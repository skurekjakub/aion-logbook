import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * The repo's ESLint flat config: type-aware typescript-eslint rules for every workspace package, React hook
 * rules for the web app, and relaxed rules for tests and CLI scripts. Formatting is Prettier's job, so no
 * stylistic rules are enabled. Type information comes from each package's own tsconfig via the project service.
 *
 * @param rootDir - absolute path of the repo root, used to resolve the tsconfigs.
 * @returns the flat config array for the root `eslint.config.ts`.
 */
export function aionConfig(rootDir: string) {
  return defineConfig(
    globalIgnores([
      "**/node_modules/",
      "**/dist/",
      "**/migrations/",
      "apps/web/src/routeTree.gen.ts",
      "research/",
      "data/",
      "docs/",
      ".claude/",
      ".superpowers/",
      ".vercel/",
    ]),

    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: rootDir },
        globals: globals.node,
      },
      linterOptions: { reportUnusedDisableDirectives: "error" },
      rules: {
        // With `noUncheckedIndexedAccess`, `!` is the explicit, reviewable way to say "this index exists".
        "@typescript-eslint/no-non-null-assertion": "off",
        // `Record<never, never>` is the deliberate "no filters" default of the registry's mapped types.
        "@typescript-eslint/no-generated-empty-object-type": "off",
        // Single-use type parameters carry inference through the registry and view helpers.
        "@typescript-eslint/no-unnecessary-type-parameters": "off",
        // TanStack Router's `redirect()` and `notFound()` are thrown by design.
        "@typescript-eslint/only-throw-error": [
          "error",
          {
            allow: [
              { from: "package", package: "@tanstack/router-core", name: "Redirect" },
              { from: "package", package: "@tanstack/router-core", name: "NotFoundError" },
            ],
          },
        ],
        // Template literals with numbers are how the views format stats; the rule's default only allows strings.
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        // Arrow shorthands such as `onClick={() => setOpen(false)}` return a void call by design.
        "@typescript-eslint/no-confusing-void-expression": [
          "error",
          { ignoreArrowShorthand: true },
        ],
        // Unused names prefixed with `_` are deliberate (positional args, destructuring to omit a key).
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
        ],
        // Server code logs through the CLI and the startup line only; anywhere else a console call is a leftover.
        "no-console": "error",
        eqeqeq: ["error", "always", { null: "ignore" }],
      },
    },

    // JSDoc on every named function, method and class, TSDoc-style: a summary, `@param name - …` for each parameter,
    // `@returns …` when it returns a value, `@throws …` when it throws. Types stay in TypeScript, not in tags.
    jsdoc.configs["flat/recommended-typescript-error"],
    {
      settings: { jsdoc: { tagNamePreference: { template: "typeParam" } } },
      rules: {
        // `@typeParam` is TSDoc's name for a type parameter; `@module` heads a file's overview comment.
        "jsdoc/check-tag-names": ["error", { definedTags: ["typeParam", "module"], typed: false }],
        // `@throws {ConflictError} …` and `@throws whatever the inserts throw …` are both fine.
        "jsdoc/require-throws-type": "off",
        // Destructured props are documented on their interface, not as `@param props.x` lines.
        "jsdoc/require-param": ["error", { checkDestructured: false }],
        "jsdoc/check-param-names": ["error", { checkDestructured: false }],
        // Named functions need JSDoc: declarations, arrows and function expressions bound to a const or
        // exported, class and object-literal methods, and interface methods. Inline callbacks (a column's
        // `cell`, a `queryFn`, a `.map` arrow) are read in place and need none.
        "jsdoc/require-jsdoc": [
          "error",
          {
            publicOnly: false,
            require: {
              FunctionDeclaration: true,
              FunctionExpression: false,
              ArrowFunctionExpression: false,
              MethodDefinition: true,
              ClassDeclaration: true,
            },
            contexts: [
              "VariableDeclarator > ArrowFunctionExpression",
              "VariableDeclarator > FunctionExpression",
              "ExportDefaultDeclaration > ArrowFunctionExpression",
              "Property[method=true] > FunctionExpression",
              "TSMethodSignature",
              "TSPropertySignature > TSTypeAnnotation > TSFunctionType",
            ],
            checkConstructors: false,
          },
        ],
        "jsdoc/require-description": ["error", { contexts: ["any"] }],
        "jsdoc/require-throws": "error",
        "jsdoc/require-hyphen-before-param-description": ["error", "always"],
        "jsdoc/tag-lines": ["error", "any", { startLines: 1 }],
        "jsdoc/no-blank-block-descriptions": "error",
      },
    },

    {
      files: ["apps/web/**/*.{ts,tsx}"],
      extends: [reactHooks.configs.flat["recommended-latest"]],
      languageOptions: { globals: globals.browser },
    },

    {
      // CLI scripts and the server entry report to the terminal.
      files: [
        "apps/server/src/cli/**",
        "apps/server/src/main.ts",
        "apps/server/src/app.ts",
        "packages/capture/src/cli.ts",
        "apps/web/scripts/**",
      ],
      rules: { "no-console": "off" },
    },

    {
      // Tests assert on shapes they just built; loose typing is fine there.
      files: ["**/test/**", "**/*.test.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/unbound-method": "off",
      },
    },

    {
      // Test cases are named by their `it()` strings; helpers shared across test files still need JSDoc.
      files: ["**/*.test.{ts,tsx}"],
      rules: { "jsdoc/require-jsdoc": "off" },
    },
  );
}
