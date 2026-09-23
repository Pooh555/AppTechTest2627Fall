import { Pressable, ScrollView, TextStyle, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import type { TermInfo } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type TermSelectorProps = {
  terms: TermInfo[]
  selectedTerm: string | null
  onSelect: (termCode: string) => void
}

export function TermSelector({ terms, selectedTerm, onSelect }: TermSelectorProps) {
  const { themed } = useAppTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={themed($content)}
      testID="term-selector"
    >
      {terms.map((item) => (
        <Pressable
          key={item.termCode}
          testID={`term-${item.termCode}`}
          onPress={() => onSelect(item.termCode)}
          style={({ pressed }) =>
            themed([$chip, item.termCode === selectedTerm && $selected, pressed && $pressed])
          }
        >
          <Text
            text={item.termName.replace(/^\d{4}-\d{2}\s*/, "")}
            size="xxs"
            style={themed($label)}
          />
        </Pressable>
      ))}
    </ScrollView>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surfaceMuted,
  borderRadius: 999,
  minHeight: 44,
  justifyContent: "center",
  paddingHorizontal: spacing.sm,
})

const $selected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primarySoft,
})

const $pressed: ThemedStyle<ViewStyle> = () => ({ opacity: 0.75 })

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})
