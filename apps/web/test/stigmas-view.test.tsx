import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StigmaSlots } from "../src/components/StigmaSlots";

/**
 * A stigma slot of a build, slotting a skill named after its level.
 *
 * @param slotLevel - the slot's unlock level
 * @returns the slot
 */
const slot = (slotLevel: number) => ({
  slotLevel,
  why: `Slot ${slotLevel}.`,
  skill: { id: `s${slotLevel}`, name: `Stigma ${slotLevel}` },
});

describe("StigmaSlots", () => {
  it("locks the slots above the character's level", () => {
    // Arrange
    const stigmas = [22, 27, 32, 37].map(slot);

    // Act
    render(<StigmaSlots stigmas={stigmas} unlockedTo={34} />);

    // Assert
    expect(screen.getByRole("img", { name: "locked at 37" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "locked at 32" })).not.toBeInTheDocument();
    expect(screen.getByText("Stigma 37")).toBeInTheDocument();
  });

  it("locks nothing when the character's level isn't known", () => {
    // Arrange
    const stigmas = [22, 37].map(slot);

    // Act
    render(<StigmaSlots stigmas={stigmas} />);

    // Assert
    expect(screen.queryByRole("img", { name: /^locked at/ })).not.toBeInTheDocument();
  });

  it("shows a slot the build leaves empty on the client's slot track", () => {
    // Arrange
    const stigmas = [slot(22)];

    // Act
    render(<StigmaSlots stigmas={stigmas} unlockedTo={34} />);

    // Assert
    const slots = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(slots).toHaveLength(4);
    expect(slots[1]).toContain("27");
    expect(slots[1]).toContain("empty");
  });

  it("marks each slot slotted, swap or slot it against what the character has", () => {
    // Arrange
    const stigmas = [slot(22), slot(27), slot(32)];
    const equipped = new Map<number, string | null>([
      [22, "s22"],
      [27, "other"],
      [32, null],
    ]);

    // Act
    render(<StigmaSlots stigmas={stigmas} unlockedTo={34} equipped={equipped} />);

    // Assert
    const slots = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(slots[0]).toContain("slotted");
    expect(slots[1]).toContain("swap");
    expect(slots[2]).toContain("slot it");
  });
});
