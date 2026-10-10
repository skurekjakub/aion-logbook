import { describe, expect, it } from "vitest";
import { getText, parseHtml } from "../src/html";
import { pyQuote, pyRepr, pyStrip, toLf } from "../src/text";
import { isoFromHeader, isoLocal } from "../src/time";

describe("python-compatible text", () => {
  it("strips Python's whitespace set, not JavaScript's", () => {
    // Act & Assert
    expect(pyStrip("  a 　")).toBe("a");
    expect(pyStrip("﻿a\u001f")).toBe("﻿a");
    expect(pyStrip("​")).toBe("​");
  });

  it("prints values as Python's repr does", () => {
    // Act & Assert
    expect(pyRepr([])).toBe("[]");
    expect(pyRepr([{ tuple: ["ko", "asr"] }])).toBe("[('ko', 'asr')]");
    expect(pyRepr("it's")).toBe('"it\'s"');
    expect(pyRepr(null)).toBe("None");
    expect(toLf("a\r\nb\rc\n")).toBe("a\nb\rc\n");
  });

  it("quotes URLs as urllib.parse.quote does", () => {
    // Act & Assert
    expect(pyQuote("a b/c~d")).toBe("a%20b/c~d");
    expect(pyQuote("아")).toBe("%EC%95%84");
  });

  it("collects text as BeautifulSoup's get_text(strip=True) does", () => {
    // Arrange
    const $ = parseHtml(
      "<div> a <b>b</b><!-- c --><script>d()</script><style>.e{}</style><template>f</template>\n g </div>",
    );
    // Act & Assert
    expect(getText($("div")[0]!, "|")).toBe("a|b|g");
  });
});

describe("capture clock", () => {
  const at = new Date("2026-09-27T22:05:09Z");

  it("formats local times at the given offset", () => {
    // Act & Assert
    expect(isoLocal(at, () => 120)).toBe("2026-09-28T00:05:09+02:00");
    expect(isoLocal(at, () => -270)).toBe("2026-09-27T17:35:09-04:30");
  });

  it("turns header stamps into ledger times", () => {
    // Act & Assert
    expect(isoFromHeader("2026-09-27T16:45:36+0200")).toBe("2026-09-27T16:45:36+02:00");
    expect(isoFromHeader("2026-09-27T16:45:36+02:00")).toBe("2026-09-27T16:45:36+02:00");
    expect(isoFromHeader("2026-09-27T16:45:36Z")).toBe("2026-09-27T16:45:36+00:00");
    expect(isoFromHeader("2026-09-27 16:45")).toBeNull();
  });
});
