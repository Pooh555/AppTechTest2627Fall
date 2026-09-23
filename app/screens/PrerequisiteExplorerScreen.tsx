import { useMemo, useState } from "react"
import { Pressable, View } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { collectCourseCodes, type PrereqNode } from "@/lib/parsePrereq"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getPrereqGraph, getPrereqTree, getUnlocks } from "@/services/courses/CourseRepository"
import { useAppTheme } from "@/theme/context"

const MAX_DEPTH = 8

export function PrerequisiteExplorerScreen() {
  const route = useRoute<AppStackScreenProps<"PrerequisiteExplorer">["route"]>()
  const navigation = useNavigation<AppStackScreenProps<"PrerequisiteExplorer">["navigation"]>()
  const { themed } = useAppTheme()
  const [direction, setDirection] = useState<"prereq" | "unlocks">("prereq")
  const root = useMemo(
    () => ({ code: route.params.code, tree: getPrereqTree(route.params.code) }),
    [route.params.code],
  )
  const empty =
    direction === "prereq"
      ? root.tree.type === "empty"
      : getUnlocks(route.params.code).length === 0

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={themed($screen)}>
      <Text text={route.params.code} preset="heading" />
      <View style={themed($segments)}>
        {(["prereq", "unlocks"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: direction === item }}
            onPress={() => setDirection(item)}
            style={themed(direction === item ? $selected : $segment)}
          >
            <Text text={item === "prereq" ? "Prerequisites" : "Unlocks"} size="xs" />
          </Pressable>
        ))}
      </View>
      {empty ? (
        <Text
          text={direction === "prereq" ? "No prerequisites" : "Not a prerequisite for any course"}
          style={themed($muted)}
        />
      ) : (
        <LazyNode
          code={root.code}
          tree={root.tree}
          direction={direction}
          depth={0}
          ancestors={new Set()}
          onOpen={(code) => navigation.push("CourseDetail", { code })}
        />
      )}
    </Screen>
  )
}

function LazyNode({
  code,
  tree,
  direction,
  depth,
  ancestors,
  onOpen,
}: {
  code: string
  tree: PrereqNode
  direction: "prereq" | "unlocks"
  depth: number
  ancestors: Set<string>
  onOpen: (code: string) => void
}) {
  const { themed } = useAppTheme()
  const [expanded, setExpanded] = useState(depth === 0)
  const graph = getPrereqGraph()
  const children = direction === "prereq" ? collectCourseCodes(tree) : getUnlocks(code)
  const repeated = ancestors.has(code)
  const atLimit = depth >= MAX_DEPTH
  const nextAncestors = new Set(ancestors).add(code)

  if (tree.type === "text") {
    return <Text text={tree.value} size="xs" style={themed($text)} />
  }
  if (repeated) {
    return <Text text="cycle - jump back" size="xs" style={themed($muted)} />
  }
  if (atLimit) return <Text text="depth limit" size="xs" style={themed($muted)} />

  return (
    <View style={themed($node)}>
      <View style={themed($row)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Expand ${code}`}
          onPress={() => setExpanded((value) => !value)}
          style={themed($chevron)}
        >
          <Text text={expanded ? "▾" : "▸"} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${code}`}
          onPress={() => onOpen(code)}
          style={themed($code)}
        >
          <Text text={code} />
        </Pressable>
      </View>
      {expanded &&
        (direction === "prereq" && tree.type === "course"
          ? tree
          : { type: "and", children: children.map((item) => graph[item]?.tree ?? { type: "empty" }) }
        ).type !== "empty" && (
          <View style={themed($children)}>
            {children.map((child, index) => (
              <LazyNode
                key={`${child}-${index}`}
                code={child}
                tree={
                  direction === "prereq"
                    ? findCourse(tree, child)
                    : (graph[child]?.tree as PrereqNode | undefined) ?? { type: "empty" }
                }
                direction={direction}
                depth={depth + 1}
                ancestors={nextAncestors}
                onOpen={onOpen}
              />
            ))}
          </View>
        )}
    </View>
  )
}

function findCourse(tree: PrereqNode, code: string): PrereqNode {
  if (tree.type === "course" && tree.code === code) return tree
  if (tree.type === "and" || tree.type === "or") {
    for (const child of tree.children) {
      const found = findCourse(child, code)
      if (found.type !== "empty") return found
    }
  }
  return { type: "course", code }
}

const $screen = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ padding: spacing.md })
const $segments = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  flexDirection: "row" as const,
  gap: spacing.xs,
  marginVertical: spacing.sm,
})
const $segment = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  padding: spacing.sm,
})
const $selected = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  padding: spacing.sm,
  backgroundColor: colors.tint,
})
const $node = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ marginTop: spacing.xs })
const $row = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  alignItems: "center" as const,
  flexDirection: "row" as const,
  gap: spacing.xs,
  minHeight: 44,
})
const $chevron = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ padding: spacing.sm })
const $code = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ padding: spacing.sm })
const $children = ({ spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({
  borderLeftWidth: 1,
  marginLeft: spacing.md,
  paddingLeft: spacing.sm,
})
const $muted = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({ color: colors.textDim })
const $text = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({
  color: colors.textDim,
  fontStyle: "italic" as const,
})
