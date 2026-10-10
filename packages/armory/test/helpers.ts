import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AccountSnapshotFile } from "@aion/schema";
import type { CharacterData, CharacterFile, Http, HttpResponse } from "../src/fetch";

/** The folder holding the captured official responses and the game-read snapshot the tests use. */
export const FIXTURES = join(import.meta.dirname, "fixtures");

/** Baon's id as the info response spells it. */
export const BAON_ID = "xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo=";

/** The character file the tests fetch for, with its id cached. */
export const BAON: CharacterFile = {
  name: "Baon",
  region: "eu",
  serverId: 2319,
  server: "Fafnir (EU)",
  characterId: BAON_ID,
};

/** The info endpoint's path. */
export const INFO = "/api/character/info";
/** The equipment endpoint's path. */
export const EQUIPMENT = "/api/character/equipment";
/** The global search endpoint's path. */
export const SEARCH = "/aion2global/search/v2/character";

/** A request the fake answered: its URL and headers. */
export interface HttpCall {
  /** The URL asked for. */
  url: URL;
  /** The headers sent. */
  headers: Record<string, string>;
}

/**
 * Builds a fake {@link Http} answering by URL path: each request to a path
 * takes that path's next canned response, the last one repeating; a path
 * with none answers 404.
 *
 * @param routes - path (e.g. `/api/character/info`) → its responses, in order
 * @returns the fake and the requests it answered, in order
 */
export function fakeHttp(routes: Record<string, HttpResponse[]>): {
  http: Http;
  calls: HttpCall[];
} {
  const calls: HttpCall[] = [];
  const served = new Map<string, number>();
  /**
   * Answers one request with its path's next canned response.
   *
   * @param url - the URL asked for
   * @param headers - the headers sent
   * @returns the canned response
   */
  const http: Http = (url, headers) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, headers });
    const responses = routes[parsed.pathname];
    if (!responses) return Promise.resolve({ status: 404, body: "{}" });
    const n = served.get(parsed.pathname) ?? 0;
    served.set(parsed.pathname, n + 1);
    return Promise.resolve(responses[Math.min(n, responses.length - 1)]!);
  };
  return { http, calls };
}

/**
 * A 200 answer with a fixture's body.
 *
 * @param name - the fixture's file name
 * @returns the answer
 */
export const ok = (name: string): HttpResponse => ({ status: 200, body: fixtureText(name) });

/**
 * A fake official site answering Baon's info and equipment, and the name search.
 *
 * @returns the fake and the requests it answered
 */
export function baonSite() {
  return fakeHttp({
    [SEARCH]: [ok("search-baon-eu-fafnir.json")],
    [INFO]: [ok("character-info-baon.json")],
    [EQUIPMENT]: [ok("character-equipment-baon.json")],
  });
}

/**
 * Reads a fixture as text.
 *
 * @param name - the file's name under `fixtures/`
 * @returns its contents
 */
export function fixtureText(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf-8");
}

/**
 * Reads and parses a JSON fixture, as a fresh copy a test may edit.
 *
 * @param name - the file's name under `fixtures/`
 * @returns the parsed value, unchecked
 */
export function fixtureJson<T = unknown>(name: string): T {
  return JSON.parse(fixtureText(name)) as T;
}

/**
 * The captured character data for Baon, Fafnir (EU), as `fetchCharacter` returns it.
 *
 * @returns a fresh copy a test may edit
 */
export function baon(): CharacterData {
  return {
    region: "eu",
    characterId: "xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo=",
    info: fixtureJson("character-info-baon.json"),
    equipment: fixtureJson("character-equipment-baon.json"),
  };
}

/**
 * The game-read snapshot of Baon the captured data is compared with.
 *
 * @returns a fresh copy a test may edit
 */
export function gameRead(): AccountSnapshotFile {
  return fixtureJson<AccountSnapshotFile>("snapshot-2026-10-10.json");
}
