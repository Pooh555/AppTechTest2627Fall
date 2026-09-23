/**
 * Recursive-descent parser for HKUST catalog prerequisite / corequisite / exclusion strings.
 *
 * Qualifiers such as "(prior to YYYY-YY)" and "(Grade X or above in CODE)" are stripped
 * before tokenizing and attached as metadata on the course token they modify.
 * Parentheses and square brackets are equivalent grouping. Mixed AND/OR at one level
 * is expected to be disambiguated by the source data; if it is not, we nest left-to-right
 * without inventing operator precedence.
 */

export type CourseMeta = {
  grade?: string
  priorTo?: string
}

export type PrereqNode =
  | { type: "empty" }
  | { type: "course"; code: string; meta?: CourseMeta }
  | { type: "and"; children: PrereqNode[] }
  | { type: "or"; children: PrereqNode[] }
  | { type: "text"; value: string }

export type FlattenedPrereq = {
  and: string[]
  or: string[][]
  text: string[]
}

export const COURSE_CODE_PATTERN = /[A-Z]{2,4}\s?\d{3,4}[A-Z]?/g

export function normalizeCourseCode(raw: string): string {
  const match = raw.trim().match(/^([A-Z]{2,4})\s?(\d{3,4}[A-Z]?)$/i)
  if (!match) return raw.trim().toUpperCase()
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`
}

type Token =
  | { kind: "and" }
  | { kind: "or" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "course"; code: string; meta?: CourseMeta }
  | { kind: "text"; value: string }

type QualifierIndex = Map<string, CourseMeta>

function mergeMeta(index: QualifierIndex, code: string, extra: CourseMeta) {
  const current = index.get(code) ?? {}
  index.set(code, { ...current, ...extra })
}

function extractQualifiers(input: string): { rest: string; meta: QualifierIndex } {
  const meta: QualifierIndex = new Map()
  let rest = input

  rest = rest.replace(
    /\(\s*Grade\s+(.+?)\s+or above in\s+([A-Z]{2,4}\s?\d{3,4}[A-Z]?)\s*\)/gi,
    (_whole, grade: string, rawCode: string) => {
      const code = normalizeCourseCode(rawCode)
      mergeMeta(meta, code, { grade: String(grade).trim() })
      return ` ${code} `
    },
  )
  rest = rest.replace(
    /Grade\s+(.+?)\s+or above in\s+([A-Z]{2,4}\s?\d{3,4}[A-Z]?)/gi,
    (_whole, grade: string, rawCode: string) => {
      const code = normalizeCourseCode(rawCode)
      mergeMeta(meta, code, { grade: String(grade).trim() })
      return ` ${code} `
    },
  )

  rest = rest.replace(
    /Pass grade in\s+([A-Z]{2,4}\s?\d{3,4}[A-Z]?)/gi,
    (_whole, rawCode: string) => {
      const code = normalizeCourseCode(rawCode)
      mergeMeta(meta, code, { grade: "Pass" })
      return ` ${code} `
    },
  )

  rest = rest.replace(
    /([A-Z]{2,4}\s?\d{3,4}[A-Z]?)\s*\(\s*prior to\s+([^)]+?)\s*\)/gi,
    (_whole, rawCode: string, year: string) => {
      const code = normalizeCourseCode(rawCode)
      mergeMeta(meta, code, { priorTo: String(year).trim() })
      return ` ${code} `
    },
  )

  return { rest: rest.replace(/\s+/g, " ").trim(), meta }
}

function tokenize(source: string, meta: QualifierIndex): Token[] {
  const tokens: Token[] = []
  let text = ""
  const flushText = () => {
    const value = text.replace(/\s+/g, " ").trim()
    if (value) tokens.push({ kind: "text", value })
    text = ""
  }

  const pattern = /[A-Z]{2,4}\s?\d{3,4}[A-Z]?/g
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0
    const before = source.slice(cursor, start)
    let offset = 0
    while (offset < before.length) {
      const rest = before.slice(offset)
      const punctuation = rest.match(/^[()[\]]/)
      if (punctuation) {
        flushText()
        tokens.push({
          kind: punctuation[0] === "(" || punctuation[0] === "[" ? "lparen" : "rparen",
        })
        offset += 1
        continue
      }
      const operator = rest.match(/^\s+(AND|OR)\b/)
      const previous = source
        .slice(0, cursor + offset)
        .trimEnd()
        .slice(-1)
      const next = source.slice(start).trimStart()[0]
      if (
        operator &&
        (/[A-Z0-9)]/.test(previous) || previous === "]") &&
        /[A-Z0-9([]/.test(next ?? "")
      ) {
        flushText()
        tokens.push({ kind: operator[1] === "AND" ? "and" : "or" })
        offset += operator[0].length
        continue
      }
      text += rest[0]
      offset += 1
    }
    flushText()
    const code = normalizeCourseCode(match[0])
    const courseMeta = meta.get(code)
    tokens.push(courseMeta ? { kind: "course", code, meta: courseMeta } : { kind: "course", code })
    cursor = start + match[0].length
  }
  for (const character of source.slice(cursor)) {
    if (/[()[\]]/.test(character)) {
      flushText()
      tokens.push({ kind: character === "(" || character === "[" ? "lparen" : "rparen" })
    } else {
      text += character
    }
  }
  flushText()
  return tokens
}

function collapseNode(op: "and" | "or", children: PrereqNode[]): PrereqNode {
  const flat: PrereqNode[] = []
  for (const child of children) {
    if (child.type === op) flat.push(...child.children)
    else if (child.type !== "empty") flat.push(child)
  }
  if (flat.length === 0) return { type: "empty" }
  if (flat.length === 1) return flat[0]
  return { type: op, children: flat }
}

function parseTokens(tokens: Token[]): PrereqNode {
  let index = 0

  const peek = () => tokens[index]
  const take = () => tokens[index++]

  function parseExpression(stopOnRParen = false): PrereqNode {
    const parts: PrereqNode[] = [parseTerm()]
    const ops: Array<"and" | "or"> = []

    while (peek()) {
      if (peek()?.kind === "and" || peek()?.kind === "or") {
        ops.push(take()!.kind as "and" | "or")
        parts.push(parseTerm())
      } else if (peek()?.kind === "rparen" && stopOnRParen) {
        break
      } else {
        ops.push("and")
        parts.push(parseTerm())
      }
    }

    if (ops.length === 0) return parts[0]
    if (ops.every((op) => op === "and")) return collapseNode("and", parts)
    if (ops.every((op) => op === "or")) return collapseNode("or", parts)

    let acc = parts[0]
    for (let i = 0; i < ops.length; i++) {
      acc = collapseNode(ops[i], [acc, parts[i + 1]])
    }
    return acc
  }

  function parseTerm(): PrereqNode {
    const token = peek()
    if (!token) return { type: "empty" }

    if (token.kind === "lparen") {
      take()
      const inner = parseExpression(true)
      if (peek()?.kind === "rparen") take()
      return inner
    }

    if (token.kind === "course") {
      take()
      return token.meta
        ? { type: "course", code: token.code, meta: token.meta }
        : { type: "course", code: token.code }
    }

    if (token.kind === "text") {
      take()
      return { type: "text", value: token.value }
    }

    if (token.kind === "rparen") {
      take()
      return parseTerm()
    }

    take()
    return parseTerm()
  }

  const tree = parseExpression()
  const trailing = tokens.slice(index).filter((token) => token.kind !== "rparen")
  if (trailing.length === 0) return tree
  const text = trailing
    .map((token) =>
      token.kind === "text" ? token.value : token.kind === "course" ? token.code : "",
    )
    .filter(Boolean)
    .join(" ")
  return text ? collapseNode("and", [tree, { type: "text", value: text }]) : tree
}

export function parsePrereq(raw: string | null | undefined): PrereqNode {
  const input = (raw ?? "").replace(/\s+/g, " ").trim()
  if (!input) return { type: "empty" }

  const { rest, meta } = extractQualifiers(input)
  if (!rest) return { type: "empty" }

  const hasCourse = new RegExp(COURSE_CODE_PATTERN.source).test(rest)
  if (!hasCourse) return { type: "text", value: input }

  return parseTokens(tokenize(rest, meta))
}

export function collectCourseCodes(node: PrereqNode, into: string[] = []): string[] {
  if (node.type === "course") into.push(node.code)
  if (node.type === "and" || node.type === "or") {
    for (const child of node.children) collectCourseCodes(child, into)
  }
  return into
}

export function flattenPrereq(node: PrereqNode): FlattenedPrereq {
  if (node.type === "empty") return { and: [], or: [], text: [] }
  if (node.type === "course") return { and: [node.code], or: [], text: [] }
  if (node.type === "text") return { and: [], or: [], text: [node.value] }

  if (node.type === "or") {
    const allCourses = node.children.every((child) => child.type === "course")
    if (allCourses) {
      return {
        and: [],
        or: [node.children.map((child) => (child as { type: "course"; code: string }).code)],
        text: [],
      }
    }
    const or: string[][] = []
    const text: string[] = []
    for (const child of node.children) {
      const flat = flattenPrereq(child)
      const codes = [...flat.and, ...flat.or.flat()]
      if (codes.length > 0) or.push(codes)
      text.push(...flat.text)
    }
    return { and: [], or, text }
  }

  const and: string[] = []
  const or: string[][] = []
  const text: string[] = []
  for (const child of node.children) {
    const flat = flattenPrereq(child)
    and.push(...flat.and)
    or.push(...flat.or)
    text.push(...flat.text)
  }
  return { and, or, text }
}

export function parseInformationalField(raw: string | null | undefined): PrereqNode {
  return parsePrereq(raw)
}
