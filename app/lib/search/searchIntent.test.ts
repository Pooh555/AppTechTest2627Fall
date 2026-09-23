import { classifyQuery } from "./searchIntent"

const prefixes = new Set(["COMP", "MATH", "DATA"])

describe("classifyQuery", () => {
  it.each([
    ["comp", { kind: "CODE_PREFIX", prefix: "COMP" }],
    ["COMP ", { kind: "CODE_PREFIX", prefix: "COMP" }],
    ["comp4", { kind: "CODE_PARTIAL", prefix: "COMP", number: "4", suffix: "" }],
    ["COMP 42", { kind: "CODE_PARTIAL", prefix: "COMP", number: "42", suffix: "" }],
    ["comp4211h", { kind: "CODE_PARTIAL", prefix: "COMP", number: "4211", suffix: "H" }],
    ["data science", { kind: "TEXT", value: "data science" }],
  ])("classifies %s", (input, expected) => {
    expect(classifyQuery(input, prefixes)).toEqual(expected)
  })
})
