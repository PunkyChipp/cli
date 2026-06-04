/* ===================================================================
   ABYSS — engine (pure logic, no DOM). Testable under Node.
   Depends on DATA (data.js) at call time.
   =================================================================== */

// ---- number formatting ----
function fmt(n) {
  if (n === Infinity) return "∞";
  if (isNaN(n)) return "0";
  if (n < 0) return "-" + fmt(-n);
  if (n < 1000) {
    if (n === Math.floor(n)) return "" + n;
    return n < 100 ? n.toFixed(1) : Math.floor(n).toString();
  }
  const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
                 "UDc", "DDc", "TDc", "QaDc", "QiDc"];
  const e = Math.floor(Math.log10(n) / 3);
  if (e < units.length) return (n / Math.pow(1000, e)).toFixed(2) + units[e];
  return n.toExponential(2).replace("e+", "e");
}
function fmtInt(n) { return n < 1000 ? "" + Math.floor(n) : fmt(n); }
function fmtTime(s) {
  s = Math.floor(s);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return d + "d " + (h % 24) + "h";
  if (h > 0) return h + "h " + (m % 60) + "m";
  return m + "m " + (s % 60) + "s";
}

// ---- bonus accumulator ----
function newBonus() {
  return {
    mult: {}, add: {},
    m(k, f) { this.mult[k] = (this.mult[k] || 1) * f; },
    a(k, v) { this.add[k] = (this.add[k] || 0) + v; },
    gm(k) { return this.mult[k] || 1; },
    ga(k) { return this.add[k] || 0; }
  };
}

// ---- difficulties ----
const DIFFICULTY = {
  relaxed: { speed: 1.6, label: "Relaxed", blurb: "A gentle current — everything flows faster." },
  diver:   { speed: 1.0, label: "Diver",   blurb: "The intended descent. Long and rewarding." },
  abyssal: { speed: 0.6, label: "Abyssal", blurb: "Slow and heavy. Every Pearl counts." }
};

// ---- new game ----
function newGame() {
  return {
    v: 1,
    difficulty: "diver",
    started: false,
    zone: 0, maxZone: 0, pressure: 0,
    res: {},                 // currency amounts
    run: {},                 // earned since last prestige (per base res)
    prod: {},                // producer owned counts
    ladder: {}, maxLadder: {},
    up: {},                  // upgrade levels
    auto: { ebbTarget: 5 },  // automation toggles + settings
    autoOn: {},              // toggled automations
    prestiges: {},           // counts
    glimmer: 0,
    cards: {},               // id -> level (owned)
    pity: 0, hauls: 0,
    slots: 3,
    presets: [Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)],
    preset: 0,
    ach: {},                 // achievement id -> true
    seen: {},                // unlock banners seen
    pending: [],             // queued unlock banner ids
    pendingDescend: null,
    stats: { taps: 0, playtime: 0 },
    offlineGain: 0, offlineSeconds: 0,
    lastSave: Date.now(), lastTick: Date.now()
  };
}

let G = newGame();

// ---- helpers ----
function zoneDef() { return DATA.zones[G.zone]; }
function res(id) { return G.res[id] || 0; }
function speed() { return DIFFICULTY[G.difficulty].speed; }
function pressureMult() { return Math.pow(2, G.pressure); }
function up(id) { return G.up[id] || 0; }
function lad(id) { return G.ladder[id] || 0; }
function maxLad(id) { return G.maxLadder[id] || 0; }
function prodCount(id) { return G.prod[id] || 0; }
function hasMilestone(zd, level) { return (G.maxLadder[zd.ladder.id] || 0) >= level; }

