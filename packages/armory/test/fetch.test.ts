import { describe, expect, it } from "vitest";
import { CharacterMatchError, HttpError, RETRY_DELAY_MS, fetchCharacter } from "../src/fetch";
import { BAON, BAON_ID, EQUIPMENT, INFO, SEARCH, fakeHttp, fixtureText, ok } from "./helpers";

/**
 * A pause that returns at once.
 *
 * @returns a settled promise
 */
const noWait = () => Promise.resolve();

describe("fetchCharacter", () => {
  it("fetches info and equipment by the cached id, without a search", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [INFO]: [ok("character-info-baon.json")],
      [EQUIPMENT]: [ok("character-equipment-baon.json")],
    });

    // Act
    const data = await fetchCharacter(BAON, http);

    // Assert
    expect(calls.map((c) => c.url.pathname)).toEqual([INFO, EQUIPMENT]);
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({
      region: "eu",
      lang: "en-US",
      characterId: BAON_ID,
      serverId: "2319",
    });
    expect(calls[0]!.headers["User-Agent"]).toMatch(/aion-logbook/);
    expect(data.characterId).toBe(BAON_ID);
    expect(data.region).toBe("eu");
    expect(data.info).toMatchObject({ profile: { characterName: "Baon" } });
    expect(data.equipment).toMatchObject({ skill: { skillList: expect.any(Array) } });
  });

  it("finds the id by name search when none is cached, matching the name exactly", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [SEARCH]: [ok("search-baon-eu-fafnir.json")],
      [INFO]: [ok("character-info-baon.json")],
      [EQUIPMENT]: [ok("character-equipment-baon.json")],
    });
    const { characterId: _cached, ...uncached } = BAON;

    // Act
    const data = await fetchCharacter(uncached, http);

    // Assert
    expect(calls.map((c) => c.url.pathname)).toEqual([SEARCH, INFO, EQUIPMENT]);
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toMatchObject({
      keyword: "Baon",
      serverId: "2319",
      region: "eu",
      localeInfo: "en-US",
    });
    expect(data.characterId).toBe(BAON_ID);
    expect(calls[1]!.url.searchParams.get("characterId")).toBe(BAON_ID);
  });

  it("fails naming the character when no search row has the exact name on the server", async () => {
    // Arrange
    const { http } = fakeHttp({ [SEARCH]: [ok("search-baon-eu-fafnir.json")] });

    // Act
    const run = fetchCharacter({ ...BAON, name: "baon", characterId: undefined }, http);

    // Assert
    await expect(run).rejects.toThrow(CharacterMatchError);
    await expect(run).rejects.toThrow(/baon.*2319/);
  });

  it("retries a 5xx once and goes on when the retry answers", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [INFO]: [{ status: 503, body: "busy" }, ok("character-info-baon.json")],
      [EQUIPMENT]: [ok("character-equipment-baon.json")],
    });
    const waits: number[] = [];

    // Act
    const data = await fetchCharacter(BAON, http, (ms) => {
      waits.push(ms);
      return Promise.resolve();
    });

    // Assert
    expect(calls.map((c) => c.url.pathname)).toEqual([INFO, INFO, EQUIPMENT]);
    expect(waits).toEqual([RETRY_DELAY_MS]);
    expect(RETRY_DELAY_MS).toBe(2000);
    expect(data.info).toMatchObject({ profile: { characterName: "Baon" } });
  });

  it("names the request and the status after a second 5xx", async () => {
    // Arrange
    const { http, calls } = fakeHttp({ [INFO]: [{ status: 502, body: "bad gateway" }] });

    // Act
    const run = fetchCharacter(BAON, http, noWait);

    // Assert
    await expect(run).rejects.toThrow(HttpError);
    await expect(run).rejects.toThrow(/character info answered 502: bad gateway/);
    expect(calls).toHaveLength(2);
  });

  it("doesn't retry a 4xx", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [INFO]: [ok("character-info-baon.json")],
      [EQUIPMENT]: [{ status: 403, body: "forbidden" }],
    });

    // Act
    const run = fetchCharacter(BAON, http);

    // Assert
    await expect(run).rejects.toThrow(/character equipment answered 403/);
    expect(calls.map((c) => c.url.pathname)).toEqual([INFO, EQUIPMENT]);
  });

  it("searches again once when the cached id answers 404, and uses the id it finds", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [INFO]: [
        { status: 404, body: fixtureText("character-info-unknown-id.json") },
        ok("character-info-baon.json"),
      ],
      [SEARCH]: [ok("search-baon-eu-fafnir.json")],
      [EQUIPMENT]: [ok("character-equipment-baon.json")],
    });

    // Act
    const data = await fetchCharacter({ ...BAON, characterId: "stale=" }, http);

    // Assert
    expect(calls.map((c) => c.url.pathname)).toEqual([INFO, SEARCH, INFO, EQUIPMENT]);
    expect(data.characterId).toBe(BAON_ID);
  });

  it("fails on the 404 when the search finds the same id again", async () => {
    // Arrange
    const { http, calls } = fakeHttp({
      [INFO]: [{ status: 404, body: fixtureText("character-info-unknown-id.json") }],
      [SEARCH]: [ok("search-baon-eu-fafnir.json")],
    });

    // Act
    const run = fetchCharacter(BAON, http);

    // Assert
    await expect(run).rejects.toThrow(/character info answered 404/);
    expect(calls.map((c) => c.url.pathname)).toEqual([INFO, SEARCH]);
  });

  it("fails naming the request when a body isn't JSON", async () => {
    // Arrange
    const { http } = fakeHttp({ [INFO]: [{ status: 200, body: "<html>maintenance</html>" }] });

    // Act
    const run = fetchCharacter(BAON, http);

    // Assert
    await expect(run).rejects.toThrow(/character info answered 200: a body that isn't JSON/);
  });
});
