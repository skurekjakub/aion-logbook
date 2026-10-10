import { describe, expect, it } from "vitest";
import type { BuildView, MacroView, SkillRow } from "../src/services/builds";
import { addSource, jsonBody, makeTestApp, readJson, testStore } from "./helpers";

const build = {
  id: "gladiator-leveling",
  class: "gladiator",
  purpose: "leveling",
  title: "Leveling",
  why: "w",
  confidence: "theory",
  skills: [{ skillId: "gladiator-ruinous-blow", rank: 1, targetLevel: 10, why: "w" }],
  stigmas: [{ slotLevel: 22, skillId: "gladiator-wrath-wave", why: "w" }],
  macros: [
    {
      id: "gladiator-leveling-main",
      name: "Main",
      key: "R",
      delayMs: 10,
      why: "w",
      steps: [{ skillId: "gladiator-ruinous-blow" }],
    },
  ],
};

const skills = [
  {
    id: "gladiator-ruinous-blow",
    class: "gladiator",
    name: "Ruinous Blow",
    kind: "active",
    unlockLevel: 10,
  },
  {
    id: "gladiator-wrath-wave",
    class: "gladiator",
    name: "Wrath Wave",
    kind: "stigma",
    unlockLevel: 22,
  },
];

/**
 * Builds the app with the build's skills already posted.
 *
 * @returns the app
 * @throws if a skill isn't created
 */
async function appWithSkills() {
  const app = makeTestApp();
  for (const skill of skills) {
    const res = await app.request("/api/skills", jsonBody(skill));
    if (res.status !== 201) throw new Error(`skill ${skill.id}: ${res.status}`);
  }
  return app;
}

describe("/api/builds", () => {
  it("creates a build and returns it nested", async () => {
    // Arrange
    const app = makeTestApp();
    for (const s of skills) {
      expect((await app.request("/api/skills", jsonBody(s))).status).toBe(201);
    }

    // Act
    const created = await app.request("/api/builds", jsonBody(build));
    const got = await readJson<BuildView>(await app.request("/api/builds/gladiator-leveling"));

    // Assert
    expect(created.status).toBe(201);
    expect(got.macros[0]!.steps[0]!.skill.name).toBe("Ruinous Blow");
    expect(got.stigmas[0]!.slotLevel).toBe(22);
  });

  it("nests skills by rank, stigmas by slot and macro steps by position, with sources", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const got = await readJson<BuildView>(await app.request("/api/builds/gladiator-leveling"));

    // Assert
    expect(got).toMatchObject({
      id: "gladiator-leveling",
      class: "gladiator",
      purpose: "leveling",
      obsoleteSince: null,
      sources: [],
      obsoleteSources: [],
      skills: [
        {
          rank: 1,
          targetLevel: 10,
          why: "w",
          skill: { id: "gladiator-ruinous-blow", unlockLevel: 10 },
        },
      ],
      stigmas: [{ slotLevel: 22, why: "w", skill: { id: "gladiator-wrath-wave", kind: "stigma" } }],
      macros: [
        {
          id: "gladiator-leveling-main",
          key: "R",
          delayMs: 10,
          steps: [{ position: 1, note: null, skill: { name: "Ruinous Blow" } }],
        },
      ],
    });
  });

  it("422s a build naming an unknown skill", async () => {
    // Arrange
    const app = makeTestApp();

    // Act
    const res = await app.request("/api/builds", jsonBody(build));

    // Assert
    expect(res.status).toBe(422);
    expect(JSON.stringify(await res.json())).toContain("gladiator-ruinous-blow");
  });

  it("422s a build citing an unknown source, and 409s a build id already taken", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const cited = await app.request(
      "/api/builds",
      jsonBody({ ...build, id: "gladiator-pve", macros: [], sources: ["web:missing"] }),
    );
    const taken = await app.request("/api/builds", jsonBody({ ...build, macros: [] }));

    // Assert
    expect(cited.status).toBe(422);
    expect(await cited.json()).toMatchObject({ kind: "sources", ids: ["web:missing"] });
    expect(taken.status).toBe(409);
  });

  it("400s a build that fills a stigma slot twice", async () => {
    // Arrange
    const app = await appWithSkills();
    const twice = { ...build, stigmas: [...build.stigmas, ...build.stigmas] };

    // Act
    const res = await app.request("/api/builds", jsonBody(twice));

    // Assert
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("fills a stigma slot twice");
  });

  it("returns [] for a class with no builds", async () => {
    // Arrange
    const app = makeTestApp();

    // Act
    const got = await readJson<unknown>(await app.request("/api/builds?class=cleric"));

    // Assert
    expect(got).toEqual([]);
  });

  it("filters the list by class and purpose", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));
    await app.request(
      "/api/builds",
      jsonBody({ ...build, id: "gladiator-pvp", purpose: "pvp", macros: [] }),
    );

    // Act
    const gladiator = await readJson<BuildView[]>(await app.request("/api/builds?class=gladiator"));
    const pvp = await readJson<BuildView[]>(await app.request("/api/builds?purpose=pvp"));

    // Assert
    expect(gladiator.map((b) => b.id)).toEqual(["gladiator-leveling", "gladiator-pvp"]);
    expect(pvp.map((b) => b.id)).toEqual(["gladiator-pvp"]);
  });

  it("patches a build's own fields and keeps its children", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const res = await app.request(
      "/api/builds/gladiator-leveling",
      jsonBody({ title: "Leveling, revised" }, "PATCH"),
    );

    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      title: "Leveling, revised",
      skills: [{ rank: 1 }],
      macros: [{ id: "gladiator-leveling-main" }],
    });
  });

  it("deletes a build with its macros, and 404s it afterwards", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const res = await app.request("/api/builds/gladiator-leveling", { method: "DELETE" });

    // Assert
    expect(res.status).toBe(204);
    expect((await app.request("/api/builds/gladiator-leveling")).status).toBe(404);
    expect(await readJson<unknown>(await app.request("/api/macros"))).toEqual([]);
  });
});

