import { describe, expect, it } from "vitest";
import { getText, parseHtml } from "../src/html";
import { pyQuote, pyRepr, pyStrip, toLf } from "../src/text";
import { isoFromHeader, isoLocal } from "../src/time";

describe("python-compatible text", () => {
  it("strips Python's whitespace set, not JavaScript's", () => {
    // Act
    const unicodeSpaces = pyStrip("  a 　");
    const bomAndUnitSeparator = pyStrip("﻿a\u001f");
    const zeroWidth = pyStrip("​");
    // Assert
    expect(unicodeSpaces).toBe("a");
    expect(bomAndUnitSeparator).toBe("﻿a");
    expect(zeroWidth).toBe("​");
  });

  it("prints values as Python's repr does", () => {
    // Act
    const emptyList = pyRepr([]);
    const tupleList = pyRepr([{ tuple: ["ko", "asr"] }]);
    const quoted = pyRepr("it's");
    const none = pyRepr(null);
    const lf = toLf("a\r\nb\rc\n");
    // Assert
    expect(emptyList).toBe("[]");
    expect(tupleList).toBe("[('ko', 'asr')]");
    expect(quoted).toBe('"it\'s"');
    expect(none).toBe("None");
    expect(lf).toBe("a\nb\rc\n");
  });

  it("quotes URLs as urllib.parse.quote does", () => {
    // Act
    const ascii = pyQuote("a b/c~d");
    const hangul = pyQuote("아");
    // Assert
    expect(ascii).toBe("a%20b/c~d");
    expect(hangul).toBe("%EC%95%84");
  });

  it("collects text as BeautifulSoup's get_text(strip=True) does", () => {
    // Arrange
    const $ = parseHtml(
      "<div> a <b>b</b><!-- c --><script>d()</script><style>.e{}</style><template>f</template>\n g </div>",
    );
    // Act
    const text = getText($("div")[0]!, "|");
    // Assert
    expect(text).toBe("a|b|g");
  });
});

describe("capture clock", () => {
  const at = new Date("2026-09-27T22:05:09Z");

  it("formats local times at the given offset", () => {
    // Act
    const ahead = isoLocal(at, () => 120);
    const behindHalfHour = isoLocal(at, () => -270);
    // Assert
    expect(ahead).toBe("2026-09-28T00:05:09+02:00");
    expect(behindHalfHour).toBe("2026-09-27T17:35:09-04:30");
  });

  it("turns header stamps into ledger times", () => {
    // Act
    const compactOffset = isoFromHeader("2026-09-27T16:45:36+0200");
    const colonOffset = isoFromHeader("2026-09-27T16:45:36+02:00");
    const zulu = isoFromHeader("2026-09-27T16:45:36Z");
    const noSeconds = isoFromHeader("2026-09-27 16:45");
    // Assert
    expect(compactOffset).toBe("2026-09-27T16:45:36+02:00");
    expect(colonOffset).toBe("2026-09-27T16:45:36+02:00");
    expect(zulu).toBe("2026-09-27T16:45:36+00:00");
    expect(noSeconds).toBeNull();
  });
});
