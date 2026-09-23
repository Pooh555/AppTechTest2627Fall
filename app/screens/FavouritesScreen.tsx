import { useEffect, useState } from "react"
import { useSQLiteContext } from "expo-sqlite"
import { useNavigation } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"

import { CourseRow } from "@/components/CourseRow"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useFavourites } from "@/context/FavouritesContext"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { getLatestTermCode, searchCourses } from "@/services/courses/CourseRepository"
import type { CourseSummary } from "@/services/courses/types"

export function FavouritesScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<AppStackScreenProps<"Main">["navigation"]>()
  const { codes } = useFavourites()
  const [courses, setCourses] = useState<CourseSummary[]>([])
  useEffect(() => {
    getLatestTermCode(db).then((termCode) =>
      searchCourses(db, { codes, termCode }).then((result) => setCourses(result.rows)),
    )
  }, [codes, db])
  return (
    <Screen preset="fixed" safeAreaEdges={["top"]}>
      <Text text="Favourites" preset="heading" style={{ padding: 16 }} />
      <FlashList
        data={courses}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <CourseRow
            course={item}
            onPress={(code) => navigation.navigate("CourseDetail", { code })}
          />
        )}
        ListEmptyComponent={<Text text="No favourites yet." style={{ padding: 16 }} />}
      />
    </Screen>
  )
}
