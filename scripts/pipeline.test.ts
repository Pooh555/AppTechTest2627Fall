import Database from "better-sqlite3"

import {
  courseCodeOf,
  dedupeSections,
  dedupeCourses,
  joinSections,
  precomputeSeatStatus,
  type CatalogRow,
  type ScheduleRow,
} from "./pipeline"
import { seatStatusForSections } from "../app/lib/seatStatus"

const TERM_A = { term_num: 104, term_code: "2610", term_name: "2026-27 Fall" }
const TERM_B = { term_num: 101, term_code: "2520", term_name: "2025-26 Winter" }

function course(
  partial: Partial<CatalogRow> & Pick<CatalogRow, "id" | "prefix" | "number">,
): CatalogRow {
  return {
    department_code: "COMP",
    department_nickname: "COMP",
    title: "Untitled",
    min_credits: 3,
    max_credits: 3,
    ...TERM_A,
    ...partial,
  }
}

describe("dedupeCourses", () => {
  it("keeps one canonical row per (prefix, number) from the latest term", () => {
    const rows: CatalogRow[] = [
      course({
        id: "001",
        prefix: "COMP",
        number: "1021",
        title: "Winter intro",
        ...TERM_B,
      }),
      course({
        id: "001",
        prefix: "COMP",
        number: "1021",
        title: "Fall intro",
        ...TERM_A,
      }),
      course({ id: "002", prefix: "MATH", number: "1013", title: "Calculus" }),
    ]

    const result = dedupeCourses(rows)
    expect(result).toHaveLength(2)

    const comp = result.find((row) => row.code === "COMP 1021")
    expect(comp?.title).toBe("Fall intro")
    expect(comp?.term_code).toBe("2610")
    expect(comp?.offeredTerms.map((term) => term.term_code).sort()).toEqual(["2520", "2610"])
    expect(comp?.offeredTerms.every((term) => term.course_id === "001")).toBe(true)
  })

  it("treats prefix + number as the human course code", () => {
    expect(courseCodeOf("COMP", "4211")).toBe("COMP 4211")
    const result = dedupeCourses([course({ id: "009", prefix: "COMP", number: "2012H" })])
    expect(result[0].code).toBe("COMP 2012H")
  })
})

describe("joinSections", () => {
  it("keeps schedule rows whose course_id is present on a catalog course", () => {
    const courses = dedupeCourses([
      course({ id: "001", prefix: "COMP", number: "1021" }),
      course({ id: "002", prefix: "MATH", number: "1013" }),
    ])
    const sections: ScheduleRow[] = [
      {
        ...TERM_A,
        course_id: "001",
        section: "L1",
        number: 1,
        type: "LEC",
        capacity: 80,
        enroll: 40,
        wait: 0,
        open: true,
      },
      {
        ...TERM_A,
        course_id: "999",
        section: "L1",
        number: 2,
        type: "LEC",
        capacity: 10,
        enroll: 10,
        wait: 0,
        open: false,
      },
    ]

    const joined = joinSections(courses, sections)
    expect(joined).toHaveLength(1)
    expect(joined[0].course_id).toBe("001")
  })

  describe("dedupeSections", () => {
    it("keeps the latest timestamped snapshot for each logical section", () => {
      const older = {
        ...TERM_A,
        course_id: "001",
        section: "L1",
        number: 1,
        type: "LEC",
        capacity: 100,
        enroll: 80,
        wait: 2,
        open: true,
        timestamp: "2026-09-01T00:00:00Z",
      }
      const latest = {
        ...older,
        number: 99,
        enroll: 95,
        wait: 12,
        open: false,
        timestamp: "2026-09-02T00:00:00Z",
      }
      const other = { ...older, section: "L2", number: 2 }

      expect(dedupeSections([older, latest, other])).toEqual([latest, other])
    })
  })

  it("joins using the stable id even when the same course appears in multiple terms", () => {
    const courses = dedupeCourses([
      course({ id: "001", prefix: "COMP", number: "1021", ...TERM_A }),
      course({ id: "001", prefix: "COMP", number: "1021", ...TERM_B }),
    ])
    const sections: ScheduleRow[] = [
      {
        ...TERM_B,
        course_id: "001",
        section: "T1",
        number: 3,
        type: "TUT",
        capacity: 40,
        enroll: 39,
        wait: 2,
        open: true,
      },
    ]
    expect(joinSections(courses, sections)).toHaveLength(1)
  })
})

describe("seatStatusForSections", () => {
  it("marks open, near-full (>= 0.9), and full/closed", () => {
    expect(seatStatusForSections([{ capacity: 100, enroll: 40, open: true }])).toBe("open")
    expect(seatStatusForSections([{ capacity: 100, enroll: 90, open: true }])).toBe("near-full")
    expect(seatStatusForSections([{ capacity: 100, enroll: 100, open: true }])).toBe("full")
    expect(seatStatusForSections([{ capacity: 100, enroll: 10, open: false }])).toBe("full")
    expect(seatStatusForSections([])).toBe("unknown")
  })

  describe("precomputeSeatStatus", () => {
    it("aggregates open seats and never marks non-capacity sections full", () => {
      const result = precomputeSeatStatus(
        [
          {
            ...TERM_A,
            course_id: "001",
            section: "L1",
            number: 1,
            type: "LEC",
            capacity: 100,
            enroll: 40,
            wait: 0,
            open: true,
          },
          {
            ...TERM_A,
            course_id: "001",
            section: "I1",
            number: 2,
            type: "IND",
            capacity: 0,
            enroll: 0,
            wait: 0,
            open: false,
          },
        ],
        new Map([["001", "COMP 1021"]]),
      )
      expect(result).toEqual([
        {
          course_code: "COMP 1021",
          term_code: "2610",
          seat_status: "open",
          open_seats: 60,
          total_capacity: 100,
        },
      ])
    })
  })
})

describe("generated database", () => {
  it("keeps FTS rowids aligned with course rowids and required indexes", () => {
    const db = new Database("assets/data/courses.db", { readonly: true })
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM courses c LEFT JOIN courses_fts f ON f.rowid = c.rowid WHERE f.rowid IS NULL",
        )
        .get(),
    ).toEqual({ count: 0 })
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_sections_code_term', 'idx_course_terms_code_term') ORDER BY name",
        )
        .all(),
    ).toEqual([{ name: "idx_course_terms_code_term" }, { name: "idx_sections_code_term" }])
    db.close()
  })
})
