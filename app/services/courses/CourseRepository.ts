import type { SQLiteDatabase } from "expo-sqlite"

import type { PrereqGraph } from "@/lib/prereqWalk"
import { parsePrereq, type PrereqNode } from "@/lib/parsePrereq"
import { seatStatusForSections } from "@/lib/seatStatus"

import type {
  Cilo,
  CourseDetail,
  CourseSection,
  CourseSummary,
  DatasetMeta,
  DepartmentInfo,
  OfferedTerm,
  SearchCoursesParams,
  TermInfo,
} from "./types"

import prereqGraphJson from "../../../assets/data/prereq-graph.json"
import datasetMetaJson from "../../../assets/data/dataset-meta.json"

const prereqGraph = prereqGraphJson as PrereqGraph
const datasetMeta = datasetMetaJson as DatasetMeta

type CourseRow = {
  code: string
  prefix: string
  number: string
  title: string
  description: string | null
  min_credits: number | null
  max_credits: number | null
  vector_display: string | null
  department_code: string
  department_nickname: string
  canonical_term_code: string
  canonical_id: string
  prerequisite: string | null
  corequisite: string | null
  exclusion: string | null
  background: string | null
  cilos: string | null
}

type SectionRow = {
  id: number
  course_id: string
  course_code: string
  term_code: string
  term_name: string
  section: string
  number: number
  role: string
  type: string
  association: number | null
  remarks: string
  capacity: number
  enroll: number
  wait: number
  consent: number
  open: number
  schedules: string
  reservations: string
  status: string
}

