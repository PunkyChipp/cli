/* =====================================================================
   ABYSS — a swim-and-eat incremental. You are a bioluminescent predator;
   eat fish to grow, bump drifting orbs to buy upgrades, descend the deep.
   Single-file canvas game. Tunable "FEEL" block up top.
   ===================================================================== */

// -------------------------------------------------- FEEL (tune freely)
const FEEL = {
  accel: 1500,        // thrust
  maxSpeedBase: 250,  // px/s before speed upgrades
  drag: 1.8,          // higher = more water resistance / quicker coast
  turn: 9,            // how fast the body rotates toward motion
  camLerp: 4,         // camera smoothing
  wiggle: 7           // tail swish amount
};

// -------------------------------------------------- helpers
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
let _s = 12345; function rnd() { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; }
function rr(a, b) { return a + Math.random() * (b - a); }
function hexRgb(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
function rgba(h, a) { const c = hexRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
function fmt(n) {
  if (n === Infinity) return "∞"; if (isNaN(n)) return "0"; if (n < 0) return "-" + fmt(-n);
  if (n < 1000) return n === Math.floor(n) ? "" + n : n.toFixed(n < 10 ? 1 : 0);
  const u = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const e = Math.floor(Math.log10(n) / 3);
  return e < u.length ? (n / Math.pow(1000, e)).toFixed(2) + u[e] : n.toExponential(2);
}
function fmtTime(s) { s = Math.floor(s); const m = (s / 60) | 0, h = (m / 60) | 0; if (h) return h + "h " + (m % 60) + "m"; if (m) return m + "m " + (s % 60) + "s"; return s + "s"; }

// -------------------------------------------------- content
const ZONES = [
  { name: "Sunlit Shallows", sky: ["#1aa6c8", "#0a5b86"], accent: "#8ff0ff", glow2: "#fff2a6", light: 1.0, req: 14 },
  { name: "Twilight Reach", sky: ["#0a3b6e", "#06173a"], accent: "#6fa8ff", glow2: "#9a6fff", light: 0.5, req: 55 },
  { name: "The Midnight", sky: ["#0a0a24", "#05021a"], accent: "#b46fff", glow2: "#5fd0ff", light: 0.2, req: 180 },
  { name: "The Abyss", sky: ["#04060f", "#01030a"], accent: "#4ff0e0", glow2: "#4f7bff", light: 0.07, req: 1e9 }
];
// fish: r=radius, val=base biomass, grow=size gained, spd=wander speed, flee, glyph, color, big(needs size)
const FISH = [
  { id: "shimmer", r: 9, val: 1, grow: 0.5, spd: 26, flee: 0, glyph: "🐟", color: "#bfe9ff", w: 0.42 },
  { id: "school", r: 7, val: 1, grow: 0.4, spd: 34, flee: 0, glyph: "🐠", color: "#9ee7c8", w: 0.30 },
  { id: "darter", r: 10, val: 4, grow: 1.0, spd: 96, flee: 1, glyph: "🐡", color: "#ffd27a", w: 0.16 },
  { id: "fat", r: 17, val: 9, grow: 3.0, spd: 16, flee: 0, glyph: "🐟", color: "#ff9ec2", w: 0.08, needs: 8 },
  { id: "glow", r: 12, val: 35, grow: 4.0, spd: 70, flee: 1, glyph: "🪼", color: "#a6fff0", w: 0.0, rare: 1 },
  { id: "whale", r: 40, val: 160, grow: 14, spd: 22, flee: 0, glyph: "🐋", color: "#9fb6ff", w: 0.0, needs: 60, rare: 2 }
];
const UPS = {
  speed:    { name: "Swift Fins",  icon: "💨", color: "#8ff0ff", cap: 30, base: 12, growth: 1.22, desc: "Top swim speed" },
  agility:  { name: "Lithe Body",  icon: "🌀", color: "#9be7a6", cap: 30, base: 14, growth: 1.22, desc: "Acceleration & turning" },
  range:    { name: "Wide Jaws",   icon: "😬", color: "#ffd27a", cap: 30, base: 16, growth: 1.24, desc: "Bite reach" },
  magnet:   { name: "Lure Glow",   icon: "🧲", color: "#c08bff", cap: 25, base: 30, growth: 1.30, desc: "Pull fish toward you" },
  luck:     { name: "Keen Senses", icon: "🍀", color: "#7affc0", cap: 25, base: 40, growth: 1.32, desc: "Rare-fish luck" },
  appetite: { name: "Big Appetite", icon: "🍽", color: "#ff8ad0", cap: 40, base: 20, growth: 1.20, desc: "Biomass per fish" }
};
const UP_KEYS = Object.keys(UPS);
const EGGS = [
  { g: "🦆", msg: "A rubber duck. It squeaks ominously.", bonus: 1 },
  { g: "🥾", msg: "An old boot. Surprisingly nutritious.", bonus: 1 },
  { g: "🍾", msg: "A message in a bottle: ‘keep swimming’.", bonus: 1 },
  { g: "🛟", msg: "A life ring. You don't need it down here.", bonus: 1 },
  { g: "🧦", msg: "The missing sock. So that's where it went.", bonus: 1 },
  { g: "🪙", msg: "Pirate gold! Worth a feast.", bonus: 12 },
  { g: "💎", msg: "A diamond. Shiny AND filling.", bonus: 30 },
  { g: "👑", msg: "A sunken crown. You feel regal.", bonus: 20 },
  { g: "🦴", msg: "An ominous bone. Best not to ask.", bonus: 2 },
  { g: "🛸", msg: "…was that a UFO? Down HERE?", bonus: 8 },
  { g: "👀", msg: "Something watched you pass. It blinked.", bonus: 0, spooky: 1 },
  { g: "🦑", msg: "A very large tentacle withdrew into the dark.", bonus: 0, spooky: 1 }
];

// -------------------------------------------------- state
function newState() {
  return {
    started: false, difficulty: "diver",
    zone: 0, maxZone: 0, pressure: 0,
    biomass: 0, size: 0,
    up: { speed: 0, agility: 0, range: 0, magnet: 0, luck: 0, appetite: 0 },
    eggs: {}, stats: { eaten: 0, playtime: 0, big: 0, descents: 0 },
    lastSave: Date.now()
  };
}
let S = newState();
const W = { creature: null, fish: [], orbs: [], eggs: [], parts: [], floats: [],
  cam: { x: 0, y: 0 }, shake: 0, combo: 0, comboT: 0, world: { w: 2600, h: 1900 },
  whirl: null, eggTimer: 8, t: 0 };
let CV, X, VW = 800, VH = 600;
const input = { x: 0, y: 0, down: false, keys: {} };

// -------------------------------------------------- derived
function zone() { return ZONES[S.zone]; }
function pressureMult() { return Math.pow(2, S.pressure); }
function zoneMult() { return Math.pow(1.9, S.zone); }
function maxSpeed() { return FEEL.maxSpeedBase * (1 + 0.05 * S.up.speed); }
function accel() { return FEEL.accel * (1 + 0.05 * S.up.agility); }
function turnRate() { return FEEL.turn * (1 + 0.03 * S.up.agility); }
function biteRange() { return 6 + 7 * S.up.range; }
function magnetR() { return S.up.magnet > 0 ? 50 + 24 * S.up.magnet : 0; }
function luckChance() { return 0.015 + 0.012 * S.up.luck; }
function appetite() { return 1 + 0.22 * S.up.appetite; }
function gainMult() { return appetite() * zoneMult() * pressureMult(); }
function creatureR() { return clamp(11 + Math.sqrt(S.size) * 2.0, 11, 68); }
function comboMult() { return 1 + W.combo * 0.12; }
function upCost(k) { const u = UPS[k]; return Math.floor(u.base * Math.pow(u.growth, S.up[k])); }

// -------------------------------------------------- init / save
function init() {
  CV = document.getElementById("c"); X = CV.getContext("2d");
  resize(); window.addEventListener("resize", resize);
  load();
  W.creature = { x: W.world.w / 2, y: W.world.h / 2, vx: 0, vy: 0, ang: 0, chomp: 0 };
  for (let i = 0; i < 55; i++) spawnFish(true);
  spawnOrbs();
  bindInput();
  requestAnimationFrame(loop);
  setInterval(hud, 160);
  if (!S.started) showStart(); else hideOverlay();
}
function resize() { VW = window.innerWidth; VH = window.innerHeight; if (CV) { CV.width = VW; CV.height = VH; } }
const KEY = "abyss.swim.v1";
function save() { S.lastSave = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { const r = localStorage.getItem(KEY); if (r) S = Object.assign(newState(), JSON.parse(r)); } catch (e) {} }
function hardReset() { try { localStorage.removeItem(KEY); } catch (e) {} S = newState(); S.started = true; W.fish = []; for (let i = 0; i < 55; i++) spawnFish(true); spawnOrbs(); S.size = 0; }

// -------------------------------------------------- spawning
function spawnFish(anywhere) {
  const pool = [];
  for (const f of FISH) {
    let w = f.w;
    if (f.rare === 1) w = luckChance();
    if (f.rare === 2) w = (S.size >= (f.needs || 0)) ? luckChance() * 0.4 : 0;
    if (f.needs && S.size < f.needs * 0.6) w *= 0.15;
    if (w > 0) pool.push([f, w]);
  }
  let tot = 0; for (const p of pool) tot += p[1];
  let r = Math.random() * tot, pick = pool[0][0];
  for (const p of pool) { r -= p[1]; if (r <= 0) { pick = p[0]; break; } }
  let x, y;
  if (anywhere) { x = Math.random() * W.world.w; y = Math.random() * W.world.h; }
  else { // spawn just off the visible edge
    const e = Math.floor(Math.random() * 4);
    x = clamp(W.cam.x + (e === 0 ? -40 : e === 1 ? VW + 40 : Math.random() * VW), 0, W.world.w);
    y = clamp(W.cam.y + (e === 2 ? -40 : e === 3 ? VH + 40 : Math.random() * VH), 0, W.world.h);
  }
  const a = Math.random() * 6.28;
  W.fish.push({ t: pick, x, y, vx: Math.cos(a) * pick.spd, vy: Math.sin(a) * pick.spd, ph: Math.random() * 6.28, wob: 0 });
}
function spawnOrbs() {
  W.orbs = [];
  UP_KEYS.forEach((k, i) => {
    const a = (i / UP_KEYS.length) * 6.28;
    W.orbs.push({ k, x: W.world.w / 2 + Math.cos(a) * 360, y: W.world.h / 2 + Math.sin(a) * 300,
      vx: rr(-18, 18), vy: rr(-18, 18), ph: Math.random() * 6.28, flash: 0 });
  });
}
function spawnEgg() {
  const d = EGGS[Math.floor(Math.random() * EGGS.length)];
  const fromLeft = Math.random() < 0.5;
  W.eggs.push({ d, x: W.cam.x + (fromLeft ? -50 : VW + 50), y: W.cam.y + rr(60, VH - 60),
    vx: (fromLeft ? 1 : -1) * rr(40, 80), vy: rr(-10, 10), ph: Math.random() * 6.28, life: 18 });
}
function addParts(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rr(spd * 0.3, spd);
    W.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rr(0.3, 0.7), max: 0.7, color }); }
}
function addFloat(x, y, txt, color) { W.floats.push({ x, y, txt, color, life: 0.9 }); }

