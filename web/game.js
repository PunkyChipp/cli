/* =====================================================================
   ABYSS — one continuous plunge. Swim DOWN through 5 layers, each with
   its own prey and upgrades, gated by how big you've grown. At the floor:
   The Wreck — salvage it for Relics and permanent power.
   Single-file canvas game. Tunable FEEL block up top.
   ===================================================================== */
const FEEL = { accel: 1500, maxSpeedBase: 250, drag: 1.8, turn: 9, camLerp: 4, wiggle: 7 };

// ---------- helpers ----------
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function d2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rr(a, b) { return a + Math.random() * (b - a); }
function hexRgb(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
function mix(h1, h2, t) { const a = hexRgb(h1), b = hexRgb(h2); return "rgb(" + ((a[0] + (b[0] - a[0]) * t) | 0) + "," + ((a[1] + (b[1] - a[1]) * t) | 0) + "," + ((a[2] + (b[2] - a[2]) * t) | 0) + ")"; }
function rgba(h, a) { if (h[0] !== "#") { return h.replace("rgb(", "rgba(").replace(")", "," + a + ")"); } const c = hexRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
function fmt(n) { if (n === Infinity) return "∞"; if (isNaN(n)) return "0"; if (n < 0) return "-" + fmt(-n);
  if (n < 1000) return n === Math.floor(n) ? "" + n : n.toFixed(n < 10 ? 1 : 0);
  const u = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"]; const e = Math.floor(Math.log10(n) / 3);
  return e < u.length ? (n / Math.pow(1000, e)).toFixed(2) + u[e] : n.toExponential(2); }
function fmtTime(s) { s = Math.floor(s); const m = (s / 60) | 0, h = (m / 60) | 0; if (h) return h + "h " + (m % 60) + "m"; if (m) return m + "m " + (s % 60) + "s"; return s + "s"; }

// ---------- world layout ----------
const WW = 1500, LH = 1500, NL = 5, WRECK_H = 1000;
const WORLD = { w: WW, h: NL * LH + WRECK_H };
const LAYERS = [
  { name: "Sunlit Shallows", col: "#1aa6c8", accent: "#8ff0ff", light: 1.00, req: 0,   fish: ["shimmer", "school"], ups: ["speed", "appetite"] },
  { name: "Kelp Forest",     col: "#0d6f86", accent: "#6fe0c0", light: 0.78, req: 8,   fish: ["school", "darter"],  ups: ["agility", "range"] },
  { name: "Twilight Reach",  col: "#0a3b6e", accent: "#6fa8ff", light: 0.46, req: 32,  fish: ["darter", "fat"],     ups: ["magnet", "luck"] },
  { name: "The Midnight",    col: "#0a0a24", accent: "#b46fff", light: 0.20, req: 90,  fish: ["fat", "glow"],       ups: ["glow", "appetite"] },
  { name: "The Trench",      col: "#04060f", accent: "#4ff0e0", light: 0.07, req: 200, fish: ["glow", "whale"],     ups: ["speed", "glow"] }
];
const WRECK_REQ = 360;
const FLOOR_COL = "#01030a";
const FISH = {
  shimmer: { r: 9,  val: 1,   grow: 0.5, spd: 26, flee: 0, glyph: "🐟", color: "#bfe9ff" },
  school:  { r: 7,  val: 2,   grow: 0.5, spd: 34, flee: 0, glyph: "🐠", color: "#9ee7c8" },
  darter:  { r: 10, val: 6,   grow: 1.2, spd: 96, flee: 1, glyph: "🐡", color: "#ffd27a" },
  fat:     { r: 18, val: 16,  grow: 3.5, spd: 16, flee: 0, glyph: "🐟", color: "#ff9ec2", needs: 10 },
  glow:    { r: 13, val: 60,  grow: 5.0, spd: 70, flee: 1, glyph: "🪼", color: "#a6fff0" },
  whale:   { r: 42, val: 300, grow: 18,  spd: 22, flee: 0, glyph: "🐋", color: "#9fb6ff", needs: 90 }
};
const UPS = {
  speed:    { name: "Swift Fins",   icon: "💨", color: "#8ff0ff", cap: 40, base: 12, growth: 1.20, desc: "Top swim speed" },
  agility:  { name: "Lithe Body",   icon: "🌀", color: "#9be7a6", cap: 40, base: 14, growth: 1.20, desc: "Acceleration & turning" },
  range:    { name: "Wide Jaws",    icon: "😬", color: "#ffd27a", cap: 40, base: 16, growth: 1.22, desc: "Bite reach" },
  magnet:   { name: "Lure Glow",    icon: "🧲", color: "#c08bff", cap: 30, base: 30, growth: 1.28, desc: "Pull fish toward you" },
  luck:     { name: "Keen Senses",  icon: "🍀", color: "#7affc0", cap: 30, base: 40, growth: 1.30, desc: "Rare-fish luck" },
  appetite: { name: "Big Appetite", icon: "🍽", color: "#ff8ad0", cap: 60, base: 20, growth: 1.18, desc: "Biomass per fish" },
  glow:     { name: "Anglerlight",  icon: "🔦", color: "#fff2a6", cap: 40, base: 26, growth: 1.22, desc: "See further in the dark" }
};
const PERM = {
  pglow:  { name: "Eternal Glow",   icon: "🔆", cap: 15, base: 3, growth: 1.55, desc: "Permanent light radius" },
  pspeed: { name: "Sea Legs",       icon: "⚡", cap: 15, base: 4, growth: 1.55, desc: "Permanent swim speed" },
  pbite:  { name: "Iron Jaw",       icon: "🦷", cap: 15, base: 4, growth: 1.55, desc: "Permanent bite reach" },
  psense: { name: "Treasure Sense", icon: "🧭", cap: 10, base: 8, growth: 1.8,  desc: "More salvage in the deep" },
  pappet: { name: "Deep Hunger",    icon: "🌑", cap: 20, base: 6, growth: 1.5,  desc: "Permanent biomass per fish" }
};
const PERM_KEYS = Object.keys(PERM);
// Evolution tree — permanent, Roe-bought (the prestige shop). cat groups them.
const EVO = {
  e_bio:    { cat: "Hunt", name: "Voracity",      icon: "🩸", cap: 30, base: 2, growth: 1.35, desc: "+Biomass per fish — and the bonus self-amplifies every 10 levels." },
  e_bite:   { cat: "Hunt", name: "Gape",          icon: "😼", cap: 20, base: 3, growth: 1.4,  desc: "+Permanent bite reach." },
  e_magnet: { cat: "Hunt", name: "Siren Call",    icon: "🧲", cap: 15, base: 6, growth: 1.5,  desc: "Permanent pull on nearby fish." },
  e_size:   { cat: "Body", name: "Strong Form",   icon: "💪", cap: 25, base: 2, growth: 1.35, desc: "+Size gained from every meal." },
  e_speed:  { cat: "Body", name: "Streamlined",   icon: "🌊", cap: 25, base: 2, growth: 1.35, desc: "+Permanent swim speed." },
  e_glow:   { cat: "Body", name: "Inner Light",   icon: "🔆", cap: 20, base: 4, growth: 1.4,  desc: "+Permanent light radius." },
  e_luck:   { cat: "Senses", name: "Sharp Eyes",  icon: "👁", cap: 20, base: 5, growth: 1.45, desc: "+Rare-fish luck." },
  e_roe:    { cat: "Senses", name: "Fertility",   icon: "🥚", cap: 25, base: 4, growth: 1.4,  desc: "+Roe gained from every Molt." },
  e_tier:   { cat: "Senses", name: "Apex Instinct", icon: "👑", cap: 10, base: 12, growth: 1.8, desc: "Each Apex Tier multiplies harder." },
  e_start:  { cat: "Instinct", name: "Muscle Memory", icon: "🧠", cap: 15, base: 3, growth: 1.5, desc: "Start each dive already part-grown." },
  e_autoeat:  { cat: "Instinct", name: "Remora",   icon: "🐠", cap: 1, base: 40, growth: 1, desc: "A remora eats nearby fish for you." },
  e_autobuy:  { cat: "Instinct", name: "Instinct", icon: "⚙", cap: 1, base: 60, growth: 1, desc: "Auto-buys the cheapest orb upgrade." },
  e_automolt: { cat: "Instinct", name: "Life Cycle", icon: "♻", cap: 1, base: 120, growth: 1, desc: "Molts automatically at your target." }
};
const EVO_KEYS = Object.keys(EVO);
const EVO_CATS = ["Hunt", "Body", "Senses", "Instinct"];
const EGGS = [
  { g: "🦆", msg: "A rubber duck. It squeaks ominously.", b: 1 }, { g: "🥾", msg: "An old boot. Surprisingly filling.", b: 1 },
  { g: "🍾", msg: "A bottle: ‘keep swimming’.", b: 1 }, { g: "🛟", msg: "A life ring. You won't need it.", b: 1 },
  { g: "🧦", msg: "The missing sock. So THAT'S where it went.", b: 1 }, { g: "🪙", msg: "Pirate gold — a feast!", b: 14 },
  { g: "💎", msg: "A diamond. Shiny AND nutritious.", b: 30 }, { g: "👑", msg: "A sunken crown. You feel regal.", b: 22 },
  { g: "🦴", msg: "An ominous bone. Best not to ask.", b: 2 }, { g: "🛸", msg: "…a UFO. Down HERE?", b: 8 },
  { g: "👀", msg: "Something watched you pass. It blinked.", b: 0, spooky: 1 }, { g: "🐙", msg: "A vast tentacle slid back into the black.", b: 0, spooky: 1 }
];

// ---------- state ----------
function newState() {
  return { started: false, difficulty: "diver", biomass: 0, size: 0, relics: 0,
    up: { speed: 0, agility: 0, range: 0, magnet: 0, luck: 0, appetite: 0, glow: 0 },
    perm: { pglow: 0, pspeed: 0, pbite: 0, psense: 0, pappet: 0 },
    roe: 0, molts: 0, apexTier: 0, deepLayer: 0, evo: {}, autoOn: {}, autoMoltTarget: 3, moltSeen: false,
    wreckFound: false, deepest: 0, eggs: {}, stats: { eaten: 0, salvage: 0, playtime: 0 }, lastSave: Date.now() };
}
let S = newState();
const W = { creature: null, fish: [], orbs: [], eggs: [], treas: [], parts: [], floats: [],
  cam: { x: 0, y: 0 }, shake: 0, combo: 0, comboT: 0, eggTimer: 9, treasTimer: 10, t: 0, barrier: null, hintT: 0 };
let CV, X, VW = 800, VH = 600;
const input = { x: 0, y: 0, down: false, keys: {} };

// ---------- derived ----------
function layerAt(y) { return clamp(Math.floor(y / LH), 0, NL - 1); }
function ev(k) { return S.evo[k] || 0; }
function apexMult() { return Math.pow(1.4 + 0.06 * ev("e_tier"), S.apexTier); }
function voracity() { const l = ev("e_bio"); if (!l) return 1; const per = 0.10 * (1 + 0.5 * Math.floor(l / 10)); return Math.pow(1 + per, l); }
function maxSpeed() { return FEEL.maxSpeedBase * (1 + 0.05 * S.up.speed + 0.05 * S.perm.pspeed + 0.05 * ev("e_speed")); }
function accel() { return FEEL.accel * (1 + 0.05 * S.up.agility); }
function turnRate() { return FEEL.turn * (1 + 0.03 * S.up.agility); }
function biteRange() { return 6 + 7 * S.up.range + 6 * S.perm.pbite + 6 * ev("e_bite"); }
function magnetR() { const b = S.up.magnet + ev("e_magnet"); return b > 0 ? 50 + 24 * b : 0; }
function luckChance() { return 0.015 + 0.012 * S.up.luck + 0.012 * ev("e_luck"); }
function appetite() { return 1 + 0.22 * S.up.appetite + 0.25 * S.perm.pappet; }
function depthMult() { return 1 + 0.6 * layerAt(W.creature ? W.creature.y : 0); }
function gainMult() { return appetite() * depthMult() * apexMult() * voracity(); }
function sizeGain(g) { return g * (1 + 0.08 * ev("e_size")); }
function creatureR() { return clamp(11 + Math.sqrt(S.size) * 1.9, 11, 70); }
function comboMult() { return 1 + W.combo * 0.12; }
function glowRadius() { return 150 + 48 * S.up.glow + 34 * S.perm.pglow + 34 * ev("e_glow") + creatureR() * 1.5; }
function moltReq() { return Math.floor(35 * Math.pow(1.6, S.molts)); }
function startSize() { return 6 * ev("e_start"); }
function roeGain() { const dl = layerAt(S.deepest); return Math.floor(Math.pow(Math.max(0, S.size) / 20, 0.6) * (1 + 0.7 * dl) * (1 + 0.1 * ev("e_roe"))); }
function canMolt() { return S.started && S.size >= moltReq(); }
function evoCost(k) { const u = EVO[k]; return Math.floor(u.base * Math.pow(u.growth, ev(k))); }
function upCost(k) { const u = UPS[k]; return Math.floor(u.base * Math.pow(u.growth, S.up[k])); }
function permCost(k) { const u = PERM[k]; return Math.floor(u.base * Math.pow(u.growth, S.perm[k])); }
function lightAt(y) { const i = y / LH; const a = clamp(Math.floor(i), 0, NL - 1), b = clamp(a + 1, 0, NL - 1); return lerp(LAYERS[a].light, LAYERS[b].light, clamp(i - a, 0, 1)); }
function colAt(y) { const i = y / LH; if (i >= NL - 1) { const t = clamp((y - (NL - 1) * LH) / (LH + WRECK_H), 0, 1); return mix(LAYERS[NL - 1].col, FLOOR_COL, t); } const a = clamp(Math.floor(i), 0, NL - 1); return mix(LAYERS[a].col, LAYERS[a + 1].col, clamp(i - a, 0, 1)); }
function accentAt(y) { return LAYERS[layerAt(y)].accent; }
function allowedMaxY() { for (let i = 1; i <= NL; i++) { const req = i < NL ? LAYERS[i].req : LAYERS[NL - 1].req; if (i < NL && S.size < LAYERS[i].req) return { y: i * LH, req: LAYERS[i].req, name: LAYERS[i].name }; } if (S.size < WRECK_REQ) return { y: NL * LH, req: WRECK_REQ, name: "The Wreck" }; return { y: WORLD.h, req: 0 }; }

// ---------- init / save ----------
function init() {
  CV = document.getElementById("c"); X = CV.getContext("2d"); resize(); window.addEventListener("resize", resize);
  load();
  W.creature = { x: WW / 2, y: 200, vx: 0, vy: 0, ang: 1.57, chomp: 0 };
  W.cam.x = W.creature.x - VW / 2; W.cam.y = W.creature.y - VH / 2;
  buildOrbs();
  for (let i = 0; i < 46; i++) spawnFish(true);
  bindInput(); requestAnimationFrame(loop); setInterval(hud, 160);
  if (!S.started) showStart(); else hideOverlay();
}
function resize() { VW = window.innerWidth; VH = window.innerHeight; if (CV) { CV.width = VW; CV.height = VH; } }
const KEY = "abyss.deep.v1";
function save() { S.lastSave = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { const r = localStorage.getItem(KEY); if (r) S = Object.assign(newState(), JSON.parse(r)); } catch (e) {} }
function hardReset() { try { localStorage.removeItem(KEY); } catch (e) {} S = newState(); S.started = true; W.fish = []; W.treas = []; for (let i = 0; i < 46; i++) spawnFish(true); buildOrbs(); }

// ---------- spawning ----------
function buildOrbs() {
  W.orbs = [];
  LAYERS.forEach((L, li) => L.ups.forEach((k, j) => {
    W.orbs.push({ k, x: rr(140, WW - 140), y: li * LH + rr(220, LH - 220), vx: rr(-16, 16), vy: rr(-12, 12), ph: rr(0, 6.28), flash: 0, band: li });
  }));
}
function spawnFish(anywhere) {
  const c = W.creature || { x: WW / 2, y: 300 };
  let x, y;
  if (anywhere) { x = Math.random() * WW; y = clamp(Math.random() * (NL * LH), 0, WORLD.h); }
  else { const e = Math.floor(Math.random() * 4);
    x = clamp(c.x + (e === 0 ? -VW / 2 - 40 : e === 1 ? VW / 2 + 40 : rr(-VW / 2, VW / 2)), 20, WW - 20);
    y = clamp(c.y + (e === 2 ? -VH / 2 - 40 : e === 3 ? VH / 2 + 40 : rr(-VH / 2, VH / 2)), 20, WORLD.h - 20); }
  const L = LAYERS[layerAt(y)];
  let id = L.fish[Math.floor(Math.random() * L.fish.length)];
  const ft = FISH[id];
  if (ft.needs && S.size < ft.needs * 0.6 && Math.random() > 0.3) id = L.fish[0];
  if ((id === "glow" || id === "darter") && Math.random() > luckChance() + 0.3 && Math.random() > 0.5) { /* keep some rarity */ }
  const a = Math.random() * 6.28, f = FISH[id];
  W.fish.push({ id, t: f, x, y, vx: Math.cos(a) * f.spd, vy: Math.sin(a) * f.spd, ph: rr(0, 6.28), wob: 0 });
}
function spawnEgg() { const d = EGGS[Math.floor(Math.random() * EGGS.length)], fl = Math.random() < 0.5, c = W.creature;
  W.eggs.push({ d, x: c.x + (fl ? -VW / 2 - 50 : VW / 2 + 50), y: c.y + rr(-VH / 3, VH / 3), vx: (fl ? 1 : -1) * rr(40, 80), vy: rr(-8, 8), ph: rr(0, 6.28), life: 16 }); }
function spawnTreasure() { if (!S.wreckFound) return; const c = W.creature; if (layerAt(c.y) < 2) return;
  const kinds = [["🪙", 6], ["🧰", 14], ["💰", 22], ["💍", 18]]; const k = kinds[Math.floor(Math.random() * kinds.length)];
  W.treas.push({ g: k[0], val: k[1], x: clamp(c.x + rr(-VW / 2, VW / 2), 40, WW - 40), y: clamp(c.y + rr(-VH / 2, VH / 2), LH, WORLD.h - 40), ph: rr(0, 6.28), life: 26, vy: rr(-4, 4) }); }
function addParts(x, y, color, n, spd) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rr(spd * 0.3, spd); W.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rr(0.3, 0.7), max: 0.7, color }); } }
function addFloat(x, y, txt, color) { W.floats.push({ x, y, txt, color, life: 0.95 }); }

