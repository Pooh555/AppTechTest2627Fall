#!/usr/bin/env npx tsx
/**
 * Build assets/data/courses.db and assets/data/prereq-graph.json
 * from courses.json + the trimmed schedule slice.
 */
import Database from "better-sqlite3"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { CatalogRow, CanonicalCourse, ScheduleRow } from "./pipeline"
import { dedupeCourses, joinSections, precomputeSeatStatus } from "./pipeline"
import { collectCourseCodes, flattenPrereq, parsePrereq } from "../app/lib/parsePrereq"

const ROOT = join(__dirname, "..")
const COURSES_JSON = join(ROOT, "courses.json")
const SCHEDULE_JSON = join(ROOT, "assets/data/schedule.json")
const OUT_DIR = join(ROOT, "assets/data")
const DB_PATH = join(OUT_DIR, "courses.db")
const GRAPH_PATH = join(OUT_DIR, "prereq-graph.json")
const META_PATH = join(OUT_DIR, "dataset-meta.json")

type GraphEntry = {
  and: string[]
  or: string[][]
  text: string[]
  tree: ReturnType<typeof parsePrereq>
  corequisite: ReturnType<typeof parsePrereq>
  exclusion: ReturnType<typeof parsePrereq>
  unlockedBy: string[]
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function createSchema(db: Database.Database) {
  db.exec(`
    PRAGMA user_version = 2;
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;

    DROP TABLE IF EXISTS sections;
    DROP TABLE IF EXISTS course_seat_status;
    DROP TABLE IF EXISTS course_terms;
    DROP TABLE IF EXISTS courses_fts;
    DROP TABLE IF EXISTS courses;
    DROP TABLE IF EXISTS meta;

    CREATE TABLE courses (
      code TEXT PRIMARY KEY,
      prefix TEXT NOT NULL,
      number TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      min_credits REAL,
      max_credits REAL,
      vector_display TEXT,
      department_code TEXT,
      department_nickname TEXT,
      school_code TEXT,
      career_type TEXT,
      canonical_term_code TEXT,
      canonical_term_name TEXT,
      canonical_id TEXT,
      code_compact TEXT NOT NULL,
      prerequisite TEXT,
      corequisite TEXT,
      exclusion TEXT,
      background TEXT,
      cilos TEXT,
      attributes TEXT
    );
    CREATE INDEX idx_courses_prefix ON courses(prefix);
    CREATE INDEX idx_courses_number ON courses(number);
    CREATE INDEX idx_courses_department ON courses(department_code);
    CREATE INDEX idx_courses_term ON courses(canonical_term_code);

    CREATE TABLE course_terms (
      code TEXT NOT NULL,
      term_code TEXT NOT NULL,
      term_name TEXT NOT NULL,
      term_num INTEGER NOT NULL,
      course_id TEXT NOT NULL,
      PRIMARY KEY (code, term_code)
    );
    CREATE INDEX idx_course_terms_term ON course_terms(term_code);
    CREATE INDEX idx_course_terms_code_term ON course_terms(code, term_code);
    CREATE INDEX idx_course_terms_id ON course_terms(course_id);

    CREATE VIRTUAL TABLE courses_fts USING fts5(
      code,
      title,
      description,
      content='courses',
      content_rowid='rowid',
      tokenize='unicode61',
      prefix='2 3'
    );

    CREATE TABLE sections (
      id INTEGER PRIMARY KEY,
      course_id TEXT NOT NULL,
      course_code TEXT,
      term_code TEXT NOT NULL,
      term_name TEXT,
      section TEXT,
      number INTEGER,
      role TEXT,
      type TEXT,
      association INTEGER,
      remarks TEXT,
      capacity INTEGER,
      enroll INTEGER,
      wait INTEGER,
      consent INTEGER,
      open INTEGER,
      schedules TEXT,
      reservations TEXT,
      status TEXT,
      timestamp TEXT
    );
    CREATE INDEX idx_sections_course_term ON sections(course_id, term_code);
    CREATE INDEX idx_sections_code_term ON sections(course_code, term_code);

    CREATE TABLE course_seat_status (
      course_code TEXT NOT NULL,
      term_code TEXT NOT NULL,
      seat_status TEXT NOT NULL,
      open_seats INTEGER NOT NULL,
      total_capacity INTEGER NOT NULL,
      PRIMARY KEY (course_code, term_code)
    );
    CREATE INDEX idx_course_seat_status_term_code
      ON course_seat_status(term_code, course_code);

    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function insertCourses(db: Database.Database, courses: CanonicalCourse[]) {
  const insertCourse = db.prepare(`
    INSERT INTO courses (
      code, prefix, number, title, description, min_credits, max_credits,
      vector_display, department_code, department_nickname, school_code, career_type,
      canonical_term_code, canonical_term_name, canonical_id, code_compact, prerequisite, corequisite,
      exclusion, background, cilos, attributes
    ) VALUES (
      @code, @prefix, @number, @title, @description, @min_credits, @max_credits,
      @vector_display, @department_code, @department_nickname, @school_code, @career_type,
      @canonical_term_code, @canonical_term_name, @canonical_id, @code_compact, @prerequisite, @corequisite,
      @exclusion, @background, @cilos, @attributes
    )
  `)
  const insertTerm = db.prepare(`
    INSERT INTO course_terms (code, term_code, term_name, term_num, course_id)
    VALUES (@code, @term_code, @term_name, @term_num, @course_id)
  `)
  const tx = db.transaction(() => {
    for (const course of courses) {
      insertCourse.run({
        code: course.code,
        prefix: course.prefix,
        number: course.number,
        title: course.title,
        description: course.description ?? "",
        min_credits: course.min_credits,
        max_credits: course.max_credits,
        vector_display: course.vector_display ?? "",
        department_code: course.department_code,
        department_nickname: course.department_nickname,
        school_code: course.school_code ?? "",
        career_type: course.career_type ?? "",
        canonical_term_code: course.term_code,
        canonical_term_name: course.term_name,
        canonical_id: course.id,
        code_compact: course.code.replace(/\s+/g, ""),
        prerequisite: course.prerequisite ?? "",
        corequisite: course.corequisite ?? "",
        exclusion: course.exclusion ?? "",
        background: course.background ?? "",
        cilos: JSON.stringify(course.cilos ?? []),
        attributes: JSON.stringify(course.attributes ?? []),
      })
      for (const term of course.offeredTerms) {
        insertTerm.run({
          code: course.code,
          term_code: term.term_code,
          term_name: term.term_name,
          term_num: term.term_num,
          course_id: term.course_id,
        })
      }
    }
  })
  tx()
  db.exec("INSERT INTO courses_fts(courses_fts) VALUES ('rebuild')")
}

function insertSeatAggregates(
  db: Database.Database,
  aggregates: ReturnType<typeof precomputeSeatStatus>,
) {
  const insert = db.prepare(`
    INSERT INTO course_seat_status
      (course_code, term_code, seat_status, open_seats, total_capacity)
    VALUES (@course_code, @term_code, @seat_status, @open_seats, @total_capacity)
  `)
  const tx = db.transaction(() => {
    for (const aggregate of aggregates) insert.run(aggregate)
  })
  tx()
}

function insertSections(
  db: Database.Database,
  sections: ScheduleRow[],
  idToCode: Map<string, string>,
) {
  const insert = db.prepare(`
    INSERT INTO sections (
      course_id, course_code, term_code, term_name, section, number, role, type,
      association, remarks, capacity, enroll, wait, consent, open, schedules,
      reservations, status, timestamp
    ) VALUES (
      @course_id, @course_code, @term_code, @term_name, @section, @number, @role, @type,
      @association, @remarks, @capacity, @enroll, @wait, @consent, @open, @schedules,
      @reservations, @status, @timestamp
    )
  `)
  const tx = db.transaction(() => {
    for (const section of sections) {
      insert.run({
        course_id: section.course_id,
        course_code: idToCode.get(section.course_id) ?? "",
        term_code: section.term_code,
        term_name: section.term_name,
        section: section.section,
        number: section.number,
        role: section.role ?? "",
        type: section.type,
        association: section.association ?? null,
        remarks: section.remarks ?? "",
        capacity: section.capacity,
        enroll: section.enroll,
        wait: section.wait,
        consent: section.consent ? 1 : 0,
        open: section.open ? 1 : 0,
        schedules: JSON.stringify(section.schedules ?? []),
        reservations: JSON.stringify(section.reservations ?? []),
        status: section.status ?? "",
        timestamp: section.timestamp ?? "",
      })
    }
  })
  tx()
}

function buildGraph(courses: CanonicalCourse[]): Record<string, GraphEntry> {
  const graph: Record<string, GraphEntry> = {}
  for (const course of courses) {
    const tree = parsePrereq(course.prerequisite)
    const flat = flattenPrereq(tree)
    graph[course.code] = {
      ...flat,
      tree,
      corequisite: parsePrereq(course.corequisite),
      exclusion: parsePrereq(course.exclusion),
      unlockedBy: [],
    }
  }

  for (const [code, entry] of Object.entries(graph)) {
    const targets = collectCourseCodes(entry.tree)
    for (const target of targets) {
      if (!graph[target]) {
        graph[target] = {
          and: [],
          or: [],
          text: [],
          tree: { type: "empty" },
          corequisite: { type: "empty" },
          exclusion: { type: "empty" },
          unlockedBy: [],
        }
      }
      if (!graph[target].unlockedBy.includes(code)) {
        graph[target].unlockedBy.push(code)
      }
    }
  }

  for (const entry of Object.values(graph)) {
    entry.unlockedBy.sort()
  }
  return graph
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const catalog = loadJson<CatalogRow[]>(COURSES_JSON)
  const schedule = loadJson<ScheduleRow[]>(SCHEDULE_JSON)

  const courses = dedupeCourses(catalog)
  const sections = joinSections(courses, schedule)
  const idToCode = new Map<string, string>()
  for (const course of courses) {
    for (const term of course.offeredTerms) {
      idToCode.set(term.course_id, course.code)
    }
  }

  const generatedAt = new Date().toISOString()
  const terms = [...new Map(catalog.map((row) => [row.term_code, row])).values()]
    .map((row) => ({
      term_code: row.term_code,
      term_name: row.term_name,
      term_num: row.term_num,
    }))
    .sort((a, b) => b.term_num - a.term_num)

  try {
    rmSync(DB_PATH)
  } catch {
    // first build
  }

  const db = new Database(DB_PATH)
  createSchema(db)
  insertCourses(db, courses)
  insertSections(db, sections, idToCode)
  insertSeatAggregates(db, precomputeSeatStatus(sections, idToCode))
  db.exec("VACUUM")
  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?), (?, ?), (?, ?)").run(
    "generated_at",
    generatedAt,
    "course_count",
    String(courses.length),
    "section_count",
    String(sections.length),
  )
  db.close()

  const graph = buildGraph(courses)
  writeFileSync(GRAPH_PATH, `${JSON.stringify(graph)}\n`)

  const meta = {
    generatedAt,
    catalogPath: "courses.json",
    schedulePath: "assets/data/schedule.json",
    scheduleSource: "ust-archive/schedule",
    scheduleConfig: "classes",
    scheduleFetchCommand:
      "python -c \"from huggingface_hub import hf_hub_download; print(hf_hub_download(repo_id='ust-archive/schedule', repo_type='dataset', revision='refs/convert/parquet', filename='classes/train/0000.parquet'))\"",
    terms,
    courseCount: courses.length,
    sectionCount: sections.length,
    catalogRowCount: catalog.length,
  }
  writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`)

  console.log(`Wrote ${DB_PATH}`)
  console.log(`Wrote ${GRAPH_PATH}`)
  console.log(`Wrote ${META_PATH}`)
  console.log(
    `courses=${courses.length} sections=${sections.length} graphKeys=${Object.keys(graph).length}`,
  )
}

main()
