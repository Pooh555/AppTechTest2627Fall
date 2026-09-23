import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

export type MainTabParamList = {
  Browse: undefined
  Favourites: undefined
  Settings: undefined
}
export type DemoTabParamList = MainTabParamList

export type AppStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>
  CourseDetail: { code: string; termCode?: string }
  PrerequisiteExplorer: { code: string }
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>
export type DemoTabScreenProps<T extends keyof DemoTabParamList> = MainTabScreenProps<T>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
