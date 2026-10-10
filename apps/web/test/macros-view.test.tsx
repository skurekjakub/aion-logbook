import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MacroChain } from "../src/components/MacroChain";

describe("MacroChain", () => {
  it("shows the key, the delay and the steps in editor order", () => {
    // Arrange
    const macro = {
      id: "m",
      name: "Main",
      key: "R",
      delayMs: 10,
      why: "One key for the rotation",
      steps: [
        { position: 2, note: "only on cooldown", skill: { id: "b", name: "Wrath Wave" } },
        { position: 1, note: null, skill: { id: "a", name: "Ruinous Blow" } },
      ],
    };

    // Act
    render(<MacroChain macro={macro} />);

    // Assert
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("10 ms")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(steps[0]).toContain("Ruinous Blow");
    expect(steps[1]).toContain("Wrath Wave");
    expect(steps[1]).toContain("only on cooldown");
  });
});