// ---------- input ----------
function bindInput() {
  const setp = e => { const r = CV.getBoundingClientRect(); input.x = e.clientX - r.left; input.y = e.clientY - r.top; };
  CV.addEventListener("pointerdown", e => { input.down = true; setp(e); CV.setPointerCapture && CV.setPointerCapture(e.pointerId); });
  CV.addEventListener("pointermove", setp);
  window.addEventListener("pointerup", () => input.down = false);
  window.addEventListener("keydown", e => input.keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => input.keys[e.key.toLowerCase()] = false);
}
function steer() { let dx = 0, dy = 0;
  if (input.down) { dx = input.x - VW / 2; dy = input.y - VH / 2; const m = Math.hypot(dx, dy); if (m > 12) { dx /= m; dy /= m; } else dx = dy = 0; }
  const k = input.keys; if (k.w || k.arrowup) dy -= 1; if (k.s || k.arrowdown) dy += 1; if (k.a || k.arrowleft) dx -= 1; if (k.d || k.arrowright) dx += 1;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } return [dx, dy]; }

// ---------- loop ----------
function loop(ts) { const now = ts / 1000; let dt = now - (W.t || now); W.t = now; if (dt > 0.05) dt = 0.05; if (S.started) update(dt); render(); requestAnimationFrame(loop); }
function update(dt) {
  S.stats.playtime += dt;
  const c = W.creature, [sx, sy] = steer();
  c.vx += sx * accel() * dt; c.vy += sy * accel() * dt;
  const dr = Math.exp(-FEEL.drag * dt); c.vx *= dr; c.vy *= dr;
  const sp = Math.hypot(c.vx, c.vy), ms = maxSpeed(); if (sp > ms) { c.vx = c.vx / sp * ms; c.vy = c.vy / sp * ms; }
  c.x = clamp(c.x + c.vx * dt, 20, WW - 20);
  c.y += c.vy * dt;
  // vertical gating
  const gate = allowedMaxY(); W.barrier = gate.y < WORLD.h ? gate : null;
  c.y = clamp(c.y, 20, gate.y - 18);
  if (W.barrier && c.y > gate.y - 60 && W.hintT <= 0) { W.hintT = 2.4; addFloat(c.x, gate.y - 70, "Grow to " + fmt(gate.req) + " to pass", "#ff8a94"); if (c.vy > 0) c.vy *= 0.3; }
  W.hintT -= dt;
  if (sp > 6) { const tg = Math.atan2(c.vy, c.vx); let d = tg - c.ang; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; c.ang += d * clamp(turnRate() * dt, 0, 1); }
  c.chomp = Math.max(0, c.chomp - dt * 4);
  if (sp > ms * 0.5 && Math.random() < 0.4) addParts(c.x - Math.cos(c.ang) * creatureR(), c.y - Math.sin(c.ang) * creatureR(), "#bfe9ff", 1, 20);
  if (c.y > S.deepest) S.deepest = c.y;

  // camera
  W.cam.x = lerp(W.cam.x, clamp(c.x - VW / 2, 0, Math.max(0, WW - VW)), clamp(FEEL.camLerp * dt, 0, 1));
  W.cam.y = lerp(W.cam.y, clamp(c.y - VH / 2, 0, Math.max(0, WORLD.h - VH)), clamp(FEEL.camLerp * dt, 0, 1));
  W.shake = Math.max(0, W.shake - dt * 6);
  W.comboT -= dt; if (W.comboT <= 0) W.combo = 0;

  // wreck reveal
  if (!S.wreckFound && S.size >= WRECK_REQ && c.y > NL * LH + 120) reachWreck();

  // fish
  const cr = creatureR(), br = cr + biteRange(), mr = magnetR();
  for (let i = W.fish.length - 1; i >= 0; i--) {
    const f = W.fish[i], ft = f.t; f.ph += dt * 3; f.wob = Math.sin(f.ph) * 6;
    f.vx += rr(-1, 1) * ft.spd * dt * 2; f.vy += rr(-1, 1) * ft.spd * dt * 2;
    const dd = Math.sqrt(d2(f.x, f.y, c.x, c.y)) || 1;
    if (ft.flee && dd < 210) { f.vx += (f.x - c.x) / dd * ft.spd * dt * 5; f.vy += (f.y - c.y) / dd * ft.spd * dt * 5; }
    if (mr > 0 && dd < mr) { f.vx += (c.x - f.x) / dd * 160 * dt; f.vy += (c.y - f.y) / dd * 160 * dt; }
    const fs = Math.hypot(f.vx, f.vy), lim = ft.spd * (ft.flee ? 2.2 : 1.2); if (fs > lim) { f.vx = f.vx / fs * lim; f.vy = f.vy / fs * lim; }
    f.x = clamp(f.x + f.vx * dt, 0, WW); f.y = clamp(f.y + f.vy * dt, 0, WORLD.h);
    if (f.x <= 0 || f.x >= WW) f.vx *= -1; if (f.y <= 0 || f.y >= WORLD.h) f.vy *= -1;
    if (Math.abs(f.x - c.x) > VW * 1.3 || Math.abs(f.y - c.y) > VH * 1.3) { W.fish.splice(i, 1); continue; }
    const edible = !ft.needs || cr >= ft.r * 0.82;
    if (edible && dd < br + ft.r) eat(i, f, ft);
  }
  while (W.fish.length < 46) spawnFish(false);

  // orbs
  for (const o of W.orbs) { o.ph += dt * 2; o.flash = Math.max(0, o.flash - dt * 3);
    o.x = clamp(o.x + o.vx * dt, 60, WW - 60); o.y += o.vy * dt;
    const top = o.band * LH + 80, bot = (o.band + 1) * LH - 80; if (o.y < top || o.y > bot) o.vy *= -1; o.y = clamp(o.y, top, bot);
    if (o.x <= 60 || o.x >= WW - 60) o.vx *= -1;
    if (d2(o.x, o.y, c.x, c.y) < (cr + 26) * (cr + 26)) tryBuy(o); }

  // eggs
  W.eggTimer -= dt; if (W.eggTimer <= 0) { W.eggTimer = rr(15, 32); spawnEgg(); }
  for (let i = W.eggs.length - 1; i >= 0; i--) { const e = W.eggs[i]; e.ph += dt * 2; e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(e.ph) * 6 * dt; e.life -= dt;
    if (!e.d.spooky && d2(e.x, e.y, c.x, c.y) < (cr + 22) * (cr + 22)) { eatEgg(e); W.eggs.splice(i, 1); continue; } if (e.life <= 0) W.eggs.splice(i, 1); }

  // treasure
  if (S.wreckFound) { W.treasTimer -= dt; if (W.treasTimer <= 0) { W.treasTimer = rr(7, 13) / (1 + 0.3 * S.perm.psense); spawnTreasure(); } }
  for (let i = W.treas.length - 1; i >= 0; i--) { const tr = W.treas[i]; tr.ph += dt * 2; tr.y += tr.vy * dt; tr.life -= dt;
    if (d2(tr.x, tr.y, c.x, c.y) < (cr + 22) * (cr + 22)) { const g = Math.ceil(tr.val * (1 + 0.5 * S.perm.psense)); S.relics += g; S.stats.salvage += g; addFloat(tr.x, tr.y, "+" + g + " ⛃", "#ffd86b"); addParts(tr.x, tr.y, "#ffd86b", 16, 120); W.shake = .5; W.treas.splice(i, 1); continue; } if (tr.life <= 0) W.treas.splice(i, 1); }

  for (let i = W.parts.length - 1; i >= 0; i--) { const p = W.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; if (p.life <= 0) W.parts.splice(i, 1); }
  for (let i = W.floats.length - 1; i >= 0; i--) { const f = W.floats[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) W.floats.splice(i, 1); }

  // automation (unlocked via Evolution)
  if (ev("e_autobuy") && S.autoOn.buy) { W.autoBuyT = (W.autoBuyT || 0) + dt; if (W.autoBuyT > 0.5) { W.autoBuyT = 0; autoBuyCheapest(); } }
  if (ev("e_autoeat") && S.autoOn.eat) { W.autoEatT = (W.autoEatT || 0) + dt; if (W.autoEatT > 0.35) { W.autoEatT = 0; remoraEat(); } }
  if (ev("e_automolt") && S.autoOn.molt && canMolt() && roeGain() >= S.autoMoltTarget) doMolt();
  // first Molt becomes available
  if (canMolt() && !S.moltSeen) { S.moltSeen = true; moltBanner(); }

  if (Date.now() - S.lastSave > 5000) save();
}

