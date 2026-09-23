import { useEffect, useState } from "react"
import { Pressable, TextInput, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"
import { useSQLiteContext } from "expo-sqlite"

import { CourseRow } from "@/components/CourseRow"
import { DepartmentSheet } from "@/components/DepartmentSheet"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { searchCourses, getDepartments, getTerms } from "@/services/courses/CourseRepository"
import type { CourseSummary, DepartmentInfo, TermInfo } from "@/services/courses/types"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

export function BrowseScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<AppStackScreenProps<"Main">["navigation"]>()
  const { themed } = useAppTheme()
  const [query, setQuery] = useState("")
  const [department, setDepartment] = useState<string | null>(null)
  const [term, setTerm] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentInfo[]>([])
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  useEffect(() => {
    Promise.all([getDepartments(db), getTerms(db)])
      .then(([nextDepartments, nextTerms]) => {
        setDepartments(nextDepartments)
        setTerms(nextTerms)
        setTerm(nextTerms[0]?.termCode ?? null)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load course data"))
  }, [db])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      searchCourses(db, { query, departmentCode: department, termCode: term })
        .then((result) => {
          if (!cancelled) setCourses(result)
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Search failed")
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [db, department, query, term])

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <View style={themed($header)}>
        <Text preset="heading" text="Course explorer" />
        <TextInput
          testID="course-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search code, title, or description"
          placeholderTextColor={themed($placeholder).color}
          style={themed($search)}
          autoCorrect={false}
        />
        <View style={themed($filters)}>
          <Pressable testID="department-filter" onPress={() => setSheetVisible(true)} style={themed($filter)}>
            <Text text={department ?? "All departments"} size="xs" />
          </Pressable>
          {terms.map((item) => (
            <Pressable
              key={item.termCode}
              testID={`term-${item.termCode}`}
              onPress={() => setTerm(item.termCode)}
              style={[themed($chip), item.termCode === term ? themed($selected) : undefined]}
            >
              <Text text={item.termName.replace(/^\d{4}-\d{2}\s*/, "")} size="xxs" />
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text text={`Course data error: ${error}`} style={themed($error)} /> : null}
      <FlashList
        testID="course-list"
        data={courses}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <CourseRow
            course={item}
            onPress={(code) => navigation.navigate("CourseDetail", { code, termCode: term ?? undefined })}
          />
        )}
        ListEmptyComponent={
          <Text
            text={loading ? "Loading courses…" : "No courses match these filters."}
            style={themed($empty)}
          />
        }
      />
      <DepartmentSheet
        visible={sheetVisible}
        departments={departments}
        selectedCode={department}
        onSelect={setDepartment}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  )
}

const $header: ViewStyle = { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }
const $search = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.separator,
  borderRadius: 10,
  borderWidth: 1,
  color: colors.text,
  marginTop: spacing.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})
const $placeholder = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({ color: colors.textDim })
const $filters = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.xs,
  marginTop: spacing.sm,
})
const $filter = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  borderColor: colors.separator,
  borderRadius: 999,
  borderWidth: 1,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})
const $chip = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  backgroundColor: colors.palette.neutral300,
  borderRadius: 999,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})
const $selected = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({ backgroundColor: colors.tint })
const $empty = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.textDim,
  padding: spacing.lg,
})
const $error = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.error,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
})
