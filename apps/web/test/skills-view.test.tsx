import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ACCOUNT, LEVELING } from "./fixtures";
import { renderRoute } from "./view-harness";

/** The builds the gladiator pages load. */
const BUILDS = { "/api/builds?class=gladiator": { body: [LEVELING] } };

/**
 * The skill priority list's rows, in order.
 *
 * @returns the rows
 */
async function priorityRows(): Promise<HTMLElement[]> {
  const list = await screen.findByRole("list", { name: "Skill priority" });
  return within(list).getAllByRole("listitem");
}

describe("SkillsView", () => {
  it("says so in an empty state when the build sets no skill levels", async () => {
    // Arrange
    const api = { "/api/builds?class=gladiator": { body: [{ ...LEVELING, skills: [] }] } };

    // Act
    await renderRoute("/gladiator/skills", api);

    // Assert
    expect(await screen.findByText("This build sets no skill levels.")).toHaveClass("empty");
  });

  it("lists the build's skills by rank, each with its target level", async () => {
    // Arrange
    const path = "/gladiator/skills";

    // Act
    await renderRoute(path, BUILDS);

    // Assert
    const rows = await priorityRows();
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Ruinous Blow"),
      expect.stringContaining("Sever"),
    ]);
    expect(within(rows[0]!).getByText("Lv 10")).toHaveClass("target");
    expect(within(rows[1]!).getByText("Lv 5")).toHaveClass("target");
  });

  it("flags a skill the character has below its target", async () => {
    // Arrange
    const path = "/gladiator/skills";

    // Act
    await renderRoute(path, BUILDS);

    // Assert
    const [ruinous, sever] = await priorityRows();
    expect(await within(ruinous!).findByText("level up")).toBeInTheDocument();
    expect(within(ruinous!).getByText("8 → 10")).toBeInTheDocument();
    expect(within(sever!).queryByText("level up")).not.toBeInTheDocument();
    expect(within(sever!).getByText("at target")).toBeInTheDocument();
  });

  it("compares nothing when the character plays another class", async () => {
    // Arrange
    const chanter = { ...ACCOUNT, snapshot: { ...ACCOUNT.snapshot, class: "chanter" } };

    // Act
    await renderRoute("/gladiator/skills", { ...BUILDS, "/api/account": { body: chanter } });

    // Assert
    const rows = await priorityRows();
    expect(screen.queryByText("level up")).not.toBeInTheDocument();
    expect(within(rows[0]!).queryByText("at target")).not.toBeInTheDocument();
  });

  it("shows the build the address names among the class's builds", async () => {
    // Arrange
    const pvp = {
      ...LEVELING,
      id: "gladiator-pvp",
      purpose: "pvp",
      title: "Duels",
      skills: [LEVELING.skills[0]!],
    };
    const api = { "/api/builds?class=gladiator": { body: [LEVELING, pvp] } };

    // Act
    await renderRoute("/gladiator/skills?build=gladiator-pvp", api);

    // Assert
    const rows = await priorityRows();
    expect(rows).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Duels/ })).toHaveAttribute("aria-current", "page");
  });
});