function eat(i, f, ft) { W.fish.splice(i, 1); const gain = ft.val * gainMult() * comboMult();
  S.biomass = Math.min(1e300, S.biomass + gain); S.size = Math.min(1e300, S.size + sizeGain(ft.grow)); S.stats.eaten++; W.combo = Math.min(12, W.combo + 1); W.comboT = 2;
  W.creature.chomp = 1; W.shake = Math.min(1, W.shake + ft.r / 60); addParts(f.x, f.y, ft.color, Math.min(20, 4 + (ft.r | 0)), 120); addFloat(f.x, f.y, "+" + fmt(gain), ft.color); }
function eatEgg(e) { const d = e.d, found = !S.eggs[d.g]; S.eggs[d.g] = true; const gain = d.b * 12 * gainMult();
  if (gain > 0) { S.biomass += gain; addFloat(e.x, e.y, "+" + fmt(gain), "#ffd86b"); } W.creature.chomp = 1; W.shake = .6; addParts(e.x, e.y, "#ffd86b", 16, 130); toast((found ? "✦ NEW · " : "") + d.g + "  " + d.msg); }
function tryBuy(o) { const k = o.k, cost = upCost(k); if (S.up[k] >= UPS[k].cap) return;
  if (S.biomass >= cost) { S.biomass -= cost; S.up[k]++; o.flash = 1; W.shake = Math.min(1, W.shake + .3); addParts(o.x, o.y, UPS[k].color, 18, 120); addFloat(o.x, o.y - 10, UPS[k].name + " Lv" + S.up[k], UPS[k].color); }
  else if (!o._w || Date.now() - o._w > 1500) { o._w = Date.now(); addFloat(o.x, o.y - 10, "Need " + fmt(cost), "#ff8a94"); } }
