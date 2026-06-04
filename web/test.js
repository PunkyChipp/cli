/* Headless smoke test for the swim game: stub DOM+canvas, run real code. */
const fs = require("fs"), vm = require("vm");
function ctx() { const grad = { addColorStop() {} };
  return new Proxy({}, { get(t, p) { if (p === "createLinearGradient" || p === "createRadialGradient") return () => grad; return p in t ? t[p] : () => {}; }, set(t, p, v) { t[p] = v; return true; } }); }
function el() { const e = { style: {}, width: 800, height: 600, className: "", textContent: "",
  getContext: () => ctx(), addEventListener() {}, setPointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  let h = ""; Object.defineProperty(e, "innerHTML", { get: () => h, set: v => h = "" + v }); return e; }
const els = {};
global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {} };
global.requestAnimationFrame = () => 0; global.setInterval = () => 0; global.setTimeout = () => 0; global.clearTimeout = () => {};
global.confirm = () => true;
const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] };
global.document = { getElementById: id => (els[id] = els[id] || el()), createElement: () => el(), addEventListener() {} };

let fails = 0;
function step(n, f) { try { f(); console.log("✓ " + n); } catch (e) { console.log("✗ FAIL " + n + " :: " + e.message + "\n  " + (e.stack || "").split("\n")[1]); fails++; } }

step("load game.js", () => vm.runInThisContext(fs.readFileSync(__dirname + "/game.js", "utf8"), { filename: "game.js" }));
step("init", () => init());
step("start", () => { S.started = true; });
step("swim updates", () => { input.down = true; input.x = 600; input.y = 300; for (let i = 0; i < 120; i++) update(0.016); });
step("creature moved", () => { if (W.creature.x === W.world.w / 2 && W.creature.y === W.world.h / 2) throw new Error("did not move"); });
step("eat a fish", () => { const c = W.creature, before = S.biomass;
  W.fish.push({ t: FISH[0], x: c.x, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); update(0.016);
  if (S.biomass <= before) throw new Error("fish not eaten"); });
step("buy via orb", () => { S.biomass = 1e6; const o = W.orbs[0]; o.x = W.creature.x; o.y = W.creature.y;
  const lv = S.up[o.k]; update(0.016); if (S.up[o.k] !== lv + 1) throw new Error("orb did not buy"); });
step("easter egg eaten", () => { const c = W.creature; W.eggs.push({ d: EGGS[0], x: c.x, y: c.y, vx: 0, vy: 0, ph: 0, life: 5 });
  update(0.016); if (!S.eggs[EGGS[0].g]) throw new Error("egg not eaten"); });
step("descend", () => { S.size = ZONES[0].req + 1; update(0.016); if (!W.whirl) throw new Error("no whirlpool");
  W.creature.x = W.whirl.x; W.creature.y = W.whirl.y; const z = S.zone; update(0.016);
  if (S.zone !== z + 1) throw new Error("did not descend"); if (S.pressure < 1) throw new Error("no pressure"); });
step("render frame", () => { W.t = 1; render(); });
step("hud + overlays", () => { hud(); showStart(); pick("diver"); flashOverlay(zone()); hideOverlay(); openMenu(); hideOverlay(); toast("hi"); });
step("rare/whale spawn weighting (no crash)", () => { S.up.luck = 25; S.size = 200; for (let i = 0; i < 200; i++) spawnFish(true); });
step("save/load roundtrip", () => { save(); const snap = JSON.parse(store["abyss.swim.v1"]); if (snap.zone !== S.zone) throw new Error("save mismatch"); });

console.log(fails === 0 ? "\nSMOKE: ALL PASS" : "\nSMOKE: " + fails + " FAIL");
process.exit(fails ? 1 : 0);
