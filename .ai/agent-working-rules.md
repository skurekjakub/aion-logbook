# Agent working rules

> **Adapt me.** Standing rulings for agents working
> in aion-logbook. Edit freely: delete rules your team doesn't hold, add
> the ones you keep repeating. This file is imported from `CLAUDE.md`, so every
> session reads it.

Standing rulings the repository owner has given agents working in this
checkout. `git log` on this file is the only date a ruling carries, so read it
when a rule looks stale.

Every section is bullets. A bullet is one rule, its reason when the reason is
not obvious, and how to apply it.

---

## 1. Talking to the user

- **Bullets, never paragraphs, in the terminal reply.** Lead with the outcome
  on one line, then one fact per bullet. Anything that needs several sentences
  belongs in a file (spec, follow-up, commit body, PR description), where
  prose is still correct.
- **Plain language first.** Say what breaks, what it means and why it matters
  before any `file:line` chain or type name. Say "throws" or "fails the build";
  never "loud-fail" or "eager-fail".
- **No gratuitous counting.** File counts, line counts and "every member of
  the set" enumerations don't belong in replies, plans, audits or comments.
  Benchmarks, measured costs and thresholds a decision turns on stay, with
  their method.
- **Answer at the end of the turn.** Do the tool work first, then reply in one
  text block.

## 2. Subagents, handoffs and scratch files

- **Before compaction, write a handoff** into the work's own journal folder —
  `.ai/refactoring/NNN-<slug>/` for a refactor,
  `.ai/bugfixes/NNN-<slug>/` for a fix,
  `.ai/feature-constitution/<domain>/<slug>/` for a feature — as
  `<date>-handoff.md`, untracked: where the run is, what is running and where
  its output lands, next steps in order, decisions made, accumulated user
  instructions, scratchpad paths. The handoff belongs in the work's journal
  folder, not in a directory of its own.
- **Specs and plans go where `AGENTS.md` puts them:** `docs/superpowers/specs/`
  and `docs/superpowers/plans/`, which are also the `superpowers:*` defaults.
  Every other working file goes where the skill driving the work says, which
  for the workflows is the journal folder; the journal links its spec and
  plan.
- **Transient scratch** (lane reports, TSVs, command output, commit-message
  files) goes under `.cache/claude-scratch/<lane>/` (git-ignored), not the
  system temp directory, which may not survive the session.

## 3. Design rulings

- **Async-first.** When a function comes to depend on an async read, make the
  function itself async instead of blocking or caching around it.
- **Refactor first.** Before adding code, scan the touched area for
  duplication and fold it into a shared helper as part of the task.
- **Audit dedup against the whole tree.** For every hand-rolled helper a
  diff introduces (regex, pool, walker, formatter, parser), search the whole
  source tree for an existing equivalent, not just the feature's siblings.
  Report "checked, legitimately new" beside the misses.
- **Dead is dead, whatever the doc says.** An unreachable branch kept "for
  extensibility" goes, even when a doc says "dormant, do not delete". Record
  the doc's scenarios in the change's spec and commit message, then delete the
  code, the guard and the doc.

## 4. Comments and docblocks

`docs/conventions/comment-policy.md` is the policy; these corrections are
enforced on top of it:

- **No archaeology, including comparative framing.** Not only "X removed" but
  "replaces X", "mirrors the old contract", "now uses…". No absence
  annotations marking where something was deleted. When ripping out X, delete
  every comment mentioning X and describe the current state as if the code had
  always been this way.
- **Test phases are labelled.** Each test body gets `// Arrange`, `// Act`,
  `// Assert` above the first statement of each phase (`// Act & Assert` for a
  one-line throw/reject assertion; a genuinely empty phase gets no label; the
  label is the whole comment).
- **Comment audits fix comments only.** Naming, fixture and structure
  findings are reported and filed in one batch; the audit never fixes them.

## 5. Tests

- **No test asserts against shipped production data.** Tests own their
  fixtures; production content changes without anyone reading the test suite.
  The capture-ledger check is the exception `AGENTS.md` sets: it runs over
  every committed research record on purpose.

## 6. Documentation content

- **Docs pages carry no version notes.** "Since version X" and upgrade
  effects go in the commit message. The page states current behaviour only.

## 7. Finishing a workflow run and deferred work

- **Work lands on `main`.** `AGENTS.md` has no feature branches until the app
  has a working baseline, so where a workflow skill says feature branch, PR or
  tracker issue, it means this: skip the Isolate phase (worktree lanes for
  parallel agents still merge into `main`), and finish with a commit on
  `main` through `git commit -F <file>` instead of a PR. Review against the
  diff since the run's first commit.
- **A workflow run finishes on the explainer artifact published** and its URL
  in the commit body. Publish the explainer first so the commit can carry it.
  The user reads the explainer instead of the diff.
- **Explainer shape:** a broad summary of the changes, then a simplified
  explainer, then a thorough walkthrough, then a question-and-answer section
  for the user to test their understanding
  (`.ai/resources/skills/explainer-contract.md`).
- **Deferred work is a standalone follow-up file**, never folded into a
  spec, plan, README or commit:
  `.ai/followups/<area>/<YYYYMMDD>-<slug>.md` in the main checkout.
- **Follow-ups from a move wait for the new paths**, so their locators
  resolve.
- **When a run ends with a deferred-work list, ask which shape the user
  wants:** follow-up files or entries in `todo.md`.

## 8. Tooling notes

### Gemini second opinions via `agy`

- `agy` runs a Gemini model headlessly. Newer models may post-date Claude's
  training data, so don't claim a model does not exist because you don't
  recognise its name. Invocation:
  `agy -p "$(cat prompt.txt)" --model <id> --mode plan --dangerously-skip-permissions --print-timeout 30m`,
  in the background.
- **Always `--mode plan --dangerously-skip-permissions`, even with every file
  pasted into the prompt.** Print mode cannot show a permission prompt, so a
  tool call is auto-denied and the run exits 0 having printed nothing.

### agent-browser

- `press Alt+r` delivers a proper keydown with the modifier set.
  `keydown Alt` followed by `keydown t` does not: `altKey` and `repeat` are
  always false. For autorepeat or modifier-hold checks, dispatch a synthetic
  `KeyboardEvent` via `eval --stdin` with the flags set, or rely on the e2e
  suite.
