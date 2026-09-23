/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"

import { Suspense, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import * as SplashScreen from "expo-splash-screen"
import { SQLiteProvider } from "expo-sqlite"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { Text } from "./components/Text"
import { FavouritesProvider } from "./context/FavouritesContext"
import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import { ErrorBoundary } from "./screens/ErrorScreen/ErrorBoundary"
import { ThemeProvider } from "./theme/context"
import { createTheme } from "./theme/theme"
import { customFontsToLoad } from "./theme/typography"
import * as storage from "./utils/storage"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"
void SplashScreen.preventAutoHideAsync()

const prefix = Linking.createURL("/")
const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Main: "courses",
      CourseDetail: "course/:code",
      PrerequisiteExplorer: "course/:code/prerequisites",
    },
  },
}

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [databaseAttempt, setDatabaseAttempt] = useState(0)

  useEffect(() => {
    if (isNavigationStateRestored && (areFontsLoaded || fontLoadError)) {
      void SplashScreen.hideAsync()
    }
  }, [areFontsLoaded, fontLoadError, isNavigationStateRestored])

  if (!isNavigationStateRestored || (!areFontsLoaded && !fontLoadError)) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator color="#8AB4FF" />
      </View>
    )
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <ThemeProvider>
          <FavouritesProvider>
            <ErrorBoundary
              key={databaseAttempt}
              catchErrors="always"
              fallback={<RetryScreen onRetry={() => setDatabaseAttempt((value) => value + 1)} />}
            >
              <Suspense fallback={<Splash />}>
                <SQLiteProvider
                  databaseName="courses-2026-09-v2.db"
                  assetSource={{
                    assetId: require("../assets/data/courses.db"),
                    forceOverwrite: true,
                  }}
                  useSuspense
                >
                  <AppNavigator
                    linking={linking}
                    initialState={initialNavigationState}
                    onStateChange={onNavigationStateChange}
                  />
                </SQLiteProvider>
              </Suspense>
            </ErrorBoundary>
          </FavouritesProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}

function Splash() {
  return (
    <View style={styles.bootScreen}>
      <ActivityIndicator color={createTheme("dark").colors.primary} />
    </View>
  )
}

function RetryScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.retry}>
      <Text text="Unable to open course data." preset="subheading" />
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text text="Retry" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bootScreen: {
    alignItems: "center",
    backgroundColor: createTheme("dark").colors.background,
    flex: 1,
    justifyContent: "center",
  },
  retry: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  retryButton: {
    marginTop: 16,
    padding: 16,
  },
})
