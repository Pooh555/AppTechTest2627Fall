import { useCallback, useEffect, useState } from "react"
import { Keyboard, Platform, TextInput, View, ViewStyle } from "react-native"
import { useSQLiteContext } from "expo-sqlite"
import { useNavigation } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { CourseRow } from "@/components/CourseRow"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import {
  AdvancedFilterSheet,
  type AdvancedFilterState,
} from "@/components/search/AdvancedFilterSheet"
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews"
import { Text } from "@/components/Text"
import { useCourseSearch } from "@/hooks/useCourseSearch"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getDepartments, getTerms } from "@/services/courses/CourseRepository"
import type { DepartmentInfo, TermInfo } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"

export function BrowseScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<AppStackScreenProps<"Main">["navigation"]>()
  const { themed } = useAppTheme()
  const [query, setQuery] = useState("")
  const [term, setTerm] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentInfo[]>([])
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    terms: [],
    openSeatsOnly: false,
    departments: [],
  })
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
    termCode: term,
    filters: advancedFilters,
    limit: 60,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getDepartments(db), getTerms(db)])
      .then(([nextDepartments, nextTerms]) => {
        if (cancelled) return
        setDepartments(nextDepartments)
        setTerms(nextTerms)
        setTerm(nextTerms[0]?.termCode ?? null)
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setMetadataError(reason instanceof Error ? reason.message : "Unable to load course data")
        }
      })
    return () => {
      cancelled = true
    }
  }, [db])

  const onCoursePress = useCallback(
    (code: string) => navigation.navigate("CourseDetail", { code, termCode: term ?? undefined }),
    [navigation, term],
  )
  // Dismiss the keyboard before the Modal opens: RN's Android Modal swallows KeyEvent
  // ACTION_DOWN but forwards ACTION_UP to the host Activity (facebook/react-native#32827),
  // so a Modal opening while the search TextInput still has focus can leave the Activity's
  // key-dispatch path in an inconsistent state. Blurring first avoids that overlap entirely.
  const openAdvancedFilters = useCallback(() => {
    Keyboard.dismiss()
    setAdvancedSheetVisible(true)
  }, [])
  const renderCourse = useCallback(
    ({ item }: { item: (typeof courses)[number] }) => (
      <CourseRow course={item} onPress={onCoursePress} />
    ),
    [onCoursePress],
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <View style={themed($header)}>
        <Text preset="heading" text="Course explorer" />
        <View style={themed($searchRow)}>
          <TextInput
            testID="course-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search code, title, or description"
            placeholderTextColor={themed($placeholder).color}
            style={themed($search)}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <PressableIcon
            testID="advanced-filter"
            icon="menu"
            size={20}
            accessibilityRole="button"
            accessibilityLabel={
              advancedFilters.openSeatsOnly ||
              advancedFilters.terms.length > 0 ||
              advancedFilters.departments.length > 0
                ? "Advanced filters, applied"
                : "Advanced filters"
            }
            onPress={openAdvancedFilters}
            containerStyle={themed(
              advancedFilters.openSeatsOnly ||
                advancedFilters.terms.length > 0 ||
                advancedFilters.departments.length > 0
                ? [$filterButton, $filterButtonActive]
                : $filterButton,
            )}
          />
        </View>
        <AdvancedFilterSheet
          visible={advancedSheetVisible}
          terms={terms}
          departments={departments}
          value={advancedFilters}
          onApply={setAdvancedFilters}
          onClose={() => setAdvancedSheetVisible(false)}
        />
      </View>
      {metadataError || error ? (
        <ErrorState
          title={metadataError ? "Unable to load course data" : "Search failed"}
          message={metadataError ?? error ?? undefined}
        />
      ) : null}
      <FlashList
        testID="course-list"
        style={Platform.OS === "web" ? $list : undefined}
        data={courses}
        keyExtractor={(item) => item.code}
        renderItem={renderCourse}
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
    </Screen>
  )
}

const $header = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]): ViewStyle => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
})
const $searchRow = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]): ViewStyle => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginTop: spacing.sm,
})
const $search = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.separator,
  borderRadius: 10,
  borderWidth: 1,
  color: colors.text,
  margin: 0,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
})
const $placeholder = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.textDim,
})
// 44x44dp hit target (accessibility minimum), icon centered on both axes so it
// sits vertically centered relative to the search input regardless of font scale.
const $filterButton = ({ colors }: ReturnType<typeof useAppTheme>["theme"]): ViewStyle => ({
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
  borderColor: colors.separator,
  borderRadius: 10,
  borderWidth: 1,
  margin: 0,
})
const $filterButtonActive = ({ colors }: ReturnType<typeof useAppTheme>["theme"]): ViewStyle => ({
  borderColor: colors.tint,
  backgroundColor: colors.primarySoft,
})
const $list: ViewStyle = {
  flex: 1,
  minHeight: 0,
}