import type { ScheduleSlot } from "@/services/courses/types"

/** Removes repeated schedule blocks while preserving their first-seen order. */
export function deduplicateSlots(
  slots: readonly ScheduleSlot[],
  sectionId: string,
): ScheduleSlot[] {
  const seen = new Set<string>()
  return slots.filter((slot) => {
    const signature = [
      sectionId,
      slot.weekday ?? "",
      slot.date_from ?? "",
      slot.date_to ?? "",
      slot.time_from ?? "",
      slot.time_to ?? "",
      slot.venue ?? "",
      slot.venue_name ?? "",
    ].join("\u0000")
    if (seen.has(signature)) return false
    seen.add(signature)
    return true
  })
}
