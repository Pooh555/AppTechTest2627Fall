import { Pressable, TextStyle, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type CourseChipProps = {
  code: string
  disabled?: boolean
  onPress: (code: string) => void
}

export function CourseChip({ code, disabled = false, onPress }: CourseChipProps) {
  const { themed } = useAppTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${code}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(code)}
      style={({ pressed }) => themed([$chip, disabled && $disabled, pressed && $pressed])}
    >
      <Text text={code} size="xs" style={themed($label)} />
    </Pressable>
  )
}

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  minHeight: 44,
  justifyContent: "center",
  paddingHorizontal: spacing.sm,
})

const $disabled: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surfaceMuted,
  opacity: 0.7,
})

const $pressed: ThemedStyle<ViewStyle> = () => ({ opacity: 0.75 })

const $label: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.text,
  fontFamily: typography.primary.medium,
})
