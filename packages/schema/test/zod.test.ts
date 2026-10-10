import { describe, expect, it } from "vitest";
import { isoDate } from "../src/zod";

describe("isoDate", () => {
  it("takes only dates on the calendar", () => {
    for (const ok of ["2026-10-12", "2024-02-29", "2026-12-31"]) {
      // Act
      const result = isoDate.safeParse(ok);

      // Assert
      expect(result.success, ok).toBe(true);
    }
    for (const bad of ["2026-13-45", "2026-02-30", "2025-02-29", "2026-00-10", "2026-04-31"]) {
      // Act
      const result = isoDate.safeParse(bad);

      // Assert
      expect(result.success, bad).toBe(false);
    }

    // Act
    const withTime = isoDate.safeParse("2026-10-12T10:00:00Z");

    // Assert
    expect(withTime.success).toBe(false);
  });
});
