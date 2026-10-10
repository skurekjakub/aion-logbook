import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { classSectionsWithContent } from "../src/app/classes";
import { LEVELING, RECORD } from "./fixtures";
import { renderRoute } from "./view-harness";

/** The builds the gladiator pages load. */
const BUILDS = { "/api/builds?class=gladiator": { body: [LEVELING] } };

describe("navigation", () => {
  it("lists only the classes a record covers, the current one active", async () => {
    // Arrange
    const path = "/gladiator/skills";

    // Act
    await renderRoute(path, BUILDS);

    // Assert
    const nav = screen.getByRole("navigation", { name: "Logbook" });
    const gladiator = await within(nav).findByRole("link", { name: "Gladiator" });
    expect(gladiator).toHaveAttribute("aria-current", "true");
    const pages = within(nav).getByRole("list", { name: "Gladiator pages" });
    expect(within(pages).getByRole("link", { name: "Skills" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).queryByRole("link", { name: "Cleric" })).not.toBeInTheDocument();
  });

  it("answers a class no record covers with the not-found state", async () => {
    // Arrange
    const path = "/cleric/skills";

    // Act
    await renderRoute(path);

    // Assert
    expect(await screen.findByText(/Nothing lives at this address/)).toBeInTheDocument();
  });
});

describe("classSectionsWithContent", () => {
  it("keeps the covered classes in client order, each with its newest record", () => {
    // Arrange
    const records = [
      { slug: "001-gladiator-build", classes: ["gladiator"] },
      { slug: "003-gladiator-pvp", classes: ["gladiator", "chanter"] },
      RECORD,
    ];

    // Act
    const sections = classSectionsWithContent(records);

    // Assert
    expect(sections.map((s) => [s.id, s.recordSlug])).toEqual([
      ["gladiator", "900-fixture"],
      ["chanter", "003-gladiator-pvp"],
    ]);
  });
});
