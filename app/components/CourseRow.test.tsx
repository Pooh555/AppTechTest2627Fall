import { fireEvent, render } from "@testing-library/react-native"

import type { CourseSummary } from "@/services/courses/types"
import { ThemeProvider } from "@/theme/context"

import { CourseRow } from "./CourseRow"

const course: CourseSummary = {
  code: "COMP 4211",
  prefix: "COMP",
  number: "4211",
  title: "Machine Learning",
  minCredits: 3,
  maxCredits: 3,
  departmentCode: "COMP",
  departmentNickname: "Computer Science",
  seatStatus: "open",
  openSeats: 10,
  totalCapacity: 100,
}

describe("CourseRow", () => {
  it("exposes an accessible inline action", () => {
    const onRemove = jest.fn()
    const { getByLabelText } = render(
      <ThemeProvider>
        <CourseRow
          course={course}
          onPress={jest.fn()}
          action={{
            icon: "♥",
            label: "Remove COMP 4211 from favorites",
            onPress: onRemove,
          }}
        />
      </ThemeProvider>,
    )

    fireEvent.press(getByLabelText("Remove COMP 4211 from favorites"))
    expect(onRemove).toHaveBeenCalledWith("COMP 4211")
  })
})
