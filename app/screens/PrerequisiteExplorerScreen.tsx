import { useMemo, useState } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"

import { PrerequisiteTree } from "@/components/prereq/PrerequisiteTree"
import { UnlockList } from "@/components/prereq/UnlockList"
import { Screen } from "@/components/Screen"
import { EmptyState } from "@/components/StateViews"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getPrerequisites, getUnlockedCourses } from "@/services/courses/prereqGraph"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function PrerequisiteExplorerScreen() {
  const route = useRoute<AppStackScreenProps<"PrerequisiteExplorer">["route"]>()
  const navigation = useNavigation<AppStackScreenProps<"PrerequisiteExplorer">["navigation"]>()
  const { themed } = useAppTheme()
  const [mode, setMode] = useState<"requires" | "unlocks">(route.params.mode ?? "requires")
  const tree = useMemo(() => getPrerequisites(route.params.code), [route.params.code])
  const unlocks = useMemo(() => getUnlockedCourses(route.params.code), [route.params.code])

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={themed($screen)}>
      <Text text={route.params.code} preset="heading" />
      <View style={themed($segments)}>
        <ModeButton
          label="Requires"
          selected={mode === "requires"}
          onPress={() => setMode("requires")}
        />
        <ModeButton
          label="Unlocks"
          selected={mode === "unlocks"}
          onPress={() => setMode("unlocks")}
        />
      </View>
      {mode === "requires" ? (
        tree.type === "empty" ? (
          <EmptyState title="No prerequisites" />
        ) : (
          <PrerequisiteTree
            tree={tree}
            onOpen={(code) => navigation.push("CourseDetail", { code })}
          />
        )
      ) : unlocks.length === 0 ? (
        <EmptyState title="Not a prerequisite for any course" />
      ) : (
        <UnlockList codes={unlocks} onOpen={(code) => navigation.push("CourseDetail", { code })} />
      )}
    </Screen>
  )
}

function ModeButton({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const { themed } = useAppTheme()
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => themed([$segment, selected && $selected, pressed && $pressed])}
    >
      <Text text={label} size="xs" />
    </Pressable>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $segments: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  marginVertical: spacing.sm,
})
const $segment: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  minHeight: 44,
  justifyContent: "center",
  paddingHorizontal: spacing.sm,
})
const $selected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primarySoft,
  borderColor: colors.primary,
})
const $pressed: ThemedStyle<ViewStyle> = () => ({ opacity: 0.75 })
