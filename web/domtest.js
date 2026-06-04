/* Headless smoke test: stub DOM + canvas, run the real UI/render/engine code. */
const fs = require("fs"), vm = require("vm");

function fakeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get(t, p) {
    if (p === "createLinearGradient" || p === "createRadialGradient") return () => grad;
    if (p in t) return t[p];
    return () => {};
  }, set(t, p, v) { t[p] = v; return true; } });
}
function fakeEl() {
  const e = {
    _html: "", style: {}, width: 800, height: 600, scrollTop: 0, className: "", textContent: "",
    getContext: () => fakeCtx(),
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ width: 300, height: 290, left: 0, top: 0 }),
    querySelectorAll: () => [], appendChild() {}, remove() {},
    setAttribute() {}, getAttribute: () => null, closest: () => null
  };
  Object.defineProperty(e, "innerHTML", { get() { return e._html; }, set(v) { e._html = "" + v; } });
  return e;
}
const els = {};
global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {} };
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0; global.setTimeout = () => 0;
global.confirm = () => true;
const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] };
global.document = {
  getElementById: id => (els[id] = els[id] || fakeEl()),
  createElement: () => fakeEl(),
  addEventListener() {}
};
global.performance = { now: () => Date.now() };

function run(f) { vm.runInThisContext(fs.readFileSync(__dirname + "/" + f, "utf8"), { filename: f }); }
let fails = 0;
function step(name, fn) { try { fn(); console.log("✓ " + name); } catch (e) { console.log("✗ FAIL " + name + " :: " + e.message + "\n" + (e.stack || "").split("\n")[1]); fails++; } }

step("load all scripts", () => { run("data.js"); run("engine.js"); run("render.js"); run("ui.js"); run("main.js"); });
step("init()", () => init());
step("pick difficulty", () => { G.difficulty = "diver"; G.started = true; recompute(); });

// progress a bit so tabs/cards unlock
step("simulate progression", () => {
  for (let i = 0; i < 30; i++) doTap();
  G.res.lumens += 1e7; buyProducer("plankton", 30); buyProducer("coral", 10);
  for (let i = 0; i < 20; i++) raiseLadder();
  G.run.lumens = 1e6; doPrestige();
  G.glimmer = 9999;
  for (let i = 0; i < 30; i++) doHaul();
  for (let i = 0; i < 80; i++) tick(0.1);
});

step("render every tab", () => {
  for (const t of ["dive", "reliquary", "auto", "descent", "codex"]) {
    UI.tab = t; const html = contentHTML();
    if (typeof html !== "string" || html.length < 1) throw new Error("empty html for " + t);
  }
});
step("render codex subtabs", () => { for (const c of ["ach", "stats", "set"]) { UI.codex = c; codexHTML(); } });
step("topbar + tabbar", () => { topbarHTML(); visibleTabs(); refreshContent(true); refreshTabs(); refreshTop(); });
step("render canvas frame", () => { sizeCanvases(); renderLoop(16); });

step("dispatch actions", () => {
  UI.tab = "dive";
  dispatch("buy", "plankton"); dispatch("buymax", "coral"); dispatch("ladder");
  dispatch("up", "r_tap"); dispatch("tab", "reliquary");
  const firstCard = Object.keys(G.cards)[0];
  if (firstCard) { toggleCard(firstCard); toggleCard(firstCard); }
  dispatch("preset", "1"); dispatch("haul");
  UI.tab = "auto"; dispatch("auto", "autoTap_0"); dispatch("tgt", "1");
  UI.tab = "codex"; dispatch("codex", "stats"); dispatch("diff", "relaxed"); dispatch("save");
});

step("tap pointer", () => { onPointerDown({ target: { closest: () => els.content }, clientX: 50, clientY: 50 }); });

step("overlays", () => {
  showDifficulty(); hideOverlay();
  showBanner({ type: "ach", id: "first_tap" }); hideOverlay();
  showBanner({ type: "milestone", zone: 0, level: 3 }); hideOverlay();
  showBanner({ type: "unlock", id: "reliquary" }); hideOverlay();
  const r = doHaul(); if (r) { showHaul(r); hideOverlay(); }
});

step("descend flow", () => {
  G.maxLadder.tide = 25; G.res.pearls = 100; recompute();
  dispatch("descend");
  if (G.zone !== 1) throw new Error("did not descend");
  processOverlays(); hideOverlay();
  UI.tab = "dive"; contentHTML(); renderLoop(32);
});

console.log(fails === 0 ? "\nDOM SMOKE: ALL PASS" : "\nDOM SMOKE: " + fails + " FAILURES");
process.exit(fails ? 1 : 0);
