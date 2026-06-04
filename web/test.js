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
step("molt prestige", () => { S.size = moltReq() + 10; S.deepest = 3 * LH; if (!canMolt()) throw new Error("cannot molt"); const r = S.roe, m = S.molts; doMolt(); if (S.roe <= r) throw new Error("no roe"); if (S.molts !== m + 1) throw new Error("molt count"); if (S.apexTier < 1) throw new Error("no apex tier"); if (S.size > 50) throw new Error("size not reset"); });
step("evolution buy + voracity self-amp", () => { S.roe = 1e6; const lv = ev("e_bio"); buyEvo("e_bio"); if (ev("e_bio") !== lv + 1) throw new Error("evo not bought"); const v1 = voracity(); S.evo.e_bio = 10; const v10 = voracity(); if (!(v10 > v1)) throw new Error("voracity not scaling"); });
step("apex multiplier affects gain", () => { S.apexTier = 0; const g0 = gainMult(); S.apexTier = 3; if (!(gainMult() > g0)) throw new Error("apex not applied"); });
step("automation: remora + auto-buy", () => { S.evo.e_autoeat = 1; S.autoOn.eat = true; const c = W.creature; W.fish.push({ id: "shimmer", t: FISH.shimmer, x: c.x + 40, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); const e = S.stats.eaten; for (let i = 0; i < 40; i++) update(0.05); if (S.stats.eaten <= e) throw new Error("remora did not eat");
  S.evo.e_autobuy = 1; S.autoOn.buy = true; S.biomass = 1e9; const tot = Object.values(S.up).reduce((a, b) => a + b, 0); for (let i = 0; i < 40; i++) update(0.05); if (Object.values(S.up).reduce((a, b) => a + b, 0) <= tot) throw new Error("auto-buy did nothing"); });
step("evolution overlay renders", () => { openEvo(); hideOverlay(); moltBanner(); hideOverlay(); });
step("bestiary tracking + mult", () => { const c = W.creature; for (let k = 0; k < 30; k++) { W.fish.push({ id: "shimmer", t: FISH.shimmer, x: c.x, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); update(0.016); } if ((S.best.shimmer || 0) < 20) throw new Error("bestiary not tracked (" + (S.best.shimmer || 0) + ")"); if (!(bestiaryMult() > 1)) throw new Error("bestiary mult not applied"); });
step("feeding frenzy", () => { S.autoOn.eat = false; const g0 = gainMult(); startFrenzy(); if (!W.frenzy) throw new Error("no frenzy"); if (frenzyMult() !== 3) throw new Error("frenzy mult"); if (!(gainMult() > g0)) throw new Error("frenzy not applied"); });
step("apex boss spawn", () => { S.size = 300; const c = W.creature; c.y = 2 * LH + 200; W.cam.y = c.y - 300; W.boss = null; W.bossCD = 0; updateBoss(0.016); if (!W.boss) throw new Error("boss did not spawn"); });
step("apex boss kill + trophy", () => { const c = W.creature, b = W.boss; b.x = c.x; b.y = c.y; b.hp = 1; b.hitCD = 0; c.vx = 200; c.vy = 0; S.size = Math.max(S.size, b.a.sizeReq + 1); const tr = Object.keys(S.trophies).length; updateBoss(0.016); if (W.boss) throw new Error("boss not killed"); if (Object.keys(S.trophies).length <= tr) throw new Error("no trophy"); if (trophyMult() <= 1) throw new Error("trophy mult not applied"); });
step("too-small knockback", () => { S.size = 1; const c = W.creature; c.y = 3 * LH + 200; W.boss = null; W.bossCD = 0; updateBoss(0.016); if (W.boss) { const b = W.boss; b.x = c.x + 5; b.y = c.y; c.vx = 0; c.vy = 0; updateBoss(0.016); if (Math.hypot(c.vx, c.vy) < 50) throw new Error("no knockback when too small"); } });
step("render at several depths", () => { for (const y of [200, LH + 50, 3 * LH + 50, NL * LH + 400]) { W.creature.y = y; W.cam.y = y - 300; W.t = 1; render(); } });
step("hud + menu (with hub)", () => { hud(); openMenu(); hideOverlay(); showStart(); pick("diver"); toast("x"); });
step("save/load", () => { save(); const s = JSON.parse(store["abyss.deep.v1"]); if (!s.wreckFound) throw new Error("save mismatch"); });

console.log(fails === 0 ? "\nSMOKE: ALL PASS" : "\nSMOKE: " + fails + " FAIL");
process.exit(fails ? 1 : 0);
