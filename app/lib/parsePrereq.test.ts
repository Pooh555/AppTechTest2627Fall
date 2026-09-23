import { flattenPrereq, parsePrereq } from "./parsePrereq"
import { expandPrereq } from "./prereqWalk"

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
})

describe("expandPrereq cycle safety", () => {
  it("renders a cycle leaf instead of recursing infinitely", () => {
    const graph = {
      "COMP 1001": {
        and: ["COMP 1002"],
        or: [] as string[][],
        text: [] as string[],
        unlockedBy: ["COMP 1002"],
      },
      "COMP 1002": {
        and: ["COMP 1001"],
        or: [] as string[][],
        text: [] as string[],
        unlockedBy: ["COMP 1001"],
      },
    }

    const tree = expandPrereq(graph, "COMP 1001")
    expect(tree.code).toBe("COMP 1001")
    expect(tree.children?.[0]?.code).toBe("COMP 1002")
    expect(tree.children?.[0]?.children?.[0]).toMatchObject({
      code: "COMP 1001",
      kind: "cycle",
    })
  })
})
