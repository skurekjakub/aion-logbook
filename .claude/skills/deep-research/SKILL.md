---
name: deep-research
description: Use when a question about behaviour has to be measured rather than remembered and the answer must outlive the conversation — "research this", "compare what the vendors do", "is X the right call", "what does the standard actually say", a claim in a draft post or a constitution nobody has verified, a design decision the constitutions do not settle, "go deep on", "use whatever it takes". Not for a single-fact lookup, and not for the change itself — once the question is answered, `feature-development` or `project-bugfixing` takes over.
---

# Deep research

Answers a question by measuring, and leaves the measurements behind. The deliverable is a
record under `research/NNN-<slug>/` (see Repo specifics)
— a `README.md` a later session or a post can cite, a `research-trail.md`, and an `evidence/`
folder of verbatim captures. The chat reply is a recap of the README, never the answer's only
home.

**A verdict with no `evidence/` behind it is an opinion.** Without the record, an agent asked
the same question a week later re-derives it; with a summary instead of a capture, it inherits
the transcription error (a vendor table with two doors merged into one cell is the recorded
case). Web search results and the repo's own constitutions are claims to test, not findings —
the constitution that said "same behaviour as vercel.com" was wrong for the case that mattered.

## Prerequisite: superpowers and the search skill

| Need | Skill |
|---|---|
| The web rounds | `iterative-research` — **REQUIRED SUB-SKILL**, its rounds go into `research-trail.md` |
| Reading a pile of repo documents | a subagent (`model: "opus"`; never Fable — `AGENTS.md` § Subagents) |
| Claiming the record is complete | `superpowers:verification-before-completion` |

## The order

**Create a todo per step before starting.** A research run with no checklist is how the
consumer test or the trail quietly goes missing.

1. **Mint the record first.** `ls research/` — highest `NNN` plus one, never reused.
   Write `README.md` with only the question: as the user asked it, then as a falsifiable
   statement ("a negotiated miss should answer the HTML because …"). Everything after this step
   writes into the folder.
2. **Ground truth from the repo, with locators.** Read the code path yourself (`file:line`).
   Dispatch a subagent for the documents — constitutions, `.ai/plans/`, `.ai/bugfixes/`, design
   and eval notes, the tests that pin today's behaviour, the upstream at
   `~/repositories/kentico-docs-jekyll` — with the brief: quote, cite `file:line`, say where a
   document is silent, offer no recommendation. Its report is saved verbatim as an evidence
   file; you do not retype it.
3. **Measure this site.** Write the probe as a script in `evidence/` (the doors are declared at
   its top; the columns are status, content type, `vary`, `cache-control`, `x-robots-tag`,
   `link`, length or redirect target), run it against production, and save the raw table. A
   page that has the feature, a page that exists without it, a path that does not exist, and
   any file class the matcher lets through (`ls public/`) are the minimum rows.
4. **Measure the comparators with the same script.** The vendors the user named (in the order
   they named them), then the ones the domain makes obvious, then the upstream. Same three
   path classes each. A vendor claim from a blog post, a search summary, or a constitution is
   not a measurement until the script has run against that vendor. Long probe batches go in
   the background one host at a time; the raw output is the evidence file, not your paraphrase.
5. **Measure the consumer.** What the real client sends: point the actual tool (WebFetch,
   `curl` with the tool's headers, the crawler's documented UA) at an echo endpoint such as
   `https://httpbin.org/headers`. What it does with the answer: point the same tool at the live
   URL under question and record what reaches the model — a tool that drops the body of every
   non-2xx changes the verdict. Save both.
6. **Primary sources, verbatim.** The RFC or spec: fetch the text and quote the deciding
   paragraphs with section numbers. Vendor documentation and packages: download the package
   (`npm view … dist.tarball`), keep the README and the source that decides, and note version
   and date. A source the fetch tool cannot read is fetched with `curl -H 'Accept:
   text/markdown'` (sites in this domain serve their own Markdown), then `curl` plain; a source
   that stays unreadable is listed as "not used" with the reason.
7. **The web rounds.** `iterative-research`, three rounds of three, each round's queries and
   synthesis written into `research-trail.md` as it happens. Fetch the primary sources the
   rounds surface (step 6) rather than trusting their snippets.
8. **Steelman before verdict.** Write the strongest case for the current behaviour and answer
   it point by point. Then the verdict, the recommendation, and — when the answer implies a
   change — a "what would change" map: files, tests, documents, with `file:line`, marked as a
   map. Side findings the research surfaced but did not settle get their own section; each one
   also becomes `.ai/followups/<slug>.md` in the primary checkout, or a line saying it was
   consciously dropped.
9. **Write the README to the contract below**, then the file index. Every number, header
   value, and vendor behaviour in it points at an evidence file. Re-read `evidence/` before
   claiming a measurement you remember taking.
10. **Reply.** A recap that stands on its own — verdict, the load-bearing evidence, the
    recommendation, the side findings — pointing at the README, and one line offering the page
    as an Artifact. The record exists before the reply is written.

## `README.md` — the contract

In this order. Scale each section to the question; a narrow question gets a short README, not a
missing section.

