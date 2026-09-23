export type ThemeId = "system" | "light" | "dark" | "pastel" | "sepia" | "midnight" | "crimson"

export type ColorTokens = {
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textDim: string
  tint: string
  onTint: string
  separator: string
  error: string
  errorBackground: string
  primary: string
  onPrimary: string
  primarySoft: string
  successBackground: string
  success: string
  warningBackground: string
  warning: string
  dangerBackground: string
  seatOpen: string
  onSeatOpen: string
  seatNearFull: string
  onSeatNearFull: string
  seatFull: string
  onSeatFull: string
  seatUnavailable: string
  onSeatUnavailable: string
  seatUnknown: string
  onSeatUnknown: string
  transparent: string
  palette: {
    neutral100: string
    neutral200: string
    neutral300: string
    neutral400: string
    neutral500: string
    neutral600: string
    neutral700: string
    neutral800: string
    neutral900: string
    secondary500: string
    accent100: string
    angry100: string
    angry500: string
    overlay50: string
  }
}

export type ThemeDefinition = {
  id: Exclude<ThemeId, "system">
  label: string
  isDark: boolean
  colors: ColorTokens
}

const common = {
  transparent: "rgba(0, 0, 0, 0)",
} as const

function tokens(
  values: Omit<ColorTokens, "transparent" | "palette"> & {
    palette?: Partial<ColorTokens["palette"]>
  },
): ColorTokens {
  const palette = {
    neutral100: values.surface,
    neutral200: values.surfaceMuted,
    neutral300: values.separator,
    neutral400: values.textDim,
    neutral500: values.textDim,
    neutral600: values.text,
    neutral700: values.tint,
    neutral800: values.surface,
    neutral900: values.background,
    secondary500: values.tint,
    accent100: values.warningBackground,
    angry100: values.errorBackground,
    angry500: values.error,
    overlay50: "rgba(0, 0, 0, 0.5)",
    ...values.palette,
  }
  return { ...values, ...common, palette }
}

