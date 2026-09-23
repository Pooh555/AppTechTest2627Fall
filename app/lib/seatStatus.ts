export type SeatStatus = "open" | "near-full" | "full" | "unknown"

type SectionSeat = {
  capacity: number
  enroll: number
  open: boolean
  type?: string
}

const rank: Record<SeatStatus, number> = { unknown: 0, open: 1, "near-full": 2, full: 3 }

function statusForType(sections: SectionSeat[]): SeatStatus {
  const usable = sections.filter((section) => section.capacity > 0)
  const pool = usable.length > 0 ? usable : sections
  if (pool.length === 0) return "unknown"
  const available = pool.filter((section) => section.open && section.enroll < section.capacity)
  if (available.some((section) => section.enroll / section.capacity < 0.9)) return "open"
  if (available.length > 0) {
    return "near-full"
  }
  return "full"
}

export function seatStatusForSections(sections: SectionSeat[]): SeatStatus {
  if (sections.length === 0) return "unknown"
  const groups = new Map<string, SectionSeat[]>()
  for (const section of sections) {
    const type = section.type ?? "ALL"
    groups.set(type, [...(groups.get(type) ?? []), section])
  }
  return [...groups.values()]
    .map(statusForType)
    .reduce((worst, status) => (rank[status] > rank[worst] ? status : worst), "unknown")
}
