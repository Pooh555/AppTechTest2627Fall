import { memo } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { formatCredits } from "@/lib/formatCredits"
import type { CourseSummary } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { SeatStatusPill } from "./SeatStatusPill"
import { Text } from "./Text"

export type CourseRowProps = {
  course: CourseSummary
  onPress: (code: string) => void
  action?: {
    label: string
    onPress: (code: string) => void
    icon: "heart" | "heart-outline"
  }
}

export const CourseRow = memo(function CourseRow({ course, onPress, action }: CourseRowProps) {
  const { themed } = useAppTheme()
  return (
    <Pressable
      accessibilityRole="button"
      testID={`course-row-${course.code.replace(/\s+/g, "-")}`}
      onPress={() => onPress(course.code)}
      style={themed($row)}
    >
      <View style={themed($top)}>
        <Text text={course.code} style={themed($code)} />
        <View style={themed($topActions)}>
          <SeatStatusPill status={course.seatStatus} />
          {action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={4}
              onPress={() => action.onPress(course.code)}
              style={themed($action)}
            >
              <Ionicons name={action.icon} size={22} color={themed($actionText).color} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text text={course.title} numberOfLines={2} style={themed($title)} />
      <Text
        text={[formatCredits(course.minCredits, course.maxCredits), course.departmentNickname]
          .filter(Boolean)
          .join(" · ")}
        size="xs"
        style={themed($meta)}
      />
    </Pressable>
  )
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  backgroundColor: colors.background,
})

const $top: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
})
const $topActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.xs,
})
const $action: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 44,
  padding: spacing.xxs,
})
const $actionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $code: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.code?.normal,
  color: colors.text,
  fontSize: 16,
})

const $title: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  marginTop: spacing.xxs,
})

const $meta: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xxs,
})
