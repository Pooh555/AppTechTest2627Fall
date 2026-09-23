import { useCallback, useEffect, useState } from "react"
import { Pressable, TextInput, View, ViewStyle } from "react-native"
import { useSQLiteContext } from "expo-sqlite"
import { useNavigation } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { CourseRow } from "@/components/CourseRow"
import { DepartmentSheet } from "@/components/DepartmentSheet"
import { Screen } from "@/components/Screen"
import {
  AdvancedFilterSheet,
  type AdvancedFilterState,
} from "@/components/search/AdvancedFilterSheet"
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews"
import { TermSelector } from "@/components/TermSelector"
import { Text } from "@/components/Text"
import { useCourseSearch } from "@/hooks/useCourseSearch"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getCourseAttributes, getDepartments, getTerms } from "@/services/courses/CourseRepository"
import type { DepartmentInfo, TermInfo } from "@/services/courses/types"
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
  const [attributes, setAttributes] = useState<string[]>([])
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    terms: [],
    openSeatsOnly: false,
    attributes: [],
  })
  const [sheetVisible, setSheetVisible] = useState(false)
  const [advancedSheetVisible, setAdvancedSheetVisible] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const {
    rows: courses,
    loading,
    error,
    hasMore,
    loadMore,
  } = useCourseSearch(db, {
    query,
    departmentCode: department,
    termCode: term,
    filters: advancedFilters,
    limit: 60,
  })

  useEffect(() => {
    Promise.all([getDepartments(db), getTerms(db), getCourseAttributes(db)])
      .then(([nextDepartments, nextTerms, nextAttributes]) => {
        setDepartments(nextDepartments)
        setTerms(nextTerms)
        setAttributes(nextAttributes)
        setTerm(nextTerms[0]?.termCode ?? null)
      })
      .catch((reason: unknown) =>
        setMetadataError(reason instanceof Error ? reason.message : "Unable to load course data"),
      )
  }, [db])

  const onCoursePress = useCallback(
    (code: string) => navigation.navigate("CourseDetail", { code, termCode: term ?? undefined }),
    [navigation, term],
  )

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
        <AdvancedFilterSheet
          visible={advancedSheetVisible}
          terms={terms}
          attributes={attributes}
          value={advancedFilters}
          onApply={setAdvancedFilters}
          onClose={() => setAdvancedSheetVisible(false)}
        />
        <View style={themed($filters)}>
          <Pressable
            testID="department-filter"
            onPress={() => setSheetVisible(true)}
            style={themed($filter)}
          >
            <Text text={department ?? "All departments"} size="xs" />
          </Pressable>
          <Pressable
            testID="advanced-filter"
            onPress={() => setAdvancedSheetVisible(true)}
            style={themed($filter)}
          >
            <Text
              text={
                advancedFilters.openSeatsOnly ||
                advancedFilters.terms.length > 0 ||
                advancedFilters.attributes.length > 0
                  ? "Filters applied"
                  : "Filters"
              }
              size="xs"
            />
          </Pressable>
          <TermSelector terms={terms} selectedTerm={term} onSelect={setTerm} />
        </View>
      </View>
      {metadataError || error ? (
        <ErrorState
          title={metadataError ? "Unable to load course data" : "Search failed"}
          message={metadataError ?? error ?? undefined}
        />
      ) : null}
      <FlashList
        testID="course-list"
        data={courses}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => <CourseRow course={item} onPress={onCoursePress} />}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loading ? (
            <LoadingState title="Loading courses…" />
          ) : (
            <EmptyState
              title="No courses match these filters"
              message="Try a different search or filter."
            />
          )
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

const $header = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]): ViewStyle => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
})
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
const $placeholder = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.textDim,
})
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
