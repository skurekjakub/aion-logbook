import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLedger, verifyLedger } from "../src/ledger";
import {
  commentToken,
  findKey,
  pageGlobal,
  parseCommentPayloads,
  renderDigest,
  searchFile,
  searchHits,
  youtubeSearch,
  youtubeWatch,
} from "../src/youtube";
import type { SeenRequest } from "./helpers";
import { fakeFetch, fixture, testContext } from "./helpers";

const VID = "EW6DgdBiIoo";

describe("youtube watch digests", () => {
  it("reads the page's embedded player response", () => {
    // Act
    const player = pageGlobal(fixture(`youtube/yt-${VID}.html`), "ytInitialPlayerResponse");
    const videoIds = findKey(player, "videoId");
    const missing = pageGlobal("<html></html>", "ytInitialData");
    // Assert
    expect(videoIds[0]).toBe(VID);
    expect(missing).toEqual({});
  });

  it("writes the digest byte for byte as ytv.py did", () => {
    // Arrange
    const html = fixture(`youtube/yt-${VID}.html`);
    // Act
    const digest = renderDigest(VID, html, []);
    // Assert
    expect(digest).toBe(fixture(`youtube/yt-${VID}.txt`));
  });

  it("formats comments and a failed comment fetch as ytv.py's lines", () => {
    // Arrange
    const html = fixture(`youtube/yt-${VID}.html`);
    // Act
    const digest = renderDigest(VID, html, [
      ["@a", "hello", "2"],
      ["ERR", "boom", ""],
    ]);
    // Assert
    expect(digest.endsWith("## Top comments (2)\n- @a [2]: hello\n- ERR []: boom\n")).toBe(true);
  });

  it("reads comment payloads and the comment section's token", () => {
    // Arrange
    const body = {
      frameworkUpdates: {
        mutations: [
          {
            payload: {
              commentEntityPayload: {
                properties: { content: { content: "좋아요" } },
                author: { displayName: "@x" },
                toolbar: { likeCountNotliked: "5" },
              },
            },
          },
        ],
      },
    };
    // Act
    const comments = parseCommentPayloads(body);
    // Assert
    expect(comments).toEqual([["@x", "좋아요", "5"]]);
    // Arrange
    const data = {
      a: { itemSectionRenderer: { sectionIdentifier: "other", token: "no" } },
      b: {
        itemSectionRenderer: { sectionIdentifier: "comment-item-section", x: { token: "yes" } },
      },
    };
    // Act
    const token = commentToken(data);
    // Assert
    expect(token).toBe("yes");
  });

  it("saves the page and its digest with their ledger lines, and skips a captured video", async () => {
    // Arrange
    const seen: SeenRequest[] = [];
    const { context } = testContext(
      fakeFetch(
        [
          [
            `https://www.youtube.com/watch?v=${VID}&hl=ko`,
            { body: fixture(`youtube/yt-${VID}.html`) },
          ],
          ["https://www.youtube.com/youtubei/v1/next", { body: "{}" }],
        ],
        seen,
      ),
      "capture:youtube",
    );
    // Act
    const [digest] = await youtubeWatch(context, "evidence/yt", [VID]);
    // Assert
    expect(digest).toBe(fixture(`youtube/yt-${VID}.txt`));
    const lines = readLedger(context.recordDir).map((e) => e.line);
    expect(lines.map((l) => [l.path, l.url])).toEqual([
      [`evidence/yt/yt-${VID}.html`, `https://www.youtube.com/watch?v=${VID}&hl=ko`],
      [`evidence/yt/yt-${VID}.txt`, `https://www.youtube.com/watch?v=${VID}`],
    ]);
    expect(verifyLedger(context.recordDir)).toEqual([]);
    // Act
    const repeated = await youtubeWatch(context, "evidence/yt", [VID]);
    // Assert
    expect(repeated).toEqual([]);
  });

  it("digests a page saved earlier without fetching it again", async () => {
    // Arrange
    const seen: SeenRequest[] = [];
    const { context } = testContext(fakeFetch([], seen), "capture:youtube");
    mkdirSync(join(context.recordDir, "evidence/yt"), { recursive: true });
    writeFileSync(
      join(context.recordDir, `evidence/yt/yt-${VID}.html`),
      fixture(`youtube/yt-${VID}.html`),
    );
    // Act
    await youtubeWatch(context, "evidence/yt", [VID]);
    // Assert
    expect(seen.some((r) => r.url.includes("/watch"))).toBe(false);
    expect(readLedger(context.recordDir).map((e) => e.line.path)).toEqual([
      `evidence/yt/yt-${VID}.txt`,
    ]);
  });
});

describe("youtube searches", () => {
  it("names result pages as ytall.py did", () => {
    // Act
    const hangul = searchFile("아이온2 검성 스킬", false);
    const punctuated = searchFile("aion 2: gladiator!", true);
    const long = searchFile("x".repeat(50), false);
    // Assert
    expect(hangul).toBe("ytq-아이온2_검성_스킬.html");
    expect(punctuated).toBe("ytq-aion_2_gladiator_-new.html");
    expect(long).toBe(`ytq-${"x".repeat(40)}.html`);
  });

  it("finds every hit ytall.py listed for a saved result page", () => {
    // Arrange
    const html = fixture("youtube/search-rumble.html");
    const data = JSON.parse(/var ytInitialData = (\{[^\n]*?\});<\/script>/.exec(html)![1]!);
    // Act
    const hits = searchHits(data).map((h) => h.join("\t"));
    // Assert
    expect(hits.length).toBeGreaterThan(5);
    const listed = new Set(
      [fixture("youtube/_hits.tsv"), fixture("youtube/_hits2.tsv")].flatMap((t) => t.split("\n")),
    );
    const ids = new Set([...listed].map((line) => line.split("\t")[0]));
    for (const hit of hits) expect(ids.has(hit.split("\t")[0]), hit).toBe(true);
  });

  it("saves both orderings of each query with their ledger lines", async () => {
    // Arrange
    const { context } = testContext(
      fakeFetch([
        ["https://www.youtube.com/results", { body: fixture("youtube/search-rumble.html") }],
      ]),
      "capture:youtube",
    );
    // Act
    const lines = await youtubeSearch(context, "evidence/ytq", ["크럼블 와글와글 아레나"]);
    // Assert
    expect(lines.length).toBeGreaterThan(5);
    const ledger = readLedger(context.recordDir).map((e) => e.line);
    expect(ledger.map((l) => l.path)).toEqual([
      "evidence/ytq/ytq-크럼블_와글와글_아레나.html",
      "evidence/ytq/ytq-크럼블_와글와글_아레나-new.html",
    ]);
    expect(ledger[1]!.url).toBe(
      "https://www.youtube.com/results?search_query=%ED%81%AC%EB%9F%BC%EB%B8%94%20%EC%99%80%EA%B8%80%EC%99%80%EA%B8%80%20%EC%95%84%EB%A0%88%EB%82%98&sp=CAI%253D",
    );
    expect(readFileSync(join(context.recordDir, ledger[0]!.path), "utf-8")).toBe(
      fixture("youtube/search-rumble.html"),
    );
  });
});
