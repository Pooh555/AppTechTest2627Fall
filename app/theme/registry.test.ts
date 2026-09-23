import { themeDefinitions } from "./registry"

function contrast(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)!
      .map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const light = Math.max(luminance(first), luminance(second))
  const dark = Math.min(luminance(first), luminance(second))
  return (light + 0.05) / (dark + 0.05)
}

describe("theme contrast", () => {
  it.each(themeDefinitions)("%s meets WCAG AA text contrast", (theme) => {
    const { colors } = theme
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.textDim, colors.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onTint, colors.tint)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onSeatOpen, colors.seatOpen)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onSeatNearFull, colors.seatNearFull)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onSeatFull, colors.seatFull)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onSeatUnavailable, colors.seatUnavailable)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onSeatUnknown, colors.seatUnknown)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.text, colors.palette.neutral200)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.text, colors.palette.neutral300)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5)
  })
})
