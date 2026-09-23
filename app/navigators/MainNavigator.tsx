import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { BrowseScreen } from "@/screens/BrowseScreen"
import { FavouritesScreen } from "@/screens/FavouritesScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { useAppTheme } from "@/theme/context"
import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainNavigator() {
  const { theme: { colors } } = useAppTheme()
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.separator },
      }}
    >
      <Tab.Screen name="Browse" component={BrowseScreen} />
      <Tab.Screen name="Favourites" component={FavouritesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}
