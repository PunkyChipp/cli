# ABYSS — dev handoff

A deep-sea **swim-and-eat incremental**. You're a bioluminescent predator: swim
(joystick / WASD), eat fish to grow, bump glowing orbs to upgrade, dive ever
deeper, and climb a nested reset ladder.

## Where the code lives (source of truth = `web/`)
- `web/game.js` — **everything**: data tables, game logic, canvas rendering, UI/overlays, input. (~900 lines, single file.)
- `web/style.css` — the DOM UI styling (HUD, overlays, shop cards).
- `web/index.html` — dev page that loads `style.css` + `game.js`.
- `web/test.js` — headless Node smoke test (stubs DOM/canvas, runs the real code).

## Build targets (generated from `web/`)
- `docs/index.html` — single self-contained file (style + game inlined into one HTML).
- `Abyss.html` — copy of the above for handing to the user (open in any browser).
- `Abyss.swiftpm/` — native iPad app (Swift Playgrounds): a SwiftUI `WKWebView`
  (`WebGameView.swift`, `MyApp.swift`, `Package.swift`) that loads the embedded
  game from `Abyss.swiftpm/GameHTML.swift` (the HTML as a Swift raw string).

### Regenerate the builds after editing `web/` (run from repo root)
```sh
node --check web/game.js && node web/test.js   # must pass
{
  printf '%s\n' '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
  printf '%s\n' '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">'
  printf '%s\n' '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
  printf '%s\n' '<title>Abyss</title><style>'; cat web/style.css; printf '%s\n' '</style></head><body>'
  printf '%s\n' '<canvas id="c"></canvas><div id="hud"></div><button id="menu" onclick="openMenu()">&#9776;</button><div id="toast"></div><div id="overlay"></div>'
  printf '%s\n' '<script>'; cat web/game.js; printf '%s\n' '</script></body></html>'
} > docs/index.html
cp docs/index.html Abyss.html
{ printf '%s\n' '// Auto-generated from web/ build.'; printf '%s\n' 'let GAME_HTML = ###"""'; cat docs/index.html; printf '%s\n' '"""###'; } > Abyss.swiftpm/GameHTML.swift
```
Then `zip -rq Abyss.swiftpm.zip Abyss.swiftpm -x '*/.DS_Store'` for the iPad deliverable.

## CI
`.github/workflows/build.yml` compiles `Abyss.swiftpm` (scheme **"Abyss"**) on a
macOS runner; triggers on `Abyss.swiftpm/**` changes. Check via the GitHub MCP
`actions_list`/`get_workflow_job`. (Web is verified by `node web/test.js`, not CI.)
Branch: **`claude/adoring-turing-cP7gR`**.

## game.js architecture
- `S` = saved state (localStorage `abyss.deep.v1`); `W` = transient world (entities, camera, timers).
- Data: `LAYERS` (8 depth zones), `FISH`, `UPS` (in-dive orb upgrades), `PERM`
  (Wreck Hub), `EVO` (Rebirth tree), `BL` (Bloodline/Migration tree), `PRIM`
  (Primordial/Ascension tree), `APEX` (6 bosses), `ACH`, `EGGS`.
- Reset ladder: **Rebirth** (→Roe→EVO, +Apex Tier) → **Migration** (→Lineage→BL,
  +Mig Tier, awakens Bestiary) → **Ascension** (→Spirit→PRIM). All multiply `gainMult()`.
- `update(dt)` sim; `render()` draws via baked **vector sprites** (`fishSprite`,
  `orbSprite`/`gemSprite`, `apexSprite` silhouettes, `darkSprite`); creature drawn live.
- Input: `steer()` = fixed-base floating joystick + WASD; drawn at end of `render()`.
- Perf: adaptive resolution (`RES`/`adaptRes()` by frame time), capped, sprite cache, off-screen culling.

## Tuning knobs
- `FEEL` (movement: maxSpeedBase, resp, turn, camLerp), `JOY_R` (joystick push radius).
- Reset pacing: `moltReq/roeGain`, `migReq/lineageGain/migUnlocked`, `spiritGain/ascUnlocked`.
- `fishCap()/spawnRate()`, `APEX[].hp/dmg/sizeReq`, gate sizes `LAYERS[].req`.

## Recent state / open threads
- Done: vector art (no in-game emoji), premium CSS UI, adaptive res + baked lighting,
  fixed-base joystick, fish cap/rate upgrades.
- Open: balance tuning (early game liked; mid/late first-pass), maybe vectorize the
  oddity-log emoji + toasts, more zones/bosses, a 4th reset. WASD unreliable in iOS WebView.
- iPad: must ship as `Abyss.swiftpm` (school blocks hosted URLs / local HTML viewers).
