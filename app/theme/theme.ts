import { createThemeDefinition, type ThemeId } from "./registry"
import { spacing } from "./spacing"
import { timing } from "./timing"
import type { Theme } from "./types"
import { typography } from "./typography"

export function createTheme(id: Exclude<ThemeId, "system">): Theme {
  const definition = createThemeDefinition(id)
  return {
    colors: definition.colors,
    spacing,
    typography,
    timing,
    isDark: definition.isDark,
  }
}

export const lightTheme = createTheme("light")
export const darkTheme = createTheme("dark")