describe("/api/macros", () => {
  it("lists a build's macro chains with their steps, and filters them by build", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const all = await readJson<MacroView[]>(await app.request("/api/macros"));
    const none = await readJson<MacroView[]>(await app.request("/api/macros?build=gladiator-pvp"));

    // Assert
    expect(all).toMatchObject([
      { id: "gladiator-leveling-main", buildId: "gladiator-leveling", steps: [{ position: 1 }] },
    ]);
    expect(none).toEqual([]);
  });

  it("creates a macro on a build, and 422s one on a build that doesn't exist", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody({ ...build, macros: [] }));
    const macro = { ...build.macros[0]!, buildId: "gladiator-leveling" };

    // Act
    const created = await app.request("/api/macros", jsonBody(macro));
    const orphan = await app.request(
      "/api/macros",
      jsonBody({ ...macro, id: "orphan", buildId: "nope" }),
    );

    // Assert
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      steps: [{ position: 1, skill: { name: "Ruinous Blow" } }],
    });
    expect(orphan.status).toBe(422);
    expect(await orphan.json()).toMatchObject({ kind: "builds", ids: ["nope"] });
  });

  it("patches a macro's key and deletes it", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const patched = await app.request(
      "/api/macros/gladiator-leveling-main",
      jsonBody({ key: "F" }, "PATCH"),
    );
    const deleted = await app.request("/api/macros/gladiator-leveling-main", { method: "DELETE" });

    // Assert
    expect(await patched.json()).toMatchObject({ key: "F" });
    expect(deleted.status).toBe(204);
    expect((await app.request("/api/macros/gladiator-leveling-main")).status).toBe(404);
  });
});

describe("/api/skills", () => {
  it("lists skills by class, then unlock level, and filters them by kind", async () => {
    // Arrange
    const app = await appWithSkills();

    // Act
    const all = await readJson<SkillRow[]>(await app.request("/api/skills"));
    const stigmas = await readJson<SkillRow[]>(await app.request("/api/skills?kind=stigma"));

    // Assert
    expect(all.map((s) => s.id)).toEqual(["gladiator-ruinous-blow", "gladiator-wrath-wave"]);
    expect(stigmas.map((s) => s.id)).toEqual(["gladiator-wrath-wave"]);
  });

  it("409s deleting a skill a build names, and keeps the skill", async () => {
    // Arrange
    const app = await appWithSkills();
    await app.request("/api/builds", jsonBody(build));

    // Act
    const res = await app.request("/api/skills/gladiator-ruinous-blow", { method: "DELETE" });

    // Assert
    expect(res.status).toBe(409);
    expect((await app.request("/api/skills/gladiator-ruinous-blow")).status).toBe(200);
  });
});

describe("?class= on class-wide findings", () => {
  it("keeps the rows of that class and the rows that apply to every class", async () => {
    // Arrange
    const store = testStore();
    addSource(store, "web:a");
    const app = makeTestApp(store);
    for (const cls of ["gladiator", "cleric", null]) {
      await app.request(
        "/api/mechanics",
        jsonBody({
          title: String(cls),
          body: "b",
          confidence: "posted",
          class: cls,
          sources: ["web:a"],
        }),
      );
    }

    // Act
    const got = await readJson<Array<{ title: string }>>(
      await app.request("/api/mechanics?class=gladiator"),
    );

    // Assert
    expect(got.map((m) => m.title)).toEqual(["gladiator", "null"]);
  });
});
