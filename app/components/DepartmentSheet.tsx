import { Modal, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { FlashList } from "@shopify/flash-list"

import type { DepartmentInfo } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"

type DepartmentSheetProps = {
  visible: boolean
  departments: DepartmentInfo[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
  onClose: () => void
}

export function DepartmentSheet({
  visible,
  departments,
  selectedCode,
  onSelect,
  onClose,
}: DepartmentSheetProps) {
  const { themed } = useAppTheme()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={themed($backdrop)} onPress={onClose} />
      <View style={themed($sheet)} testID="department-sheet">
        <Text preset="subheading" text="Department" style={themed($heading)} />
        <FlashList
          data={[{ code: "", nickname: "All departments" }, ...departments]}
          keyExtractor={(item) => item.code || "all"}
          estimatedItemSize={48}
          renderItem={({ item }) => {
            const code = item.code || null
            const selected = selectedCode === code
            return (
              <Pressable
                testID={code ? `department-${code}` : "department-all"}
                onPress={() => {
                  onSelect(code)
                  onClose()
                }}
                style={themed([$item, selected && $selected])}
              >
                <Text
                  text={code ? `${code} · ${item.nickname}` : item.nickname}
                  weight={selected ? "medium" : "normal"}
                />
              </Pressable>
            )
          }}
        />
      </View>
    </Modal>
  )
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.overlay50,
})

const $sheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: "55%",
  backgroundColor: colors.background,
  paddingTop: spacing.sm,
  paddingHorizontal: spacing.xs,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
})

const $item: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $selected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
})
