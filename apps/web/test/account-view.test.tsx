import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./view-harness";

/**
 * The card of a macro chain as read, found by its heading.
 *
 * @param name - the chain's name
 * @returns the card
 * @throws when no chain card has that name
 */
async function chainCard(name: string): Promise<HTMLElement> {
  const heading = await screen.findByRole("heading", { level: 4, name });
  const card = heading.closest("article");
  if (!card) throw new Error(`no card around the "${name}" heading`);
  return card;
}

describe("AccountView", () => {
  it("shows a chain's key, and flags a chain without one as unbound", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    const opener = await chainCard("Opener");
    expect(within(opener).getByText("R").tagName).toBe("KBD");
    expect(within(opener).queryByText("unbound")).not.toBeInTheDocument();
    const pull = await chainCard("Pull");
    expect(within(pull).getByText("unbound")).toHaveClass("pill");
  });

  it("lists a chain's steps by position, each named as read", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    const steps = await screen.findByRole("list", { name: "Opener steps" });
    const names = within(steps)
      .getAllByRole("listitem")
      .map((li) => li.querySelector(".skill-name")?.textContent);
    expect(names).toEqual(["Ruinous Blow", "Sever"]);
  });

  it("shows a step that matched no skill as a chip flagged unresolved", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    const steps = await screen.findByRole("list", { name: "Pull steps" });
    const chip = within(steps).getByText("Mystery Pull").closest(".skill-chip");
    expect(chip).toHaveClass("unresolved");
    expect(chip).toHaveTextContent("unresolved");
    const resolved = within(await screen.findByRole("list", { name: "Opener steps" }))
      .getByText("Sever")
      .closest(".skill-chip");
    expect(resolved).not.toHaveClass("unresolved");
  });

  it("shows an empty stigma slot as empty and a filled one by its skill", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    const stigmas = await screen.findByRole("region", { name: "Stigmas" });
    const slots = within(stigmas)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(slots).toEqual([
      expect.stringContaining("Wrath Wave"),
      expect.stringContaining("empty"),
    ]);
    expect(slots[0]).toMatch(/^22/);
    expect(slots[1]).toMatch(/^27/);
  });
});