// ---- recompute (the interlock) ----
function recompute() {
  const B = newBonus();
  B.m("all", speed());
  B.m("all", pressureMult());

  const zd = zoneDef();

  // Ladder boosts tap + production.
  const L = lad(zd.ladder.id);
  B.m("tap", 1 + zd.ladder.tapPer * L);
  B.m("prod", 1 + zd.ladder.prodPer * L);

  // Zone interlock (cross-boosts between features).
  if (zd.apply) zd.apply(B, G);

  // Milestones already reached (permanent, based on best ladder level).
  const mx = maxLad(zd.ladder.id);
  for (const m of zd.milestones) if (mx >= m.level && m.apply) m.apply(B, G);

  // Zone upgrades.
  for (const u of zd.upgrades) {
    const lvl = up(u.id);
    if (lvl > 0) applyParts(B, u.parts(lvl), 1);
  }

  // Cards (global loadout).
  applyCards(B);

  // Achievements (permanent global perks).
  for (const a of DATA.achievements) if (G.ach[a.id] && a.apply) a.apply(B, G);

  G._B = B;
  return B;
}

function applyParts(B, parts, power) {
  for (const p of parts) {
    if (p.b !== undefined) B.m(p.k, 1 + p.b * power);
    if (p.add !== undefined) B.a(p.k, p.add * power);
  }
}

// ---- cards / loadout ----
function activeSlots() { return G.presets[G.preset]; }
function equippedCards() {
  const out = [];
  const slots = activeSlots();
  for (let i = 0; i < G.slots; i++) {
    const id = slots[i];
    if (id && G.cards[id] !== undefined) out.push({ i, id, def: DATA.cardMap[id], lvl: G.cards[id] });
  }
  return out;
}
function applyCards(B) {
  const eq = equippedCards();
  if (eq.length === 0) return;
  // power per equipped card from synergy cards.
  const power = {};
  for (const c of eq) power[c.i] = 1;
  for (const c of eq) {
    const syn = c.def.syn;
    if (!syn) continue;
    const val = syn.val * c.lvl;
    if (syn.scope === "adj") {
      for (const o of eq) if (Math.abs(o.i - c.i) === 1) power[o.i] += val;
    } else if (syn.scope === "all") {
      for (const o of eq) if (o.i !== c.i) power[o.i] += val;
    } else if (syn.scope.startsWith("rarity:")) {
      const r = syn.scope.split(":")[1];
      for (const o of eq) if (o.def.rarity === r) power[o.i] += val;
    }
  }
  for (const c of eq) {
    if (c.def.parts) applyParts(B, c.def.parts(c.lvl), power[c.i]);
  }
}
// Aggregate human-readable loadout summary.
function loadoutSummary() {
  const before = recompute();
  // Build a bonus with cards excluded for comparison.
  const out = {};
  const keys = ["all", "tap", "prod"];
  for (const k of keys) out[k] = before.gm(k);
  return out;
}

// ---- production ----
function producerYield(p) {
  const zd = zoneDef(), B = G._B;
  let y = p.baseYield;
  y *= B.gm("yield:" + p.id);
  y *= B.gm("res:" + p.res);
  y *= B.gm("prod");
  y *= B.gm("all");
  return y;
}
function perSec(resId) {
  const zd = zoneDef(); let s = 0;
  for (const p of zd.producers) if (p.res === resId) s += prodCount(p.id) * producerYield(p);
  return s;
}
function basePerSec() { return perSec(zoneDef().base.res); }
function tapValue() {
  const zd = zoneDef(), B = G._B;
  const base = 1 + B.ga("tapflat");
  return base * B.gm("tap") * B.gm("all");
}

// ---- costs ----
function producerCost(p) {
  const B = G._B;
  return p.baseCost * Math.pow(p.growth, prodCount(p.id)) * B.gm("cost:" + p.id);
}
function ladderCost(zd) {
  const B = G._B, l = zd.ladder;
  let c = l.baseCost * Math.pow(l.growth, lad(l.id)) * B.gm("ladcost:" + l.id);
  if (l.cheapenAt && maxLad(l.id) >= l.cheapenAt) {
    const owned = prodCount(l.cheapenBy);
    c *= Math.max(0.35, 1 - 0.02 * Math.sqrt(owned));
  }
  return c;
}
function upgradeCost(u) { return u.base * Math.pow(u.growth, up(u.id)); }

