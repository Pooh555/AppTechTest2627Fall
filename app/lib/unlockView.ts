export type UnlockViewNode = {
  code: string
  kind: "course"
}

/** Converts reverse graph edges into a direction-specific flat unlock list. */
export function buildUnlockView(codes: readonly string[]): UnlockViewNode[] {
  return codes.map((code) => ({ kind: "course", code }))
}
