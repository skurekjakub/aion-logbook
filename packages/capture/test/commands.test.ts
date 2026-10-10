import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CliEnv } from "../src/commands";
import { runCli, UsageError } from "../src/commands";
import { readLedger } from "../src/ledger";
import { fakeFetch, FIXED_NOW } from "./helpers";

/**
 * Builds a CLI environment over a temp `research/` folder holding one
 * record, `r1`, with one evidence file; relative paths resolve against
 * the `research/` folder.
 *
 * @returns the environment, what it printed, the record and the `research/` folder
 */
function env(): {
  env: CliEnv;
  out: string[];
  err: string[];
  record: string;
  researchDir: string;
} {
  const researchDir = mkdtempSync(join(tmpdir(), "aion-cli-"));
  const record = join(researchDir, "r1");
  mkdirSync(join(record, "evidence"), { recursive: true });
  writeFileSync(join(record, "evidence", "page.html"), "<html></html>");
  const out: string[] = [];
  const err: string[] = [];
  return {
    env: {
      researchDir,
      cwd: researchDir,
      out: (l) => void out.push(l),
      err: (l) => void err.push(l),
      now: () => FIXED_NOW,
      offsetAt: () => 120,
      http: { fetch: fakeFetch([]), sleep: () => Promise.resolve() },
    },
    out,
    err,
    record,
    researchDir,
  };
}

describe("pnpm capture", () => {
  it("log appends a line for a file captured another way, stamped now unless --at says", async () => {
    const { env: e, record } = env();
    await runCli(
      ["log", "r1", "evidence/page.html", "--url", "https://x.test/p", "--tool", "agent-browser"],
      e,
    );
    expect(readLedger(record)[0]!.line).toMatchObject({
      path: "evidence/page.html",
      url: "https://x.test/p",
      tool: "agent-browser",
      captured_at: "2026-09-27T16:45:36+02:00",
    });
    writeFileSync(join(record, "evidence", "derived.json"), "{}");
    await runCli(
      [
        "log",
        "r1",
        "evidence/derived.json",
        "--url",
        "-",
        "--tool",
        "manual",
        "--at",
        "2026-09-28T09:00:00+02:00",
      ],
      e,
    );
    expect(readLedger(record)[1]!.line).toMatchObject({
      url: null,
      captured_at: "2026-09-28T09:00:00+02:00",
    });
  });

  it("verify passes a held ledger and fails a record with a gap, naming the file", async () => {
    const { env: e, out, err, record } = env();
    await runCli(
      ["log", "r1", "evidence/page.html", "--url", "https://x.test", "--tool", "curl"],
      e,
    );
    expect(await runCli(["verify"], e)).toBe(0);
    expect(out).toContain("r1: ok");
    writeFileSync(join(record, "evidence", "late.md"), "x");
    expect(await runCli(["verify", "r1"], e)).toBe(1);
    expect(err).toContain("r1: evidence/late.md has no ledger line");
  });

  it("verify reports an unreadable ledger as its record's failure and checks the others", async () => {
    const { env: e, out, err, researchDir } = env();
    await runCli(
      ["log", "r1", "evidence/page.html", "--url", "https://x.test", "--tool", "curl"],
      e,
    );
    mkdirSync(join(researchDir, "r0", "evidence"), { recursive: true });
    writeFileSync(join(researchDir, "r0", "evidence", "captures.jsonl"), "{not json\n");
    out.length = 0;
    expect(await runCli(["verify"], e)).toBe(1);
    expect(out).toEqual(["r0: FAILED", "r1: ok"]);
    expect(err).toEqual([expect.stringMatching(/^r0: evidence\/captures\.jsonl \[line 1\]: /)]);
  });

  it("backfill resolves a relative --from against the folder pnpm ran in", async () => {
    const { env: e, researchDir } = env();
    mkdirSync(join(researchDir, "elsewhere", "r1"), { recursive: true });
    e.cwd = join(researchDir, "elsewhere");
    await expect(runCli(["backfill", "r1", "--from", "r1"], e)).rejects.toThrow(/git/);
    await expect(runCli(["backfill", "r1", "--from", "nope"], e)).rejects.toThrow(UsageError);
  });

  it("backfill writes a ledger from git times, and refuses a second run", async () => {
    const { env: e, out } = env();
    await expect(runCli(["backfill", "r1"], e)).rejects.toThrow(/git|no commit/);
    await runCli(
      ["log", "r1", "evidence/page.html", "--url", "https://x.test", "--tool", "curl"],
      e,
    );
    await expect(runCli(["backfill", "r1"], e)).rejects.toThrow(/already has a ledger/);
    expect(out).toEqual([expect.stringContaining('"path":"evidence/page.html"')]);
  });

  it("web fetch captures a page into the record, url before dir", async () => {
    const { env: e, out, record } = env();
    e.http = {
      fetch: fakeFetch([["https://guide.test/a", { body: "<h1>A</h1>" }]]),
      sleep: () => Promise.resolve(),
    };
    expect(await runCli(["web", "fetch", "r1", "https://guide.test/a", "evidence/web"], e)).toBe(0);
    expect(readLedger(record)[0]!.line).toMatchObject({
      path: "evidence/web/guide-test-a.md",
      tool: "capture:web",
    });
    expect(out).toEqual(["evidence/web/guide-test-a.md"]);
  });

  it("rejects paths outside evidence/, unknown records and unknown commands", async () => {
    const { env: e } = env();
    for (const argv of [
      ["log", "r1", "curated/x.json", "--url", "u", "--tool", "curl"],
      ["log", "r1", "evidence/../import.json", "--url", "u", "--tool", "curl"],
      ["log", "r1", "evidence//page.html", "--url", "u", "--tool", "curl"],
      ["web", "fetch", "r1", "https://guide.test/a", "evidence/./web"],
      ["log", "r1", "evidence/page.html"],
      ["verify", "nope"],
      ["web", "fetch", "r1", "evidence/web"],
      ["web", "fetch", "r1", "ftp://guide.test/a", "evidence/web"],
      ["web", "get", "r1", "https://guide.test/a", "evidence/web"],
      ["dc", "fetch", "r1", "evidence/dc", "1"],
      ["youtube", "frames", "r1"],
      ["scrape"],
    ]) {
      await expect(runCli(argv, e), argv.join(" ")).rejects.toThrow(UsageError);
    }
  });
});
