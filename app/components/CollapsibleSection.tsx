import { useState } from "react"
import { LayoutAnimation, Platform, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

type CollapsibleSectionProps = {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  testID?: string
  onExpandedChange?: (expanded: boolean) => void
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  testID,
  onExpandedChange,
}: CollapsibleSectionProps) {
  const { themed } = useAppTheme()
  const [expanded, setExpanded] = useState(defaultExpanded)

  const toggle = () => {
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const next = !expanded
    setExpanded(next)
    onExpandedChange?.(next)
  }

  return (
    <View style={themed($container)} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={themed($header)}
      >
        <Text text={title} preset="subheading" />
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={themed($icon).color}
        />
      </Pressable>
      {expanded ? <View style={themed($body)}>{children}</View> : null}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderBottomColor: colors.separator,
  borderBottomWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 44,
  paddingVertical: spacing.xs,
})

const $body: ThemedStyle<ViewStyle> = () => ({
  alignItems: "stretch",
})

const $icon: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