// -------------------------------------------------- input
function bindInput() {
  const setp = e => { const r = CV.getBoundingClientRect(); input.x = (e.clientX - r.left); input.y = (e.clientY - r.top); };
  CV.addEventListener("pointerdown", e => { input.down = true; setp(e); CV.setPointerCapture && CV.setPointerCapture(e.pointerId); });
  CV.addEventListener("pointermove", e => { setp(e); });
  window.addEventListener("pointerup", () => input.down = false);
  window.addEventListener("keydown", e => { input.keys[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup", e => { input.keys[e.key.toLowerCase()] = false; });
}
function steerVec() {
  let dx = 0, dy = 0;
  if (input.down) { dx = input.x - VW / 2; dy = input.y - VH / 2; const m = Math.hypot(dx, dy);
    if (m > 12) { dx /= m; dy /= m; } else { dx = dy = 0; } }
  const k = input.keys;
  if (k["w"] || k["arrowup"]) dy -= 1; if (k["s"] || k["arrowdown"]) dy += 1;
  if (k["a"] || k["arrowleft"]) dx -= 1; if (k["d"] || k["arrowright"]) dx += 1;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  return [dx, dy];
}

// -------------------------------------------------- update
function loop(ts) {
  const now = ts / 1000; let dt = now - (W.t || now); W.t = now; if (dt > 0.05) dt = 0.05;
  if (S.started) update(dt);
  render();
  requestAnimationFrame(loop);
}
function update(dt) {
  S.stats.playtime += dt;
  const c = W.creature, [sx, sy] = steerVec();
  c.vx += sx * accel() * dt; c.vy += sy * accel() * dt;
  // drag
  const dr = Math.exp(-FEEL.drag * dt); c.vx *= dr; c.vy *= dr;
  // clamp speed
  const sp = Math.hypot(c.vx, c.vy), ms = maxSpeed();
  if (sp > ms) { c.vx = c.vx / sp * ms; c.vy = c.vy / sp * ms; }
  c.x = clamp(c.x + c.vx * dt, 20, W.world.w - 20);
  c.y = clamp(c.y + c.vy * dt, 20, W.world.h - 20);
  if (sp > 6) { const target = Math.atan2(c.vy, c.vx); let d = target - c.ang;
    while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; c.ang += d * clamp(turnRate() * dt, 0, 1); }
  c.chomp = Math.max(0, c.chomp - dt * 4);
  if (sp > ms * 0.5 && Math.random() < 0.4) addParts(c.x - Math.cos(c.ang) * creatureR(), c.y - Math.sin(c.ang) * creatureR(), "#bfe9ff", 1, 20);

  // camera
  const tx = clamp(c.x - VW / 2, 0, Math.max(0, W.world.w - VW));
  const ty = clamp(c.y - VH / 2, 0, Math.max(0, W.world.h - VH));
  W.cam.x = lerp(W.cam.x, tx, clamp(FEEL.camLerp * dt, 0, 1));
  W.cam.y = lerp(W.cam.y, ty, clamp(FEEL.camLerp * dt, 0, 1));
  W.shake = Math.max(0, W.shake - dt * 6);

  // combo decay
  W.comboT -= dt; if (W.comboT <= 0) W.combo = 0;

  // fish
  const cr = creatureR(), br = cr + biteRange(), mr = magnetR();
  for (let i = W.fish.length - 1; i >= 0; i--) {
    const f = W.fish[i], ft = f.t;
    f.ph += dt * 3; f.wob = Math.sin(f.ph) * 6;
    // wander
    f.vx += rr(-1, 1) * ft.spd * dt * 2; f.vy += rr(-1, 1) * ft.spd * dt * 2;
    const d2 = dist2(f.x, f.y, c.x, c.y), d = Math.sqrt(d2);
    if (ft.flee && d < 220) { f.vx += (f.x - c.x) / d * ft.spd * dt * 5; f.vy += (f.y - c.y) / d * ft.spd * dt * 5; }
    if (mr > 0 && d < mr && d > 1) { f.vx += (c.x - f.x) / d * 160 * dt; f.vy += (c.y - f.y) / d * 160 * dt; }
    const fs = Math.hypot(f.vx, f.vy), lim = ft.spd * (ft.flee ? 2.2 : 1.2);
    if (fs > lim) { f.vx = f.vx / fs * lim; f.vy = f.vy / fs * lim; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 0 || f.x > W.world.w) f.vx *= -1; if (f.y < 0 || f.y > W.world.h) f.vy *= -1;
    f.x = clamp(f.x, 0, W.world.w); f.y = clamp(f.y, 0, W.world.h);
    // eat?
    const edible = !ft.needs || cr >= ft.r * 0.82;
    if (edible && d < br + ft.r) eat(i, f, ft);
  }
  while (W.fish.length < 55) spawnFish(false);

  // orbs
  for (const o of W.orbs) {
    o.ph += dt * 2; o.flash = Math.max(0, o.flash - dt * 3);
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (o.x < 60 || o.x > W.world.w - 60) o.vx *= -1; if (o.y < 60 || o.y > W.world.h - 60) o.vy *= -1;
    if (dist2(o.x, o.y, c.x, c.y) < (cr + 26) * (cr + 26)) tryBuy(o);
  }

  // eggs
  W.eggTimer -= dt;
  if (W.eggTimer <= 0) { W.eggTimer = rr(16, 34); spawnEgg(); }
  for (let i = W.eggs.length - 1; i >= 0; i--) {
    const e = W.eggs[i]; e.ph += dt * 2; e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(e.ph) * 6 * dt; e.life -= dt;
    if (!e.d.spooky && dist2(e.x, e.y, c.x, c.y) < (cr + 22) * (cr + 22)) { eatEgg(e); W.eggs.splice(i, 1); continue; }
    if (e.life <= 0) W.eggs.splice(i, 1);
  }

  // particles / floats
  for (let i = W.parts.length - 1; i >= 0; i--) { const p = W.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; if (p.life <= 0) W.parts.splice(i, 1); }
  for (let i = W.floats.length - 1; i >= 0; i--) { const f = W.floats[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) W.floats.splice(i, 1); }

  // descend whirlpool
  if (S.zone < ZONES.length - 1 && S.size >= zone().req && !W.whirl)
    W.whirl = { x: W.world.w / 2, y: W.world.h - 80, ph: 0 };
  if (W.whirl) { W.whirl.ph += dt * 2;
    if (dist2(W.whirl.x, W.whirl.y, c.x, c.y) < (cr + 50) * (cr + 50)) descend(); }

  if (Date.now() - S.lastSave > 5000) save();
}

function eat(i, f, ft) {
  W.fish.splice(i, 1);
  const gain = ft.val * gainMult() * comboMult();
  S.biomass += gain; S.size += ft.grow; S.stats.eaten++;
  if (ft.val > S.stats.big) S.stats.big = ft.val;
  W.combo = Math.min(12, W.combo + 1); W.comboT = 2;
  W.creature.chomp = 1; W.shake = Math.min(1, W.shake + ft.r / 60);
  addParts(f.x, f.y, ft.color, Math.min(20, 4 + (ft.r | 0)), 120);
  addFloat(f.x, f.y, "+" + fmt(gain), ft.color);
}
function eatEgg(e) {
  const d = e.d; const found = !S.eggs[d.g]; S.eggs[d.g] = true;
  const gain = d.bonus * 10 * gainMult();
  if (gain > 0) { S.biomass += gain; addFloat(e.x, e.y, "+" + fmt(gain), "#ffd86b"); }
  W.creature.chomp = 1; W.shake = 0.6; addParts(e.x, e.y, "#ffd86b", 16, 130);
  toast((found ? "✦ NEW · " : "") + d.g + "  " + d.msg);
}
function tryBuy(o) {
  const k = o.k, cost = upCost(k);
  if (S.up[k] >= UPS[k].cap) { return; }
  if (S.biomass >= cost) {
    S.biomass -= cost; S.up[k]++; o.flash = 1; W.shake = Math.min(1, W.shake + 0.3);
    addParts(o.x, o.y, UPS[k].color, 18, 120); addFloat(o.x, o.y - 10, UPS[k].name + " Lv" + S.up[k], UPS[k].color);
  } else if (!o._warn || Date.now() - o._warn > 1500) { o._warn = Date.now(); addFloat(o.x, o.y - 10, "Need " + fmt(cost), "#ff8a94"); }
}
function descend() {
  S.pressure++; S.zone++; S.maxZone = Math.max(S.maxZone, S.zone); S.stats.descents++;
  S.size = 0; W.whirl = null; W.fish = []; for (let i = 0; i < 55; i++) spawnFish(true);
  W.creature.x = W.world.w / 2; W.creature.y = W.world.h / 2; W.creature.vx = W.creature.vy = 0;
  W.cam.x = W.creature.x - VW / 2; W.cam.y = W.creature.y - VH / 2;
  spawnOrbs();
  flashOverlay(zone());
}

// -------------------------------------------------- render
function render() {
  const z = zone();
  const shx = (Math.random() - 0.5) * W.shake * 14, shy = (Math.random() - 0.5) * W.shake * 14;
  // bg
  const g = X.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, z.sky[0]); g.addColorStop(1, z.sky[1]);
  X.fillStyle = g; X.fillRect(0, 0, VW, VH);
  const dg = X.createLinearGradient(0, VH * 0.3, 0, VH); dg.addColorStop(0, "rgba(0,0,0,0)"); dg.addColorStop(1, "rgba(0,0,0,.5)");
  X.fillStyle = dg; X.fillRect(0, 0, VW, VH);
  // god rays
  if (z.light > 0.3) for (let i = 0; i < 5; i++) {
    const x = ((i * 360 - W.cam.x * 0.3) % (VW + 360)) - 80 + Math.sin(W.t * 0.2 + i) * 20;
    const lg = X.createLinearGradient(0, 0, 0, VH * 0.9); lg.addColorStop(0, rgba(z.glow2, 0.08 * z.light)); lg.addColorStop(1, "rgba(0,0,0,0)");
    X.fillStyle = lg; X.beginPath(); X.moveTo(x, -40); X.lineTo(x + 70, -40); X.lineTo(x + 180, VH * 0.9); X.lineTo(x + 50, VH * 0.9); X.closePath(); X.fill();
  }
  // parallax marine snow
  X.fillStyle = "rgba(255,255,255,.14)";
  for (let i = 0; i < 90; i++) { const px = ((i * 137.5 - W.cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20;
    const py = ((i * 91.3 + W.t * 12 - W.cam.y * 0.5) % (VH + 40) + VH + 40) % (VH + 40) - 20; X.fillRect(px, py, 2, 2); }

  X.save(); X.translate(-W.cam.x + shx, -W.cam.y + shy);

  // whirlpool
  if (W.whirl) { const wp = W.whirl;
    for (let r = 60; r > 8; r -= 10) { X.strokeStyle = rgba(z.accent, 0.2 + (60 - r) / 200); X.lineWidth = 3;
      X.beginPath(); X.arc(wp.x, wp.y, r, wp.ph + r * 0.1, wp.ph + r * 0.1 + 5); X.stroke(); }
    glow(wp.x, wp.y, 70, z.accent, 0.18); ftxt(wp.x, wp.y - 80, "▼ DIVE DEEPER", z.accent, 16);
  }

  // orbs
  for (const o of W.orbs) { const u = UPS[o.k], cost = upCost(o.k), maxed = S.up[o.k] >= u.cap;
    const pr = 24 + Math.sin(o.ph) * 2 + o.flash * 10;
    glow(o.x, o.y, pr + 14, u.color, 0.3 + o.flash * 0.4);
    X.font = "22px serif"; X.textAlign = "center"; X.textBaseline = "middle"; X.fillText(u.icon, o.x, o.y);
    ftxt(o.x, o.y - pr - 8, u.name + " Lv" + S.up[o.k], u.color, 12);
    ftxt(o.x, o.y + pr + 10, maxed ? "MAX" : fmt(cost) + " ◍", maxed ? "#fff" : (S.biomass >= cost ? "#9be7a6" : "#ff8a94"), 12);
  }

  // fish
  X.textAlign = "center"; X.textBaseline = "middle";
  for (const f of W.fish) { const ft = f.t; glow(f.x, f.y + f.wob, ft.r + 4, ft.color, 0.25);
    X.font = (ft.r * 1.7 | 0) + "px serif"; X.fillText(ft.glyph, f.x, f.y + f.wob); }

  // eggs
  for (const e of W.eggs) { glow(e.x, e.y, 22, e.d.spooky ? "#ff5c6a" : "#ffd86b", 0.25 + 0.15 * Math.sin(e.ph));
    X.font = "26px serif"; X.fillText(e.d.g, e.x, e.y); }

  // particles
  for (const p of W.parts) { const a = clamp(p.life / p.max, 0, 1); glow(p.x, p.y, 4, p.color, 0.6 * a); }

  // creature
  drawCreature();

  // floats
  for (const f of W.floats) { X.globalAlpha = clamp(f.life / 0.9, 0, 1); ftxt(f.x, f.y, f.txt, f.color, 16); X.globalAlpha = 1; }
  X.restore();

  // combo
  if (W.combo > 1) { X.textAlign = "center"; X.fillStyle = zone().accent; X.font = "700 22px system-ui";
    X.fillText("×" + comboMult().toFixed(1) + " combo", VW / 2, 90); }
  // vignette
  const vg = X.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (0.3 + (1 - z.light) * 0.4) + ")");
  X.fillStyle = vg; X.fillRect(0, 0, VW, VH);
}
function drawCreature() {
  const c = W.creature, z = zone(), r = creatureR() * (1 + c.chomp * 0.12);
  X.save(); X.translate(c.x, c.y); X.rotate(c.ang);
  const wig = Math.sin(W.t * 8) * FEEL.wiggle * (0.3 + Math.min(1, Math.hypot(c.vx, c.vy) / maxSpeed()));
  // tail
  X.strokeStyle = rgba(z.accent, 0.8); X.lineWidth = r * 0.5; X.lineCap = "round";
  X.beginPath(); X.moveTo(-r * 0.6, 0); X.quadraticCurveTo(-r * 1.2, wig, -r * 1.7, wig * 1.6); X.stroke();
  // body glow + body
  glow(0, 0, r * 1.7, z.accent, 0.22);
  X.fillStyle = rgba(z.glow2, 0.9); X.beginPath(); X.ellipse(0, 0, r * 1.15, r * 0.72, 0, 0, 6.283); X.fill();
  X.fillStyle = "#fff"; X.beginPath(); X.ellipse(r * 0.2, 0, r * 0.7, r * 0.5, 0, 0, 6.283); X.fill();
  // mouth (chomp)
  X.fillStyle = "#08121a"; X.beginPath(); X.moveTo(r * 0.7, 0);
  X.arc(r * 0.55, 0, r * 0.55, -0.5 - c.chomp * 0.6, 0.5 + c.chomp * 0.6); X.closePath(); X.fill();
  // eye
  X.fillStyle = "#04121a"; X.beginPath(); X.arc(r * 0.45, -r * 0.28, r * 0.13, 0, 6.283); X.fill();
  // bioluminescent dots scale with size
  X.fillStyle = rgba(z.accent, 0.9);
  const dots = 3 + Math.min(8, (S.size / 12) | 0);
  for (let i = 0; i < dots; i++) { const dx = -r * 0.5 + i * (r * 1.3 / dots); X.beginPath(); X.arc(dx, -r * 0.5, r * 0.08, 0, 6.283); X.fill(); }
  X.restore();
  // bite range hint when holding
  if (input.down) { X.strokeStyle = rgba(z.accent, 0.12); X.lineWidth = 1; X.beginPath(); X.arc(c.x, c.y, r + biteRange(), 0, 6.283); X.stroke(); }
}
function glow(x, y, r, color, a) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0)); X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 6.283); X.fill(); }
function ftxt(x, y, t, color, size) { X.font = "700 " + size + "px system-ui"; X.textAlign = "center"; X.fillStyle = color; X.fillText(t, x, y); }