// ---- actions ----
function doTap() {
  const zd = zoneDef(), v = tapValue();
  G.res[zd.base.res] = (G.res[zd.base.res] || 0) + v;
  G.run[zd.base.res] = (G.run[zd.base.res] || 0) + v;
  G.stats.taps++;
  return v;
}
function buyProducer(id, n) {
  const zd = zoneDef(), p = zd.producers.find(x => x.id === id);
  if (!p) return;
  n = n || 1;
  for (let i = 0; i < n; i++) {
    const c = producerCost(p);
    if ((G.res[p.res] || 0) < c) break;
    G.res[p.res] -= c;
    G.prod[id] = (G.prod[id] || 0) + 1;
    recompute();
  }
}
function buyMaxProducer(id) {
  const zd = zoneDef(), p = zd.producers.find(x => x.id === id);
  if (!p) return;
  let n = 0;
  while (n < 5000 && (G.res[p.res] || 0) >= producerCost(p)) { G.res[p.res] -= producerCost(p); G.prod[id] = (G.prod[id] || 0) + 1; n++; }
  if (n > 0) recompute();
}
function raiseLadder() {
  const zd = zoneDef(), c = ladderCost(zd), r = zd.ladder.res;
  if ((G.res[r] || 0) < c) return;
  G.res[r] -= c;
  G.ladder[zd.ladder.id] = lad(zd.ladder.id) + 1;
  G.maxLadder[zd.ladder.id] = Math.max(maxLad(zd.ladder.id), G.ladder[zd.ladder.id]);
  awardMilestones(zd);
  recompute();
}
function buyUpgrade(id) {
  const zd = zoneDef(), u = zd.upgrades.find(x => x.id === id);
  if (!u) return;
  if (up(id) >= u.cap) return;
  const c = upgradeCost(u);
  if ((G.res[u.res] || 0) < c) return;
  G.res[u.res] -= c;
  G.up[id] = up(id) + 1;
  recompute();
}

// ---- prestige (zone reset) ----
function prestigeGain(zd) {
  const p = zd.prestige, B = G._B;
  const earned = G.run[zd.base.res] || 0;
  const g = Math.sqrt(earned / p.threshold) * B.gm("prestige:" + p.gain);
  return Math.floor(g);
}
function canPrestige(zd) { return prestigeGain(zd) >= 1; }
function doPrestige() {
  const zd = zoneDef();
  if (!canPrestige(zd)) return;
  const p = zd.prestige;
  G.res[p.gain] = (G.res[p.gain] || 0) + prestigeGain(zd);
  G.prestiges[p.id] = (G.prestiges[p.id] || 0) + 1;
  // reset base res + run + listed producers + ladder
  G.res[zd.base.res] = 0; G.run[zd.base.res] = 0;
  for (const pid of p.resetProducers) G.prod[pid] = 0;
  if (p.resetLadder) G.ladder[zd.ladder.id] = 0;
  // starting producers from upgrades
  if (p.startProducer && up(p.startUpgrade)) G.prod[p.startProducer] = (p.startPer || 0) * up(p.startUpgrade);
  recompute();
}

// ---- descend ----
function canDescend(zd) {
  const d = zd.descend; if (!d) return false;
  return G.zone === zd.id && maxLad(zd.ladder.id) >= d.level && (G.res[d.cost.res] || 0) >= d.cost.amt;
}
function doDescend() {
  const zd = zoneDef();
  if (!canDescend(zd)) return;
  G.pressure++;
  G.prestiges.descend = (G.prestiges.descend || 0) + 1;
  G.zone++;
  G.maxZone = Math.max(G.maxZone, G.zone);
  initZone(G.zone);
  G.glimmer += 25 * G.zone;
  G.pendingDescend = G.zone;
  recompute();
}
function initZone(i) {
  const zd = DATA.zones[i]; if (!zd) return;
  if (G.res[zd.base.res] === undefined) G.res[zd.base.res] = 0;
  if (G.run[zd.base.res] === undefined) G.run[zd.base.res] = 0;
}

