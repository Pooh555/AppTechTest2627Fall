export type SearchIntent =
  | { kind: "CODE_PREFIX"; prefix: string }
  | { kind: "CODE_PARTIAL"; prefix: string; number: string; suffix: string }
  | { kind: "TEXT"; value: string }

const CODE_PARTIAL = /^([a-z]{1,4})\s?(\d{1,4})([a-z]?)$/i

/** Classifies user input before SQL is generated so code searches never query prose. */
export function classifyQuery(raw: string, prefixes: ReadonlySet<string>): SearchIntent {
  const value = raw.trim()
  const letters = /^[a-z]{1,4}$/i.exec(value)
  if (letters && prefixes.has(value.toUpperCase())) {
    return { kind: "CODE_PREFIX", prefix: value.toUpperCase() }
  }
  const partial = CODE_PARTIAL.exec(value)
  if (partial && prefixes.has(partial[1].toUpperCase())) {
    return {
      kind: "CODE_PARTIAL",
      prefix: partial[1].toUpperCase(),
      number: partial[2],
      suffix: partial[3].toUpperCase(),
    }
  }
  return { kind: "TEXT", value }
}

export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

export type SearchFilters = {
  termCode?: string | null
  terms?: string[]
  departmentCode?: string | null
  departments?: string[]
  codes?: string[]
  openSeatsOnly?: boolean
  limit: number
  offset: number
}

export type CourseFilters = {
  terms?: string[]
  openSeatsOnly?: boolean
  departments?: string[]
}

export type SearchPlan = {
  sql: string
  args: Array<string | number>
}

/** Builds the deterministic course-list query for one classified search intent. */
export function buildSearchPlan(intent: SearchIntent, filters: SearchFilters): SearchPlan {
  const clauses: string[] = []
  const args: Array<string | number> = []
  const orderArgs: string[] = []
  let from = "FROM courses c"
  let order = "c.prefix, c.number, c.code"

  if (intent.kind === "CODE_PREFIX") {
    clauses.push("c.prefix = ?")
    args.push(intent.prefix)
  } else if (intent.kind === "CODE_PARTIAL") {
    clauses.push("c.code_compact LIKE ? ESCAPE '\\'")
    args.push(`${intent.prefix}${intent.number}${intent.suffix}%`)
  } else if (intent.value) {
    const tokens = intent.value
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (tokens.length > 0) {
      from += " JOIN courses_fts ON courses_fts.rowid = c.rowid"
      clauses.push("courses_fts MATCH ?")
      args.push(tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(" AND "))
      order =
        "CASE WHEN UPPER(c.code) = UPPER(?) THEN 0 WHEN UPPER(c.title) LIKE UPPER(?) ESCAPE '\\' THEN 1 WHEN UPPER(c.title) LIKE UPPER(?) ESCAPE '\\' THEN 2 ELSE 3 END, bm25(courses_fts, 10, 5, 1), c.code"
      orderArgs.push(intent.value, `${escapeLike(intent.value)}%`, `%${escapeLike(intent.value)}%`)
    }
  }

  // Only scope by term when the user explicitly picked one via the Terms filter.
  // `filters.termCode` is the screen's ambient "current term" (used for seat-status
  // lookups elsewhere) and must not silently restrict results when no filter is applied,
  // or courses with no section in that term vanish even though nothing looks filtered.
  const terms = filters.terms?.length ? filters.terms : []
  if (terms.length > 0) {
    // Filter against `sections` (the real per-term schedule), not `course_terms` (the
    // catalog's nominal offering list). A course can be catalogued for a term without
    // ever having a scheduled section that term; course_terms doesn't distinguish that,
    // so it let stale/nominal terms leak through and term chips appeared to do nothing.
    clauses.push(
      `c.code IN (SELECT DISTINCT s.course_code FROM sections s WHERE s.term_code IN (${terms.map(() => "?").join(",")}))`,
    )
    args.push(...terms)
  }
  if (filters.departmentCode) {
    clauses.push("c.department_code = ?")
    args.push(filters.departmentCode)
  }
  if (filters.departments?.length) {
    clauses.push(`c.department_code IN (${filters.departments.map(() => "?").join(",")})`)
    args.push(...filters.departments)
  }
  if (filters.codes && filters.codes.length > 0) {
    clauses.push(`c.code IN (${filters.codes.map(() => "?").join(",")})`)
    args.push(...filters.codes)
  }
  if (filters.openSeatsOnly) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM course_seat_status ss
        WHERE ss.course_code = c.code
          AND ss.open_seats > 0
          ${terms.length > 0 ? `AND ss.term_code IN (${terms.map(() => "?").join(",")})` : ""}
      )`,
    )
    if (terms.length > 0) args.push(...terms)
  }
  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : ""
  return {
    sql: `SELECT c.code, c.prefix, c.number, c.title, c.min_credits, c.max_credits,
      c.department_code, c.department_nickname ${from}${where}
      ORDER BY ${order} LIMIT ? OFFSET ?`,
    args: [...args, ...orderArgs, filters.limit + 1, filters.offset],
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&")
}