export const themeDefinitions: readonly ThemeDefinition[] = [
  {
    id: "light",
    label: "Light",
    isDark: false,
    colors: tokens({
      background: "#F7F8FA",
      surface: "#FFFFFF",
      surfaceMuted: "#EEF1F6",
      text: "#0F172A",
      textDim: "#475569",
      tint: "#1E4FA3",
      onTint: "#FFFFFF",
      separator: "#D9DFEA",
      error: "#8F1D1D",
      errorBackground: "#FCE0E0",
      primary: "#1E4FA3",
      onPrimary: "#FFFFFF",
      primarySoft: "#E3ECFB",
      successBackground: "#DCF5E4",
      success: "#14532D",
      warningBackground: "#FDF0C8",
      warning: "#7A4A00",
      dangerBackground: "#FCE0E0",
      seatOpen: "#DCF5E4",
      onSeatOpen: "#14532D",
      seatNearFull: "#FDF0C8",
      onSeatNearFull: "#7A4A00",
      seatFull: "#FCE0E0",
      onSeatFull: "#8F1D1D",
      seatUnavailable: "#EEF1F6",
      onSeatUnavailable: "#0F172A",
      seatUnknown: "#D9DFEA",
      onSeatUnknown: "#0F172A",
    }),
  },
  {
    id: "dark",
    label: "Dark",
    isDark: true,
    colors: tokens({
      background: "#0E1420",
      surface: "#171F2E",
      surfaceMuted: "#1E2838",
      text: "#E8EEF9",
      textDim: "#A3AFC4",
      tint: "#8AB4FF",
      onTint: "#0B1B36",
      separator: "#2A3548",
      error: "#FF9A9A",
      errorBackground: "#421515",
      primary: "#8AB4FF",
      onPrimary: "#0B1B36",
      primarySoft: "#24365C",
      successBackground: "#12361F",
      success: "#86E3A5",
      warningBackground: "#3D2E06",
      warning: "#FFD166",
      dangerBackground: "#421515",
      seatOpen: "#12361F",
      onSeatOpen: "#86E3A5",
      seatNearFull: "#3D2E06",
      onSeatNearFull: "#FFD166",
      seatFull: "#421515",
      onSeatFull: "#FF9A9A",
      seatUnavailable: "#1E2838",
      onSeatUnavailable: "#E8EEF9",
      seatUnknown: "#2A3548",
      onSeatUnknown: "#E8EEF9",
    }),
  },
  {
    id: "crimson",
    label: "Crimson",
    isDark: false,
    colors: tokens({
      background: "#FFF8F7",
      surface: "#FFFFFF",
      surfaceMuted: "#FBE9E7",
      text: "#2B1111",
      textDim: "#6B3A3A",
      tint: "#B91C1C",
      onTint: "#FFFFFF",
      separator: "#E8CACA",
      error: "#991B1B",
      errorBackground: "#FEE2E2",
      primary: "#B91C1C",
      onPrimary: "#FFFFFF",
      primarySoft: "#FEE2E2",
      successBackground: "#DCFCE7",
      success: "#166534",
      warningBackground: "#FEF3C7",
      warning: "#78350F",
      dangerBackground: "#FEE2E2",
      seatOpen: "#DCFCE7",
      onSeatOpen: "#166534",
      seatNearFull: "#FEF3C7",
      onSeatNearFull: "#78350F",
      seatFull: "#FEE2E2",
      onSeatFull: "#991B1B",
      seatUnavailable: "#F4E8E6",
      onSeatUnavailable: "#2B1111",
      seatUnknown: "#E8D8D5",
      onSeatUnknown: "#2B1111",
    }),
  },
  {
    id: "pastel",
    label: "Pastel",
    isDark: false,
    colors: tokens({
      background: "#FAF7FF",
      surface: "#FFFFFF",
      surfaceMuted: "#F0E8FF",
      text: "#24133D",
      textDim: "#5A4772",
      tint: "#6B21A8",
      onTint: "#FFFFFF",
      separator: "#DCCCF2",
      error: "#86198F",
      errorBackground: "#FCE7F3",
      primary: "#6B21A8",
      onPrimary: "#FFFFFF",
      primarySoft: "#F3E8FF",
      successBackground: "#DCFCE7",
      success: "#166534",
      warningBackground: "#FEF3C7",
      warning: "#78350F",
      dangerBackground: "#FCE7F3",
      seatOpen: "#DCFCE7",
      onSeatOpen: "#166534",
      seatNearFull: "#FEF3C7",
      onSeatNearFull: "#78350F",
      seatFull: "#FCE7F3",
      onSeatFull: "#86198F",
      seatUnavailable: "#F1E8FA",
      onSeatUnavailable: "#24133D",
      seatUnknown: "#E5D8F0",
      onSeatUnknown: "#24133D",
    }),
  },
  {
    id: "sepia",
    label: "Sepia",
    isDark: false,
    colors: tokens({
      background: "#FBF6EC",
      surface: "#FFFDF8",
      surfaceMuted: "#F2E7D2",
      text: "#2D2014",
      textDim: "#604B36",
      tint: "#7C2D12",
      onTint: "#FFFFFF",
      separator: "#DCC9AA",
      error: "#991B1B",
      errorBackground: "#FEE2E2",
      primary: "#7C2D12",
      onPrimary: "#FFFFFF",
      primarySoft: "#FFEDD5",
      successBackground: "#DCFCE7",
      success: "#166534",
      warningBackground: "#FEF3C7",
      warning: "#78350F",
      dangerBackground: "#FEE2E2",
      seatOpen: "#DCFCE7",
      onSeatOpen: "#166534",
      seatNearFull: "#FEF3C7",
      onSeatNearFull: "#78350F",
      seatFull: "#FEE2E2",
      onSeatFull: "#991B1B",
      seatUnavailable: "#EFE6D8",
      onSeatUnavailable: "#2D2014",
      seatUnknown: "#E2D4C1",
      onSeatUnknown: "#2D2014",
    }),
  },
  {
    id: "midnight",
    label: "Midnight",
    isDark: true,
    colors: tokens({
      background: "#07111F",
      surface: "#0D1B2A",
      surfaceMuted: "#16324A",
      text: "#E6F4FF",
      textDim: "#A8C2D8",
      tint: "#38BDF8",
      onTint: "#082F49",
      separator: "#27506D",
      error: "#FDA4AF",
      errorBackground: "#4C1D2A",
      primary: "#38BDF8",
      onPrimary: "#082F49",
      primarySoft: "#164E63",
      successBackground: "#123B35",
      success: "#86EFAC",
      warningBackground: "#45320A",
      warning: "#FDE68A",
      dangerBackground: "#4C1D2A",
      seatOpen: "#123B35",
      onSeatOpen: "#86EFAC",
      seatNearFull: "#45320A",
      onSeatNearFull: "#FDE68A",
      seatFull: "#4C1D2A",
      onSeatFull: "#FDA4AF",
      seatUnavailable: "#1B293A",
      onSeatUnavailable: "#E6F4FF",
      seatUnknown: "#263A4D",
      onSeatUnknown: "#E6F4FF",
    }),
  },
]

export function createThemeDefinition(id: Exclude<ThemeId, "system">): ThemeDefinition {
  return themeDefinitions.find((theme) => theme.id === id) ?? themeDefinitions[0]
}

export function migrateThemeId(value: string | undefined): ThemeId | undefined {
  if (value === "youtube") return "crimson"
  if (
    value === "system" ||
    value === "light" ||
    value === "dark" ||
    value === "pastel" ||
    value === "sepia" ||
    value === "midnight" ||
    value === "crimson"
  ) {
    return value
  }
  return undefined
}
