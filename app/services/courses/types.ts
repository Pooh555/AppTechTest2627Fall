import type { PrereqNode } from "@/lib/parsePrereq"
import type { SeatStatus } from "@/lib/seatStatus"

export type TermInfo = {
  termCode: string
  termName: string
  termNum: number
}

export type DepartmentInfo = {
  code: string
  nickname: string
}

export type OfferedTerm = TermInfo & {
  courseId: string
}

export type CourseSummary = {
  code: string
  prefix: string
  number: string
  title: string
  minCredits: number | null
  maxCredits: number | null
  departmentCode: string
  departmentNickname: string
  seatStatus: SeatStatus
}

export type Cilo = {
  description: string
}

export type CourseDetail = CourseSummary & {
  description: string
  vectorDisplay: string
  canonicalTermCode: string
  canonicalId: string
  prerequisite: string
  corequisite: string
  exclusion: string
  background: string
  cilos: Cilo[]
  offeredTerms: OfferedTerm[]
  prereqTree: PrereqNode
  coreqTree: PrereqNode
  exclusionTree: PrereqNode
}

export type ScheduleSlot = {
  weekday?: string
  date_from?: string
  date_to?: string
  time_from?: string
  time_to?: string
  venue?: string
  venue_name?: string
  instructors?: string[]
}

export type Reservation = {
  name?: string
  quota?: number
  enroll?: number
}

export type CourseSection = {
  id: number
  courseId: string
  courseCode: string
  termCode: string
  termName: string
  section: string
  number: number
  role: string
  type: string
  association: number | null
  remarks: string
  capacity: number
  enroll: number
  wait: number
  consent: boolean
  open: boolean
  schedules: ScheduleSlot[]
  reservations: Reservation[]
  status: string
}

export type DatasetMeta = {
  generatedAt: string
  catalogPath: string
  schedulePath: string
  scheduleSource: string
  scheduleConfig: string
  scheduleFetchCommand: string
  terms: Array<{ term_code: string; term_name: string; term_num: number }>
  courseCount: number
  sectionCount: number
  catalogRowCount: number
}

export type SearchCoursesParams = {
  query?: string
  departmentCode?: string | null
  termCode?: string | null
  codes?: string[]
  limit?: number
  offset?: number
}

export type SearchCoursesResult = {
  rows: CourseSummary[]
  hasMore: boolean
}