type SeatRow = {
  course_code: string
  capacity: number
  enroll: number
  open: number
}

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function toFtsQuery(raw: string): string {
  const tokens = raw
    .replace(/[^\w.+-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  return tokens.map((token) => `${token}*`).join(" AND ")
}

function likeQuery(raw: string): { sql: string; args: string[] } {
  const value = `%${raw.trim()}%`
  return {
    sql: "(c.code LIKE ? OR c.title LIKE ? OR c.description LIKE ?)",
    args: [value, value, value],
  }
}

function graphTree(code: string, fallback: string | null | undefined): PrereqNode {
  const entry = prereqGraph[code]
  if (entry?.tree) return entry.tree as PrereqNode
  return parsePrereq(fallback)
}

function toSummary(
  row: CourseRow,
  seatRows: Array<{ capacity: number; enroll: number; open: boolean }>,
): CourseSummary {
  return {
    code: row.code,
    prefix: row.prefix,
    number: row.number,
    title: row.title,
    minCredits: row.min_credits,
    maxCredits: row.max_credits,
    departmentCode: row.department_code,
    departmentNickname: row.department_nickname,
    seatStatus: seatStatusForSections(seatRows),
  }
}

async function seatsByCourse(
  db: SQLiteDatabase,
  termCode: string | null | undefined,
  codes: string[],
): Promise<Map<string, Array<{ capacity: number; enroll: number; open: boolean }>>> {
  const map = new Map<string, Array<{ capacity: number; enroll: number; open: boolean }>>()
  if (!termCode || codes.length === 0) return map

  const placeholders = codes.map(() => "?").join(",")
  const rows = await db.getAllAsync<SeatRow>(
    `SELECT course_code, capacity, enroll, open
     FROM sections
     WHERE term_code = ? AND course_code IN (${placeholders})`,
    [termCode, ...codes],
  )
  for (const row of rows) {
    const list = map.get(row.course_code) ?? []
    list.push({
      capacity: row.capacity,
      enroll: row.enroll,
      open: row.open === 1,
    })
    map.set(row.course_code, list)
  }
  return map
}

export async function searchCourses(
  db: SQLiteDatabase,
  params: SearchCoursesParams = {},
): Promise<CourseSummary[]> {
  const query = params.query?.trim() ?? ""
  const clauses: string[] = []
  const args: Array<string | number> = []

  let sql = `SELECT DISTINCT c.code, c.prefix, c.number, c.title, c.description,
      c.min_credits, c.max_credits, c.vector_display, c.department_code,
      c.department_nickname, c.canonical_term_code, c.canonical_id,
      c.prerequisite, c.corequisite, c.exclusion, c.background, c.cilos
    FROM courses c`

  if (query.length > 0 && toFtsQuery(query)) {
    sql += ` JOIN courses_fts fts ON fts.rowid = c.rowid`
    clauses.push("fts MATCH ?")
    args.push(toFtsQuery(query))
  }

  if (params.termCode) {
    sql += ` JOIN course_terms t ON t.code = c.code`
    clauses.push("t.term_code = ?")
    args.push(params.termCode)
  }

  if (params.departmentCode) {
    clauses.push("c.department_code = ?")
    args.push(params.departmentCode)
  }

  if (params.codes && params.codes.length > 0) {
    clauses.push(`c.code IN (${params.codes.map(() => "?").join(",")})`)
    args.push(...params.codes)
  }

  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(" AND ")}`
  }
  sql += " ORDER BY c.prefix, c.number"

  let rows: CourseRow[]
  try {
    rows = await db.getAllAsync<CourseRow>(sql, args)
  } catch (error) {
    if (query.length === 0) throw error
    const fallback = likeQuery(query)
    const fallbackClauses = clauses.filter((clause) => clause !== "fts MATCH ?")
    const fallbackArgs = args.filter((_value, index) => index !== 0)
    const where = [...fallbackClauses, fallback.sql]
    const fallbackSql = `SELECT DISTINCT c.code, c.prefix, c.number, c.title, c.description,
      c.min_credits, c.max_credits, c.vector_display, c.department_code,
      c.department_nickname, c.canonical_term_code, c.canonical_id,
      c.prerequisite, c.corequisite, c.exclusion, c.background, c.cilos
      FROM courses c${params.termCode ? " JOIN course_terms t ON t.code = c.code" : ""}
      WHERE ${where.join(" AND ")} ORDER BY c.prefix, c.number`
    rows = await db.getAllAsync<CourseRow>(fallbackSql, [...fallbackArgs, ...fallback.args])
  }
  const seats = await seatsByCourse(
    db,
    params.termCode,
    rows.map((row) => row.code),
  )
  const summaries = rows.map((row) => toSummary(row, seats.get(row.code) ?? []))
  if (params.codes && params.codes.length > 0) {
    const order = new Map(params.codes.map((code, index) => [code, index]))
    summaries.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0))
  }
  return summaries
}

export async function getCourseDetail(
  db: SQLiteDatabase,
  code: string,
  termCode?: string | null,
): Promise<CourseDetail | null> {
  const row = await db.getFirstAsync<CourseRow>(
    `SELECT code, prefix, number, title, description, min_credits, max_credits,
            vector_display, department_code, department_nickname, canonical_term_code,
            canonical_id, prerequisite, corequisite, exclusion, background, cilos
     FROM courses WHERE code = ?`,
    [code],
  )
  if (!row) return null

  const termRows = await db.getAllAsync<{
    term_code: string
    term_name: string
    term_num: number
    course_id: string
  }>(
    `SELECT term_code, term_name, term_num, course_id FROM course_terms
     WHERE code = ? ORDER BY term_num DESC`,
    [code],
  )
  const offeredTerms: OfferedTerm[] = termRows.map((term) => ({
    termCode: term.term_code,
    termName: term.term_name,
    termNum: term.term_num,
    courseId: term.course_id,
  }))

  const seatTerm = termCode ?? row.canonical_term_code
  const seats = await seatsByCourse(db, seatTerm, [code])
  const summary = toSummary(row, seats.get(code) ?? [])
  const cilos = parseJsonArray<Cilo>(row.cilos, []).map((item) => ({
    description: typeof item === "string" ? item : (item.description ?? ""),
  }))

  return {
    ...summary,
    description: row.description ?? "",
    vectorDisplay: row.vector_display ?? "",
    canonicalTermCode: row.canonical_term_code,
    canonicalId: row.canonical_id,
    prerequisite: row.prerequisite ?? "",
    corequisite: row.corequisite ?? "",
    exclusion: row.exclusion ?? "",
    background: row.background ?? "",
    cilos,
    offeredTerms,
    prereqTree: graphTree(code, row.prerequisite),
    coreqTree: parsePrereq(row.corequisite),
    exclusionTree: parsePrereq(row.exclusion),
  }
}

export async function getSections(
  db: SQLiteDatabase,
  code: string,
  termCode: string,
): Promise<CourseSection[]> {
  const rows = await db.getAllAsync<SectionRow>(
    `SELECT id, course_id, course_code, term_code, term_name, section, number, role, type,
            association, remarks, capacity, enroll, wait, consent, open, schedules,
            reservations, status
     FROM sections
     WHERE course_code = ? AND term_code = ?
     ORDER BY type, number`,
    [code, termCode],
  )
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    termCode: row.term_code,
    termName: row.term_name,
    section: row.section,
    number: row.number,
    role: row.role,
    type: row.type,
    association: row.association,
    remarks: row.remarks,
    capacity: row.capacity,
    enroll: row.enroll,
    wait: row.wait,
    consent: row.consent === 1,
    open: row.open === 1,
    schedules: parseJsonArray(row.schedules, []),
    reservations: parseJsonArray(row.reservations, []),
    status: row.status,
  }))
}

export function getPrereqTree(code: string): PrereqNode {
  return graphTree(code, "")
}

export function getUnlocks(code: string): string[] {
  return prereqGraph[code]?.unlockedBy ?? []
}

export function getPrereqGraph(): PrereqGraph {
  return prereqGraph
}

export async function getDepartments(db: SQLiteDatabase): Promise<DepartmentInfo[]> {
  return db.getAllAsync<DepartmentInfo>(
    `SELECT DISTINCT department_code AS code, department_nickname AS nickname
     FROM courses
     ORDER BY department_code`,
  )
}

export async function getTerms(db: SQLiteDatabase): Promise<TermInfo[]> {
  return db.getAllAsync<TermInfo>(
    `SELECT DISTINCT term_code AS termCode, term_name AS termName, term_num AS termNum
     FROM course_terms
     ORDER BY term_num DESC`,
  )
}

export function getDatasetMeta(): DatasetMeta {
  return datasetMeta
}
