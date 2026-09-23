import { Modal, Pressable, ScrollView, TextStyle, View, ViewStyle } from "react-native"

import type { DepartmentInfo, TermInfo } from "@/services/courses/types"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "../Text"

export type AdvancedFilterState = {
  terms: string[]
  openSeatsOnly: boolean
  departments: string[]
}

type AdvancedFilterSheetProps = {
  visible: boolean
  terms: TermInfo[]
  departments: DepartmentInfo[]
  value: AdvancedFilterState
  onApply: (value: AdvancedFilterState) => void
  onClose: () => void
}

export function AdvancedFilterSheet({
  visible,
  terms,
  departments,
  value,
  onApply,
  onClose,
}: AdvancedFilterSheetProps) {
  const { themed } = useAppTheme()
  const toggle = (items: string[], item: string) =>
    items.includes(item) ? items.filter((current) => current !== item) : [...items, item]

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={themed($backdrop)} onPress={onClose} />
      <View style={themed($sheet)} testID="advanced-filter-sheet">
        <Text text="Advanced filters" preset="subheading" style={themed($heading)} />
        <ScrollView contentContainerStyle={themed($content)}>
          <Text text="Terms" style={themed($section)} />
          {terms.map((term) => {
            const selected = value.terms.includes(term.termCode)
            return (
              <Pressable
                key={term.termCode}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => onApply({ ...value, terms: toggle(value.terms, term.termCode) })}
                style={themed([$option, selected && $selected])}
              >
                <Text text={term.termName} />
              </Pressable>
            )
          })}
          <Text text="Availability" style={themed($section)} />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value.openSeatsOnly }}
            onPress={() => onApply({ ...value, openSeatsOnly: !value.openSeatsOnly })}
            style={themed([$option, value.openSeatsOnly && $selected])}
          >
            <Text text="Open seats only" />
          </Pressable>
          <Text text="Departments" style={themed($section)} />
          {departments.map((department) => {
            const selected = value.departments.includes(department.code)
            return (
              <Pressable
                key={department.code}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() =>
                  onApply({ ...value, departments: toggle(value.departments, department.code) })
                }
                style={themed([$option, selected && $selected])}
              >
                <Text text={`${department.code} · ${department.nickname}`} />
              </Pressable>
            )
          })}
        </ScrollView>
        <Pressable
          accessibilityLabel="Apply advanced search filters"
          accessibilityRole="button"
          onPress={onClose}
          style={themed($done)}
          testID="filter-apply-button"
        >
          <Text text="Apply" style={themed($doneText)} />
        </Pressable>
      </View>
    </Modal>
  )
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.overlay50,
  flex: 1,
})
const $sheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  height: "75%",
  paddingTop: spacing.sm,
})
const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
})
const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
})
const $section: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.sm,
})
const $option: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  minHeight: 44,
  justifyContent: "center",
  paddingHorizontal: spacing.sm,
})
const $selected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primarySoft,
  borderColor: colors.tint,
})
const $done: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.primary,
  justifyContent: "center",
  margin: spacing.md,
  minHeight: 44,
  borderRadius: 8,
})
const $doneText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.onPrimary,
  fontWeight: "600",
})
