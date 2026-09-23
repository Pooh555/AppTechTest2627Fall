import { buildView } from "./prereqView"
import type { PrereqGraph } from "./prereqWalk"

const graph: PrereqGraph = {
  "COMP 1001": {
    tree: {
      type: "and",
      children: [{ type: "course", code: "COMP 1002" }],
    },
    and: ["COMP 1002"],
    or: [],
    text: [],
    unlockedBy: ["COMP 2001"],
  },
  "COMP 1002": {
    tree: { type: "course", code: "COMP 1001" },
    and: ["COMP 1001"],
    or: [],
    text: [],
    unlockedBy: [],
  },
  "COMP 2001": {
    tree: { type: "empty" },
    and: [],
    or: [],
    text: [],
    unlockedBy: [],
  },
}

describe("buildView", () => {
  it("preserves groups and represents cycles", () => {
    const view = buildView("COMP 1001", graph)
    expect(view).toMatchObject({ kind: "group", mode: "all" })
    expect(buildView("COMP 1002", graph)).toMatchObject({ kind: "course", code: "COMP 1001" })
  })

  it("caps depth and marks missing catalogue courses", () => {
    expect(buildView("COMP 1001", graph, { maxDepth: 0 })).toEqual({
      kind: "max-depth",
      code: "COMP 1001",
    })
    expect(buildView("COMP 9999", graph)).toEqual({ kind: "missing", code: "COMP 9999" })
  })

  it("uses reverse edges for unlocks", () => {
    expect(buildView("COMP 1001", graph, { direction: "unlocks" })).toMatchObject({
      kind: "course",
      children: [{ kind: "course", code: "COMP 2001" }],
    })
  })
})
