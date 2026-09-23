import { useState } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import type { PrereqNode } from "@/lib/parsePrereq"
import { getPrerequisites, courseExists } from "@/services/courses/prereqGraph"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { CourseChip } from "./CourseChip"

type PrerequisiteTreeProps = {
  tree: PrereqNode
  onOpen: (code: string) => void
}

export function PrerequisiteTree({ tree, onOpen }: PrerequisiteTreeProps) {
  return <TreeRow node={tree} ancestors={new Set()} depth={0} onOpen={onOpen} />
}

function TreeRow({
  node,
  ancestors,
  depth,
  onOpen,
}: {
  node: PrereqNode
  ancestors: ReadonlySet<string>
  depth: number
  onOpen: (code: string) => void
}) {
  const { themed } = useAppTheme()
  const [expanded, setExpanded] = useState(depth === 0)
  if (node.type === "empty") return null
  if (node.type === "text") {
    return <Text text={node.value} size="xs" style={themed($text)} />
  }
  if (node.type === "and" || node.type === "or") {
    return (
      <View style={themed($group)}>
        <Text
          text={node.type === "and" ? "All of" : "One of"}
          size="xs"
          style={themed($groupLabel)}
        />
        {node.children.map((child, index) => (
          <TreeRow
            key={`${node.type}-${index}`}
            node={child}
            ancestors={ancestors}
            depth={depth}
            onOpen={onOpen}
          />
        ))}
      </View>
    )
  }

  if (ancestors.has(node.code)) {
    return <Text text={`${node.code} · cycle`} size="xs" style={themed($text)} />
  }
  if (depth >= 8) {
    return <Text text={`${node.code} · depth limit`} size="xs" style={themed($text)} />
  }

  const nextAncestors = new Set(ancestors)
  nextAncestors.add(node.code)
  const childTree = getPrerequisites(node.code)
  return (
    <View style={themed($course)}>
      <View style={themed($courseRow)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${node.code}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={themed($toggle)}
        >
          <Text text={expanded ? "▾" : "▸"} />
        </Pressable>
        <CourseChip code={node.code} disabled={!courseExists(node.code)} onPress={onOpen} />
      </View>
      {expanded && childTree.type !== "empty" ? (
        <View style={themed($children)}>
          <TreeRow node={childTree} ancestors={nextAncestors} depth={depth + 1} onOpen={onOpen} />
        </View>
      ) : null}
    </View>
  )
}

const $group: ThemedStyle<ViewStyle> = ({ spacing }) => ({ gap: spacing.xs })
const $groupLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xxxs,
})
const $course: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.xs })
const $courseRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.xs,
})
const $toggle: ThemedStyle<ViewStyle> = () => ({
  minHeight: 44,
  minWidth: 44,
  alignItems: "center",
  justifyContent: "center",
})
const $children: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderLeftColor: colors.separator,
  borderLeftWidth: 1,
  marginLeft: spacing.md,
  paddingLeft: spacing.sm,
})
const $text: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontStyle: "italic",
})
