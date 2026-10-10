/**
 * Writes the Vercel deployment to `.vercel/output` at the repo root, in
 * Vercel's Build Output API layout: the built web app (`apps/web/dist`, so
 * run `vite build` first) as static files that fall back to `index.html`,
 * and `src/vercel.ts` bundled as the function every `/api` request reaches.
 * Run via `pnpm build:vercel`, which builds the web app first.
 *
 * The bundle keeps `import.meta.url`, from which `@aion/schema/migrations`
 * resolves `../migrations`, so the bundle sits in the function's `src/` and
 * the migrations are copied to its `migrations/`.
 *
 * Exits with the underlying error if the web app isn't built or the bundle
 * fails.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { migrationsFolder } from "@aion/schema/migrations";
import { repoRoot } from "../config";

const webDist = join(repoRoot, "apps", "web", "dist");
const output = join(repoRoot, ".vercel", "output");
const fn = join(output, "functions", "api.func");

if (!existsSync(join(webDist, "index.html"))) {
  console.error(`no web build at ${webDist}: run the web app's vite build first`);
  process.exit(1);
}

rmSync(output, { recursive: true, force: true });
cpSync(webDist, join(output, "static"), { recursive: true });

await build({
  entryPoints: [join(repoRoot, "apps", "server", "src", "vercel.ts")],
  outfile: join(fn, "src", "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  minify: true,
  legalComments: "none",
  // Bundled CommonJS dependencies call `require`, which an ES module lacks.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
cpSync(migrationsFolder, join(fn, "migrations"), { recursive: true });

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs24.x",
    handler: "src/index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
  }),
);
mkdirSync(output, { recursive: true });
writeFileSync(
  join(output, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "^/api(?:/.*)?$", dest: "/api" },
      { handle: "filesystem" },
      { src: "/.*", dest: "/index.html" },
    ],
  }),
);
console.log(`wrote ${output}`);
