import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { StyleProp, useColorScheme } from "react-native"
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  Theme as NavTheme,
} from "@react-navigation/native"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"

import { setImperativeTheming } from "./context.utils"
import { migrateThemeId, type ThemeId } from "./registry"
import { createTheme } from "./theme"
import type {
  AllowedStylesT,
  ImmutableThemeContextModeT,
  Theme,
  ThemeContextModeT,
  ThemedFnT,
  ThemedStyle,
} from "./types"

export type ThemeContextType = {
  navigationTheme: NavTheme
  setThemeContextOverride: (newTheme: ThemeContextModeT) => void
  themeId: ThemeId
  theme: Theme
  themeContext: ImmutableThemeContextModeT
  themed: ThemedFnT
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export interface ThemeProviderProps {
  initialContext?: ThemeContextModeT
}

/**
 * The ThemeProvider is the heart and soul of the design token system. It provides a context wrapper
 * for your entire app to consume the design tokens as well as global functionality like the app's theme.
 *
 * To get started, you want to wrap your entire app's JSX hierarchy in `ThemeProvider`
 * and then use the `useAppTheme()` hook to access the theme context.
 *
 * Documentation: https://docs.infinite.red/ignite-cli/boilerplate/app/theme/Theming/
 */
export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  // The operating system theme:
  const systemColorScheme = useColorScheme()
  // Our saved theme context: can be "light", "dark", or undefined (system theme)
  const [themeScheme, setThemeScheme] = useMMKVString("usthing.theme", storage)

  useEffect(() => {
    if (themeScheme === "youtube") {
      setThemeScheme("crimson")
      return
    }
    if (themeScheme !== undefined) return
    const legacy = storage.getString("ignite.themeScheme")
    if (legacy === "light" || legacy === "dark") {
      setThemeScheme(legacy)
    } else {
      setThemeScheme("system")
    }
  }, [setThemeScheme, themeScheme])

  /**
   * This function is used to set the theme context and is exported from the useAppTheme() hook.
   *  - setThemeContextOverride("dark") sets the app theme to dark no matter what the system theme is.
   *  - setThemeContextOverride("light") sets the app theme to light no matter what the system theme is.
   *  - setThemeContextOverride(undefined) the app will follow the operating system theme.
   */
  const setThemeContextOverride = useCallback(
    (newTheme: ThemeContextModeT) => setThemeScheme(newTheme),
    [setThemeScheme],
  )

  /**
   * initialContext is the theme context passed in from the app.tsx file and always takes precedence.
   * themeScheme is the value from MMKV. If undefined, we fall back to the system theme
   * systemColorScheme is the value from the device. If undefined, we fall back to "light"
   */
  const themeId: ThemeId = initialContext ?? migrateThemeId(themeScheme) ?? "system"
  const themeContext: ImmutableThemeContextModeT =
    themeId === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : themeId

  const theme: Theme = useMemo(() => createTheme(themeContext), [themeContext])

  const navigationTheme: NavTheme = useMemo(() => {
    const base = theme.isDark ? NavDarkTheme : NavDefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.tint,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.separator,
        notification: theme.colors.error,
      },
    }
  }, [theme])

  useEffect(() => {
    setImperativeTheming(theme)
  }, [theme])

  const themed = useCallback(
    <T,>(styleOrStyleFn: AllowedStylesT<T>) => {
      const flatStyles = [styleOrStyleFn].flat(3) as (ThemedStyle<T> | StyleProp<T>)[]
      const stylesArray = flatStyles.map((f) => {
        if (typeof f === "function") {
          return (f as ThemedStyle<T>)(theme)
        } else {
          return f
        }
      })
      // Flatten the array of styles into a single object
      return Object.assign({}, ...stylesArray) as T
    },
    [theme],
  )

  const value = {
    navigationTheme,
    theme,
    themeContext,
    themeId,
    setThemeContextOverride,
    themed,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * This is the primary hook that you will use to access the theme context in your components.
 * Documentation: https://docs.infinite.red/ignite-cli/boilerplate/app/theme/useAppTheme.tsx/
 */
export const useAppTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useAppTheme must be used within an ThemeProvider")
  }
  return context
}
