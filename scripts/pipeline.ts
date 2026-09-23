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

export function joinSections(
  courses: CanonicalCourse[],
  sections: ScheduleRow[],
): ScheduleRow[] {
  const ids = new Set<string>()
  for (const course of courses) {
    for (const term of course.offeredTerms) ids.add(term.course_id)
    ids.add(course.id)
  }
  return sections.filter((section) => ids.has(section.course_id))
}

export type { SeatStatus } from "../app/lib/seatStatus"
export { seatStatusForSections } from "../app/lib/seatStatus"
