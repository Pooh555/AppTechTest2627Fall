import { migrateThemeId } from "./registry"

describe("theme identifier migration", () => {
  it("renames the deprecated YouTube identifier without losing the palette", () => {
    expect(migrateThemeId("youtube")).toBe("crimson")
    expect(migrateThemeId("crimson")).toBe("crimson")
    expect(migrateThemeId("unknown")).toBeUndefined()
  })
})