1. **Header** — what was measured, against what, on which date, from which branch; what the
   research changed (nothing) and where the change lives once it lands.
2. **Question** — as asked, then falsifiable.
3. **Verdict** — one paragraph, the answer and the single strongest reason.
4. **Reasoning** — numbered lines of evidence, each with its evidence-file pointer; the
   comparator table (site × decides-by × the three path classes, measured date) sits here.
5. **The steelman** — the current behaviour's best case, answered.
6. **Recommendation** — the rule, and the open sub-choices with a recommendation each.
7. **What would change** — the map, marked as a map; or "nothing".
8. **Side findings** — out of scope, surfaced for a decision, each with its follow-up.
9. **Sources** — every URL used, with a clause on what it settled.
10. **Files** — the evidence index: one line per file, what it holds.

`research-trail.md` follows the `iterative-research` output format. `evidence/` files are
numbered in the order they were captured, named for what they hold, and never edited after
capture; a later measurement is a new file. Prettier skips the folder; nothing else needs to.

## Subagents

- Every dispatch names `model: "opus"` or `"sonnet"`; the document reader and the reviewer are
  `opus`.
- A brief names the evidence file the subagent writes and its format, so its captures land in
  the record without passing through your context. The final report is saved verbatim beside
  them.
- Do not `EnterWorktree` while a subagent runs in the primary checkout — the isolation guard
  refuses its Bash from that moment. Research happens in the primary checkout; the change it
  recommends is the flow that branches. An agent dispatched into its own worktree
  (`isolation: "worktree"`, as `refresh-meta`'s area agents are) works there by design; the
  rule is about the session that dispatched a subagent into the primary checkout.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The user needs this in an hour; chat is faster than a record" | The record is the answer. A chat answer is gone by the next session and the evidence with it. |
| "The subagent's table is right there, I'll summarise it" | You will merge two cells. The subagent writes the file; you point at it. |
| "The constitution / the post already says what the site does" | Measure it. The constitution's vendor claim was false for the case that decided the question. |
| "Search results say vendor X does Y" | Run the probe against vendor X. Results describe their docs, not their misses. |
| "The headers are documented, the consumer test is overkill" | The decisive fact — the fetch tool drops 4xx bodies — is documented nowhere. |
| "I'll offer a page at the end if they want one" | The page is optional; the record is not. Write the folder first. |
| "The source didn't fetch, I'll cite the summary" | Try `Accept: text/markdown`, then plain `curl`; if it still fails, say "not used" and why. |
| "I remember the number" | Read it back from `evidence/`. |
| "This is a small question, the folder is ceremony" | A small question gets a short README in the same folder shape, not a chat answer. |

## Red flags — stop

- A verdict written before `evidence/` has a capture in it
- A vendor row in the README with no raw table behind it
- A number, header value or quotation in the README that no evidence file contains
- "Measured" with no date, or a date with no target named
- A subagent report paraphrased into the README instead of saved
- The chat reply longer than the README's verdict and reasoning
- A worktree entered while a research subagent is still running

Any of these: stop, produce the missing capture, then continue.

## Repo specifics (aion-logbook)

This skill was written for an HTTP-behaviour blog repo; in this repo the "site" is the Aion 2
guide sites, videos and the game client itself, and the steps map as follows.

- Records live in `research/NNN-<slug>/`: `README.md`, `research-trail.md` and `evidence/`,
  numbered in capture order; a record the app loads also has `import.json`, `curated/` and
  `searches.json`, its saved searches (schema `packages/capture/src/searches.ts`). The records
  test holds a new importable record to both: `import.json` carries
  `"ledger": { "file": "evidence/captures.jsonl" }`, and `searches.json` saves the searches the
  first round ran, each dated to `import.json`'s `startedAt`.
- "Measure" means capture: guide pages, videos and in-game readings saved verbatim into
  `evidence/` with `pnpm capture` (`README.md` § Captures lists the commands and their
  arguments): `web fetch` for a server-rendered guide page, and `youtube` `watch`, `search`,
  `download`, `frames`, `sheet` and `subs` for videos.
- Every file under `evidence/` gets its line in the record's `evidence/captures.jsonl` in the
  commit that adds it. `pnpm capture` writes the line itself; a file captured any other way
  (agent-browser, curl, a derived or hand-written file) gets it from `pnpm capture log <record>
  <path> --url <url|-> --tool <tool>`. `pnpm capture verify <record>` checks a ledger, and
  `pnpm verify` checks every record's. Captured media stays local (gitignored); its line is
  committed.
- Guides disagree. A conflict between guides is recorded with both sources, not resolved by
  picking one silently; confidence stays `theory` unless a source shows measured data.
- The character's own state (skills, stigmas, macros) is read from the client with
  `pnpm game shot` into `account/`, not into a record's `evidence/`; `AGENTS.md` § Game bridge
  holds the safety rules.
- Client-rendered pages are read with agent-browser, headed, using the native Chrome
  (`AGENT_BROWSER_EXECUTABLE_PATH`), and the saved page gets its line from `pnpm capture log`.
- `pnpm import:record <slug>` loads the curated dataset into the app.
