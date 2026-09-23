import { TextStyle, View, ViewStyle } from "react-native"

import type { SeatStatus } from "@/lib/seatStatus"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

const LABELS: Record<SeatStatus, string> = {
  "open": "Open",
  "near-full": "Near full",
  "full": "Full",
  "unknown": "No seats data",
  "n/a": "N/A",
}

export function SeatStatusPill({ status }: { status: SeatStatus }) {
  const { themed } = useAppTheme()
  return (
    <View testID={`seat-pill-${status}`} style={themed([$pill, $tone[status]])}>
      <Text text={LABELS[status]} size="xxs" style={themed($label)} />
    </View>
  )
}

const $pill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxxs,
  borderRadius: 999,
})

const $label: ThemedStyle<TextStyle> = () => ({
  color: "#ffffff",
  fontWeight: "600",
})

const $tone: Record<SeatStatus, ThemedStyle<ViewStyle>> = {
  "open": ({ colors }) => ({ backgroundColor: colors.successBackground }),
  "near-full": ({ colors }) => ({ backgroundColor: colors.warningBackground }),
  "full": ({ colors }) => ({ backgroundColor: colors.dangerBackground }),
  "n/a": ({ colors }) => ({ backgroundColor: colors.surfaceMuted }),
  "unknown": ({ colors }) => ({ backgroundColor: colors.palette.neutral500 }),
}