function reachWreck() { S.wreckFound = true; S.relics += 50; S.biomass += 500 * gainMult(); W.shake = 1;
  document.getElementById("overlay").innerHTML =
    '<div class="ov" style="border-color:rgba(255,216,107,.5)"><div class="ovtag" style="color:#ffd86b">THE FLOOR OF THE WORLD</div>' +
    '<div class="ovt">The Wreck</div><div class="ovs">A drowned giant, crusted with light. Among its bones, treasure glints in the dark.</div>' +
    '<div class="ovs"><b>Salvage unlocked.</b> Glowing treasure now drifts through the deep — gather it for <b>Relics</b>, and spend them on permanent power in the Wreck Hub (☰).</div>' +
    '<div class="ovs" style="color:#ffd86b">+50 ⛃ Relics</div><button class="ovbtn" onclick="hideOverlay()">Begin salvaging</button></div>';
  showOverlay(); }

function doMolt() {
  if (!canMolt()) return;
  S.roe += roeGain(); S.molts++; S.apexTier++;
  S.size = startSize(); S.biomass = 0;
  S.up = { speed: 0, agility: 0, range: 0, magnet: 0, luck: 0, appetite: 0, glow: 0 };
  const c = W.creature; c.x = WW / 2; c.y = 200; c.vx = c.vy = 0;
  W.cam.x = c.x - VW / 2; W.cam.y = c.y - VH / 2;
  W.fish = []; for (let i = 0; i < 46; i++) spawnFish(true); buildOrbs(); W.shake = 1;
}
function buyEvo(k) { const u = EVO[k], cost = evoCost(k); if (ev(k) >= u.cap || S.roe < cost) return; S.roe -= cost; S.evo[k] = ev(k) + 1; openEvo(); }
function autoBuyCheapest() { let best = null, bc = Infinity; for (const o of W.orbs) { if (S.up[o.k] >= UPS[o.k].cap) continue; const cst = upCost(o.k); if (cst <= S.biomass && cst < bc) { bc = cst; best = o; } } if (best) { S.biomass -= bc; S.up[best.k]++; best.flash = 1; } }
function remoraEat() { const c = W.creature, R = creatureR() + biteRange() + 90; let bi = -1, bd = R * R;
  for (let i = 0; i < W.fish.length; i++) { const f = W.fish[i]; if (f.t.needs && creatureR() < f.t.r * 0.82) continue; const d = d2(f.x, f.y, c.x, c.y); if (d < bd) { bd = d; bi = i; } }
  if (bi >= 0) eat(bi, W.fish[bi], W.fish[bi].t); }

