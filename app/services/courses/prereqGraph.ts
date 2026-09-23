import { parsePrereq, type PrereqNode } from "@/lib/parsePrereq"
import type { FlattenedPrereq } from "@/lib/parsePrereq"

export type PrereqGraphEntry = FlattenedPrereq & {
  tree?: PrereqNode
  unlockedBy: string[]
}

export type PrereqGraph = Record<string, PrereqGraphEntry>

let graph: PrereqGraph | undefined

function loadGraph(): PrereqGraph {
  if (!graph) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    graph = require("../../../assets/data/prereq-graph.json") as PrereqGraph
  }
  return graph
}

/** Returns the parsed prerequisite AST for a course code. */
export function getPrerequisites(code: string): PrereqNode {
  return loadGraph()[code]?.tree ?? { type: "empty" }
}

/** Returns direct courses unlocked by completing the supplied course. */
export function getUnlockedCourses(code: string): string[] {
  return loadGraph()[code]?.unlockedBy ?? []
}

/** Returns whether the generated graph contains a course node. */
export function courseExists(code: string): boolean {
  return code in loadGraph()
}

/** Returns the lazily loaded graph for view-model construction and warm-up. */
export function getPrerequisiteGraph(): PrereqGraph {
  return loadGraph()
}

export function getPrerequisitesFromText(value: string | null | undefined): PrereqNode {
  return parsePrereq(value)
}
