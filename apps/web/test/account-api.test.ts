import { describe, expect, it } from "vitest";
import { toAccountOverview } from "../src/api/account";
import type { AccountResponse } from "../src/api/types";
import { ACCOUNT, NO_ACCOUNT } from "./fixtures";

describe("toAccountOverview", () => {
  it("names each stigma's skill as skillName and gives a snapshot without macros an empty list", () => {
    // Arrange
    const { macros: _macros, stigmas: _stigmas, ...snapshot } = ACCOUNT.snapshot;
    const response = {
      ...ACCOUNT,
      snapshot: {
        ...snapshot,
        stigmas: [{ slotLevel: 22, name: "Wrath Wave", skillId: "gladiator-wrath-wave" }],
      },
    } as unknown as AccountResponse;

    // Act
    const overview = toAccountOverview(response);

    // Assert
    expect(overview.snapshot?.stigmas).toEqual([
      { slotLevel: 22, skillName: "Wrath Wave", skillId: "gladiator-wrath-wave" },
    ]);
    expect(overview.snapshot?.macros).toEqual([]);
  });

  it("passes a response already in the views' shape through unchanged", () => {
    // Arrange
    const response = ACCOUNT as unknown as AccountResponse;

    // Act
    const overview = toAccountOverview(response);

    // Assert
    expect(overview).toEqual(ACCOUNT);
  });

  it("keeps an overview without a snapshot as it is", () => {
    // Arrange
    const response = NO_ACCOUNT as unknown as AccountResponse;

    // Act
    const overview = toAccountOverview(response);

    // Assert
    expect(overview).toEqual(NO_ACCOUNT);
  });
});
