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

import { useCallback, useState } from "react"
import { Pressable } from "react-native"
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
import { ThemeProvider } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"
import * as storage from "./utils/storage"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"
void SplashScreen.preventAutoHideAsync()

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Main: "courses",
    CourseDetail: "course/:code",
    PrerequisiteExplorer: "course/:code/prerequisites",
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
  const [isDatabaseReady, setIsDatabaseReady] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [databaseAttempt, setDatabaseAttempt] = useState(0)
  const onDatabaseInit = useCallback(async () => {
    setDatabaseError(null)
    setIsDatabaseReady(true)
    await SplashScreen.hideAsync()
  }, [])
  const onDatabaseError = useCallback((error: Error) => {
    setDatabaseError(error.message)
    setIsDatabaseReady(false)
  }, [])

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color.
  // In iOS: application:didFinishLaunchingWithOptions:
  // In Android: https://stackoverflow.com/a/45838109/204044
  // You can replace with your own loading component if you wish.
  if (!isNavigationStateRestored || (!areFontsLoaded && !fontLoadError)) {
    return null
  }

  const linking = {
    prefixes: [prefix],
    config,
  }

  // otherwise, we're ready to render the app
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <ThemeProvider>
          <FavouritesProvider>
            <SQLiteProvider
              key={databaseAttempt}
              databaseName="courses-2026-09.db"
              assetSource={{ assetId: require("../assets/data/courses.db") }}
              useSuspense={false}
              onInit={onDatabaseInit}
              onError={onDatabaseError}
            >
              {databaseError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDatabaseError(null)
                    setIsDatabaseReady(false)
                    setDatabaseAttempt((value) => value + 1)
                  }}
                >
                  <Text text={`Unable to open course data: ${databaseError}. Tap to retry.`} />
                </Pressable>
              ) : isDatabaseReady ? (
                <AppNavigator
                  linking={linking}
                  initialState={initialNavigationState}
                  onStateChange={onNavigationStateChange}
                />
              ) : null}
            </SQLiteProvider>
          </FavouritesProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
