import type { SQLiteDatabase } from "expo-sqlite"

import { parsePrereq, type PrereqNode } from "@/lib/parsePrereq"
import type { PrereqGraph } from "@/lib/prereqWalk"
import { buildSearchPlan, classifyQuery, normalizeQuery } from "@/lib/search/searchIntent"

import type {
  Cilo,
  CourseDetail,
  CourseSection,
  CourseSummary,
  DatasetMeta,
  DepartmentInfo,
  OfferedTerm,
  SearchCoursesParams,
  SearchCoursesResult,
  TermInfo,
} from "./types"
import datasetMetaJson from "../../../assets/data/dataset-meta.json"

let prereqGraph: PrereqGraph | undefined
const datasetMeta = datasetMetaJson as DatasetMeta

function loadPrereqGraph(): PrereqGraph {
  if (!prereqGraph) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    prereqGraph = require("../../../assets/data/prereq-graph.json") as PrereqGraph
  }
  return prereqGraph
}

type CourseRow = {
  code: string
  prefix: string
  number: string
  title: string
  code_compact: string
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
  seat_status: CourseSummary["seatStatus"]
  open_seats: number
  total_capacity: number
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

function graphTree(code: string, fallback: string | null | undefined): PrereqNode {
  const entry = loadPrereqGraph()[code]
  if (entry?.tree) return entry.tree as PrereqNode
  return parsePrereq(fallback)
}

function toSummary(row: CourseRow, seatRow?: SeatRow): CourseSummary {
  return {
    code: row.code,
    prefix: row.prefix,
    number: row.number,
    title: row.title,
    minCredits: row.min_credits,
    maxCredits: row.max_credits,
    departmentCode: row.department_code,
    departmentNickname: row.department_nickname,
    seatStatus: seatRow?.seat_status ?? "unknown",
    openSeats: seatRow?.open_seats ?? 0,
    totalCapacity: seatRow?.total_capacity ?? 0,
  }
}

async function seatsByCourse(
  db: SQLiteDatabase,
  termCode: string | null | undefined,
  codes: string[],
): Promise<Map<string, SeatRow>> {
  const map = new Map<string, SeatRow>()
  if (!termCode || codes.length === 0) return map

  const placeholders = codes.map(() => "?").join(",")
  const rows = await db.getAllAsync<SeatRow>(
    `SELECT course_code, seat_status, open_seats, total_capacity
     FROM course_seat_status
     WHERE term_code = ? AND course_code IN (${placeholders})`,
    [termCode, ...codes],
  )
  for (const row of rows) {
    map.set(row.course_code, row)
  }
  return map
}

export async function searchCourses(
  db: SQLiteDatabase,
  params: SearchCoursesParams = {},
): Promise<SearchCoursesResult> {
  if (params.codes && params.codes.length === 0) return { rows: [], hasMore: false }
  const limit = params.limit ?? 60
  const offset = params.offset ?? 0
  const prefixRows = await db.getAllAsync<{ prefix: string }>(
    "SELECT DISTINCT prefix FROM courses ORDER BY prefix",
  )
  const intent = classifyQuery(
    normalizeQuery(params.query ?? ""),
    new Set(prefixRows.map((row) => row.prefix)),
  )
  const plan = buildSearchPlan(intent, {
    termCode: params.termCode,
    departmentCode: params.departmentCode,
    codes: params.codes,
    limit,
    offset,
  })
  const rows = await db.getAllAsync<CourseRow>(plan.sql, plan.args)
  const seats = await seatsByCourse(
    db,
    params.termCode,
    rows.map((row) => row.code),
  )
  const hasMore = rows.length > limit
  const summaries = rows.slice(0, limit).map((row) => toSummary(row, seats.get(row.code)))
  if (params.codes && params.codes.length > 0) {
    const order = new Map(params.codes.map((code, index) => [code, index]))
    summaries.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0))
  }
  return { rows: summaries, hasMore }
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
  const summary = toSummary(row, seats.get(code))
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
     ORDER BY CASE type
       WHEN 'LEC' THEN 0
       WHEN 'LAB' THEN 1
       WHEN 'TUT' THEN 2
       WHEN 'IND' THEN 3
       ELSE 4 END, number`,
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
  return loadPrereqGraph()[code]?.unlockedBy ?? []
}

export function getPrereqGraph(): PrereqGraph {
  return loadPrereqGraph()
}

export async function getLatestTermCode(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ termCode: string }>(
    "SELECT term_code AS termCode FROM course_terms ORDER BY term_num DESC LIMIT 1",
  )
  return row?.termCode ?? null
}

export async function getCourseTitles(
  db: SQLiteDatabase,
  codes: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (let offset = 0; offset < codes.length; offset += 100) {
    const batch = codes.slice(offset, offset + 100)
    if (batch.length === 0) continue
    const rows = await db.getAllAsync<{ code: string; title: string }>(
      `SELECT code, title FROM courses WHERE code IN (${batch.map(() => "?").join(",")})`,
      batch,
    )
    for (const row of rows) result[row.code] = row.title
  }
  return result
}

export async function getCourseExists(db: SQLiteDatabase, code: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ exists: number }>(
    "SELECT EXISTS(SELECT 1 FROM courses WHERE code = ?) AS exists",
    [code],
  )
  return row?.exists === 1
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
