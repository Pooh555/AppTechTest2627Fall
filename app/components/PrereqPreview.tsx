import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import type { PrereqNode } from "@/lib/parsePrereq"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

type PrereqPreviewProps = {
  node: PrereqNode
  onOpenCourse?: (code: string) => void
}

export function PrereqPreview({ node, onOpenCourse }: PrereqPreviewProps) {
  const { themed } = useAppTheme()
  if (node.type === "empty") {
    return <Text text="No prerequisite" size="xs" />
  }
  return <View style={themed($wrap)}>{renderNode(node, onOpenCourse, themed)}</View>
}

function renderNode(
  node: PrereqNode,
  onOpenCourse: ((code: string) => void) | undefined,
  themed: ReturnType<typeof useAppTheme>["themed"],
): React.ReactNode {
  if (node.type === "empty") return null
  if (node.type === "text") {
    return <Text key={node.value} text={node.value} size="xs" style={themed($text)} />
  }
  if (node.type === "course") {
    const meta = [
      node.meta?.grade ? `grade ${node.meta.grade}` : null,
      node.meta?.priorTo ? `prior to ${node.meta.priorTo}` : null,
    ]
      .filter(Boolean)
      .join(", ")
    return (
      <Pressable
        key={node.code}
        testID={`prereq-chip-${node.code.replace(/\s+/g, "-")}`}
        onPress={() => onOpenCourse?.(node.code)}
        style={themed($chip)}
      >
        <Text text={node.code} size="xs" style={themed($chipText)} />
        {!!meta && <Text text={meta} size="xxs" style={themed($meta)} />}
      </Pressable>
    )
  }

  return (
    <View key={node.type} style={themed($group)}>
      {node.children.map((child, index) => (
        <View key={index} style={themed($groupRow)}>
          {index > 0 && (
            <Text text={node.type.toUpperCase()} size="xxs" weight="medium" style={themed($op)} />
          )}
          {renderNode(child, onOpenCourse, themed)}
        </View>
      ))}
    </View>
  )
}

const $wrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $group: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  gap: spacing.xxs,
  paddingLeft: spacing.xs,
  borderLeftWidth: 2,
  borderLeftColor: colors.separator,
})

const $groupRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.xs,
})

const $chip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral300,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxxs,
  borderRadius: 8,
})

const $chipText: ThemedStyle<TextStyle> = ({ typography, colors }) => ({
  fontFamily: typography.code?.normal,
  color: colors.text,
})

const $meta: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $op: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontStyle: "italic",
})
