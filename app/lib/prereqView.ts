import type { PrereqNode } from "./parsePrereq"

export type PrereqGraphEntry = {
  tree?: PrereqNode
  and: string[]
  or: string[][]
  text: string[]
  unlockedBy: string[]
}

export type PrereqGraph = Record<string, PrereqGraphEntry>

export type PrereqViewNode =
  | {
      kind: "course"
      code: string
      meta?: { grade?: string; priorTo?: string }
      children: PrereqViewNode[]
    }
  | { kind: "group"; mode: "all" | "any"; children: PrereqViewNode[] }
  | { kind: "text"; value: string }
  | { kind: "cycle"; code: string }
  | { kind: "max-depth"; code: string }
  | { kind: "missing"; code: string }

export type PrereqViewOptions = {
  direction?: "prereq" | "unlocks"
  ancestors?: Set<string>
  depth?: number
  maxDepth?: number
  catalogue?: Set<string>
}

export function buildView(
  nodeOrCode: PrereqNode | string,
  graph: PrereqGraph,
  options: PrereqViewOptions = {},
): PrereqViewNode {
  const direction = options.direction ?? "prereq"
  const ancestors = options.ancestors ?? new Set<string>()
  const depth = options.depth ?? 0
  const maxDepth = options.maxDepth ?? 8
  const code =
    typeof nodeOrCode === "string"
      ? nodeOrCode
      : nodeOrCode.type === "course"
        ? nodeOrCode.code
        : ""

  if (typeof nodeOrCode === "string") {
    if (ancestors.has(code)) return { kind: "cycle", code }
    if (depth >= maxDepth) return { kind: "max-depth", code }
    if (options.catalogue && !options.catalogue.has(code)) return { kind: "missing", code }
    const entry = graph[code]
    if (!entry) return { kind: "missing", code }
    const nextAncestors = new Set(ancestors).add(code)
    if (direction === "unlocks") {
      return {
        kind: "course",
        code,
        children: entry.unlockedBy.map((child) =>
          buildView(child, graph, { ...options, ancestors: nextAncestors, depth: depth + 1 }),
        ),
      }
    }
    return buildView(entry.tree as PrereqNode, graph, {
      ...options,
      ancestors: nextAncestors,
      depth,
    })
  }

  switch (nodeOrCode.type) {
    case "empty":
      return { kind: "text", value: "No prerequisites" }
    case "text":
      return { kind: "text", value: nodeOrCode.value }
    case "and":
    case "or":
      return {
        kind: "group",
        mode: nodeOrCode.type === "and" ? "all" : "any",
        children: nodeOrCode.children.map((child) =>
          buildView(child, graph, { ...options, depth }),
        ),
      }
    case "course": {
      if (ancestors.has(nodeOrCode.code)) return { kind: "cycle", code: nodeOrCode.code }
      if (depth >= maxDepth) return { kind: "max-depth", code: nodeOrCode.code }
      if (options.catalogue && !options.catalogue.has(nodeOrCode.code)) {
        return { kind: "missing", code: nodeOrCode.code }
      }
      const nextAncestors = new Set(ancestors).add(nodeOrCode.code)
      const entry = graph[nodeOrCode.code]
      return {
        kind: "course",
        code: nodeOrCode.code,
        meta: nodeOrCode.meta,
        children:
          direction === "prereq" && entry?.tree
            ? [
                buildView(entry.tree as PrereqNode, graph, {
                  ...options,
                  ancestors: nextAncestors,
                  depth: depth + 1,
                }),
              ]
            : [],
      }
    }
  }
}
