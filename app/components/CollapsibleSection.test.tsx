import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { CollapsibleSection } from "./CollapsibleSection"
import { Text } from "./Text"

describe("CollapsibleSection", () => {
  it("starts collapsed and toggles its content accessibly", () => {
    const { getByRole, getByText, queryByText } = render(
      <ThemeProvider>
        <CollapsibleSection title="Prerequisites">
          <Text text="Hidden content" />
        </CollapsibleSection>
      </ThemeProvider>,
    )

    expect(queryByText("Hidden content")).toBeNull()
    const header = getByRole("button", { name: "Expand Prerequisites" })
    expect(header.props.accessibilityState).toEqual({ expanded: false })

    fireEvent.press(header)

    expect(getByText("Hidden content")).toBeTruthy()
    expect(
      getByRole("button", { name: "Collapse Prerequisites" }).props.accessibilityState,
    ).toEqual({
      expanded: true,
    })
  })

  it("notifies the owner after changing expansion state", () => {
    const onExpandedChange = jest.fn()
    const { getByRole } = render(
      <ThemeProvider>
        <CollapsibleSection title="Sections" onExpandedChange={onExpandedChange}>
          <Text text="Sections content" />
        </CollapsibleSection>
      </ThemeProvider>,
    )

    fireEvent.press(getByRole("button", { name: "Expand Sections" }))

    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })
})
