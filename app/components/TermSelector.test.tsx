import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { TermSelector } from "./TermSelector"

describe("TermSelector", () => {
  it("uses a horizontal scroll container with edge padding", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TermSelector
          terms={[
            { termCode: "2610", termName: "2026-27 Fall", termNum: 1 },
            { termCode: "2605", termName: "2025-26 Winter", termNum: 2 },
          ]}
          selectedTerm="2610"
          onSelect={() => undefined}
        />
      </ThemeProvider>,
    )

    const selector = getByTestId("term-selector")
    expect(selector.props.horizontal).toBe(true)
    expect(selector.props.showsHorizontalScrollIndicator).toBe(false)
    expect(selector.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingHorizontal: 16 }),
    )
  })
})
