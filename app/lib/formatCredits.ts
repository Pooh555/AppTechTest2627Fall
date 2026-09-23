export function formatCredits(min: number | null, max: number | null): string {
  if (min == null && max == null) return ""
  const label = min != null && max != null && min !== max ? `${min}–${max}` : String(min ?? max)
  return `${label} cr`
}