// -------------------------------------------------- HUD + overlays (DOM)
function hud() {
  const z = zone();
  const next = S.zone < ZONES.length - 1 ? Math.min(1, S.size / z.req) : 1;
  document.getElementById("hud").innerHTML =
    '<div class="hchip"><b style="color:' + z.accent + '">◍ ' + fmt(S.biomass) + '</b><span>Biomass</span></div>' +
    '<div class="hchip"><b>⬤ ' + fmt(S.size) + '</b><span>Size</span></div>' +
    (S.pressure > 0 ? '<div class="hchip"><b style="color:#7fe4ff">🜄 ×' + fmt(pressureMult()) + '</b><span>Pressure</span></div>' : "") +
    '<div class="hchip hz"><b>' + z.name + '</b><span>Depth ' + (S.zone + 1) + (S.zone < ZONES.length - 1 ? ' · dive at ' + fmt(z.req) + ' size' : ' · the bottom') + '</span>' +
    '<div class="bar"><i style="width:' + (next * 100).toFixed(0) + '%;background:' + z.accent + '"></i></div></div>';
}
function showStart() {
  let d = "";
  for (const k in { relaxed: 1, diver: 1, abyssal: 1 }) d += '<button class="ovbtn" onclick="pick(\'' + k + '\')"><b>' + k[0].toUpperCase() + k.slice(1) + "</b></button>";
  document.getElementById("overlay").innerHTML =
    '<div class="ov"><div class="ovt">ABYSS</div>' +
    '<div class="ovs">You are a small light in a big dark. <b>Hold/drag to swim</b> (or WASD), eat fish to grow, and bump the glowing orbs to upgrade. Dive deeper when you\'re big enough.</div>' +
    '<div class="ovs" style="opacity:.7">Watch for things drifting by…</div>' + d + "</div>";
  showOverlay();
}
function pick(k) { S.difficulty = k; S.started = true; save(); hideOverlay(); }
function flashOverlay(z) {
  document.getElementById("overlay").innerHTML =
    '<div class="ov" style="border-color:' + rgba(z.accent, 0.5) + '"><div class="ovtag" style="color:' + z.accent + '">DESCENDING</div>' +
    '<div class="ovt">' + z.name + '</div><div class="ovs">A new dark, new prey, and everything worth more.</div>' +
    '<button class="ovbtn" onclick="hideOverlay()">Dive in</button></div>';
  showOverlay(); setTimeout(() => { const o = document.getElementById("overlay"); if (o.style.display !== "none") hideOverlay(); }, 3200);
}
function openMenu() {
  const eggsFound = Object.keys(S.eggs).length;
  let eg = ""; for (const e of EGGS) eg += '<span class="egg">' + (S.eggs[e.g] ? e.g : "❔") + "</span>";
  document.getElementById("overlay").innerHTML =
    '<div class="ov"><div class="ovt2">Logbook</div>' +
    '<div class="ovs">Eaten ' + fmt(S.stats.eaten) + " · Descents " + S.stats.descents + " · Played " + fmtTime(S.stats.playtime) + "</div>" +
    '<div class="ovs"><b>Oddities found ' + eggsFound + "/" + EGGS.length + "</b></div><div class='eggs'>" + eg + "</div>" +
    '<div class="ovs">Pace: ' +
    ["relaxed", "diver", "abyssal"].map(k => '<button class="mini ' + (S.difficulty === k ? "on" : "") + '" onclick="S.difficulty=\'' + k + '\';openMenu()">' + k + "</button>").join(" ") + "</div>" +
    '<button class="ovbtn" onclick="hideOverlay()">Back to the deep</button>' +
    '<button class="ovbtn danger" onclick="if(confirm(\'Erase all progress?\')){hardReset();hideOverlay();}">Erase progress</button></div>';
  showOverlay();
}
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.className = "show"; clearTimeout(t._t); t._t = setTimeout(() => t.className = "", 3200); }
function showOverlay() { document.getElementById("overlay").style.display = "flex"; }
function hideOverlay() { document.getElementById("overlay").style.display = "none"; document.getElementById("overlay").innerHTML = ""; }

if (typeof window !== "undefined") window.addEventListener("load", init);
if (typeof module !== "undefined" && module.exports) module.exports = { newState, get S() { return S; }, set S(v) { S = v; } };
