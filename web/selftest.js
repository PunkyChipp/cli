/* Node self-test: load data + engine, simulate, assert no crashes and sane growth. */
const DATA = require("./data");
const E = require("./engine");
E.setDATA(DATA);

let fails = 0;
function ok(name, cond) { console.log((cond ? "✓" : "✗ FAIL") + " " + name); if (!cond) fails++; }

E.G = E.newGame();
let g = E.G;
E.recompute();

ok("tapValue > 0", E.tapValue() > 0);
ok("cards loaded = 40", DATA.cards.length === 40);
ok("cardMap built", !!DATA.cardMap.kraken);

// Tap + buy + tick growth
for (let i = 0; i < 50; i++) E.doTap();
ok("lumens from taps", g.res.lumens > 0);
g.res.lumens += 1000;
E.buyProducer("plankton", 10);
ok("bought plankton", g.prod.plankton >= 10);
const before = g.res.lumens;
for (let i = 0; i < 50; i++) E.tick(0.1); // ~5s
ok("lumens grow from production", g.res.lumens > before);
ok("basePerSec > 0", E.basePerSec() > 0);

// Tide ladder
g.res.lumens += 1e6;
const t0 = g.ladder.tide || 0;
for (let i = 0; i < 5; i++) E.raiseLadder();
ok("tide rose", (g.ladder.tide || 0) > t0);
ok("maxTide tracked", (g.maxLadder.tide || 0) >= (g.ladder.tide || 0));

// Upgrade (capped + mixed)
g.res.lumens += 1e6;
E.buyUpgrade("r_tap");
ok("upgrade bought", (g.up.r_tap || 0) === 1);

// Prestige (Ebb)
g.run.lumens = 5e5;
E.recompute();
const pg = E.prestigeGain(E.zoneDef());
ok("prestige gain >= 1", pg >= 1);
E.doPrestige();
ok("got pearls", g.res.pearls >= 1);
ok("ebb reset plankton", (g.prod.plankton || 0) === 0);

// Cards: haul + equip changes bonus
g.glimmer = 5000;
let got = null;
for (let i = 0; i < 20; i++) { const r = E.doHaul(); if (r) got = r; }
ok("hauled some cards", Object.keys(g.cards).length > 0);
const anyCard = Object.keys(g.cards)[0];
const allBefore = g._B.gm("all");
E.equipCard(0, anyCard);
E.recompute();
ok("equipping changed a bonus", g._B.gm("all") !== allBefore || g._B.gm("tap") !== 1 || g._B.gm("prod") !== 1);

// Descend
g.maxLadder.tide = 25; g.res.pearls = 100;
E.recompute();
ok("can descend", E.canDescend(E.zoneDef()));
E.doDescend();
ok("descended to zone 1", g.zone === 1);
ok("pressure rose", g.pressure === 1);
ok("zone1 base res init", g.res.glow !== undefined);

// fmt
ok("fmt 1500 = 1.50K", E.fmt(1500) === "1.50K");
ok("fmt 1e9 = 1.00B", E.fmt(1e9) === "1.00B");

// big simulation in zone1 for stability
g.res.glow += 1e4; E.buyProducer("lantern", 20);
for (let i = 0; i < 200; i++) E.tick(0.1);
ok("zone1 glow grows & no NaN", g.res.glow > 0 && !isNaN(g.res.glow));

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);
