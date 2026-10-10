import { defineConfig } from "drizzle-kit";

/** drizzle-kit config: generates SQLite migrations from the table schema into `./migrations`. */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/tables/index.ts",
  out: "./migrations",
});
