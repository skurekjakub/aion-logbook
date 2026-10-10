# Open questions

Decisions waiting on the user. Each links to the design it rests on. Answer inline, or in a session, and delete the entry once it's settled.

## Assumptions the bootstrap made (2026-10-10)

Spec: [`docs/superpowers/specs/2026-10-10-aion-logbook-design.md`](docs/superpowers/specs/2026-10-10-aion-logbook-design.md), § Assumptions. The run was autonomous, so each of these was decided by the agent and is open to correction.

1. **What "the same project" means.** The port keeps crumble-logbook's architecture, workflow and rules (records, capture ledger, layered API, web app, read-only Vercel site, AutoHotkey tools, `.claude` hooks) and none of its Cookie Run content. Is that the intent, or should any crumble feature (a simulator, rankings, usage stats) have an Aion 2 counterpart?
2. **Classes as the main axis.** Crumble's game modes become Aion 2's classes in the URLs (`/gladiator/...`, `/chanter/...`), and only classes with content show in the navigation. Would you rather browse by purpose (leveling, PvE, PvP) first, with classes inside?
3. **Which character.** The bridge reads the character logged in on the Steam (global) client at `E:\Steam\steamapps\common\AION2`. Is that the only character to track, or should snapshots carry several characters or servers?
4. **Which class the first record researches.** Record 001 researches the logged-in character's class. Is there another class you want covered next?
5. **Driving the game.** The agent may click and type in menus (skills, stigmas, macro editor, key settings), never in combat or in a party, and checks a screenshot before every next input. Is any window off limits, or should every change wait for your go-ahead?
6. **Publishing.** The repo goes public on `skurekjakub` and the site on Vercel, both carrying the character's name, level and build as read from the client. Is the character's name fine to publish, or should snapshots drop it?