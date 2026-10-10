import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NO_ACCOUNT } from "./fixtures";
import { renderRoute } from "./view-harness";

describe("HomeView", () => {
  it("shows the character card and what to do now", async () => {
    // Arrange
    const path = "/";

    // Act
    await renderRoute(path);

    // Assert
    const card = await screen.findByRole("region", { name: "Fixture" });
    expect(within(card).getByText("Lv 34")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Gladiator" })).toHaveAttribute(
      "href",
      "/gladiator",
    );
    const next = screen.getByRole("region", { name: "Do next" });
    expect(await within(next).findByText("Ruinous Blow 8 → 10")).toBeInTheDocument();
    expect(within(next).getByText("Rebuild Opener as Main")).toBeInTheDocument();
    expect(within(next).queryByText("Slot a stigma at 27")).not.toBeInTheDocument();
  });

  it("says how to load a character when none is", async () => {
    // Arrange
    const api = { "/api/account": { body: NO_ACCOUNT } };

    // Act
    await renderRoute("/", api);

    // Assert
    expect(await screen.findByText(/No character snapshot yet/)).toBeInTheDocument();
  });
});
