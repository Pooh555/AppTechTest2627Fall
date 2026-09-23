import { flattenPrereq, parsePrereq } from "./parsePrereq"
import courses from "../../courses.json"
import type { CatalogRow } from "../../scripts/pipeline"

function assertNoPunctuationLeaves(node: ReturnType<typeof parsePrereq>) {
  if (node.type === "text") expect(node.value).toMatch(/[\p{L}\p{N}]/u)
  if (node.type === "and" || node.type === "or") {
    node.children.forEach(assertNoPunctuationLeaves)
  }
}

describe("parsePrereq", () => {
  it("parses an empty string as no prerequisite", () => {
    expect(parsePrereq("")).toEqual({ type: "empty" })
    expect(parsePrereq("   ")).toEqual({ type: "empty" })
    expect(parsePrereq(null)).toEqual({ type: "empty" })
  })

  it("parses a single course", () => {
    expect(parsePrereq("ACCT 3010")).toEqual({ type: "course", code: "ACCT 3010" })
  })

  it("parses an OR of two courses", () => {
    expect(parsePrereq("COMP 1021 OR COMP 1028")).toEqual({
      type: "or",
      children: [
        { type: "course", code: "COMP 1021" },
        { type: "course", code: "COMP 1028" },
      ],
    })
  })

  it("parses AND of an OR-group and a course", () => {
    expect(parsePrereq("(COMP 2012 OR COMP 2012H) AND COMP 2211")).toEqual({
      type: "and",
      children: [
        {
          type: "or",
          children: [
            { type: "course", code: "COMP 2012" },
            { type: "course", code: "COMP 2012H" },
          ],
        },
        { type: "course", code: "COMP 2211" },
      ],
    })
  })

  it("attaches grade qualifiers and keeps grouping", () => {
    const tree = parsePrereq(
      "(Grade A or above in COMP 1023) OR (Grade A or above in COMP 1021 AND Pass grade in COMP 1028)",
    )
    expect(tree).toEqual({
      type: "or",
      children: [
        { type: "course", code: "COMP 1023", meta: { grade: "A" } },
        {
          type: "and",
          children: [
            { type: "course", code: "COMP 1021", meta: { grade: "A" } },
            { type: "course", code: "COMP 1028", meta: { grade: "Pass" } },
          ],
        },
      ],
    })
  })

  it("treats () and [] as equivalent grouping", () => {
    expect(parsePrereq("COMP 2611 OR [ELEC 2350 AND (COMP 2011 OR COMP 2012H)]")).toEqual({
      type: "or",
      children: [
        { type: "course", code: "COMP 2611" },
        {
          type: "and",
          children: [
            { type: "course", code: "ELEC 2350" },
            {
              type: "or",
              children: [
                { type: "course", code: "COMP 2011" },
                { type: "course", code: "COMP 2012H" },
              ],
            },
          ],
        },
      ],
    })
  })

  it("treats (prior to ...) as metadata on the preceding course, not a grouping paren", () => {
    const tree = parsePrereq("COMP 1021 OR COMP 1022P (prior to 2025-26) OR COMP 1023")
    expect(tree).toEqual({
      type: "or",
      children: [
        { type: "course", code: "COMP 1021" },
        { type: "course", code: "COMP 1022P", meta: { priorTo: "2025-26" } },
        { type: "course", code: "COMP 1023" },
      ],
    })
  })

  it("returns a text leaf for unresolvable prose", () => {
    expect(parsePrereq("any COMP courses of 3000-level or above")).toEqual({
      type: "text",
      value: "any COMP courses of 3000-level or above",
    })
  })

  it("flattens AND of OR-group plus a course", () => {
    const tree = parsePrereq("(COMP 2012 OR COMP 2012H) AND COMP 2211")
    expect(flattenPrereq(tree)).toEqual({
      and: ["COMP 2211"],
      or: [["COMP 2012", "COMP 2012H"]],
      text: [],
    })
  })

  it("keeps lowercase operators in prose and extracts later course codes", () => {
    expect(parsePrereq("Pass in Mathematics and Statistics; COMP 1021")).toEqual({
      type: "and",
      children: [
        { type: "text", value: "Pass in Mathematics and Statistics;" },
        { type: "course", code: "COMP 1021" },
      ],
    })
  })

  it("does not lose trailing content after an unbalanced parenthesis", () => {
    expect(parsePrereq("(COMP 1021 OR COMP 1028")).toEqual({
      type: "or",
      children: [
        { type: "course", code: "COMP 1021" },
        { type: "course", code: "COMP 1028" },
      ],
    })
    expect(parsePrereq("COMP 1021) AND COMP 1028")).toEqual({
      type: "and",
      children: [
        { type: "course", code: "COMP 1021" },
        { type: "course", code: "COMP 1028" },
      ],
    })
  })

  it("parses grade C-minus qualifiers", () => {
    expect(parsePrereq("Grade C- or above in MATH 1013")).toEqual({
      type: "course",
      code: "MATH 1013",
      meta: { grade: "C-" },
    })
  })

  it("parses every bundled prerequisite, corequisite, and exclusion safely", () => {
    let resolved = 0
    let text = 0
    for (const row of courses as CatalogRow[]) {
      for (const value of [row.prerequisite, row.corequisite, row.exclusion]) {
        const tree = parsePrereq(value)
        assertNoPunctuationLeaves(tree)
        const json = JSON.stringify(tree)
        if (json.includes('"type":"course"')) resolved += 1
        if (json.includes('"type":"text"')) text += 1
      }
    }
    expect(resolved + text).toBeGreaterThan(0)
    console.info(`Prerequisite coverage: resolved=${resolved}, text=${text}`)
  })
})
