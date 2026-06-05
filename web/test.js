/* Headless smoke test — continuous descent + full reset ladder. */
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
step("8 layers", () => { if (NL !== 8) throw new Error("expected 8 layers, got " + NL); });
step("swim & move", () => { input.down = true; input.x = 700; input.y = 500; for (let i = 0; i < 120; i++) update(0.016); if (W.creature.y === 200 && W.creature.x === WW / 2) throw new Error("no move"); });
step("eat", () => { const c = W.creature, b = S.biomass; W.fish.push({ id: "shimmer", t: FISH.shimmer, x: c.x, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); update(0.016); if (S.biomass <= b) throw new Error("not eaten"); });
step("orb buy", () => { S.biomass = 1e7; const o = W.orbs[0]; o.x = W.creature.x; o.y = W.creature.y; W.creature.y = o.y; const lv = S.up[o.k]; update(0.016); if (S.up[o.k] !== lv + 1) throw new Error("no buy"); });
step("gating blocks deep dive", () => { S.size = 0; const c = W.creature; c.y = LH - 5; c.vy = 600; for (let i = 0; i < 30; i++) update(0.05); if (c.y > LH) throw new Error("passed barrier too small (" + c.y + ")"); });
step("growing opens descent", () => { S.size = 1e5; const c = W.creature; c.vy = 600; for (let i = 0; i < 60; i++) update(0.05); if (c.y <= LH) throw new Error("could not descend"); });
step("reach wreck", () => { S.size = WRECK_REQ + 10; const c = W.creature; c.y = WRECK_LAYER * LH + 200; const r = S.relics; update(0.016); if (!S.wreckFound) throw new Error("wreck not found"); if (S.relics <= r) throw new Error("no relic reward"); });
step("salvage treasure", () => { S.size = 1e6; const c = W.creature; c.y = 3 * LH + 100; update(0.016); spawnTreasure(); const tr = W.treas[W.treas.length - 1]; if (!tr) throw new Error("no treasure"); tr.x = c.x; tr.y = c.y; const r = S.relics; update(0.016); if (S.relics <= r) throw new Error("not salvaged"); });
step("relic hub buy", () => { S.relics = 1e6; const lv = S.perm.pglow; buyPerm("pglow"); if (S.perm.pglow !== lv + 1) throw new Error("perm not bought"); });
step("rebirth (molt)", () => { S.size = moltReq() + 10; S.deepest = 4 * LH; if (!canMolt()) throw new Error("cannot rebirth"); const r = S.roe, m = S.molts; doMolt(); if (S.roe <= r || S.molts !== m + 1 || S.apexTier < 1) throw new Error("rebirth bad"); });
step("evolution + voracity", () => { S.roe = 1e6; buyEvo("e_bio"); const v1 = voracity(); S.evo.e_bio = 10; if (!(voracity() > v1)) throw new Error("voracity not scaling"); });
step("migration unlock + migrate", () => { S.molts = 4; S.deepest = 4 * LH + 10; S.roe = 200; if (!migUnlocked()) throw new Error("mig not unlocked"); if (!canMigrate()) throw new Error("cannot migrate (gain " + lineageGain() + ")"); const lg = S.lineage; doMigrate(); if (S.lineage <= lg) throw new Error("no lineage"); if (S.migrations !== 1 || S.migTier !== 1) throw new Error("mig counters"); if (!S.bestAwake) throw new Error("bestiary not awakened"); if (S.roe !== 0) throw new Error("roe not reset"); });
step("bloodline buy affects stat", () => { S.lineage = 1e6; const sp = maxSpeed(); buyBl("bl_speed"); if (!(maxSpeed() > sp)) throw new Error("bloodline speed not applied"); const hp = maxHP(); buyBl("bl_hp"); if (!(maxHP() > hp)) throw new Error("bloodline hp not applied"); });
step("migration tier multiplies gain", () => { S.migTier = 0; const g0 = gainMult(); S.migTier = 2; if (!(gainMult() > g0)) throw new Error("migTier not applied"); });
step("ascension unlock + ascend", () => { S.migrations = 2; S.best = { shimmer: 12000, school: 2500 }; if (bestiaryStars() < 8) throw new Error("stars " + bestiaryStars()); S.lineage = 1e5; if (!ascUnlocked()) throw new Error("asc not unlocked"); if (!canAscend()) throw new Error("cannot ascend (gain " + spiritGain() + ")"); const s = S.spirit; doAscend(); if (S.spirit <= s || S.ascensions !== 1 || S.ascTier !== 1) throw new Error("ascend bad"); if (S.lineage !== 0) throw new Error("lineage not reset"); });
step("primordial buy multiplies", () => { S.spirit = 1e6; const g0 = gainMult(); buyPrim("pr_all"); if (!(gainMult() > g0)) throw new Error("primordial not applied"); });
step("automation remora + autobuy", () => { S.evo.e_autoeat = 1; S.autoOn.eat = true; const c = W.creature; W.fish.push({ id: "shimmer", t: FISH.shimmer, x: c.x + 40, y: c.y, vx: 0, vy: 0, ph: 0, wob: 0 }); const e = S.stats.eaten; for (let i = 0; i < 40; i++) update(0.05); if (S.stats.eaten <= e) throw new Error("remora no eat"); });
step("bestiary awakened gating", () => { S.bestAwake = false; if (bestiaryHTML() !== "") throw new Error("bestiary shown before awaken"); S.bestAwake = true; if (bestiaryHTML().length < 10) throw new Error("bestiary empty after awaken"); });
step("feeding frenzy", () => { S.autoOn.eat = false; const g0 = gainMult(); startFrenzy(); if (!W.frenzy || frenzyMult() < 3) throw new Error("frenzy"); if (!(gainMult() > g0)) throw new Error("frenzy not applied"); });
step("boss spawn", () => { S.size = 300; const c = W.creature; c.y = 2 * LH + 200; W.cam.y = c.y - 300; W.boss = null; W.bossCD = 0; updateBoss(0.016); if (!W.boss) throw new Error("no spawn"); });
step("boss kill + trophy", () => { const c = W.creature, b = W.boss; b.x = c.x; b.y = c.y; b.hp = 1; b.hitCD = 0; c.vx = 200; c.vy = 0; S.size = Math.max(S.size, b.a.sizeReq + 1); const tr = Object.keys(S.trophies).length; updateBoss(0.016); if (W.boss) throw new Error("not killed"); if (Object.keys(S.trophies).length <= tr) throw new Error("no trophy"); });
step("deep boss damages + flee", () => { const c = W.creature; const meg = APEX.find(a => a.id === "meg"); S.size = meg.sizeReq + 20; c.y = 4 * LH + 300; W.boss = { a: meg, x: c.x, y: c.y, hp: 1e9, max: 1e9, hitCD: 0, lungeCD: 9, ph: 0 }; W.hp = 1; W.invuln = 0; S.biomass = 1000; c.vx = 0; c.vy = 0; update(0.4); if (W.hp >= maxHP() && S.biomass === 1000) throw new Error("no damage/flee occurred"); });
step("hp regen", () => { W.boss = null; W.hp = 5; const c = W.creature; c.y = 200; for (let i = 0; i < 20; i++) update(0.1); if (!(W.hp > 5)) throw new Error("no regen"); });
step("new deep fish", () => { if (!FISH.lobster || !FISH.viper || !FISH.gulper) throw new Error("missing new fish"); });
step("achievements + mult", () => { S.ach = {}; S.stats.eaten = 100; const g0 = gainMult(); checkAch(); if (!S.ach.a_eat100) throw new Error("ach not unlocked"); if (!(achMult() > 1)) throw new Error("achMult not applied"); if (!(gainMult() > g0)) throw new Error("ach gain not applied"); });
step("render deep + polish + overlays", () => {
  W.hurt = 0.4; W.layerTitle = "The Trench"; W.layerTitleT = 2;
  W.boss = { a: APEX.find(a => a.id === "meg"), x: W.creature.x, y: W.creature.y - 150, hp: 50, max: 100, hitCD: 0, lungeCD: 0.2, lungeVX: 200, lungeVY: 0, ph: 0 };
  for (const y of [200, 2 * LH, 5 * LH + 200, 7 * LH + 200]) { W.creature.y = y; W.cam.y = y - 300; W.t = 1; render(); }
  W.boss = null;
  openEvo(); hideOverlay(); openBloodline(); hideOverlay(); openAscension(); hideOverlay(); openMenu(); hideOverlay(); migBanner(); ascBanner(); hideOverlay(); hud(); });
step("save/load", () => { save(); const s = JSON.parse(store["abyss.deep.v1"]); if (s.migrations !== S.migrations) throw new Error("save mismatch"); });

console.log(fails === 0 ? "\nSMOKE: ALL PASS" : "\nSMOKE: " + fails + " FAIL");
process.exit(fails ? 1 : 0);
