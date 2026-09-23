import { ReactNode } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type StateAction = {
  label: string
  onPress: () => void
}

type StateViewProps = {
  title: string
  message?: string
  action?: StateAction
  icon?: ReactNode
}

export function EmptyState(props: StateViewProps) {
  return <StateView {...props} />
}

export function LoadingState({ title = "Loading…" }: { title?: string }) {
  return <StateView title={title} />
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: Omit<StateViewProps, "icon">) {
  return <StateView title={title} message={message} action={action} />
}

function StateView({ title, message, action, icon }: StateViewProps) {
  const { themed } = useAppTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={themed($container(insets))}>
      {icon ? <View style={themed($icon)}>{icon}</View> : null}
      <Text text={title} preset="subheading" style={themed($title)} />
      {message ? <Text text={message} style={themed($message)} /> : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => themed([$action, pressed && $pressed])}
        >
          <Text text={action.label} style={themed($actionText)} />
        </Pressable>
      ) : null}
    </View>
  )
}

const $container =
  (insets: EdgeInsets): ThemedStyle<ViewStyle> =>
  ({ spacing }) => ({
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    paddingHorizontal: Math.max(insets.left, insets.right) + spacing.md,
    paddingVertical: spacing.xl,
  })

const $icon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  textAlign: "center",
})

const $message: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
  textAlign: "center",
})

const $action: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primary,
  borderRadius: 8,
  marginTop: spacing.md,
  minHeight: 44,
  justifyContent: "center",
  paddingHorizontal: spacing.md,
})

const $pressed: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.75,
})

const $actionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.onPrimary,
  fontWeight: "600",
})
