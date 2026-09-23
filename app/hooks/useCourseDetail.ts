import { useEffect, useState } from "react"
import type { SQLiteDatabase } from "expo-sqlite"

import { getCourseDetail, getSections } from "@/services/courses/CourseRepository"
import type { CourseDetail, CourseSection } from "@/services/courses/types"

export function useCourseDetail(
  db: SQLiteDatabase,
  code: string,
  termCode?: string,
): {
  course: CourseDetail | null
  sections: CourseSection[]
  loading: boolean
  error: string | null
} {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [sections, setSections] = useState<CourseSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCourseDetail(db, code, termCode)
      .then((detail) => {
        if (cancelled) return
        if (!detail) {
          setCourse(null)
          setSections([])
          setError("Course not found")
          return
        }
        setCourse(detail)
        return getSections(db, code, termCode ?? detail.canonicalTermCode).then((nextSections) => {
          if (!cancelled) setSections(nextSections)
        })
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load course")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, db, termCode])

  return { course, sections, loading, error }
}
