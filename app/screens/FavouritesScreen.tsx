import { useEffect, useState } from "react"
import { TextStyle } from "react-native"
import { useSQLiteContext } from "expo-sqlite"
import { useNavigation } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { CourseRow } from "@/components/CourseRow"
import { Screen } from "@/components/Screen"
import { EmptyState } from "@/components/StateViews"
import { Text } from "@/components/Text"
import { useFavourites } from "@/context/FavouritesContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getLatestTermCode, searchCourses } from "@/services/courses/CourseRepository"
import type { CourseSummary } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export function FavouritesScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<AppStackScreenProps<"Main">["navigation"]>()
  const { codes, toggleFavourite } = useFavourites()
  const { themed } = useAppTheme()
  const [courses, setCourses] = useState<CourseSummary[]>([])
  useEffect(() => {
    getLatestTermCode(db).then((termCode) =>
      searchCourses(db, { codes, termCode }).then((result) => setCourses(result.rows)),
    )
  }, [codes, db])
  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <Text text="Favourites" preset="heading" style={themed($heading)} />
      <FlashList
        data={courses}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <CourseRow
            course={item}
            onPress={(code) => navigation.navigate("CourseDetail", { code })}
            action={{
              icon: "♥",
              label: `Remove ${item.code} from favorites`,
              onPress: (code) => {
                setCourses((current) => current.filter((course) => course.code !== code))
                toggleFavourite(code)
              },
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState title="No favourites yet" message="Save courses to find them here." />
        }
      />
    </Screen>
  )
}

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({ padding: spacing.md })
