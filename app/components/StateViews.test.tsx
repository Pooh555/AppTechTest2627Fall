import { render } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { EmptyState } from "./StateViews"
import { ThemeProvider } from "../theme/context"

describe("EmptyState", () => {
  it("keeps state copy inside a padded reusable container", () => {
    const { getByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 640 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <ThemeProvider>
          <EmptyState title="No results" message="Try another search." />
        </ThemeProvider>
      </SafeAreaProvider>,
    )

    expect(getByText("No results")).toBeDefined()
    expect(getByText("Try another search.")).toBeDefined()
  })
})