// ---------- render ----------
function render() {
  const shx = (Math.random() - 0.5) * W.shake * 14, shy = (Math.random() - 0.5) * W.shake * 14;
  const topC = colAt(W.cam.y), botC = colAt(W.cam.y + VH);
  const g = X.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, topC); g.addColorStop(1, botC); X.fillStyle = g; X.fillRect(0, 0, VW, VH);
  // marine snow (parallax)
  X.fillStyle = "rgba(255,255,255,.13)";
  for (let i = 0; i < 90; i++) { const px = ((i * 137.5 - W.cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20; const py = ((i * 91.3 + W.t * 12 - W.cam.y * 0.5) % (VH + 40) + VH + 40) % (VH + 40) - 20; X.fillRect(px, py, 2, 2); }

  X.save(); X.translate(-W.cam.x + shx, -W.cam.y + shy);

  // layer labels + barriers
  for (let i = 0; i < NL; i++) { const yy = i * LH; ftxt(WW / 2, yy + 40, LAYERS[i].name.toUpperCase(), rgba(LAYERS[i].accent, .5), 13); }
  if (W.barrier) { const by = W.barrier.y, ac = accentAt(by - 10); X.strokeStyle = rgba("#ff8a94", .5); X.lineWidth = 3; X.setLineDash([16, 14]);
    X.beginPath(); X.moveTo(0, by); X.lineTo(WW, by); X.stroke(); X.setLineDash([]);
    ftxt(WW / 2, by - 14, "▼ grow to " + fmt(W.barrier.req) + " to descend", "#ffb0b8", 14); }

  // the wreck
  drawWreck();

  // orbs
  for (const o of W.orbs) { const u = UPS[o.k], cost = upCost(o.k), maxed = S.up[o.k] >= u.cap, pr = 24 + Math.sin(o.ph) * 2 + o.flash * 10;
    glow(o.x, o.y, pr + 14, u.color, .3 + o.flash * .4); X.font = "22px serif"; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText(u.icon, o.x, o.y);
    ftxt(o.x, o.y - pr - 8, u.name + " Lv" + S.up[o.k], u.color, 12); ftxt(o.x, o.y + pr + 10, maxed ? "MAX" : fmt(cost) + " ◍", maxed ? "#fff" : (S.biomass >= cost ? "#9be7a6" : "#ff8a94"), 12); }

  // treasure
  for (const tr of W.treas) { glow(tr.x, tr.y, 20, "#ffd86b", .28 + .15 * Math.sin(tr.ph)); X.font = "24px serif"; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText(tr.g, tr.x, tr.y); }

  // fish
  X.textAlign = "center"; X.textBaseline = "middle";
  for (const f of W.fish) { glow(f.x, f.y + f.wob, f.t.r + 4, f.t.color, .25); X.font = (f.t.r * 1.7 | 0) + "px serif"; X.fillText(f.t.glyph, f.x, f.y + f.wob); }

  // eggs
  for (const e of W.eggs) { glow(e.x, e.y, 22, e.d.spooky ? "#ff5c6a" : "#ffd86b", .25 + .15 * Math.sin(e.ph)); X.font = "26px serif"; X.fillText(e.d.g, e.x, e.y); }
  for (const p of W.parts) glow(p.x, p.y, 4, p.color, .6 * clamp(p.life / p.max, 0, 1));
  drawCreature();
  if (ev("e_autoeat") && S.autoOn.eat) { const c = W.creature, a = W.t * 2, rr2 = creatureR() + 30, rx = c.x + Math.cos(a) * rr2, ry = c.y + Math.sin(a) * rr2;
    glow(rx, ry, 12, "#ffd27a", .5); X.font = "16px serif"; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText("🐠", rx, ry); }
  for (const f of W.floats) { X.globalAlpha = clamp(f.life / .95, 0, 1); ftxt(f.x, f.y, f.txt, f.color, 16); X.globalAlpha = 1; }
  X.restore();

  // darkness / light bubble
  const dark = clamp(1 - lightAt(W.creature.y), 0, 1) * 0.92;
  if (dark > 0.02) { const cs = { x: W.creature.x - W.cam.x + shx, y: W.creature.y - W.cam.y + shy }, gr = glowRadius();
    const lg = X.createRadialGradient(cs.x, cs.y, gr * 0.35, cs.x, cs.y, gr * 1.8);
    lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0," + dark + ")"); X.fillStyle = lg; X.fillRect(0, 0, VW, VH); }

  if (W.combo > 1) { X.textAlign = "center"; X.fillStyle = accentAt(W.creature.y); X.font = "700 22px system-ui"; X.fillText("×" + comboMult().toFixed(1) + " combo", VW / 2, 96); }
}
function drawWreck() {
  const wy = NL * LH + 560, wx = WW / 2;
  if (W.cam.y + VH < wy - 520 || W.cam.y > wy + 400) return;
  X.save(); X.translate(wx, wy); X.rotate(-0.14);
  glow(0, 0, 520, "#9fb6ff", 0.06);
  // hull
  X.fillStyle = "#0c1422"; X.beginPath(); X.moveTo(-380, -70); X.quadraticCurveTo(-300, 80, 220, 80); X.quadraticCurveTo(420, 70, 430, -40); X.lineTo(360, -70); X.closePath(); X.fill();
  X.fillStyle = "#10202f"; X.fillRect(-300, -150, 360, 90);
  X.fillStyle = "#0a1622"; X.fillRect(-120, -230, 150, 90);
  // funnels
  X.fillStyle = "#14283a"; for (let i = 0; i < 3; i++) { X.fillRect(-260 + i * 90, -210, 46, 70); }
  // glowing portholes
  for (let i = 0; i < 9; i++) { glow(-340 + i * 78, -20, 12, "#ffd27a", .8); }
  for (let i = 0; i < 5; i++) { glow(-280 + i * 70, -120, 9, "#8ff0ff", .7); }
  // bioluminescent crust
  X.strokeStyle = rgba("#7affc0", .5); X.lineWidth = 4; X.beginPath(); X.moveTo(-380, -60); X.quadraticCurveTo(0, 70, 430, -30); X.stroke();
  X.restore();
  ftxt(wx, wy - 300, "✦ THE WRECK ✦", "#ffd86b", 18);
}
function drawCreature() {
  const c = W.creature, ac = accentAt(c.y), gl = LAYERS[layerAt(c.y)].accent, r = creatureR() * (1 + c.chomp * .12);
  X.save(); X.translate(c.x, c.y); X.rotate(c.ang);
  const wig = Math.sin(W.t * 8) * FEEL.wiggle * (.3 + Math.min(1, Math.hypot(c.vx, c.vy) / maxSpeed()));
  X.strokeStyle = rgba(ac, .8); X.lineWidth = r * .5; X.lineCap = "round"; X.beginPath(); X.moveTo(-r * .6, 0); X.quadraticCurveTo(-r * 1.2, wig, -r * 1.7, wig * 1.6); X.stroke();
  glow(0, 0, r * 1.8, ac, .25);
  X.fillStyle = rgba(gl, .92); X.beginPath(); X.ellipse(0, 0, r * 1.15, r * .72, 0, 0, 6.283); X.fill();
  X.fillStyle = "#fff"; X.beginPath(); X.ellipse(r * .2, 0, r * .7, r * .5, 0, 0, 6.283); X.fill();
  X.fillStyle = "#08121a"; X.beginPath(); X.moveTo(r * .7, 0); X.arc(r * .55, 0, r * .55, -.5 - c.chomp * .6, .5 + c.chomp * .6); X.closePath(); X.fill();
  X.fillStyle = "#04121a"; X.beginPath(); X.arc(r * .45, -r * .28, r * .13, 0, 6.283); X.fill();
  X.fillStyle = rgba(ac, .9); const dots = 3 + Math.min(9, (S.size / 12) | 0); for (let i = 0; i < dots; i++) { const dx = -r * .5 + i * (r * 1.3 / dots); X.beginPath(); X.arc(dx, -r * .5, r * .08, 0, 6.283); X.fill(); }
  X.restore();
  if (input.down) { X.strokeStyle = rgba(ac, .12); X.lineWidth = 1; X.beginPath(); X.arc(c.x, c.y, r + biteRange(), 0, 6.283); X.stroke(); }
}
function glow(x, y, r, color, a) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0)); X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 6.283); X.fill(); }
function ftxt(x, y, t, color, size) { X.font = "700 " + size + "px system-ui"; X.textAlign = "center"; X.fillStyle = color; X.fillText(t, x, y); }

