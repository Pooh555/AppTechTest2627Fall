import { useState } from "react"
import { Pressable, View } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { expandPrereq, type WalkNode } from "@/lib/prereqWalk"
import { getPrereqGraph } from "@/services/courses/CourseRepository"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

const graph = getPrereqGraph()

export function PrerequisiteExplorerScreen() {
  const route = useRoute<AppStackScreenProps<"PrerequisiteExplorer">["route"]>()
  const navigation = useNavigation<AppStackScreenProps<"PrerequisiteExplorer">["navigation"]>()
  const { themed } = useAppTheme()
  const [unlocks, setUnlocks] = useState(false)
  const root = expandPrereq(graph, route.params.code, new Set(), 0, unlocks ? "unlocks" : "prereq")
  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={{ padding: 16 }}>
      <Text text={`${unlocks ? "What this course unlocks" : "Prerequisites"}: ${route.params.code}`} preset="heading" />
      <Pressable testID="toggle-unlocks" onPress={() => setUnlocks((value) => !value)} style={themed($toggle)}>
        <Text text={unlocks ? "Show prerequisites" : "Show what this unlocks"} size="xs" />
      </Pressable>
      <Tree node={root} level={0} onCourse={(code) => navigation.push("CourseDetail", { code })} />
    </Screen>
  )
}

function Tree({ node, level, onCourse }: { node: WalkNode; level: number; onCourse: (code: string) => void }) {
  const [expanded, setExpanded] = useState(level < 1)
  const { themed } = useAppTheme()
  const canExpand = !!node.children?.length && node.kind === "course"
  return (
    <View style={{ marginLeft: level * 14, marginTop: 8 }}>
      <Pressable onPress={() => (canExpand ? setExpanded((value) => !value) : node.kind === "course" && onCourse(node.code))} style={themed($node)}>
        <Text text={`${canExpand ? (expanded ? "▾ " : "▸ ") : ""}${node.code}`} />
        {node.kind === "cycle" && <Text text="cycle — jump back" size="xs" style={themed($muted)} />}
        {node.kind === "max-depth" && <Text text="depth limit reached" size="xs" style={themed($muted)} />}
        {node.kind === "text" && <Text text={node.text ?? ""} size="xs" style={themed($muted)} />}
      </Pressable>
      {expanded && node.children?.map((child, index) => <Tree key={`${child.code}-${index}`} node={child} level={level + 1} onCourse={onCourse} />)}
    </View>
  )
}

const $toggle = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ backgroundColor: colors.palette.neutral300, borderRadius: 8, marginTop: spacing.sm, padding: spacing.sm })
const $node = ({ colors, spacing }: ReturnType<typeof useAppTheme>["theme"]) => ({ borderBottomColor: colors.separator, borderBottomWidth: 1, paddingVertical: spacing.xs })
const $muted = ({ colors }: ReturnType<typeof useAppTheme>["theme"]) => ({ color: colors.textDim })
