import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { getDatasetMeta } from "@/services/courses/CourseRepository"
import { useAppTheme } from "@/theme/context"
import { themeDefinitions, type ThemeId } from "@/theme/registry"
import type { ThemedStyle } from "@/theme/types"

export function SettingsScreen() {
  const { themed, themeId, setThemeContextOverride } = useAppTheme()
  const meta = getDatasetMeta()
  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={themed($screen)}>
      <Text text="Settings" preset="heading" />
      <Text text="Theme" preset="subheading" style={themed($heading)} />
      <View style={themed($themes)}>
        <ThemeOption
          id="system"
          label="System"
          selected={themeId === "system"}
          onSelect={setThemeContextOverride}
        />
        {themeDefinitions.map((definition) => (
          <ThemeOption
            key={definition.id}
            id={definition.id}
            label={definition.label}
            selected={themeId === definition.id}
            swatch={definition.colors.tint}
            onSelect={setThemeContextOverride}
          />
        ))}
      </View>
      <View style={themed($datasetBlock)}>
        <Text
          text={`Bundled terms: ${meta.terms.map((term) => term.term_name).join(", ")}`}
          size="xs"
          style={themed($helperText)}
        />
        <Text text={`Generated: ${meta.generatedAt}`} size="xs" style={themed($helperText)} />
        <Text
          text={`${meta.courseCount} courses · ${meta.sectionCount} sections`}
          size="xs"
          style={themed($helperText)}
        />
      </View>
    </Screen>
  )
}

function ThemeOption({
  id,
  label,
  selected,
  swatch,
  onSelect,
}: {
  id: ThemeId
  label: string
  selected: boolean
  swatch?: string
  onSelect: (id: ThemeId) => void
}) {
  const { themed } = useAppTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onSelect(id)}
      style={({ pressed }) => themed([$option, selected && $selected, pressed && $pressed])}
    >
      <View style={themed([$radio, selected && $radioSelected])} />
      {swatch ? <View style={themed($swatch(swatch))} /> : null}
      <Text text={label} style={themed($optionText)} />
    </Pressable>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})
const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
})
const $themes: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})
const $option: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.sm,
  minHeight: 48,
  paddingHorizontal: spacing.sm,
})
const $selected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primarySoft,
  borderColor: colors.tint,
})
const $pressed: ThemedStyle<ViewStyle> = () => ({ opacity: 0.75 })
const $radio: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.textDim,
  borderRadius: 999,
  borderWidth: 2,
  height: 20,
  width: 20,
})
const $radioSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
})
const $swatch =
  (color: string): ThemedStyle<ViewStyle> =>
  ({ spacing }) => ({
    backgroundColor: color,
    borderRadius: 999,
    height: spacing.sm,
    width: spacing.sm,
  })
const $optionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})
const $datasetBlock: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  gap: spacing.xxs,
  marginTop: spacing.lg,
  paddingTop: spacing.sm,
})
const $helperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
