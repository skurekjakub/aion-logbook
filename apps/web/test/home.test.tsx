import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NO_ACCOUNT, SYNC_URL } from "./fixtures";
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

  it("links the sync button to the workflow's page when the server can't sync", async () => {
    // Act
    await renderRoute("/");

    // Assert
    const button = await screen.findByRole("link", { name: /Sync character/ });
    expect(button).toHaveAttribute("href", SYNC_URL);
  });

  it("runs the sync on a press when the server can, and says how it ended", async () => {
    // Arrange
    const api = { "/api/account/sync": { body: { mode: "local", url: SYNC_URL } } };
    await renderRoute("/", api);
    const canned = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "POST" || (input instanceof Request && input.method === "POST")
        ? Promise.resolve(Response.json({ status: "synced", message: "pushed" }))
        : canned(input, init),
    );

    // Act
    fireEvent.click(await screen.findByRole("button", { name: /Sync character/ }));

    // Assert
    expect(await screen.findByText("✓ pushed")).toBeInTheDocument();
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
