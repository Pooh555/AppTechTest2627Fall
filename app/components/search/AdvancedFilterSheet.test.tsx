import { fireEvent, render } from "@testing-library/react-native"

import type { DepartmentInfo, TermInfo } from "@/services/courses/types"
import { ThemeProvider } from "@/theme/context"

import { AdvancedFilterSheet } from "./AdvancedFilterSheet"

const terms: TermInfo[] = [{ termCode: "2610", termName: "Fall 2026-27", termNum: 1 }]
const departments: DepartmentInfo[] = [{ code: "COMP", nickname: "Computer Science" }]

describe("AdvancedFilterSheet", () => {
  it("reports accessible filter selections", () => {
    const onApply = jest.fn()
    const { getByText } = render(
      <ThemeProvider>
        <AdvancedFilterSheet
          visible
          terms={terms}
          departments={departments}
          value={{ terms: [], openSeatsOnly: false, departments: [] }}
          onApply={onApply}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    )

    fireEvent.press(getByText("Open seats only"))
    expect(onApply).toHaveBeenCalledWith({
      terms: [],
      openSeatsOnly: true,
      departments: [],
    })
  })
})
