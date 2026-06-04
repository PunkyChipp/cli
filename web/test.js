/* Headless smoke test for the continuous-descent game. */
const fs = require("fs"), vm = require("vm");
function ctx() { const grad = { addColorStop() {} };
  return new Proxy({}, { get(t, p) { if (p === "createLinearGradient" || p === "createRadialGradient") return () => grad; if (p === "setLineDash") return () => {}; return p in t ? t[p] : () => {}; }, set(t, p, v) { t[p] = v; return true; } }); }
function el() { const e = { style: {}, width: 800, height: 600, className: "", textContent: "", getContext: () => ctx(), addEventListener() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  let h = ""; Object.defineProperty(e, "innerHTML", { get: () => h, set: v => h = "" + v }); return e; }
const els = {};
global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {} };
global.requestAnimationFrame = () => 0; global.setInterval = () => 0; global.setTimeout = () => 0; global.clearTimeout = () => {}; global.confirm = () => true;
const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] };
global.document = { getElementById: id => (els[id] = els[id] || el()), createElement: () => el(), addEventListener() {} };

let fails = 0;
function step(n, f) { try { f(); console.log("✓ " + n); } catch (e) { console.log("✗ FAIL " + n + " :: " + e.message + "\n  " + (e.stack || "").split("\n")[1]); fails++; } }

step("load", () => vm.runInThisContext(fs.readFileSync(__dirname + "/game.js", "utf8"), { filename: "game.js" }));
step("init + start", () => { init(); S.started = true; });
step("swim & move", () => { input.down = true; input.x = 700; input.y = 500; for (let i = 0; i < 120; i++) update(0.016); if (W.creature.y === 200 && W.creature.x === WW / 2) throw new Error("no move"); });
step("eat", () => { const c = W.creature, b = S.biomass; W.fish.push({ id: "shimmer", t: FISH.shimmer, x: c.x, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); update(0.016); if (S.biomass <= b) throw new Error("not eaten"); });
step("orb buy", () => { S.biomass = 1e7; const o = W.orbs[0]; o.x = W.creature.x; o.y = W.creature.y; W.creature.y = o.y; const lv = S.up[o.k]; update(0.016); if (S.up[o.k] !== lv + 1) throw new Error("no buy"); });
step("gating blocks deep dive", () => { S.size = 0; const c = W.creature; c.y = LH - 5; c.vy = 600; for (let i = 0; i < 30; i++) update(0.05); if (c.y > LH) throw new Error("passed barrier while too small (y=" + c.y + ")"); });
step("growing opens descent", () => { S.size = 1000; const c = W.creature; c.vy = 600; for (let i = 0; i < 40; i++) update(0.05); if (c.y <= LH) throw new Error("could not descend when big"); });
step("reach wreck", () => { S.size = WRECK_REQ + 10; const c = W.creature; c.y = NL * LH + 200; const r = S.relics; update(0.016); if (!S.wreckFound) throw new Error("wreck not found"); if (S.relics <= r) throw new Error("no relic reward"); });
step("salvage treasure", () => { const c = W.creature; c.y = (NL - 1) * LH + 100; spawnTreasure(); const tr = W.treas[W.treas.length - 1]; if (!tr) throw new Error("no treasure"); tr.x = c.x; tr.y = c.y; const r = S.relics; update(0.016); if (S.relics <= r) throw new Error("treasure not salvaged"); });
step("buy permanent (relic hub)", () => { S.relics = 1e6; const lv = S.perm.pglow; buyPerm("pglow"); if (S.perm.pglow !== lv + 1) throw new Error("perm not bought"); });
step("render at several depths", () => { for (const y of [200, LH + 50, 3 * LH + 50, NL * LH + 400]) { W.creature.y = y; W.cam.y = y - 300; W.t = 1; render(); } });
step("hud + menu (with hub)", () => { hud(); openMenu(); hideOverlay(); showStart(); pick("diver"); toast("x"); });
step("save/load", () => { save(); const s = JSON.parse(store["abyss.deep.v1"]); if (!s.wreckFound) throw new Error("save mismatch"); });

console.log(fails === 0 ? "\nSMOKE: ALL PASS" : "\nSMOKE: " + fails + " FAIL");
process.exit(fails ? 1 : 0);
