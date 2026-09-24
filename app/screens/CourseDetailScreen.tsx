import { useState } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { useSQLiteContext } from "expo-sqlite"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { CollapsibleSection } from "@/components/CollapsibleSection"
import { UnlockList } from "@/components/prereq/UnlockList"
import { PrereqPreview } from "@/components/PrereqPreview"
import { Screen } from "@/components/Screen"
import { SectionCard } from "@/components/SectionCard"
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews"
import { Text } from "@/components/Text"
import { useFavourites } from "@/context/FavouritesContext"
import { useCourseDetail } from "@/hooks/useCourseDetail"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getUnlockedCourses } from "@/services/courses/prereqGraph"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function CourseDetailScreen() {
  const db = useSQLiteContext()
  const route = useRoute<AppStackScreenProps<"CourseDetail">["route"]>()
  const navigation = useNavigation<AppStackScreenProps<"CourseDetail">["navigation"]>()
  const { themed } = useAppTheme()
  const [sectionsExpanded, setSectionsExpanded] = useState(false)
  const { hasFavourite, toggleFavourite } = useFavourites()
  const { course, sections, loading, error } = useCourseDetail(
    db,
    route.params.code,
    route.params.termCode,
  )

  if (loading)
    return (
      <Screen preset="fixed">
        <LoadingState title="Loading course…" />
      </Screen>
    )
  if (error || !course)
    return (
      <Screen preset="fixed">
        <ErrorState
          title={error ?? "Course not found"}
          action={{ label: "Go back", onPress: navigation.goBack }}
        />
      </Screen>
    )
  const unlockedCourses = getUnlockedCourses(course.code)
  const sectionRows = sections

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <FlashList
        data={sectionsExpanded ? sectionRows : []}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={themed($content)}>
            <View style={themed($titleRow)}>
              <View style={themed($title)}>
                <Text text={course.code} preset="heading" />
                <Text text={course.title} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasFavourite(course.code)
                    ? `Remove ${course.code} from favorites`
                    : `Add ${course.code} to favorites`
                }
                onPress={() => toggleFavourite(course.code)}
                style={themed($favourite)}
              >
                <Ionicons
                  name={hasFavourite(course.code) ? "heart" : "heart-outline"}
                  size={28}
                  color={themed($favourite).color}
                />
              </Pressable>
            </View>
            <Text
              text={`${course.vectorDisplay || "Credits unavailable"} · ${course.departmentNickname}`}
              size="xs"
              style={themed($muted)}
            />
            {!!course.description && <Text text={course.description} style={themed($section)} />}
            {!!course.cilos.length && (
              <CollapsibleSection title="CILOs" testID="course-cilos">
                <Text
                  text={course.cilos.map((item) => `• ${item.description}`).join("\n")}
                  style={themed($section)}
                />
              </CollapsibleSection>
            )}
            <CollapsibleSection title="Prerequisites" testID="course-prerequisites">
              <PrereqPreview
                node={course.prereqTree}
                onOpenCourse={(code) =>
                  navigation.push("CourseDetail", { code, termCode: route.params.termCode })
                }
              />
              <Pressable
                testID="open-prereq-explorer"
                onPress={() => navigation.navigate("PrerequisiteExplorer", { code: course.code })}
                style={themed($button)}
              >
                <Text text="Open full prerequisite explorer" />
              </Pressable>
              {!!course.corequisite && (
                <Text text={`Corequisites: ${course.corequisite}`} style={themed($section)} />
              )}
              {!!course.exclusion && (
                <Text text={`Exclusions: ${course.exclusion}`} style={themed($section)} />
              )}
            </CollapsibleSection>
            <CollapsibleSection title="Unlocks" testID="course-unlocks">
              {unlockedCourses.length > 0 ? (
                <UnlockList
                  codes={unlockedCourses.slice(0, 5)}
                  onOpen={(code) =>
                    navigation.push("CourseDetail", { code, termCode: route.params.termCode })
                  }
                />
              ) : (
                <Text text="No courses listed." size="xs" style={themed($muted)} />
              )}
              <Pressable
                testID="open-unlock-explorer"
                onPress={() =>
                  navigation.navigate("PrerequisiteExplorer", { code: course.code, mode: "unlocks" })
                }
                style={themed($button)}
              >
                <Text text="Open full prerequisite explorer" />
              </Pressable>
            </CollapsibleSection>
            <CollapsibleSection
              title="Sections"
              testID="course-sections"
              onExpandedChange={setSectionsExpanded}
            >
              {sectionRows.length === 0 ? <EmptyState title="No sections for this term" /> : null}
            </CollapsibleSection>
          </View>
        }
        renderItem={({ item }) => <SectionCard section={item} />}
        ItemSeparatorComponent={null}
        ListEmptyComponent={null}
      />
    </Screen>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $titleRow = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  flexDirection: "row" as const,
  gap: spacing.sm,
})
const $favourite = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  padding: spacing.xs,
  color: colors.tint,
})
const $title: ThemedStyle<ViewStyle> = () => ({ flex: 1 })
const $muted = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})
const $section = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  marginTop: spacing.md,
})
const $button = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  backgroundColor: colors.palette.neutral300,
  borderRadius: 8,
  marginTop: spacing.sm,
  padding: spacing.sm,
})