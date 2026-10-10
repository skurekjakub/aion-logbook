# Comment policy

> **Adapt me.** The `rubber-duk-*` agents grade every comment a diff adds
> against this file. Tighten or loosen it to match your team, then keep it the
> single source of truth.

Comments come in two shapes. Anything else is a finding.

## 1. Doc comments on functions — API documentation

- **Required pattern:** every function, method, class and interface method
  (tests' `it()` bodies excepted, `AGENTS.md`) gets a TSDoc comment: a summary
  of what it does, `@param name - …` for each parameter (units, range, what
  `null` means), `@returns …` when it returns a value, and `@throws …` for how
  it fails. Types stay in TypeScript, not in tags; ESLint enforces it.
- **Forbidden pattern:** restating the signature (`@param id - The id.`),
  describing the implementation step by step, or naming callers.

## 2. Inline comments — at gotchas only

- **Required pattern:** as long as the point needs, placed on the line that
  would surprise a careful reader: a workaround, an ordering constraint, a
  non-obvious invariant. An external constraint carries a locator (issue URL,
  spec section, bug number) that resolves.
- **Forbidden pattern:** narrating what the next line does, section banners,
  authorship, `TODO` without an owner or issue link.

## The voice test

Apply it to every sentence: *would this still be true and useful if a
different caller used this function tomorrow?* If not, it is narrative, and
narrative has a destination other than the code:

| It's actually… | It goes in… |
|---|---|
| Why you chose this, alternatives rejected | the commit message or PR description |
| A behaviour that must keep working | a test, named for the behaviour |
| History ("was X, now Y", "after the refactor") | git log |
| A fact about today's data or deployment | nowhere, or a runbook |
| A plan / ticket / RFC reference | the PR description |

## No archaeology

When code is removed or replaced, remove every comment that mentions the old
shape, and write the remaining comments as if the code had always been this
way. No "replaces X", "now uses Y", "kept for compatibility with the old…".

## Tests

Test bodies are labelled by phase — `// Arrange`, `// Act`, `// Assert`
(`// Act & Assert` for a one-line throw/reject assertion; no label for a
genuinely empty phase). The test name carries the behaviour; don't restate it
in a comment.
