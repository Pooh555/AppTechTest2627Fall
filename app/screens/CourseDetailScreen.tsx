/* eslint-disable react-native/no-inline-styles */
import { useEffect, useState } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { useSQLiteContext } from "expo-sqlite"
import { useNavigation, useRoute } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { PrereqPreview } from "@/components/PrereqPreview"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useFavourites } from "@/context/FavouritesContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getCourseDetail, getSections } from "@/services/courses/CourseRepository"
import type { CourseDetail, CourseSection } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"

export function CourseDetailScreen() {
  const db = useSQLiteContext()
  const route = useRoute<AppStackScreenProps<"CourseDetail">["route"]>()
  const navigation = useNavigation<AppStackScreenProps<"CourseDetail">["navigation"]>()
  const { themed } = useAppTheme()
  const { hasFavourite, toggleFavourite } = useFavourites()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [sections, setSections] = useState<CourseSection[]>([])

  useEffect(() => {
    let cancelled = false
    getCourseDetail(db, route.params.code, route.params.termCode).then((detail) => {
      if (!detail || cancelled) return
      setCourse(detail)
      getSections(db, route.params.code, route.params.termCode ?? detail.canonicalTermCode).then(
        (nextSections) => {
          if (!cancelled) setSections(nextSections)
        },
      )
    })
    return () => {
      cancelled = true
    }
  }, [db, route.params.code, route.params.termCode])

  if (!course)
    return (
      <Screen preset="fixed">
        <Text text="Loading course…" />
      </Screen>
    )
  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <FlashList
        data={sections}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={themed($content)}>
            <View style={themed($titleRow)}>
              <View style={{ flex: 1 }}>
                <Text text={course.code} preset="heading" />
                <Text text={course.title} />
              </View>
              <Pressable onPress={() => toggleFavourite(course.code)} style={themed($favourite)}>
                <Text text={hasFavourite(course.code) ? "★" : "☆"} size="xl" />
              </Pressable>
            </View>
            <Text
              text={`${course.vectorDisplay || "Credits unavailable"} · ${course.departmentNickname}`}
              size="xs"
              style={themed($muted)}
            />
            {!!course.description && <Text text={course.description} style={themed($section)} />}
            {!!course.cilos.length && (
              <Text
                text={`CILOs\n${course.cilos.map((item) => `• ${item.description}`).join("\n")}`}
                style={themed($section)}
              />
            )}
            <Text text="Prerequisites" preset="subheading" />
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
            <Text text="Sections" preset="subheading" style={themed($section)} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={themed($sectionRow)}>
            <Text text={`${item.type} ${item.section}`} weight="medium" />
            <Text
              text={`${item.enroll}/${item.capacity} enrolled · wait ${item.wait} · ${item.open ? "Open" : "Closed"}`}
              size="xs"
              style={themed($muted)}
            />
            {item.schedules.map((slot, index) => (
              <Text
                key={index}
                text={`${slot.weekday ?? ""} ${slot.time_from ?? ""}-${slot.time_to ?? ""} ${slot.venue_name ?? slot.venue ?? ""}`}
                size="xs"
              />
            ))}
          </View>
        )}
        ListEmptyComponent={<Text text="No sections for this term." style={themed($muted)} />}
      />
    </Screen>
  )
}

const $content: ViewStyle = { padding: 16 }
const $titleRow = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  flexDirection: "row" as const,
  gap: spacing.sm,
})
const $favourite = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({
  padding: 4,
  color: colors.tint,
})
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
const $sectionRow = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  padding: spacing.md,
})
