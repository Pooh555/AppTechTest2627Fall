/* eslint-disable react-native/no-inline-styles */
import { View } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Switch } from "@/components/Toggle/Switch"
import { getDatasetMeta } from "@/services/courses/CourseRepository"
import { useAppTheme } from "@/theme/context"

export function SettingsScreen() {
  const { themeContext, setThemeContextOverride } = useAppTheme()
  const meta = getDatasetMeta()
  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={{ padding: 16 }}>
      <Text text="Settings" preset="heading" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <Text text="Dark mode" />
        <Switch
          value={themeContext === "dark"}
          onValueChange={(value) => setThemeContextOverride(value ? "dark" : "light")}
          accessibilityLabel="Dark mode"
        />
      </View>
      <Text
        text={`Bundled terms: ${meta.terms.map((term) => term.term_name).join(", ")}`}
        style={{ marginTop: 24 }}
      />
      <Text text={`Generated: ${meta.generatedAt}`} size="xs" />
      <Text text={`${meta.courseCount} courses · ${meta.sectionCount} sections`} size="xs" />
    </Screen>
  )
}
