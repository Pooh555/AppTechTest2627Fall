export type CatalogRow = {
  id: string
  term_num: number
  term_code: string
  term_name: string
  academic_year?: string
  campus_code?: string
  campus_name?: string
  campus_nickname?: string
  department_code: string
  department_nickname: string
  school_code?: string
  career_code?: string
  career_type?: string
  prefix: string
  number: string
  title: string
  min_credits: number | null
  max_credits: number | null
  vector?: string
  vector_display?: string
  description?: string
  previous?: string
  alternate?: string
  prerequisite?: string
  corequisite?: string
  exclusion?: string
  background?: string
  colist?: string
  equivalence?: string
  reference?: string
  attributes?: unknown
  cilos?: unknown
  timestamp?: string
  status?: string
}

export type ScheduleRow = {
  term_num: number
  term_code: string
  term_name: string
  course_id: string
  section: string
  number: number
  role?: string
  type: string
  association?: number
  remarks?: string
  capacity: number
  enroll: number
  wait: number
  consent?: boolean
  open: boolean
  schedules?: unknown
  reservations?: unknown
  status?: string
  timestamp?: string
}

export type OfferedTerm = {
  term_code: string
  term_name: string
  term_num: number
  course_id: string
}

export type CanonicalCourse = CatalogRow & {
  code: string
  offeredTerms: OfferedTerm[]
}

export function courseCodeOf(prefix: string, number: string): string {
  return `${prefix} ${number}`
}

export function dedupeCourses(rows: CatalogRow[]): CanonicalCourse[] {
  const groups = new Map<string, CatalogRow[]>()
  for (const row of rows) {
    const code = courseCodeOf(row.prefix, row.number)
    const list = groups.get(code)
    if (list) list.push(row)
    else groups.set(code, [row])
  }

  const canonical: CanonicalCourse[] = []
  for (const [code, list] of groups) {
    const sorted = [...list].sort((a, b) => b.term_num - a.term_num)
    const latest = sorted[0]
    const offeredByTerm = new Map<string, OfferedTerm>()
    for (const row of sorted) {
      if (!offeredByTerm.has(row.term_code)) {
        offeredByTerm.set(row.term_code, {
          term_code: row.term_code,
          term_name: row.term_name,
          term_num: row.term_num,
          course_id: row.id,
        })
      }
    }
    canonical.push({
      ...latest,
      code,
      offeredTerms: [...offeredByTerm.values()].sort((a, b) => b.term_num - a.term_num),
    })
  }

  return canonical.sort((a, b) => a.code.localeCompare(b.code))
}

export function joinSections(courses: CanonicalCourse[], sections: ScheduleRow[]): ScheduleRow[] {
  const keys = new Set<string>()
  for (const course of courses) {
    for (const term of course.offeredTerms) keys.add(`${term.course_id}\0${term.term_code}`)
    keys.add(`${course.id}\0${course.term_code}`)
  }
  return sections.filter((section) => keys.has(`${section.course_id}\0${section.term_code}`))
}

export type SeatAggregate = {
  course_code: string
  term_code: string
  seat_status: "open" | "near-full" | "full" | "n/a"
  open_seats: number
  total_capacity: number
}

export function precomputeSeatStatus(
  sections: ScheduleRow[],
  idToCode: Map<string, string>,
): SeatAggregate[] {
  const grouped = new Map<string, ScheduleRow[]>()
  for (const section of sections) {
    const code = idToCode.get(section.course_id)
    if (!code) continue
    const key = `${code}\0${section.term_code}`
    grouped.set(key, [...(grouped.get(key) ?? []), section])
  }
  return [...grouped.entries()].map(([key, rows]) => {
    const [course_code, term_code] = key.split("\0")
    const measurable = rows.filter((row) => row.type !== "IND" && row.capacity > 0)
    const open_seats = measurable.reduce(
      (total, row) => total + Math.max(row.capacity - row.enroll, 0),
      0,
    )
    const total_capacity = measurable.reduce((total, row) => total + row.capacity, 0)
    const has_room = measurable.some((row) => row.open && row.enroll < row.capacity)
    const near_full = measurable.some((row) => row.enroll / row.capacity >= 0.9)
    const seat_status =
      measurable.length === 0
        ? "n/a"
        : has_room && open_seats > 0 && measurable.some((row) => row.enroll / row.capacity < 0.9)
          ? "open"
          : near_full
            ? "near-full"
            : "full"
    return { course_code, term_code, seat_status, open_seats, total_capacity }
  })
}

export type { SeatStatus } from "../app/lib/seatStatus"
export { seatStatusForSections } from "../app/lib/seatStatus"
