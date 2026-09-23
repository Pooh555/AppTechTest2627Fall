import { useCallback, useEffect, useReducer, useRef } from "react"
import type { SQLiteDatabase } from "expo-sqlite"

import { searchCourses } from "@/services/courses/CourseRepository"
import type { CourseSummary, SearchCoursesParams } from "@/services/courses/types"

type State = {
  rows: CourseSummary[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
}

type Action =
  | { type: "start" }
  | { type: "startMore" }
  | { type: "success"; rows: CourseSummary[]; hasMore: boolean }
  | { type: "append"; rows: CourseSummary[]; hasMore: boolean }
  | { type: "error"; message: string }

const initialState: State = {
  rows: [],
  loading: true,
  loadingMore: false,
  hasMore: false,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...state, loading: true, error: null }
    case "startMore":
      return { ...state, loadingMore: true, error: null }
    case "success":
      return { ...state, rows: action.rows, hasMore: action.hasMore, loading: false, error: null }
    case "append":
      return {
        ...state,
        rows: [...state.rows, ...action.rows],
        hasMore: action.hasMore,
        loadingMore: false,
      }
    case "error":
      return { ...state, loading: false, loadingMore: false, error: action.message }
  }
}

export function useCourseSearch(db: SQLiteDatabase, params: SearchCoursesParams) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const requestId = useRef(0)
  const { departmentCode, query, termCode, limit, codes, filters } = params
  const codesKey = codes?.join("\0")
  const filtersKey = JSON.stringify(filters ?? {})

  useEffect(() => {
    if (!termCode) return
    const id = ++requestId.current
    const timer = setTimeout(() => {
      dispatch({ type: "start" })
      searchCourses(db, {
        query,
        departmentCode,
        termCode,
        filters,
        codes,
        offset: 0,
        limit: limit ?? 60,
      })
        .then((result) => {
          if (id === requestId.current) {
            dispatch({ type: "success", rows: result.rows, hasMore: result.hasMore })
          }
        })
        .catch((reason: unknown) => {
          if (id === requestId.current) {
            dispatch({
              type: "error",
              message: reason instanceof Error ? reason.message : "Search failed",
            })
          }
        })
    }, 120)
    return () => clearTimeout(timer)
  }, [codes, codesKey, db, departmentCode, filters, filtersKey, limit, query, termCode])

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading || state.loadingMore) return
    const id = ++requestId.current
    dispatch({ type: "startMore" })
    searchCourses(db, {
      query,
      departmentCode,
      termCode,
      filters,
      codes,
      offset: state.rows.length,
      limit: limit ?? 60,
    })
      .then((result) => {
        if (id === requestId.current) {
          dispatch({ type: "append", rows: result.rows, hasMore: result.hasMore })
        }
      })
      .catch((reason: unknown) => {
        if (id === requestId.current) {
          dispatch({
            type: "error",
            message: reason instanceof Error ? reason.message : "Unable to load more courses",
          })
        }
      })
  }, [
    db,
    departmentCode,
    codes,
    limit,
    query,
    termCode,
    filters,
    state.hasMore,
    state.loading,
    state.loadingMore,
    state.rows.length,
  ])

  return { ...state, loadMore }
}
