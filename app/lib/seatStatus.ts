export type SeatStatus = "open" | "near-full" | "full" | "unknown"

export function seatStatusForSections(
  sections: Array<{ capacity: number; enroll: number; open: boolean }>,
): SeatStatus {
  if (sections.length === 0) return "unknown"
  const usable = sections.filter((section) => section.capacity > 0)
  const pool = usable.length > 0 ? usable : sections
  const allClosedOrFull = pool.every((section) => {
    if (!section.open) return true
    return section.capacity > 0 && section.enroll >= section.capacity
  })
  if (allClosedOrFull) return "full"
  const nearFull = pool.some(
    (section) => section.capacity > 0 && section.enroll / section.capacity >= 0.9,
  )
  if (nearFull) return "near-full"
  return "open"
}
