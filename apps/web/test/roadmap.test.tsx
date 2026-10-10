import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ACCOUNT, ROADMAP } from "./fixtures";
import { renderRoute } from "./view-harness";

/**
 * The roadmap row holding an action.
 *
 * @param action - the row's action text
 * @returns the row
 * @throws when no roadmap row holds it
 */
async function row(action: string): Promise<HTMLElement> {
  const text = await screen.findByText(action);
  const item = text.closest("li");
  if (!item) throw new Error(`no roadmap row around "${action}"`);
  return item;
}

describe("the derived roadmap", () => {
  it("groups the character page's roadmap under now, next and later badges", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    const roadmap = await screen.findByRole("region", { name: "Roadmap" });
    await within(roadmap).findByText("Ruinous Blow 8 → 10");
    const badges = within(roadmap)
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);
    expect(badges).toEqual(["Now", "Next", "Later"]);
  });

  it("marks derived items auto and curated ones curated", async () => {
    // Arrange
    const path = "/account";

    // Act
    await renderRoute(path);

    // Assert
    expect(within(await row("Ruinous Blow 8 → 10")).getByText("auto")).toHaveClass("pill");
    expect(within(await row("Rebuild Opener as Main")).getByText("auto")).toBeInTheDocument();
    expect(within(await row("Slot a stigma at 27")).getByText("curated")).toHaveClass("pill");
  });

  it("asks for the roadmap of the snapshot the address names", async () => {
    // Arrange
    const older = {
      snapshotId: "2026-10-01",
      items: [{ ...ROADMAP.items[0], action: "Ruinous Blow 5 → 10" }],
    };
    const api = {
      "/api/account?snapshot=2026-10-01": { body: ACCOUNT },
      "/api/account/roadmap?snapshot=2026-10-01": { body: older },
    };

    // Act
    await renderRoute("/account?snapshot=2026-10-01", api);

    // Assert
    expect(await screen.findByText("Ruinous Blow 5 → 10")).toBeInTheDocument();
  });

  it("says so when the roadmap has no items", async () => {
    // Arrange
    const api = { "/api/account/roadmap": { body: { snapshotId: "2026-10-07", items: [] } } };

    // Act
    await renderRoute("/account", api);

    // Assert
    expect(await screen.findByText("No roadmap yet.")).toBeInTheDocument();
  });
});
