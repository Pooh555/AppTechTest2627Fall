import type { FlattenedPrereq, PrereqNode } from "./parsePrereq"

export type PrereqGraphEntry = FlattenedPrereq & {
  unlockedBy: string[]
  tree?: PrereqNode
}

export type PrereqGraph = Record<string, PrereqGraphEntry>

export type WalkKind = "course" | "cycle" | "max-depth" | "text"

export type WalkNode = {
  code: string
  kind: WalkKind
  text?: string
  children?: WalkNode[]
}

export const MAX_PREREQ_DEPTH = 8

export function directCodes(entry: FlattenedPrereq | undefined): string[] {
  if (!entry) return []
  const seen = new Set<string>()
  const codes: string[] = []
  for (const code of [...entry.and, ...entry.or.flat()]) {
    if (!seen.has(code)) {
      seen.add(code)
      codes.push(code)
    }
  }
  return codes
}

export function expandPrereq(
  graph: PrereqGraph,
  code: string,
  ancestors: Set<string> = new Set(),
  depth = 0,
  direction: "prereq" | "unlocks" = "prereq",
): WalkNode {
  if (ancestors.has(code)) {
    return { code, kind: "cycle" }
  }
  if (depth >= MAX_PREREQ_DEPTH) {
    return { code, kind: "max-depth" }
  }

  const entry = graph[code]
  const nextCodes = direction === "unlocks" ? (entry?.unlockedBy ?? []) : directCodes(entry)
  const texts = direction === "prereq" ? (entry?.text ?? []) : []
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(code)

  const children: WalkNode[] = nextCodes.map((childCode) =>
    expandPrereq(graph, childCode, nextAncestors, depth + 1, direction),
  )
  for (const value of texts) {
    children.push({ code: value, kind: "text", text: value })
  }

  return { code, kind: "course", children }
}