// ---- milestones / landmarks ----
function awardMilestones(zd) {
  const mx = maxLad(zd.ladder.id);
  for (const m of zd.milestones) {
    if (mx >= m.level && !G.seen["ms:" + zd.id + ":" + m.level]) {
      G.seen["ms:" + zd.id + ":" + m.level] = true;
      if (m.card && G.cards[m.card] === undefined) { G.cards[m.card] = 1; }
      if (m.slot) G.slots = Math.min(9, G.slots + m.slot);
      if (m.glimmer) G.glimmer += m.glimmer;
      G.pending.push({ type: "milestone", zone: zd.id, level: m.level });
    }
  }
}

// ---- cards: haul / fuse / equip ----
function haulCost() { return Math.floor(5 * Math.pow(1.18, G.hauls)); }
function canHaul() { return G.glimmer >= haulCost() && unownedCards().length > 0; }
function unownedCards() { return DATA.cards.filter(c => G.cards[c.id] === undefined); }
function rollRarity() {
  // pity: every 12 hauls without rare+, force rare+
  const forced = G.pity >= 11;
  const r = Math.random();
  let rarity;
  if (forced) rarity = r < 0.6 ? "rare" : r < 0.9 ? "epic" : "legendary";
  else if (r < 0.55) rarity = "common";
  else if (r < 0.80) rarity = "uncommon";
  else if (r < 0.93) rarity = "rare";
  else if (r < 0.985) rarity = "epic";
  else rarity = "legendary";
  return rarity;
}
function doHaul() {
  if (!canHaul()) return null;
  G.glimmer -= haulCost();
  G.hauls++;
  let rarity = rollRarity();
  const rarOrder = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  // find a card of rarity (prefer unowned; if none unowned at rarity, fall to a dup of best matching)
  let pool = DATA.cards.filter(c => c.rarity === rarity);
  let unowned = pool.filter(c => G.cards[c.id] === undefined);
  let card;
  if (unowned.length) card = unowned[Math.floor(Math.random() * unowned.length)];
  else {
    // try any unowned of any rarity; else dup (level up) a random owned of this rarity
    const anyUn = unownedCards();
    if (anyUn.length && pool.every(c => G.cards[c.id] !== undefined)) {
      card = anyUn[Math.floor(Math.random() * anyUn.length)];
    } else if (pool.length) {
      card = pool[Math.floor(Math.random() * pool.length)];
    } else { card = DATA.cards[Math.floor(Math.random() * DATA.cards.length)]; }
  }
  if (["rare", "epic", "legendary", "mythic"].includes(card.rarity)) G.pity = 0; else G.pity++;
  let leveled = false;
  if (G.cards[card.id] === undefined) G.cards[card.id] = 1;
  else { G.cards[card.id]++; leveled = true; }
  recompute();
  return { card, leveled };
}
function equipCard(slot, id) {
  if (slot < 0 || slot >= G.slots) return;
  const slots = activeSlots();
  // remove this card from any other slot first
  for (let i = 0; i < slots.length; i++) if (slots[i] === id) slots[i] = null;
  slots[slot] = id;
  recompute();
}
function unequipSlot(slot) { activeSlots()[slot] = null; recompute(); }
function setPreset(i) { G.preset = i; recompute(); }

