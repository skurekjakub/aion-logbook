import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LedgerError, readLedger, verifyLedger } from "../src/ledger";
import { htmlToText, pageTitle, slugOfUrl, webCapture } from "../src/web";
import type { SeenRequest } from "./helpers";
import { fakeFetch, testContext } from "./helpers";

const GUIDE_URL = "https://eloboost24.eu/blog/aion-2-gladiator-build?x=1";
const GUIDE_PATH = "evidence/01-guides/eloboost24-eu-blog-aion-2-gladiator-build.md";
const GUIDE_HTML = `<html><head><title> Gladiator  Build </title><style>.a{}</style></head>
<body><header><nav><a href="/">Home</a></nav></header><main><h1>Gladiator build</h1>
<p>Level  the <b>core</b> skills
first.</p></main><footer>© site</footer></body></html>`;

describe("web capture", () => {
  it("keeps headings, list items and table cells, drops scripts", () => {
    // Arrange
    const html = `<html><head><title>T</title><script>x()</script></head><body><nav>menu</nav>
      <h2>Stigma</h2><ul><li>Wrath Wave</li></ul><table><tr><td>22</td><td>Rage Burst</td></tr></table></body></html>`;
    // Act
    const text = htmlToText(html);
    // Assert
    expect(text).toContain("## Stigma");
    expect(text).toContain("- Wrath Wave");
    expect(text).toContain("| 22 | Rage Burst |");
    expect(text).not.toContain("x()");
    expect(text).not.toContain("menu");
  });

  it("slugs a URL into a stable file name", () => {
    // Act & Assert
    expect(slugOfUrl("https://eloboost24.eu/blog/aion-2-gladiator-build?x=1")).toBe(
      "eloboost24-eu-blog-aion-2-gladiator-build",
    );
  });

  it("slugs a bare host, drops www. and the fragment, and caps the length", () => {
    // Act & Assert
    expect(slugOfUrl("https://www.Aion2.run/#top")).toBe("aion2-run");
    expect(slugOfUrl(`https://a.test/${"x".repeat(300)}`).length).toBeLessThanOrEqual(120);
  });

  it("writes paragraphs with collapsed whitespace, nested and ordered lists, header rows and code", () => {
    // Arrange
    const html = `<body><p>one
      two <a href="/x">three</a><br>four</p>
      <ol><li>first<ul><li>inner</li></ul></li><li>second</li></ol>
      <table><thead><tr><th>Slot</th><th>Stigma</th></tr></thead>
      <tbody><tr><td>27</td><td>A | B</td></tr></tbody></table>
      <pre>keep   this
  layout</pre><blockquote><p>quoted</p></blockquote><div>loose <i>text</i></div></body>`;
    // Act & Assert
    expect(htmlToText(html)).toBe(
      [
        "one two three\nfour",
        "1. first\n  - inner\n2. second",
        "| Slot | Stigma |\n| --- | --- |\n| 27 | A \\| B |",
        "```\nkeep   this\n  layout\n```",
        "> quoted",
        "loose text",
      ].join("\n\n") + "\n",
    );
  });

  it("reads the page title, else its first heading", () => {
    // Act & Assert
    expect(pageTitle(GUIDE_HTML)).toBe("Gladiator Build");
    expect(pageTitle("<body><h1>Only <b>heading</b></h1></body>")).toBe("Only heading");
    expect(pageTitle("<body><p>none</p></body>")).toBe("");
  });

  it("writes the page as Markdown with front matter, and its ledger line", async () => {
    // Arrange
    const seen: SeenRequest[] = [];
    const { context } = testContext(
      fakeFetch([[GUIDE_URL, { body: GUIDE_HTML }]], seen),
      "capture:web",
    );
    // Act & Assert
    expect(await webCapture(context, "evidence/01-guides", GUIDE_URL)).toBe(GUIDE_PATH);
    // Assert
    expect(readFileSync(join(context.recordDir, GUIDE_PATH), "utf-8")).toBe(
      [
        "---",
        `url: "${GUIDE_URL}"`,
        "captured_at: 2026-09-27T16:45:36+02:00",
        'title: "Gladiator Build"',
        "---",
        "",
        "# Gladiator build",
        "",
        "Level the core skills first.",
        "",
      ].join("\n"),
    );
    expect(readLedger(context.recordDir).map((entry) => entry.line)).toEqual([
      expect.objectContaining({
        path: GUIDE_PATH,
        url: GUIDE_URL,
        tool: "capture:web",
        captured_at: "2026-09-27T16:45:36+02:00",
      }),
    ]);
    expect(verifyLedger(context.recordDir)).toEqual([]);
    expect(seen).toHaveLength(1);
  });

  it("keeps a page already captured without fetching it again", async () => {
    // Arrange
    const seen: SeenRequest[] = [];
    const { context, logs } = testContext(
      fakeFetch([[GUIDE_URL, { body: GUIDE_HTML }]], seen),
      "capture:web",
    );
    await webCapture(context, "evidence/01-guides", GUIDE_URL);
    // Act & Assert
    expect(await webCapture(context, "evidence/01-guides", GUIDE_URL)).toBeNull();
    // Assert
    expect(seen).toHaveLength(1);
    expect(readLedger(context.recordDir)).toHaveLength(1);
    expect(logs).toContain(`  ${GUIDE_PATH}: already captured`);
  });

  it("never overwrites a file that has no ledger line", async () => {
    // Arrange
    const { context } = testContext(fakeFetch([[GUIDE_URL, { body: GUIDE_HTML }]]), "capture:web");
    mkdirSync(join(context.recordDir, "evidence/01-guides"), { recursive: true });
    writeFileSync(join(context.recordDir, GUIDE_PATH), "hand-written");
    // Act & Assert
    await expect(webCapture(context, "evidence/01-guides", GUIDE_URL)).rejects.toThrow(LedgerError);
    // Assert
    expect(readFileSync(join(context.recordDir, GUIDE_PATH), "utf-8")).toBe("hand-written");
  });

  it("fails a page that never answers 200, writing nothing", async () => {
    // Arrange
    const { context } = testContext(fakeFetch([]), "capture:web");
    // Act & Assert
    await expect(webCapture(context, "evidence/01-guides", GUIDE_URL)).rejects.toThrow(
      `could not fetch ${GUIDE_URL}`,
    );
    // Assert
    expect(readLedger(context.recordDir)).toEqual([]);
  });

  it("refuses a URL whose file name another URL's capture already holds", async () => {
    // Arrange
    const other = "https://eloboost24.eu/blog/aion-2-gladiator-build?page=2";
    const seen: SeenRequest[] = [];
    const { context } = testContext(
      fakeFetch([["https://eloboost24.eu/", { body: GUIDE_HTML }]], seen),
      "capture:web",
    );
    await webCapture(context, "evidence/01-guides", GUIDE_URL);
    // Act & Assert
    expect(await webCapture(context, "evidence/01-guides", GUIDE_URL)).toBeNull();
    // Act
    const refusal = webCapture(context, "evidence/01-guides", other);
    // Assert
    await expect(refusal).rejects.toThrow(LedgerError);
    await expect(refusal).rejects.toThrow(`${GUIDE_PATH} already holds ${GUIDE_URL}`);
    await expect(refusal).rejects.toThrow(other);
    expect(seen).toHaveLength(1);
    expect(readLedger(context.recordDir)).toHaveLength(1);
  });
});
