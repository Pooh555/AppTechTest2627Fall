import { Pressable } from "react-native"
import { useAppTheme } from "@/theme/context"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { getDatasetMeta } from "@/services/courses/CourseRepository"

export function SettingsScreen() {
  const { themeContext, setThemeContextOverride } = useAppTheme()
  const meta = getDatasetMeta()
  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={{ padding: 16 }}>
      <Text text="Settings" preset="heading" />
      <Text text={`Theme: ${themeContext}`} style={{ marginTop: 16 }} />
      <Pressable onPress={() => setThemeContextOverride(themeContext === "dark" ? "light" : "dark")} style={{ marginTop: 8 }}>
        <Text text="Toggle light / dark mode" />
      </Pressable>
      <Text text={`Bundled terms: ${meta.terms.map((term) => term.term_name).join(", ")}`} style={{ marginTop: 24 }} />
      <Text text={`Generated: ${meta.generatedAt}`} size="xs" />
      <Text text={`${meta.courseCount} courses · ${meta.sectionCount} sections`} size="xs" />
    </Screen>
  )
}