// ---- automation ----
function runAuto(dt) {
  const zd = zoneDef(), B = G._B;
  // auto-tap
  if (G.autoOn["autoTap_" + zd.id]) {
    const v = tapValue() * dt;
    G.res[zd.base.res] += v; G.run[zd.base.res] += v;
  }
  // auto-buy producers
  for (const p of zd.producers) {
    if (G.autoOn["autoProd_" + p.id]) {
      let n = 0;
      while (n < 8 && (G.res[p.res] || 0) >= producerCost(p)) { G.res[p.res] -= producerCost(p); G.prod[p.id] = (G.prod[p.id] || 0) + 1; n++; }
      if (n) recompute();
    }
  }
  // auto-prestige
  if (G.autoOn["autoPrestige_" + zd.id] && prestigeGain(zd) >= (G.auto.ebbTarget || 5)) doPrestige();
}

// ---- glimmer trickle (from scaling) ----
function glimmerRate() { return Math.sqrt(Math.max(0, basePerSec())) / 600; }

// ---- achievements ----
function checkAchievements() {
  for (const a of DATA.achievements) {
    if (!G.ach[a.id] && a.cond(G)) {
      G.ach[a.id] = true;
      if (a.glimmer) G.glimmer += a.glimmer;
      if (a.slot) G.slots = Math.min(9, G.slots + a.slot);
      G.pending.push({ type: "ach", id: a.id });
    }
  }
}

// ---- unlock banners (onboarding) ----
function checkUnlocks() {
  const zd = zoneDef();
  function fire(id, cond) { if (cond && !G.seen["u:" + id]) { G.seen["u:" + id] = true; G.pending.push({ type: "unlock", id }); } }
  fire("prestige_" + zd.id, canPrestige(zd));
  fire("descend_" + zd.id, canDescend(zd));
  fire("reliquary", G.glimmer >= haulCost() || Object.keys(G.cards).length > 0);
}

// ---- tick ----
function tick(dt) {
  if (!G._B) recompute();
  const zd = zoneDef();
  const add = basePerSec() * dt;
  G.res[zd.base.res] = (G.res[zd.base.res] || 0) + add;
  G.run[zd.base.res] = (G.run[zd.base.res] || 0) + add;
  // secondary currencies produced by other producers in zone
  for (const p of zd.producers) if (p.res !== zd.base.res) {
    G.res[p.res] = (G.res[p.res] || 0) + prodCount(p.id) * producerYield(p) * dt;
  }
  G.glimmer += glimmerRate() * dt;
  runAuto(dt);
  awardMilestones(zd);
  checkAchievements();
  checkUnlocks();
  G.stats.playtime += dt;
}

// ---- offline ----
function applyOffline() {
  const now = Date.now();
  const dt = (now - (G.lastSave || now)) / 1000;
  G.lastTick = now;
  if (dt < 30) { G.offlineGain = 0; G.offlineSeconds = 0; return; }
  recompute();
  const capped = Math.min(dt, 8 * 3600) * (G._B.gm("offline") || 1);
  const zd = zoneDef();
  const g = basePerSec() * capped;
  G.res[zd.base.res] = (G.res[zd.base.res] || 0) + g;
  G.run[zd.base.res] = (G.run[zd.base.res] || 0) + g;
  G.offlineGain = g; G.offlineSeconds = Math.min(dt, 8 * 3600);
}

// ---- save / load ----
const SAVE_KEY = "abyss.save.v1";
function save() {
  G.lastSave = Date.now();
  if (typeof localStorage !== "undefined") {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
  }
}
function load() {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    G = Object.assign(newGame(), s);
    // ensure presets length
    if (!G.presets) G.presets = [Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)];
    return true;
  } catch (e) { return false; }
}
function hardReset() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY);
  G = newGame();
  recompute();
}

// Node export for self-test.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { get G() { return G; }, set G(v) { G = v; },
    newGame, recompute, tick, doTap, buyProducer, buyMaxProducer, raiseLadder,
    buyUpgrade, doPrestige, canPrestige, prestigeGain, doDescend, canDescend,
    doHaul, equipCard, fmt, fmtInt, basePerSec, tapValue, producerCost, ladderCost,
    upgradeCost, perSec, zoneDef, setDATA: (d) => { DATA = d; } };
}
