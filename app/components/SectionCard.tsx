import { View, ViewStyle, TextStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import type { CourseSection } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

type Tone = "success" | "warning" | "danger" | "neutral"

type SeatState = {
  label: string
  tone: Tone
}

function seatState(section: CourseSection): SeatState {
  if (section.wait > 0) return { label: `Waitlist · ${section.wait}`, tone: "warning" }
  if (!section.open) return { label: "Closed", tone: "danger" }
  if (section.capacity > 0 && section.enroll >= section.capacity) return { label: "Full", tone: "neutral" }
  return { label: "Open", tone: "success" }
}

function scheduleLabel(slot: CourseSection["schedules"][number]): string {
  return [slot.weekday, slot.time_from && slot.time_to ? `${slot.time_from} – ${slot.time_to}` : null]
    .filter(Boolean)
    .join("  ·  ")
}

export function SectionCard({ section }: { section: CourseSection }) {
  const { themed, theme } = useAppTheme()
  const state = seatState(section)
  const available = Math.max(section.capacity - section.enroll, 0)
  const fillRatio = section.capacity > 0 ? Math.min(section.enroll / section.capacity, 1) : 0
  const venues = Array.from(
    new Set(section.schedules.map((slot) => slot.venue_name || slot.venue).filter(Boolean)),
  ) as string[]
  const instructors = Array.from(
    new Set(section.schedules.flatMap((slot) => slot.instructors ?? [])),
  )

  return (
    <View testID={`section-card-${section.section}`} style={themed($card)}>
      <View style={themed($header)}>
        <View style={themed($titleGroup)}>
          <View style={themed($typeBadge)}>
            <Text text={section.type} size="xxs" weight="bold" style={themed($typeBadgeText)} />
          </View>
          <Text text={section.section} weight="semiBold" />
          <Text text={`#${section.number}`} size="xxs" style={themed($muted)} />
        </View>
        <View style={themed([$statusPill, $toneBg(state.tone)])}>
          <Text text={state.label} size="xxs" weight="medium" style={themed($toneText(state.tone))} />
        </View>
      </View>

      {(section.schedules.length > 0 || venues.length > 0 || instructors.length > 0) && (
        <View style={themed($meta)}>
          {section.schedules.map((slot, index) => {
            const label = scheduleLabel(slot)
            return label ? (
              <View key={index} style={themed($metaRow)}>
                <Ionicons name="time-outline" size={13} color={theme.colors.textDim} />
                <Text text={label} size="xs" style={themed($metaText)} />
              </View>
            ) : null
          })}
          {venues.map((venue) => (
            <View key={venue} style={themed($metaRow)}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textDim} />
              <Text text={venue} size="xs" style={themed($metaText)} />
            </View>
          ))}
          {instructors.length > 0 && (
            <View style={themed($metaRow)}>
              <Ionicons name="person-outline" size={13} color={theme.colors.textDim} />
              <Text text={instructors.join(", ")} size="xs" style={themed($metaText)} />
            </View>
          )}
        </View>
      )}

      <View style={themed($seatBlock)}>
        <View style={themed($seatBarTrack)}>
          <View
            style={themed([$seatBarFill, $toneBg(state.tone), { width: `${fillRatio * 100}%` }])}
          />
        </View>
        <View style={themed($seatStatsRow)}>
          <Text text={`${section.enroll} / ${section.capacity} enrolled`} size="xxs" style={themed($muted)} />
          <Text
            text={available > 0 ? `${available} seat${available === 1 ? "" : "s"} left` : state.label}
            size="xxs"
            weight="medium"
            style={themed($toneText(state.tone))}
          />
        </View>
      </View>
    </View>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderColor: colors.separator,
  borderWidth: 1,
  borderRadius: 14,
  marginHorizontal: spacing.md,
  marginTop: spacing.sm,
  padding: spacing.sm,
  gap: spacing.xs,
})

const $header: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $titleGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  flexShrink: 1,
})

const $typeBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primarySoft,
  borderRadius: 6,
  paddingHorizontal: spacing.xxs,
  paddingVertical: 2,
})

const $typeBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  letterSpacing: 0.5,
})

const $statusPill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderRadius: 999,
  paddingHorizontal: spacing.xs,
  paddingVertical: 3,
})

const $meta: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  gap: spacing.xxxs,
  paddingTop: spacing.xxs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $metaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $muted: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $seatBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxxs,
})

const $seatBarTrack: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surfaceMuted,
  borderRadius: 999,
  height: 6,
  overflow: "hidden",
})

const $seatBarFill: ThemedStyle<ViewStyle> = () => ({
  height: "100%",
  borderRadius: 999,
})

const $seatStatsRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $toneBg =
  (tone: Tone): ThemedStyle<ViewStyle> =>
  ({ colors }) => ({
    backgroundColor: {
      success: colors.successBackground,
      warning: colors.warningBackground,
      danger: colors.dangerBackground,
      neutral: colors.surfaceMuted,
    }[tone],
  })

const $toneText =
  (tone: Tone): ThemedStyle<TextStyle> =>
  ({ colors }) => ({
    color: {
      success: colors.success,
      warning: colors.warning,
      danger: colors.error,
      neutral: colors.textDim,
    }[tone],
  })