// ---------- HUD + overlays ----------
function hud() {
  const c = W.creature || { y: 0 }, L = LAYERS[layerAt(c.y)], gate = allowedMaxY();
  const prog = gate.y < WORLD.h ? clamp(S.size / gate.req, 0, 1) : 1;
  const evoUnlocked = S.moltSeen || S.molts > 0 || canMolt();
  document.getElementById("hud").innerHTML =
    `<div class="hchip"><b style="color:${L.accent}">◍ ${fmt(S.biomass)}</b><span>Biomass</span></div>` +
    `<div class="hchip"><b>⬤ ${fmt(S.size)}</b><span>Size</span></div>` +
    (S.molts > 0 || S.roe > 0 || canMolt() ? `<div class="hchip"><b style="color:#ff9ec2">🥚 ${fmt(S.roe)}</b><span>Roe</span></div>` : "") +
    (S.apexTier > 0 ? `<div class="hchip"><b style="color:#ffd86b">👑 ×${fmt(apexMult())}</b><span>Apex T${S.apexTier}</span></div>` : "") +
    (S.wreckFound ? `<div class="hchip"><b style="color:#ffd86b">⛃ ${fmt(S.relics)}</b><span>Relics</span></div>` : "") +
    `<div class="hchip hz"><b>${L.name}</b><span>Depth ${layerAt(c.y) + 1}/${NL}${gate.y < WORLD.h ? " · grow to " + fmt(gate.req) : " · the floor"}</span>` +
    `<div class="bar"><i style="width:${(prog * 100) | 0}%;background:${L.accent}"></i></div></div>` +
    (evoUnlocked ? `<button class="hbtn ${canMolt() ? "ready" : ""}" onclick="openEvo()">🧬 Evolve${canMolt() ? " ●" : ""}</button>` : "");
}
function moltBanner() {
  document.getElementById("overlay").innerHTML =
    `<div class="ov" style="border-color:rgba(255,158,194,.5)"><div class="ovtag" style="color:#ff9ec2">A NEW INSTINCT</div>` +
    `<div class="ovt2">You can Molt</div><div class="ovs">Shed your form to start the dive over — but keep <b>Roe</b> and rise an <b>Apex Tier</b> (a permanent multiplier on everything). Spend Roe in the <b>Evolution</b> tree (🧬) to come back faster and stronger every time.</div>` +
    `<button class="ovbtn" onclick="hideOverlay();openEvo()">Open Evolution</button><button class="ovbtn" onclick="hideOverlay()">Later</button></div>`;
  showOverlay();
}
function openEvo() {
  const can = canMolt(), gain = roeGain();
  let h = `<div class="ov ovwide"><div class="ovt2" style="color:#ff9ec2">🧬 Evolution</div>` +
    `<div class="ovs">Roe 🥚 ${fmt(S.roe)} · Apex Tier ${S.apexTier} (×${fmt(apexMult())}) · Molts ${S.molts}</div>` +
    `<button class="ovbtn ${can ? "" : "dim"}" ${can ? `onclick="doMolt();openEvo()"` : "disabled"} style="border-color:rgba(255,158,194,.5);background:rgba(255,158,194,.14)">` +
    (can ? `Molt now — gain ${fmt(gain)} Roe 🥚` : `Grow to ${fmt(moltReq())} size to Molt (${fmt(S.size)})`) + `</button>`;
  for (const cat of EVO_CATS) {
    h += `<div class="evocat">${cat}</div><div class="shop">`;
    for (const k of EVO_KEYS) { if (EVO[k].cat !== cat) continue; const u = EVO[k], lv = ev(k), maxed = lv >= u.cap, cost = evoCost(k), able = !maxed && S.roe >= cost;
      h += `<button class="shopi ${able ? "on" : ""}" ${able ? `onclick="buyEvo('${k}')"` : "disabled"}><span class="si">${u.icon}</span><b>${u.name}</b><span class="sd">${u.desc}</span><span class="sc" style="color:#ff9ec2">${maxed ? "MAX" : (u.cap > 1 ? "Lv" + lv + " · " : "") + fmt(cost) + " 🥚"}</span></button>`; }
    h += `</div>`;
  }
  // automation toggles (once unlocked)
  if (ev("e_autoeat") || ev("e_autobuy") || ev("e_automolt")) {
    h += `<div class="evocat">Automation</div><div class="autos">`;
    if (ev("e_autoeat")) h += autoTog("eat", "🐠 Remora auto-eat");
    if (ev("e_autobuy")) h += autoTog("buy", "⚙ Auto-buy orbs");
    if (ev("e_automolt")) h += autoTog("molt", "♻ Auto-molt") + `<div class="ovs">Auto-molt at ≥ ${S.autoMoltTarget} Roe <button class="mini" onclick="S.autoMoltTarget=Math.max(1,S.autoMoltTarget-1);openEvo()">−</button> <button class="mini" onclick="S.autoMoltTarget+=1;openEvo()">+</button></div>`;
    h += `</div>`;
  }
  h += `<button class="ovbtn" onclick="hideOverlay()">Back to the hunt</button></div>`;
  document.getElementById("overlay").innerHTML = h; showOverlay();
}
function autoTog(key, label) { const on = !!S.autoOn[key]; return `<button class="atog ${on ? "on" : ""}" onclick="S.autoOn['${key}']=!S.autoOn['${key}'];openEvo()">${label}<span>${on ? "ON" : "OFF"}</span></button>`; }
function showStart() {
  let d = ""; ["relaxed", "diver", "abyssal"].forEach(k => d += `<button class="ovbtn" onclick="pick('${k}')"><b>${k[0].toUpperCase() + k.slice(1)}</b></button>`);
  document.getElementById("overlay").innerHTML =
    `<div class="ov"><div class="ovt">ABYSS</div><div class="ovs">You are a small light in a vast dark. <b>Hold/drag to swim</b> (or WASD). Eat fish to grow; the bigger you are, the deeper you can dive. Bump glowing orbs to upgrade. Reach the floor… and see what waits.</div>${d}</div>`;
  showOverlay();
}
function pick(k) { S.difficulty = k; S.started = true; save(); hideOverlay(); }
function openMenu() {
  const eggs = Object.keys(S.eggs).length; let eg = ""; for (const e of EGGS) eg += `<span class="egg">${S.eggs[e.g] ? e.g : "❔"}</span>`;
  let hub = "";
  if (S.wreckFound) { hub = `<div class="ovt2" style="color:#ffd86b">⚓ Wreck Hub</div><div class="ovs">Spend Relics ⛃ ${fmt(S.relics)} on permanent power.</div><div class="shop">`;
    for (const k of PERM_KEYS) { const u = PERM[k], lv = S.perm[k], maxed = lv >= u.cap, cost = permCost(k), can = !maxed && S.relics >= cost;
      hub += `<button class="shopi ${can ? "on" : ""}" ${can ? `onclick="buyPerm('${k}')"` : "disabled"}><span class="si">${u.icon}</span><b>${u.name}</b><span class="sd">${u.desc}</span><span class="sc">${maxed ? "MAX" : "Lv" + lv + " · " + fmt(cost) + " ⛃"}</span></button>`; }
    hub += `</div>`; }
  document.getElementById("overlay").innerHTML =
    `<div class="ov">${hub}<div class="ovt2">Logbook</div>` +
    `<div class="ovs">Eaten ${fmt(S.stats.eaten)} · Salvaged ${fmt(S.stats.salvage)} ⛃ · Played ${fmtTime(S.stats.playtime)}</div>` +
    `<div class="ovs"><b>Oddities ${eggs}/${EGGS.length}</b></div><div class="eggs">${eg}</div>` +
    `<div class="ovs">Pace: ${["relaxed", "diver", "abyssal"].map(k => `<button class="mini ${S.difficulty === k ? "on" : ""}" onclick="S.difficulty='${k}';openMenu()">${k}</button>`).join(" ")}</div>` +
    `<button class="ovbtn" onclick="hideOverlay()">Back to the deep</button>` +
    `<button class="ovbtn danger" onclick="if(confirm('Erase all progress?')){hardReset();hideOverlay();}">Erase progress</button></div>`;
  showOverlay();
}
function buyPerm(k) { const u = PERM[k], cost = permCost(k); if (S.perm[k] >= u.cap || S.relics < cost) return; S.relics -= cost; S.perm[k]++; openMenu(); }
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.className = "show"; clearTimeout(t._t); t._t = setTimeout(() => t.className = "", 3200); }
function showOverlay() { document.getElementById("overlay").style.display = "flex"; }
function hideOverlay() { const o = document.getElementById("overlay"); o.style.display = "none"; o.innerHTML = ""; }

if (typeof window !== "undefined") window.addEventListener("load", init);
if (typeof module !== "undefined" && module.exports) module.exports = { newState, get S() { return S; }, set S(v) { S = v; } };
