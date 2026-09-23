import { buildUnlockView } from "./unlockView"

describe("buildUnlockView", () => {
  it("keeps unlocks as a flat dependent list", () => {
    expect(buildUnlockView(["COMP 2001", "COMP 3001"])).toEqual([
      { kind: "course", code: "COMP 2001" },
      { kind: "course", code: "COMP 3001" },
    ])
  })
})
