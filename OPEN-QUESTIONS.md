# Open questions

Decisions waiting on the user. Each links to the design it rests on. Answer inline, or in a session, and delete the entry once it's settled.

## Assumptions the bootstrap made (2026-10-10)

Spec: [`docs/superpowers/specs/2026-10-10-aion-logbook-design.md`](docs/superpowers/specs/2026-10-10-aion-logbook-design.md), § Assumptions. The run was autonomous, so each of these was decided by the agent and is open to correction.

1. **What "the same project" means.** The port keeps crumble-logbook's architecture, workflow and rules (records, capture ledger, layered API, web app, read-only Vercel site, AutoHotkey tools, `.claude` hooks) and none of its Cookie Run content. Is that the intent, or should any crumble feature (a simulator, rankings, usage stats) have an Aion 2 counterpart?
2. **Classes as the main axis.** Crumble's game modes become Aion 2's classes in the URLs (`/gladiator/...`, `/chanter/...`), and only classes with content show in the navigation. Would you rather browse by purpose (leveling, PvE, PvP) first, with classes inside?
3. **More characters.** The sync and the snapshots track the one character in `account/character.json` (Baon, Cleric, Fafnir EU). Should they carry alts or other servers too?