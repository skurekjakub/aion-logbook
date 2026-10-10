import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

/** Vitest project for the web app: jsdom, Testing Library matchers, and cleanup between tests. */
export default defineProject({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
