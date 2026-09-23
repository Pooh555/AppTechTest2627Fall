import { deduplicateSlots } from "./deduplicateSlots"

describe("deduplicateSlots", () => {
  it("removes inflated duplicate schedule blocks but keeps distinct blocks", () => {
    const morning = {
      weekday: "Mon",
      time_from: "09:00",
      time_to: "10:20",
      venue: "LT-A",
    }
    const afternoon = { ...morning, time_from: "14:00", time_to: "15:20" }

    expect(deduplicateSlots([morning, morning, afternoon], "LEC01")).toEqual([morning, afternoon])
    expect(deduplicateSlots([morning], "LEC02")).toEqual([morning])
  })
})
