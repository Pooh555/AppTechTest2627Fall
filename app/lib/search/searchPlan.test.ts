import Database from "better-sqlite3"

import { buildSearchPlan, classifyQuery, normalizeQuery } from "./searchIntent"

const database = new Database("assets/data/courses.db", { readonly: true })

afterAll(() => database.close())

function codesFor(query: string): string[] {
  const prefixes = new Set(
    database
      .prepare("SELECT DISTINCT prefix FROM courses")
      .all()
      .map((row) => (row as { prefix: string }).prefix),
  )
  const plan = buildSearchPlan(classifyQuery(normalizeQuery(query), prefixes), {
    limit: 10,
    offset: 0,
  })
  return database
    .prepare(plan.sql)
    .all(...plan.args)
    .map((row) => (row as { code: string }).code)
}

describe("real course search plans", () => {
  it("restricts a code prefix to one course family", () => {
    const codes = codesFor("comp")
    expect(codes.length).toBeGreaterThan(0)
    expect(new Set(codes.map((code) => code.split(" ")[0]))).toEqual(new Set(["COMP"]))
  })

  it.each([
    ["comp4", "COMP 4"],
    ["COMP 42", "COMP 42"],
    ["comp4211", "COMP 4211"],
  ])("matches code input %s without description search", (query, prefix) => {
    const codes = codesFor(query)
    expect(codes.every((code) => code.startsWith(prefix))).toBe(true)
  })

  it("keeps title matches ahead of description-only matches", () => {
    const codes = codesFor("data")
    expect(codes[0]).toBe("DSAA 5002")
  })

  it("adds parameterized term, seat, and attribute filters", () => {
    const plan = buildSearchPlan(
      { kind: "TEXT", value: "" },
      {
        terms: ["2610", "2620"],
        openSeatsOnly: true,
        departments: ["COMP", "MATH"],
        limit: 60,
        offset: 0,
      },
    )

    expect(plan.sql).toContain("sections")
    expect(plan.sql).toContain("course_seat_status")
    expect(plan.sql).toContain("c.department_code IN (?,?)")
    expect(plan.args).toEqual(["2610", "2620", "COMP", "MATH", "2610", "2620", 61, 0])
  })

  it("strictly restricts Browse results to courses with a scheduled section in the selected term", () => {
    const [{ termCode }] = database
      .prepare(
        "SELECT term_code AS termCode FROM sections GROUP BY term_code ORDER BY COUNT(*) ASC LIMIT 1",
      )
      .all() as { termCode: string }[]

    const unfiltered = codesFor("")
    const plan = buildSearchPlan(
      { kind: "TEXT", value: "" },
      { terms: [termCode], limit: 5000, offset: 0 },
    )
    const filteredCodes = database
      .prepare(plan.sql)
      .all(...plan.args)
      .map((row) => (row as { code: string }).code)

    expect(filteredCodes.length).toBeGreaterThan(0)
    expect(filteredCodes.length).toBeLessThan(unfiltered.length)

    const actualCodesForTerm = new Set(
      database
        .prepare("SELECT DISTINCT course_code FROM sections WHERE term_code = ?")
        .all(termCode)
        .map((row) => (row as { course_code: string }).course_code),
    )
    for (const code of filteredCodes) {
      expect(actualCodesForTerm.has(code)).toBe(true)
    }
  })
})
