# HEARTH — notes for Claude Code

A cosy game played through a fake in-game terminal. Plain JS, no dependencies.

- Source of truth is `web/`. `docs/index.html` is **generated**, so never edit it by hand.
- After any change in `web/`: run `npm test` (headless full-season playthrough, must be all ✓) then `npm run build`, and commit the build output too (CI checks it's up to date).
- `MODDING.md` explains where everything lives and how to add rooms, fish, crops, letters, commands.
- Writing voice matters more than features here: short, specific, warm, a bit dry. Wren writes in lowercase asides; Fenn is terse; Pip is ALL CAPS enthusiasm; Ottoline loves a PS; Juniper is precise and quietly poetic. No generic "cozy" filler.
- Target is the web for now (a desktop/PC build later, likely by wrapping `docs/index.html`). Keep it a single offline file with no external requests.
- Players may use touch: anything important should be reachable by tapping `{cmd:...}` links or the keycaps (`contextKeys()` in `14-story.js`).
