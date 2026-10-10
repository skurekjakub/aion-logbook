import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createServices } from "../src/services";
import type { SyncRun } from "../src/services/sync";
import {
  SYNC_WORKFLOW_URL,
  githubSyncService,
  localSyncService,
  manualSyncService,
} from "../src/services/sync";
import { testStore } from "./helpers";

const NOW = new Date("2026-10-10T12:00:00Z");

/**
 * Builds a fake GitHub API: the runs listing answers `runs`, a dispatch answers `dispatchStatus`.
 *
 * @param runs - the workflow runs the listing returns, newest first
 * @param dispatchStatus - the dispatch's HTTP status
 * @returns the fetch function and the requests it saw, as `METHOD url`
 */
function fakeGitHub(runs: object[], dispatchStatus = 204) {
  const calls: string[] = [];
  const fetchFn = ((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    if (method === "POST") return Promise.resolve(new Response(null, { status: dispatchStatus }));
    return Promise.resolve(Response.json({ workflow_runs: runs }));
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("localSyncService", () => {
  it("runs the sync and answers its last line of output", async () => {
    // Arrange
    const svc = localSyncService(() =>
      Promise.resolve({ code: 0, output: "fetched Baon\npushed\n\n" }),
    );

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "synced", message: "pushed" });
  });

  it("answers a non-zero exit as failed, with the sync's last line", async () => {
    // Arrange
    const svc = localSyncService(() =>
      Promise.resolve({ code: 1, output: "sync failed: the site answered 503\n" }),
    );

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "failed", message: "sync failed: the site answered 503" });
  });

  it("answers busy to a press while a sync runs", async () => {
    // Arrange
    let finish: (run: SyncRun) => void = () => undefined;
    const svc = localSyncService(() => new Promise((resolve) => (finish = resolve)));
    const first = svc.start();

    // Act
    const second = await svc.start();
    finish({ code: 0, output: "pushed" });

    // Assert
    expect(second).toEqual({ status: "busy", url: SYNC_WORKFLOW_URL });
    expect(await first).toEqual({ status: "synced", message: "pushed" });
  });
});

describe("githubSyncService", () => {
  it("dispatches the workflow on main when the last run finished long enough ago", async () => {
    // Arrange
    const gh = fakeGitHub([
      { status: "completed", created_at: "2026-10-10T11:00:00Z", html_url: "https://run/1" },
    ]);
    const svc = githubSyncService("token", gh.fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "dispatched", url: SYNC_WORKFLOW_URL });
    expect(gh.calls.at(-1)).toMatch(/^POST .*\/actions\/workflows\/sync\.yml\/dispatches$/);
  });

  it("refuses as busy while the last run is in progress, without dispatching", async () => {
    // Arrange
    const gh = fakeGitHub([
      { status: "in_progress", created_at: "2026-10-10T10:00:00Z", html_url: "https://run/2" },
    ]);
    const svc = githubSyncService("token", gh.fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "busy", url: "https://run/2" });
    expect(gh.calls.filter((c) => c.startsWith("POST"))).toEqual([]);
  });

  it("refuses as busy within the cooldown of the last run", async () => {
    // Arrange
    const gh = fakeGitHub([
      { status: "completed", created_at: "2026-10-10T11:58:00Z", html_url: "https://run/3" },
    ]);
    const svc = githubSyncService("token", gh.fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "busy", url: "https://run/3" });
  });

  it("answers busy from memory inside the cooldown of its own dispatch", async () => {
    // Arrange
    const gh = fakeGitHub([]);
    const svc = githubSyncService("token", gh.fetchFn, () => NOW);
    await svc.start();
    const before = gh.calls.length;

    // Act
    const again = await svc.start();

    // Assert
    expect(again).toEqual({ status: "busy", url: SYNC_WORKFLOW_URL });
    expect(gh.calls.length).toBe(before);
  });

  it("answers a failed runs listing as failed, without dispatching", async () => {
    // Arrange
    const calls: string[] = [];
    const fetchFn = ((url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return Promise.resolve(new Response(null, { status: 401 }));
    }) as typeof fetch;
    const svc = githubSyncService("token", fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "failed", message: "GitHub answered 401" });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual([]);
  });

  it("answers an unreachable GitHub as failed", async () => {
    // Arrange
    const fetchFn = (() => Promise.reject(new Error("getaddrinfo ENOTFOUND"))) as typeof fetch;
    const svc = githubSyncService("token", fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "failed", message: "getaddrinfo ENOTFOUND" });
  });

  it("answers a refused dispatch as failed, with GitHub's status", async () => {
    // Arrange
    const gh = fakeGitHub([], 403);
    const svc = githubSyncService("token", gh.fetchFn, () => NOW);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "failed", message: "GitHub answered 403" });
  });
});

describe("the sync routes", () => {
  it("say how a press starts the sync", async () => {
    // Arrange
    const app = createApp(createServices(testStore(), manualSyncService()));

    // Act
    const info = await app.request("/api/account/sync");

    // Assert
    expect(await info.json()).toEqual({ mode: "manual", url: SYNC_WORKFLOW_URL });
  });

  it("answer a same-origin press with what it did, whatever Host a proxy set", async () => {
    // Arrange
    const app = createApp(createServices(testStore(), manualSyncService()));
    const headers = {
      "Sec-Fetch-Site": "same-origin",
      Origin: "http://localhost:5173",
      Host: "localhost:8787",
    };

    // Act
    const press = await app.request("/api/account/sync", { method: "POST", headers });

    // Assert
    expect(press.status).toBe(200);
    expect(await press.json()).toEqual({ status: "manual", url: SYNC_WORKFLOW_URL });
  });

  it("refuse a press another site sent, without starting a sync", async () => {
    // Arrange
    let started = false;
    const sync = localSyncService(() => {
      started = true;
      return Promise.resolve({ code: 0, output: "pushed" });
    });
    const app = createApp(createServices(testStore(), sync));
    const headers = { "Sec-Fetch-Site": "cross-site", Origin: "https://evil.test" };

    // Act
    const press = await app.request("/api/account/sync", { method: "POST", headers });

    // Assert
    expect(press.status).toBe(403);
    expect(started).toBe(false);
  });

  it("answer a failed sync with 502", async () => {
    // Arrange
    const sync = localSyncService(() => Promise.resolve({ code: 1, output: "boom" }));
    const app = createApp(createServices(testStore(), sync));

    // Act
    const press = await app.request("/api/account/sync", { method: "POST" });

    // Assert
    expect(press.status).toBe(502);
    expect(await press.json()).toEqual({ status: "failed", message: "boom" });
  });
});
