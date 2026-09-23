import { View, ViewStyle } from "react-native"

import { buildUnlockView } from "@/lib/unlockView"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { CourseChip } from "./CourseChip"

type UnlockListProps = {
  codes: readonly string[]
  onOpen: (code: string) => void
}

export function UnlockList({ codes, onOpen }: UnlockListProps) {
  const { themed } = useAppTheme()
  return (
    <View style={themed($list)}>
      {buildUnlockView(codes).map((item) => (
        <CourseChip key={item.code} code={item.code} onPress={onOpen} />
      ))}
    </View>
  )
}

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})
