import { fireEvent, render } from "@testing-library/react-native"

import type { TermInfo } from "@/services/courses/types"
import { ThemeProvider } from "@/theme/context"

import { AdvancedFilterSheet } from "./AdvancedFilterSheet"

const terms: TermInfo[] = [{ termCode: "2610", termName: "Fall 2026-27", termNum: 1 }]

describe("AdvancedFilterSheet", () => {
  it("reports accessible filter selections", () => {
    const onApply = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <AdvancedFilterSheet
          visible
          terms={terms}
          attributes={["CC26"]}
          value={{ terms: [], openSeatsOnly: false, attributes: [] }}
          onApply={onApply}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    )

    fireEvent.press(getByText("Open seats only"))
    expect(onApply).toHaveBeenCalledWith({
      terms: [],
      openSeatsOnly: true,
      attributes: [],
    })
  })
})
