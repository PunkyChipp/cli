/* =====================================================================
   ABYSS — one continuous plunge. Swim DOWN through 5 layers, each with
   its own prey and upgrades, gated by how big you've grown. At the floor:
   The Wreck — salvage it for Relics and permanent power.
   Single-file canvas game. Tunable FEEL block up top.
   ===================================================================== */
const FEEL = { maxSpeedBase: 285, resp: 8.5, turn: 12, camLerp: 5, wiggle: 7, accel: 1500, drag: 1.8 };

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
const WW = 1500, LH = 1500;
const LAYERS = [
  { name: "Sunlit Shallows", col: "#1aa6c8", accent: "#8ff0ff", light: 1.00, req: 0,   fish: ["shimmer", "school"], ups: ["speed", "appetite"] },
  { name: "Kelp Forest",     col: "#0d6f86", accent: "#6fe0c0", light: 0.78, req: 8,   fish: ["school", "darter"],  ups: ["agility", "range"] },
  { name: "Twilight Reach",  col: "#0a3b6e", accent: "#6fa8ff", light: 0.46, req: 32,  fish: ["darter", "fat"],     ups: ["magnet", "luck"] },
  { name: "The Midnight",    col: "#0a0a24", accent: "#b46fff", light: 0.20, req: 90,  fish: ["fat", "glow"],       ups: ["glow", "appetite"] },
  { name: "The Trench",      col: "#04060f", accent: "#4ff0e0", light: 0.07,  req: 200,  fish: ["glow", "whale"],     ups: ["speed", "glow"] },
  { name: "Hadal Deep",      col: "#02100a", accent: "#7affc0", light: 0.05,  req: 480,  fish: ["lobster", "glow", "whale"], ups: ["range", "appetite"] },
  { name: "The Sunless",     col: "#0a0210", accent: "#ff6fd0", light: 0.035, req: 1100, fish: ["viper", "gulper", "glow"],  ups: ["luck", "magnet"] },
  { name: "The Bonefields",  col: "#0c0608", accent: "#ffd86b", light: 0.02,  req: 2600, fish: ["gulper", "whale", "viper"], ups: ["glow", "speed"] }
];
const NL = LAYERS.length;
const WRECK_LAYER = 5;          // the Wreck guards the gateway to the truly deep
const WRECK_REQ = 480;          // == LAYERS[WRECK_LAYER].req
const WORLD = { w: WW, h: NL * LH };
const FLOOR_COL = "#01030a";
const FISH = {
  shimmer: { r: 9,  val: 1,   grow: 0.5, spd: 26, flee: 0, glyph: "🐟", color: "#bfe9ff" },
  school:  { r: 7,  val: 2,   grow: 0.5, spd: 34, flee: 0, glyph: "🐠", color: "#9ee7c8" },
  darter:  { r: 10, val: 6,   grow: 1.2, spd: 96, flee: 1, glyph: "🐡", color: "#ffd27a" },
  fat:     { r: 18, val: 16,  grow: 3.5, spd: 16, flee: 0, glyph: "🐟", color: "#ff9ec2", needs: 10 },
  glow:    { r: 13, val: 60,  grow: 5.0, spd: 70, flee: 1, glyph: "🪼", color: "#a6fff0" },
  whale:   { r: 42, val: 300, grow: 18,  spd: 22, flee: 0, glyph: "🐋", color: "#9fb6ff", needs: 90 },
  lobster: { r: 16, val: 48,  grow: 5.0, spd: 18, flee: 0, glyph: "🦞", color: "#ff9e7a", needs: 24 },
  viper:   { r: 11, val: 95,  grow: 4.5, spd: 112, flee: 1, glyph: "🐊", color: "#caff7a" },
  gulper:  { r: 34, val: 260, grow: 16,  spd: 20, flee: 0, glyph: "🐳", color: "#9fd0ff", needs: 110 }
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
  e_automolt: { cat: "Instinct", name: "Life Cycle", icon: "♻", cap: 1, base: 120, growth: 1, desc: "Rebirths automatically at your target." }
};
const EVO_KEYS = Object.keys(EVO);
const EVO_CATS = ["Hunt", "Body", "Senses", "Instinct"];

// Bloodline tree — permanent, Lineage-bought (2nd reset). Touches every stat.
const BL = {
  bl_speed:   { cat: "Predator", name: "Hydrodynamic", icon: "💨", cap: 40, base: 2, growth: 1.22, desc: "+4% swim speed" },
  bl_agility: { cat: "Predator", name: "Reflexes",     icon: "🌀", cap: 40, base: 2, growth: 1.22, desc: "+Acceleration & turning" },
  bl_bite:    { cat: "Predator", name: "Maw",          icon: "😼", cap: 40, base: 3, growth: 1.24, desc: "+Bite reach" },
  bl_might:   { cat: "Predator", name: "Killing Blow", icon: "⚔", cap: 40, base: 3, growth: 1.26, desc: "+Damage to Apex Predators" },
  bl_knock:   { cat: "Predator", name: "Anchored",     icon: "⚓", cap: 20, base: 4, growth: 1.3,  desc: "−Knockback taken" },
  bl_appetite:{ cat: "Metabolism", name: "Gluttony",   icon: "🍖", cap: 50, base: 2, growth: 1.2,  desc: "+Biomass per fish" },
  bl_size:    { cat: "Metabolism", name: "Growth Spurt", icon: "📈", cap: 40, base: 2, growth: 1.22, desc: "+Size gained per meal" },
  bl_combocap:{ cat: "Metabolism", name: "Bloodlust",  icon: "🔥", cap: 20, base: 5, growth: 1.4,  desc: "+Max combo (×2 each)" },
  bl_combomul:{ cat: "Metabolism", name: "Killing Spree", icon: "💥", cap: 30, base: 3, growth: 1.3, desc: "+Combo strength" },
  bl_combotime:{ cat: "Metabolism", name: "Momentum",  icon: "⏱", cap: 20, base: 4, growth: 1.3,  desc: "+Combo duration" },
  bl_hp:      { cat: "Vitality", name: "Thick Hide",   icon: "🛡", cap: 40, base: 3, growth: 1.25, desc: "+Max health" },
  bl_armor:   { cat: "Vitality", name: "Scales",       icon: "🐢", cap: 25, base: 5, growth: 1.35, desc: "−Damage taken" },
  bl_regen:   { cat: "Vitality", name: "Mending",      icon: "➕", cap: 25, base: 4, growth: 1.3,  desc: "+Health regen" },
  bl_luck:    { cat: "Senses", name: "Predator's Eye", icon: "👁", cap: 30, base: 3, growth: 1.3,  desc: "+Rare-fish luck" },
  bl_glow:    { cat: "Senses", name: "Beacon",         icon: "🔆", cap: 30, base: 3, growth: 1.28, desc: "+Light radius" },
  bl_magnet:  { cat: "Senses", name: "Vortex",         icon: "🧲", cap: 30, base: 3, growth: 1.3,  desc: "+Fish magnet" },
  bl_salvage: { cat: "Senses", name: "Wreckborn",      icon: "🪙", cap: 25, base: 5, growth: 1.35, desc: "+Relics per salvage" },
  bl_density: { cat: "Senses", name: "Teeming Sea",    icon: "🐟", cap: 20, base: 6, growth: 1.4,  desc: "+Fish in the water" },
  bl_frenzy:  { cat: "Senses", name: "Blood in Water", icon: "🌀", cap: 20, base: 6, growth: 1.4,  desc: "Stronger, longer Feeding Frenzies" },
  bl_roe:     { cat: "Heredity", name: "Brood Mother", icon: "🥚", cap: 40, base: 3, growth: 1.26, desc: "+Roe per Rebirth" },
  bl_lineage: { cat: "Heredity", name: "Old Blood",    icon: "🩸", cap: 30, base: 6, growth: 1.4,  desc: "+Lineage per Migration" },
  bl_apex:    { cat: "Heredity", name: "Ascendant",    icon: "👑", cap: 20, base: 8, growth: 1.5,  desc: "Apex Tiers multiply harder" },
  bl_mig:     { cat: "Heredity", name: "Deep Lineage", icon: "♾", cap: 15, base: 12, growth: 1.6, desc: "Migration Tiers multiply harder" },
  bl_descent: { cat: "Instinct", name: "Pressure-Born", icon: "🜄", cap: 20, base: 5, growth: 1.4, desc: "−Size needed to descend (−3%/lvl)" }
};
const BL_KEYS = Object.keys(BL);
const BL_CATS = ["Predator", "Metabolism", "Vitality", "Senses", "Heredity", "Instinct"];

// Primordial tree — permanent, Spirit-bought (3rd reset). Top-tier multipliers.
const PRIM = {
  pr_all:     { name: "Primordial Hunger", icon: "🌑", cap: 50, base: 1, growth: 1.3, desc: "×1.15 ALL gains per level" },
  pr_roe:     { name: "Endless Spawn",     icon: "🥚", cap: 30, base: 1, growth: 1.35, desc: "×1.25 Roe per level" },
  pr_lineage: { name: "Ancient Current",   icon: "🩸", cap: 30, base: 1, growth: 1.35, desc: "×1.25 Lineage per level" },
  pr_start:   { name: "Born Vast",         icon: "🐋", cap: 20, base: 2, growth: 1.4, desc: "Start each dive much larger" },
  pr_auto:    { name: "Hivemind",          icon: "🧠", cap: 20, base: 2, growth: 1.4, desc: "Automation runs faster" }
};
const PRIM_KEYS = Object.keys(PRIM);
const EGGS = [
  { g: "🦆", msg: "A rubber duck. It squeaks ominously.", b: 1 }, { g: "🥾", msg: "An old boot. Surprisingly filling.", b: 1 },
  { g: "🍾", msg: "A bottle: ‘keep swimming’.", b: 1 }, { g: "🛟", msg: "A life ring. You won't need it.", b: 1 },
  { g: "🧦", msg: "The missing sock. So THAT'S where it went.", b: 1 }, { g: "🪙", msg: "Pirate gold — a feast!", b: 14 },
  { g: "💎", msg: "A diamond. Shiny AND nutritious.", b: 30 }, { g: "👑", msg: "A sunken crown. You feel regal.", b: 22 },
  { g: "🦴", msg: "An ominous bone. Best not to ask.", b: 2 }, { g: "🛸", msg: "…a UFO. Down HERE?", b: 8 },
  { g: "👀", msg: "Something watched you pass. It blinked.", b: 0, spooky: 1 }, { g: "🐙", msg: "A vast tentacle slid back into the black.", b: 0, spooky: 1 }
];
// Apex Predators — boss encounters that roam the deep. Grow past sizeReq to fight them.
const APEX = [
  { id: "squid",    name: "Colossal Squid",  glyph: "🦑", layer: 2, hp: 70,    sizeReq: 55,   r: 60,  color: "#c08bff", biomass: 6e3,  roe: 8,    dmg: 0,  trophy: "Beak of the Squid (+15% all gains)" },
  { id: "devil",    name: "Black Seadevil",  glyph: "🐡", layer: 3, hp: 200,   sizeReq: 130,  r: 70,  color: "#ff5c6a", biomass: 4e4,  roe: 20,   dmg: 0,  trophy: "Devil's Lure (+15% all gains)" },
  { id: "meg",      name: "Megalodon",       glyph: "🦈", layer: 4, hp: 520,   sizeReq: 260,  r: 95,  color: "#9fe9ff", biomass: 3e5,  roe: 50,   dmg: 9,  trophy: "Ancient Tooth (+15% all gains)" },
  { id: "guardian", name: "The Drowned God", glyph: "🐙", layer: 5, hp: 1400,  sizeReq: 480,  r: 130, color: "#ffd86b", biomass: 2e6,  roe: 140,  dmg: 16, trophy: "Crown of the Deep (+15% all gains)" },
  { id: "hadalisk", name: "The Hadalisk",    glyph: "🐍", layer: 6, hp: 7000,  sizeReq: 1100, r: 150, color: "#7affc0", biomass: 3e7,  roe: 450,  dmg: 34, trophy: "Venom Sac (+15% all gains)" },
  { id: "bonelord", name: "The Bone Lord",   glyph: "💀", layer: 7, hp: 30000, sizeReq: 2600, r: 185, color: "#ffe9a6", biomass: 3e8,  roe: 1400, dmg: 70, trophy: "Lord's Skull (+15% all gains)" }
];
function apexFor(layerIdx) { return APEX.find(a => a.layer === layerIdx) || null; }
const BEST_THRESH = [20, 100, 500, 2500, 12000];
// Achievements — long-tail goals; each grants a permanent +6% to all gains.
const ACH = [
  { id: "a_eat100",  name: "Hungry",        desc: "Eat 100 fish.",                 cond: s => s.stats.eaten >= 100 },
  { id: "a_eat10k",  name: "Insatiable",    desc: "Eat 10,000 fish.",              cond: s => s.stats.eaten >= 10000 },
  { id: "a_layer3",  name: "Into the Blue", desc: "Reach the Twilight Reach.",     cond: s => layerAt(s.deepest) >= 2 },
  { id: "a_layer5",  name: "Pressure Diver",desc: "Reach the Hadal Deep.",         cond: s => layerAt(s.deepest) >= 5 },
  { id: "a_layer7",  name: "Bonepicker",    desc: "Reach the Bonefields.",         cond: s => layerAt(s.deepest) >= 7 },
  { id: "a_size",    name: "Colossus",      desc: "Reach size 1,000.",             cond: s => s.size >= 1000 },
  { id: "a_rebirth", name: "Reborn",        desc: "Rebirth for the first time.",   cond: s => s.molts >= 1 || s.migrations > 0 },
  { id: "a_apex5",   name: "Tiered",        desc: "Reach Apex Tier 5.",            cond: s => s.apexTier >= 5 },
  { id: "a_mig1",    name: "Migrant",       desc: "Migrate for the first time.",   cond: s => s.migrations >= 1 },
  { id: "a_asc1",    name: "Ancient",       desc: "Ascend for the first time.",    cond: s => s.ascensions >= 1 },
  { id: "a_boss1",   name: "Giant Killer",  desc: "Slay an Apex Predator.",        cond: s => Object.keys(s.bossKills).length >= 1 },
  { id: "a_boss4",   name: "Apex of Apexes",desc: "Slay 4 kinds of Apex.",         cond: s => Object.keys(s.bossKills).length >= 4 },
  { id: "a_salvage", name: "Wrecker",       desc: "Salvage 1,000 Relics.",         cond: s => s.stats.salvage >= 1000 },
  { id: "a_eggs",    name: "Beachcomber",   desc: "Find every oddity.",            cond: s => Object.keys(s.eggs).length >= EGGS.length },
  { id: "a_best",    name: "Naturalist",    desc: "Earn 12 Bestiary stars.",       cond: s => bestiaryStars() >= 12 },
  { id: "a_full",    name: "King of the Deep", desc: "Unlock every other achievement.", cond: s => Object.keys(s.ach).length >= 15 }
];

// ---------- state ----------
function newState() {
  return { started: false, difficulty: "diver", biomass: 0, size: 0, relics: 0,
    up: { speed: 0, agility: 0, range: 0, magnet: 0, luck: 0, appetite: 0, glow: 0 },
    perm: { pglow: 0, pspeed: 0, pbite: 0, psense: 0, pappet: 0 },
    roe: 0, molts: 0, apexTier: 0, deepLayer: 0, evo: {}, autoOn: {}, autoMoltTarget: 3, moltSeen: false,
    lineage: 0, migrations: 0, migTier: 0, bl: {}, migSeen: false, bestAwake: false,
    spirit: 0, ascensions: 0, ascTier: 0, prim: {}, ascSeen: false,
    wreckFound: false, deepest: 0, eggs: {}, best: {}, trophies: {}, bossKills: {}, ach: {},
    stats: { eaten: 0, salvage: 0, playtime: 0 }, lastSave: Date.now() };
}
let S = newState();
const W = { creature: null, fish: [], orbs: [], eggs: [], treas: [], parts: [], floats: [],
  cam: { x: 0, y: 0 }, shake: 0, combo: 0, comboT: 0, eggTimer: 9, treasTimer: 10, t: 0, barrier: null, hintT: 0,
  boss: null, bossCD: 20, frenzy: null, frenzyTimer: 80, autoBuyT: 0, autoEatT: 0, warnT: 0 };
let CV, X, VW = 800, VH = 600;
const input = { x: 0, y: 0, ox: 0, oy: 0, down: false, keys: {} };

// ---------- derived ----------
function layerAt(y) { return clamp(Math.floor(y / LH), 0, NL - 1); }
function ev(k) { return S.evo[k] || 0; }
function bl(k) { return S.bl[k] || 0; }
function pr(k) { return S.prim[k] || 0; }
function bestiaryStars() { let n = 0; for (const id in S.best) for (const t of BEST_THRESH) if (S.best[id] >= t) n++; return n; }
function apexMult() { return Math.pow(1.4 + 0.06 * ev("e_tier") + 0.04 * bl("bl_apex"), S.apexTier); }
function migTierMult() { return Math.pow(2 + 0.15 * bl("bl_mig"), S.migTier); }
function ascTierMult() { return Math.pow(3, S.ascTier); }
function primAll() { return Math.pow(1.15, pr("pr_all")); }
function voracity() { const l = ev("e_bio"); if (!l) return 1; const per = 0.10 * (1 + 0.5 * Math.floor(l / 10)); return Math.pow(1 + per, l); }
function maxSpeed() { return FEEL.maxSpeedBase * (1 + 0.05 * S.up.speed + 0.05 * S.perm.pspeed + 0.05 * ev("e_speed") + 0.04 * bl("bl_speed")); }
function accel() { return FEEL.accel * (1 + 0.05 * S.up.agility + 0.04 * bl("bl_agility")); }
function turnRate() { return FEEL.turn * (1 + 0.03 * S.up.agility + 0.03 * bl("bl_agility")); }
function biteRange() { return 6 + 7 * S.up.range + 6 * S.perm.pbite + 6 * ev("e_bite") + 5 * bl("bl_bite"); }
function magnetR() { const b = S.up.magnet + ev("e_magnet") + bl("bl_magnet"); return b > 0 ? 50 + 24 * b : 0; }
function luckChance() { return 0.015 + 0.012 * S.up.luck + 0.012 * ev("e_luck") + 0.010 * bl("bl_luck"); }
function appetite() { return 1 + 0.22 * S.up.appetite + 0.25 * S.perm.pappet + 0.18 * bl("bl_appetite"); }
function depthMult() { return 1 + 0.6 * layerAt(W.creature ? W.creature.y : 0); }
function bestiaryMult() { let m = 1; for (const id in S.best) { let r = 0; for (const t of BEST_THRESH) if (S.best[id] >= t) r++; m *= 1 + 0.04 * r; } return m; }
function trophyMult() { return Math.pow(1.15, Object.keys(S.trophies).length); }
function frenzyMult() { return (W.frenzy && W.frenzy.t > 0) ? W.frenzy.mult : 1; }
function bitePower() { return (4 + creatureR() * 0.25 + S.apexTier * 2 + 2 * ev("e_bite")) * (1 + 0.25 * bl("bl_might")); }
function achMult() { return Math.pow(1.06, Object.keys(S.ach).length); }
function gainMult() { return appetite() * depthMult() * apexMult() * migTierMult() * ascTierMult() * voracity() * bestiaryMult() * trophyMult() * frenzyMult() * primAll() * achMult(); }
function sizeGain(g) { return g * (1 + 0.08 * ev("e_size") + 0.06 * bl("bl_size")); }
function creatureR() { return clamp(11 + Math.sqrt(S.size) * 1.9, 11, 70); }
function comboCap() { return 12 + 2 * bl("bl_combocap"); }
function comboTime() { return 2 + 0.3 * bl("bl_combotime"); }
function comboMult() { return 1 + W.combo * (0.12 + 0.02 * bl("bl_combomul")); }
function glowRadius() { return 150 + 48 * S.up.glow + 34 * S.perm.pglow + 34 * ev("e_glow") + 30 * bl("bl_glow") + creatureR() * 1.5; }
function maxHP() { return 100 + 30 * bl("bl_hp"); }
function armorMult() { return Math.max(0.15, 1 - 0.03 * bl("bl_armor")); }
function regenRate() { return 2 + 2 * bl("bl_regen"); }
function knockMult() { return Math.max(0.2, 1 - 0.04 * bl("bl_knock")); }
function salvageMult() { return (1 + 0.5 * S.perm.psense) * (1 + 0.2 * bl("bl_salvage")); }
function fishTarget() { return 46 + 4 * bl("bl_density"); }
function frenzyPower() { return 3 + 0.5 * bl("bl_frenzy"); }
function frenzyTime() { return 12 + 1.5 * bl("bl_frenzy"); }
function frenzyEvery() { return [Math.max(20, 70 - 2 * bl("bl_frenzy")), Math.max(40, 130 - 3 * bl("bl_frenzy"))]; }
function descentReqMult() { return Math.max(0.2, 1 - 0.03 * bl("bl_descent")); }
function autoSpeedMult() { return 1 + 0.3 * pr("pr_auto"); }
function moltReq() { return Math.floor(35 * Math.pow(1.6, S.molts)); }
function startSize() { return 6 * ev("e_start") + 16 * pr("pr_start"); }
function roeGain() { const dl = layerAt(S.deepest); return Math.floor(Math.pow(Math.max(0, S.size) / 20, 0.6) * (1 + 0.7 * dl) * (1 + 0.1 * ev("e_roe")) * (1 + 0.06 * bl("bl_roe")) * Math.pow(1.25, pr("pr_roe"))); }
function migUnlocked() { return S.migrations > 0 || (S.molts >= 4 && layerAt(S.deepest) >= 4); }
function migReq() { return Math.floor(8 * Math.pow(1.7, S.migrations)); }
function lineageGain() { return Math.floor(Math.pow(Math.max(0, S.roe) / 6, 0.55) * (1 + 0.5 * S.apexTier) * (1 + 0.06 * bl("bl_lineage")) * (1 + 0.04 * bestiaryStars()) * Math.pow(1.25, pr("pr_lineage"))); }
function canMigrate() { return migUnlocked() && S.roe >= migReq() && lineageGain() >= 1; }
function ascUnlocked() { return S.ascensions > 0 || (S.migrations >= 2 && bestiaryStars() >= 8); }
function spiritGain() { return Math.floor(Math.pow(Math.max(0, S.lineage) / 10, 0.5) * (1 + 0.3 * S.migTier) * (1 + 0.03 * bestiaryStars())); }
function canAscend() { return ascUnlocked() && spiritGain() >= 1; }
function blCost(k) { const u = BL[k]; return Math.floor(u.base * Math.pow(u.growth, bl(k))); }
function primCost(k) { const u = PRIM[k]; return Math.floor(u.base * Math.pow(u.growth, pr(k))); }
function canMolt() { return S.started && S.size >= moltReq(); }
function evoCost(k) { const u = EVO[k]; return Math.floor(u.base * Math.pow(u.growth, ev(k))); }
function upCost(k) { const u = UPS[k]; return Math.floor(u.base * Math.pow(u.growth, S.up[k])); }
function permCost(k) { const u = PERM[k]; return Math.floor(u.base * Math.pow(u.growth, S.perm[k])); }
function lightAt(y) { const i = y / LH; const a = clamp(Math.floor(i), 0, NL - 1), b = clamp(a + 1, 0, NL - 1); return lerp(LAYERS[a].light, LAYERS[b].light, clamp(i - a, 0, 1)); }
function colAt(y) { const i = y / LH; if (i >= NL - 1) { const t = clamp((y - (NL - 1) * LH) / LH, 0, 1); return mix(LAYERS[NL - 1].col, FLOOR_COL, t); } const a = clamp(Math.floor(i), 0, NL - 1); return mix(LAYERS[a].col, LAYERS[a + 1].col, clamp(i - a, 0, 1)); }
function accentAt(y) { return LAYERS[layerAt(y)].accent; }
function allowedMaxY() { const m = descentReqMult(); for (let i = 1; i < NL; i++) { const req = Math.floor(LAYERS[i].req * m); if (S.size < req) return { y: i * LH, req, name: LAYERS[i].name }; } return { y: WORLD.h, req: 0 }; }

// ---------- init / save ----------
function init() {
  CV = document.getElementById("c"); X = CV.getContext("2d"); resize(); window.addEventListener("resize", resize);
  load();
  W.creature = { x: WW / 2, y: 200, vx: 0, vy: 0, ang: 1.57, chomp: 0 };
  W.cam.x = W.creature.x - VW / 2; W.cam.y = W.creature.y - VH / 2;
  buildOrbs();
  for (let i = 0; i < fishTarget(); i++) spawnFish(true);
  bindInput(); requestAnimationFrame(loop); setInterval(hud, 160);
  if (!S.started) showStart(); else hideOverlay();
}
function resize() { VW = window.innerWidth; VH = window.innerHeight; if (CV) { CV.width = VW; CV.height = VH; } }
const KEY = "abyss.deep.v1";
function save() { S.lastSave = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { const r = localStorage.getItem(KEY); if (r) S = Object.assign(newState(), JSON.parse(r)); } catch (e) {} }
function hardReset() { try { localStorage.removeItem(KEY); } catch (e) {} S = newState(); S.started = true; W.fish = []; W.treas = []; for (let i = 0; i < fishTarget(); i++) spawnFish(true); buildOrbs(); }

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
  CV.addEventListener("pointerdown", e => { setp(e); input.ox = input.x; input.oy = input.y; input.down = true; if (CV.setPointerCapture) CV.setPointerCapture(e.pointerId); e.preventDefault(); }, { passive: false });
  CV.addEventListener("pointermove", e => { setp(e); if (input.down) e.preventDefault(); }, { passive: false });
  window.addEventListener("pointerup", () => input.down = false);
  window.addEventListener("pointercancel", () => input.down = false);
  const kd = e => { input.keys[(e.key || "").toLowerCase()] = true; };
  const ku = e => { input.keys[(e.key || "").toLowerCase()] = false; };
  window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
  document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);
}
const JOY_R = 78;   // how far you push for full thrust
function steer() {
  let dx = 0, dy = 0;
  if (input.down) {  // dynamic floating joystick — base trails the thumb for 1:1 steering
    let jx = input.x - input.ox, jy = input.y - input.oy, m = Math.hypot(jx, jy);
    if (m > JOY_R) { input.ox = input.x - jx / m * JOY_R; input.oy = input.y - jy / m * JOY_R; jx = input.x - input.ox; jy = input.y - input.oy; m = JOY_R; }
    if (m > 5) { const mag = m / JOY_R; dx = jx / m * mag; dy = jy / m * mag; }
  }
  const k = input.keys; let kx = 0, ky = 0;
  if (k.w || k.arrowup) ky -= 1; if (k.s || k.arrowdown) ky += 1; if (k.a || k.arrowleft) kx -= 1; if (k.d || k.arrowright) kx += 1;
  if (kx || ky) { const m = Math.hypot(kx, ky); dx += kx / m; dy += ky / m; }
  const mm = Math.hypot(dx, dy); if (mm > 1) { dx /= mm; dy /= mm; }
  return [dx, dy];
}

// ---------- loop ----------
function loop(ts) { const now = ts / 1000; let dt = now - (W.t || now); W.t = now; if (dt > 0.05) dt = 0.05; if (S.started) update(dt); render(); requestAnimationFrame(loop); }
function update(dt) {
  S.stats.playtime += dt;
  const c = W.creature, [sx, sy] = steer();
  // Smooth velocity-seek: glide toward the joystick's target velocity (frame-rate independent).
  const ms = maxSpeed();
  const resp = FEEL.resp * (1 + 0.04 * (S.up.agility + bl("bl_agility")));
  const k = 1 - Math.exp(-resp * dt);
  c.vx += (sx * ms - c.vx) * k; c.vy += (sy * ms - c.vy) * k;
  const sp = Math.hypot(c.vx, c.vy);
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
  // depth title on entering a new, deeper layer
  const _cl = layerAt(c.y);
  if (_cl !== W.lastLayer) { if (W.lastLayer != null && _cl > W.lastLayer) { W.layerTitle = LAYERS[_cl].name; W.layerTitleT = 2.6; } W.lastLayer = _cl; }
  if (W.layerTitleT > 0) W.layerTitleT -= dt;
  if (W.hurt > 0) W.hurt -= dt;

  // camera
  W.cam.x = lerp(W.cam.x, clamp(c.x - VW / 2, 0, Math.max(0, WW - VW)), clamp(FEEL.camLerp * dt, 0, 1));
  W.cam.y = lerp(W.cam.y, clamp(c.y - VH / 2, 0, Math.max(0, WORLD.h - VH)), clamp(FEEL.camLerp * dt, 0, 1));
  W.shake = Math.max(0, W.shake - dt * 6);
  W.comboT -= dt; if (W.comboT <= 0) W.combo = 0;

  // health regen
  if (W.hp == null) W.hp = maxHP();
  W.hp = Math.min(maxHP(), W.hp + regenRate() * dt);
  if (W.invuln > 0) W.invuln -= dt;
  // wreck reveal
  if (!S.wreckFound && layerAt(c.y) >= WRECK_LAYER) reachWreck();
  updateBoss(dt); updateFrenzy(dt);

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
  while (W.fish.length < fishTarget()) spawnFish(false);

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
    if (d2(tr.x, tr.y, c.x, c.y) < (cr + 22) * (cr + 22)) { const g = Math.ceil(tr.val * salvageMult()); S.relics += g; S.stats.salvage += g; addFloat(tr.x, tr.y, "+" + g + " ⛃", "#ffd86b"); addParts(tr.x, tr.y, "#ffd86b", 16, 120); W.shake = .5; W.treas.splice(i, 1); continue; } if (tr.life <= 0) W.treas.splice(i, 1); }

  for (let i = W.parts.length - 1; i >= 0; i--) { const p = W.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; if (p.life <= 0) W.parts.splice(i, 1); }
  for (let i = W.floats.length - 1; i >= 0; i--) { const f = W.floats[i]; f.life -= dt; f.y -= 30 * dt; if (f.life <= 0) W.floats.splice(i, 1); }

  // automation (unlocked via Evolution)
  if (ev("e_autobuy") && S.autoOn.buy) { W.autoBuyT = (W.autoBuyT || 0) + dt; if (W.autoBuyT > 0.5 / autoSpeedMult()) { W.autoBuyT = 0; autoBuyCheapest(); } }
  if (ev("e_autoeat") && S.autoOn.eat) { W.autoEatT = (W.autoEatT || 0) + dt; if (W.autoEatT > 0.35 / autoSpeedMult()) { W.autoEatT = 0; remoraEat(); } }
  if (ev("e_automolt") && S.autoOn.molt && canMolt() && roeGain() >= S.autoMoltTarget) doMolt();
  // reset-layer unlock banners
  if (canMolt() && !S.moltSeen) { S.moltSeen = true; moltBanner(); }
  if (migUnlocked() && !S.migSeen) { S.migSeen = true; migBanner(); }
  if (ascUnlocked() && !S.ascSeen) { S.ascSeen = true; ascBanner(); }
  checkAch();

  if (Date.now() - S.lastSave > 5000) save();
}
function checkAch() {
  for (const a of ACH) { if (!S.ach[a.id] && a.cond(S)) { S.ach[a.id] = true; toast("🏅 " + a.name + " — " + a.desc); W.shake = Math.min(1, W.shake + 0.3); } }
}

function eat(i, f, ft) { W.fish.splice(i, 1); const gain = ft.val * gainMult() * comboMult();
  S.biomass = Math.min(1e300, S.biomass + gain); S.size = Math.min(1e300, S.size + sizeGain(ft.grow)); S.stats.eaten++;
  if (f.id) { const pv = S.best[f.id] || 0; S.best[f.id] = pv + 1; if (S.bestAwake) for (const t of BEST_THRESH) if (pv < t && pv + 1 >= t) { addFloat(f.x, f.y - 18, "✦ Bestiary ★", "#9be7a6"); break; } }
  W.combo = Math.min(comboCap(), W.combo + 1); W.comboT = comboTime();
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
  W.fish = []; for (let i = 0; i < fishTarget(); i++) spawnFish(true); buildOrbs(); W.hp = maxHP(); W.boss = null; W.shake = 1;
}
function resetDive() {
  S.size = startSize(); S.biomass = 0;
  S.up = { speed: 0, agility: 0, range: 0, magnet: 0, luck: 0, appetite: 0, glow: 0 };
  const c = W.creature; c.x = WW / 2; c.y = 200; c.vx = c.vy = 0; W.cam.x = c.x - VW / 2; W.cam.y = c.y - VH / 2;
  W.fish = []; for (let i = 0; i < fishTarget(); i++) spawnFish(true); buildOrbs(); W.hp = maxHP(); W.boss = null; W.shake = 1;
}
function doMigrate() { if (!canMigrate()) return; S.lineage += lineageGain(); S.migrations++; S.migTier++; S.bestAwake = true; S.roe = 0; S.evo = {}; S.apexTier = 0; S.molts = 0; S.moltSeen = false; resetDive(); }
function doAscend() { if (!canAscend()) return; S.spirit += spiritGain(); S.ascensions++; S.ascTier++; S.lineage = 0; S.bl = {}; S.migTier = 0; S.migrations = 0; S.roe = 0; S.evo = {}; S.apexTier = 0; S.molts = 0; resetDive(); }
function buyEvo(k) { const u = EVO[k], cost = evoCost(k); if (ev(k) >= u.cap || S.roe < cost) return; S.roe -= cost; S.evo[k] = ev(k) + 1; openEvo(); }
function buyBl(k) { const u = BL[k], cost = blCost(k); if (bl(k) >= u.cap || S.lineage < cost) return; S.lineage -= cost; S.bl[k] = bl(k) + 1; openBloodline(); }
function buyPrim(k) { const u = PRIM[k], cost = primCost(k); if (pr(k) >= u.cap || S.spirit < cost) return; S.spirit -= cost; S.prim[k] = pr(k) + 1; openAscension(); }
function autoBuyCheapest() { let best = null, bc = Infinity; for (const o of W.orbs) { if (S.up[o.k] >= UPS[o.k].cap) continue; const cst = upCost(o.k); if (cst <= S.biomass && cst < bc) { bc = cst; best = o; } } if (best) { S.biomass -= bc; S.up[best.k]++; best.flash = 1; } }
function remoraEat() { const c = W.creature, R = creatureR() + biteRange() + 90; let bi = -1, bd = R * R;
  for (let i = 0; i < W.fish.length; i++) { const f = W.fish[i]; if (f.t.needs && creatureR() < f.t.r * 0.82) continue; const d = d2(f.x, f.y, c.x, c.y); if (d < bd) { bd = d; bi = i; } }
  if (bi >= 0) eat(bi, W.fish[bi], W.fish[bi].t); }

// ---- Apex Predator bosses ----
function updateBoss(dt) {
  const c = W.creature, li = layerAt(c.y);
  if (!W.boss) {
    W.bossCD -= dt;
    const target = apexFor(li);
    if (target && W.bossCD <= 0 && S.size >= target.sizeReq * 0.5) {
      W.boss = { a: target, x: clamp(c.x + rr(-260, 260), 110, WW - 110), y: clamp(c.y + rr(-200, 200), 120, WORLD.h - 120), hp: target.hp, max: target.hp, hitCD: 0, lungeCD: rr(1, 3), ph: 0 };
      toast((target.dmg > 0 ? "☠ " : "⚠ ") + target.name + (target.dmg > 0 ? " hunts you…" : " stirs nearby…"));
    }
    return;
  }
  const b = W.boss, a = b.a; b.ph += dt * 2; b.hitCD = Math.max(0, b.hitCD - dt); b.lungeCD -= dt;
  const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
  // deep, dangerous bosses chase faster and lunge
  let sp = 42 + a.dmg * 1.2;
  if (a.dmg > 0 && b.lungeCD <= 0 && d < 320) { b.lungeVX = dx / d * 360; b.lungeVY = dy / d * 360; b.lungeCD = rr(2.5, 4.5); }
  b.x += (dx / d * sp + (b.lungeVX || 0)) * dt; b.y += (dy / d * sp + (b.lungeVY || 0)) * dt;
  b.lungeVX = (b.lungeVX || 0) * 0.9; b.lungeVY = (b.lungeVY || 0) * 0.9;
  const cr = creatureR();
  if (d < a.r + cr) {
    if (S.size >= a.sizeReq) {
      if (b.hitCD <= 0 && Math.hypot(c.vx, c.vy) > 55) { b.hp -= bitePower(); b.hitCD = 0.25; W.shake = Math.min(1, W.shake + 0.4); W.creature.chomp = 1; addParts((c.x + b.x) / 2, (c.y + b.y) / 2, a.color, 14, 150); c.vx *= -0.4; c.vy *= -0.4; }
      if (a.dmg > 0) damagePlayer(a.dmg * dt);   // even when you can fight it, the deep bites back
    } else { c.vx = -dx / d * 430 * knockMult(); c.vy = -dy / d * 430 * knockMult(); if (a.dmg > 0) damagePlayer(a.dmg * 1.5 * dt); if (W.warnT <= 0) { W.warnT = 1.4; addFloat(c.x, c.y - 40, "Too small — grow to " + fmt(a.sizeReq), "#ff8a94"); } }
  }
  W.warnT -= dt;
  if (b.hp <= 0) killBoss(b);
}
function damagePlayer(amt) {
  if (W.invuln > 0) return;
  if (W.hp == null) W.hp = maxHP();
  W.hp -= amt * armorMult(); W.shake = Math.min(1, W.shake + 0.2); W.hurt = 0.4;
  if (W.hp <= 0) fleeSurface();
}
function fleeSurface() {
  const c = W.creature; c.x = WW / 2; c.y = 200; c.vx = c.vy = 0; W.cam.x = c.x - VW / 2; W.cam.y = c.y - VH / 2;
  W.boss = null; W.bossCD = rr(18, 36); W.hp = maxHP(); W.invuln = 2.5; W.shake = 1;
  const lost = S.biomass * 0.5; S.biomass -= lost;
  toast("💀 Driven back to the surface — lost half your Biomass!");
}
function killBoss(b) {
  const a = b.a, bm = a.biomass * (1 + 0.5 * S.apexTier);
  S.biomass = Math.min(1e300, S.biomass + bm); S.roe += a.roe; S.bossKills[a.id] = (S.bossKills[a.id] || 0) + 1;
  const first = !S.trophies[a.id]; if (first) S.trophies[a.id] = true;
  addParts(b.x, b.y, a.color, 44, 240); W.shake = 1; W.boss = null; W.bossCD = rr(28, 52);
  document.getElementById("overlay").innerHTML =
    `<div class="ov" style="border-color:${a.color}88"><div class="ovtag" style="color:${a.color}">APEX SLAIN</div>` +
    `<div class="ovbigglyph">${a.glyph}</div><div class="ovt2" style="color:${a.color}">${a.name}</div>` +
    `<div class="ovs">+${fmt(bm)} Biomass · +${a.roe} Roe 🥚</div>` +
    (first ? `<div class="ovs" style="color:${a.color}"><b>Trophy unlocked:</b> ${a.trophy}</div>` : `<div class="ovs">Slain ×${S.bossKills[a.id]}</div>`) +
    `<button class="ovbtn" onclick="hideOverlay()">Feast</button></div>`;
  showOverlay();
}
// ---- Feeding Frenzy events ----
function updateFrenzy(dt) {
  if (W.frenzy) { W.frenzy.t -= dt; if (W.frenzy.t <= 0) W.frenzy = null; }
  W.frenzyTimer -= dt;
  if (W.frenzyTimer <= 0) { const fe = frenzyEvery(); W.frenzyTimer = rr(fe[0], fe[1]); startFrenzy(); }
}
function startFrenzy() {
  const c = W.creature; W.frenzy = { t: frenzyTime(), mult: frenzyPower() };
  for (let i = 0; i < 16; i++) { const id = Math.random() < 0.5 ? "darter" : "glow", f = FISH[id], a = Math.random() * 6.28, dx = rr(60, 260);
    W.fish.push({ id, t: f, x: clamp(c.x + Math.cos(a) * dx, 20, WW - 20), y: clamp(c.y + Math.sin(a) * dx, 20, WORLD.h - 20), vx: 0, vy: 0, ph: rr(0, 6.28), wob: 0 }); }
  toast("🌀 FEEDING FRENZY ×" + frenzyPower().toFixed(1) + " — eat fast!");
}

// ---------- sprite cache (perf: bake glow+emoji once, then drawImage) ----------
const SPR = {};
function sprCanvas(sz) { const cv = document.createElement("canvas"); cv.width = sz; cv.height = sz; return cv; }
function discGlow(cx, c, r, color, a) { const g = cx.createRadialGradient(c, c, 0, c, c, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0)); cx.fillStyle = g; cx.beginPath(); cx.arc(c, c, r, 0, 6.283); cx.fill(); }
function emojiSprite(key, glyph, color, glowR, fontPx, alpha) {
  let s = SPR[key]; if (s) return s;
  const sz = Math.ceil((glowR + 6) * 2), c = sz / 2; const cv = sprCanvas(sz), cx = cv.getContext("2d");
  discGlow(cx, c, glowR, color, alpha); cx.font = fontPx + "px serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(glyph, c, c);
  SPR[key] = cv; return cv;
}
function fishSprite(id) { const ft = FISH[id]; return emojiSprite("f" + id, ft.glyph, ft.color, ft.r + 4, ft.r * 1.7 | 0, .30); }
function eggSprite(d) { return emojiSprite("e" + d.g, d.g, d.spooky ? "#ff5c6a" : "#ffd86b", 22, 26, .35); }
function treasSprite(g) { return emojiSprite("t" + g, g, "#ffd86b", 20, 24, .34); }
function orbSprite(k) { const u = UPS[k]; return emojiSprite("o" + k, u.icon, u.color, 38, 22, .4); }
function apexSprite(id) { const a = APEX.find(x => x.id === id); return emojiSprite("a" + id, a.glyph, a.color, a.r + 22, a.r * 1.9 | 0, .35); }

// ---------- render ----------
function render() {
  const shx = (Math.random() - 0.5) * W.shake * 14, shy = (Math.random() - 0.5) * W.shake * 14;
  const topC = colAt(W.cam.y), botC = colAt(W.cam.y + VH);
  const g = X.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, topC); g.addColorStop(1, botC); X.fillStyle = g; X.fillRect(0, 0, VW, VH);
  // marine snow (parallax)
  X.fillStyle = "rgba(255,255,255,.13)";
  for (let i = 0; i < 55; i++) { const px = ((i * 137.5 - W.cam.x * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20; const py = ((i * 91.3 + W.t * 12 - W.cam.y * 0.5) % (VH + 40) + VH + 40) % (VH + 40) - 20; X.fillRect(px, py, 2, 2); }
  // rising bubbles (tinted by the current layer) — batched into one path
  const bubC = accentAt(W.creature ? W.creature.y : 0);
  X.strokeStyle = rgba(bubC, 0.18); X.lineWidth = 1; X.beginPath();
  for (let i = 0; i < 20; i++) { const bx = ((i * 211.3 - W.cam.x * 0.6) % (VW + 30) + VW + 30) % (VW + 30) - 15;
    const by = ((VH - (i * 53.7 + W.t * 26) % (VH + 30)) - W.cam.y * 0.6 % 1); const sz = 1.5 + (i % 4); const yy = ((by % (VH + 30)) + VH + 30) % (VH + 30) - 15;
    X.moveTo(bx + sz, yy); X.arc(bx, yy, sz, 0, 6.283); }
  X.stroke();

  X.save(); X.translate(-W.cam.x + shx, -W.cam.y + shy);

  // layer labels + barriers (only the visible band)
  for (let i = 0; i < NL; i++) { const yy = i * LH + 40; if (yy < W.cam.y - 40 || yy > W.cam.y + VH + 40) continue; ftxt(WW / 2, yy, LAYERS[i].name.toUpperCase(), rgba(LAYERS[i].accent, .5), 13); }
  if (W.barrier) { const by = W.barrier.y, ac = accentAt(by - 10); X.strokeStyle = rgba("#ff8a94", .5); X.lineWidth = 3; X.setLineDash([16, 14]);
    X.beginPath(); X.moveTo(0, by); X.lineTo(WW, by); X.stroke(); X.setLineDash([]);
    ftxt(WW / 2, by - 14, "▼ grow to " + fmt(W.barrier.req) + " to descend", "#ffb0b8", 14); }

  // the wreck
  drawWreck();

  // orbs
  for (const o of W.orbs) { if (o.y < W.cam.y - 90 || o.y > W.cam.y + VH + 90 || o.x < W.cam.x - 90 || o.x > W.cam.x + VW + 90) continue; const u = UPS[o.k], cost = upCost(o.k), maxed = S.up[o.k] >= u.cap; const sc = 1 + .05 * Math.sin(o.ph) + o.flash * .25; const s = orbSprite(o.k), w = s.width * sc;
    X.drawImage(s, o.x - w / 2, o.y - w / 2, w, w);
    ftxt(o.x, o.y - 42, u.name + " Lv" + S.up[o.k], u.color, 12); ftxt(o.x, o.y + 42, maxed ? "MAX" : fmt(cost) + " ◍", maxed ? "#fff" : (S.biomass >= cost ? "#9be7a6" : "#ff8a94"), 12); }

  // treasure
  for (const tr of W.treas) { const s = treasSprite(tr.g); X.drawImage(s, tr.x - s.width / 2, tr.y - s.height / 2); }

  // fish (sprite-cached)
  for (const f of W.fish) { const s = fishSprite(f.id); X.drawImage(s, f.x - s.width / 2, f.y + f.wob - s.height / 2); }

  // eggs
  for (const e of W.eggs) { const s = eggSprite(e.d); X.drawImage(s, e.x - s.width / 2, e.y - s.height / 2); }
  for (const p of W.parts) { X.fillStyle = rgba(p.color, .7 * clamp(p.life / p.max, 0, 1)); X.beginPath(); X.arc(p.x, p.y, 3, 0, 6.283); X.fill(); }
  if (W.boss) { const b = W.boss, a = b.a; const bs = apexSprite(a.id); X.drawImage(bs, b.x - bs.width / 2, b.y - bs.height / 2); X.textAlign = "center"; X.textBaseline = "middle";
    const bw = a.r * 2, hpf = clamp(b.hp / b.max, 0, 1); X.fillStyle = "rgba(0,0,0,.5)"; X.fillRect(b.x - bw / 2, b.y - a.r - 24, bw, 8); X.fillStyle = a.color; X.fillRect(b.x - bw / 2, b.y - a.r - 24, bw * hpf, 8);
    ftxt(b.x, b.y - a.r - 34, a.name + (S.size >= a.sizeReq ? "  (ram it!)" : "  · grow to " + fmt(a.sizeReq)), a.color, 13);
    if (a.dmg > 0 && (Math.abs(b.lungeVX || 0) + Math.abs(b.lungeVY || 0) > 80 || b.lungeCD < 0.4)) { X.strokeStyle = rgba("#ff5c6a", 0.4 + 0.3 * Math.abs(Math.sin(W.t * 18))); X.lineWidth = 3; X.beginPath(); X.arc(b.x, b.y, a.r + 13, 0, 6.283); X.stroke(); } }
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
  if (W.frenzy && W.frenzy.t > 0) { X.textAlign = "center"; X.fillStyle = "#ffd86b"; X.font = "800 26px system-ui"; X.globalAlpha = clamp(W.frenzy.t, 0, 1); X.fillText("🌀 FEEDING FRENZY ×" + W.frenzy.mult.toFixed(1), VW / 2, 130); X.globalAlpha = 1; }
  if (W.hp != null && W.hp < maxHP() - 0.5) { const hpf = clamp(W.hp / maxHP(), 0, 1); X.fillStyle = "rgba(0,0,0,.5)"; X.fillRect(VW / 2 - 110, 150, 220, 13); X.fillStyle = hpf > 0.3 ? "#7affc0" : "#ff5c6a"; X.fillRect(VW / 2 - 110, 150, 220 * hpf, 13); ftxt(VW / 2, 160, "♥ " + Math.ceil(W.hp) + " / " + Math.ceil(maxHP()), "#fff", 11); }
  // damage vignette
  if (W.hurt > 0) { const a = clamp(W.hurt, 0, 1) * 0.5; const vg = X.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.78); vg.addColorStop(0, "rgba(255,40,40,0)"); vg.addColorStop(1, "rgba(255,30,30," + a + ")"); X.fillStyle = vg; X.fillRect(0, 0, VW, VH); }
  // depth title on entering a new layer
  if (W.layerTitleT > 0 && W.layerTitle) { const a = clamp(W.layerTitleT, 0, 1); X.globalAlpha = a; X.textAlign = "center";
    X.fillStyle = accentAt(W.creature.y); X.font = "700 12px system-ui"; X.fillText("DEPTH " + (layerAt(W.creature.y) + 1) + " / " + NL, VW / 2, VH * 0.38 - 30);
    X.fillStyle = "#fff"; X.font = "300 40px system-ui"; X.fillText(W.layerTitle, VW / 2, VH * 0.38); X.globalAlpha = 1; }
  // virtual joystick (touch / hold)
  if (input.down) {
    const ox = input.ox, oy = input.oy; const ac = accentAt(W.creature.y);
    let jx = input.x - ox, jy = input.y - oy; const m = Math.hypot(jx, jy); if (m > JOY_R) { jx = jx / m * JOY_R; jy = jy / m * JOY_R; }
    X.strokeStyle = rgba(ac, .35); X.lineWidth = 3; X.beginPath(); X.arc(ox, oy, JOY_R, 0, 6.283); X.stroke();
    X.fillStyle = "rgba(0,0,0,.25)"; X.beginPath(); X.arc(ox, oy, JOY_R, 0, 6.283); X.fill();
    X.fillStyle = rgba(ac, .55); X.beginPath(); X.arc(ox + jx, oy + jy, 26, 0, 6.283); X.fill();
    X.fillStyle = "rgba(255,255,255,.85)"; X.beginPath(); X.arc(ox + jx, oy + jy, 9, 0, 6.283); X.fill();
  }
}
function drawWreck() {
  const wy = WRECK_LAYER * LH + 300, wx = WW / 2;
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
  const body = (W.hurt > 0 && Math.sin(W.t * 30) > 0) ? "#ff6a6a" : gl;
  X.save(); X.translate(c.x, c.y); X.rotate(c.ang);
  const moveF = Math.min(1, Math.hypot(c.vx, c.vy) / maxSpeed());
  const wig = Math.sin(W.t * 8) * FEEL.wiggle * (.3 + moveF);
  // tail fin
  X.strokeStyle = rgba(ac, .8); X.lineWidth = r * .5; X.lineCap = "round"; X.beginPath(); X.moveTo(-r * .6, 0); X.quadraticCurveTo(-r * 1.2, wig, -r * 1.7, wig * 1.6); X.stroke();
  X.fillStyle = rgba(ac, .55); X.beginPath(); X.moveTo(-r * 1.4, wig); X.lineTo(-r * 2.0, wig * 1.6 - r * .5); X.lineTo(-r * 2.0, wig * 1.6 + r * .5); X.closePath(); X.fill();
  glow(0, 0, r * 1.8, ac, .25);
  // pectoral fins (flap with motion)
  const flap = Math.sin(W.t * 9) * .25 * (.4 + moveF);
  X.fillStyle = rgba(ac, .5);
  X.beginPath(); X.ellipse(-r * .1, r * .75, r * .55, r * .26, .5 + flap, 0, 6.283); X.fill();
  X.beginPath(); X.ellipse(-r * .1, -r * .75, r * .55, r * .26, -.5 - flap, 0, 6.283); X.fill();
  // dorsal fin
  X.fillStyle = rgba(gl, .8); X.beginPath(); X.moveTo(r * .1, -r * .6); X.quadraticCurveTo(-r * .2, -r * 1.5, -r * .6, -r * .6); X.closePath(); X.fill();
  // body
  X.fillStyle = rgba(body, .94); X.beginPath(); X.ellipse(0, 0, r * 1.15, r * .72, 0, 0, 6.283); X.fill();
  X.fillStyle = "rgba(255,255,255,.85)"; X.beginPath(); X.ellipse(r * .2, 0, r * .7, r * .5, 0, 0, 6.283); X.fill();
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
    (S.molts > 0 || S.roe > 0 || canMolt() ? `<div class="hchip"><b style="color:#ff9ec2">🥚 ${fmt(S.roe)}</b><span>Roe${S.apexTier ? " ·T" + S.apexTier : ""}</span></div>` : "") +
    (S.migrations > 0 || S.lineage > 0 ? `<div class="hchip"><b style="color:#ff6fd0">🩸 ${fmt(S.lineage)}</b><span>Lineage${S.migTier ? " ·T" + S.migTier : ""}</span></div>` : "") +
    (S.ascensions > 0 || S.spirit > 0 ? `<div class="hchip"><b style="color:#8ff0ff">✦ ${fmt(S.spirit)}</b><span>Spirit</span></div>` : "") +
    (S.wreckFound ? `<div class="hchip"><b style="color:#ffd86b">⛃ ${fmt(S.relics)}</b><span>Relics</span></div>` : "") +
    `<div class="hchip hz"><b>${L.name}</b><span>Depth ${layerAt(c.y) + 1}/${NL}${gate.y < WORLD.h ? " · grow to " + fmt(gate.req) : " · the floor"}</span>` +
    `<div class="bar"><i style="width:${(prog * 100) | 0}%;background:${L.accent}"></i></div></div>` +
    (evoUnlocked ? `<button class="hbtn ${canMolt() ? "ready" : ""}" onclick="openEvo()">🧬 Evolve${canMolt() ? " ●" : ""}</button>` : "") +
    (migUnlocked() ? `<button class="hbtn ${canMigrate() ? "ready" : ""}" style="border-color:rgba(255,111,208,.4);background:rgba(255,111,208,.12)" onclick="openBloodline()">🩸 Bloodline${canMigrate() ? " ●" : ""}</button>` : "") +
    (ascUnlocked() ? `<button class="hbtn ${canAscend() ? "ready" : ""}" style="border-color:rgba(143,240,255,.4);background:rgba(143,240,255,.12)" onclick="openAscension()">✦ Primordial${canAscend() ? " ●" : ""}</button>` : "");
}
function moltBanner() {
  document.getElementById("overlay").innerHTML =
    `<div class="ov" style="border-color:rgba(255,158,194,.5)"><div class="ovtag" style="color:#ff9ec2">A NEW INSTINCT</div>` +
    `<div class="ovt2">You can Rebirth</div><div class="ovs">Begin the dive anew — but keep <b>Roe</b> and rise an <b>Apex Tier</b> (a permanent multiplier on everything). Spend Roe in the <b>Evolution</b> tree (🧬) to come back faster and stronger every time.</div>` +
    `<button class="ovbtn" onclick="hideOverlay();openEvo()">Open Evolution</button><button class="ovbtn" onclick="hideOverlay()">Later</button></div>`;
  showOverlay();
}
function openEvo() {
  const can = canMolt(), gain = roeGain();
  let h = `<div class="ov ovwide"><div class="ovt2" style="color:#ff9ec2">🧬 Evolution</div>` +
    `<div class="ovs">Roe 🥚 ${fmt(S.roe)} · Apex Tier ${S.apexTier} (×${fmt(apexMult())}) · Rebirths ${S.molts}</div>` +
    `<button class="ovbtn ${can ? "" : "dim"}" ${can ? `onclick="doMolt();openEvo()"` : "disabled"} style="border-color:rgba(255,158,194,.5);background:rgba(255,158,194,.14)">` +
    (can ? `Rebirth now — gain ${fmt(gain)} Roe 🥚` : `Grow to ${fmt(moltReq())} size to Rebirth (${fmt(S.size)})`) + `</button>`;
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
    if (ev("e_automolt")) h += autoTog("molt", "♻ Auto-Rebirth") + `<div class="ovs">Auto-Rebirth at ≥ ${S.autoMoltTarget} Roe <button class="mini" onclick="S.autoMoltTarget=Math.max(1,S.autoMoltTarget-1);openEvo()">−</button> <button class="mini" onclick="S.autoMoltTarget+=1;openEvo()">+</button></div>`;
    h += `</div>`;
  }
  if (migUnlocked()) h += `<button class="ovbtn" onclick="hideOverlay();openBloodline()" style="border-color:rgba(255,111,208,.5);background:rgba(255,111,208,.12)">🩸 Migration &amp; Bloodline ›</button>`;
  h += `<button class="ovbtn" onclick="hideOverlay()">Back to the hunt</button></div>`;
  document.getElementById("overlay").innerHTML = h; showOverlay();
}
function shopGrid(defs, keys, cats, lvFn, costFn, have, curIcon, buyFn, color) {
  const groups = cats || [null]; let h = "";
  for (const cat of groups) {
    if (cat) h += `<div class="evocat">${cat}</div>`;
    h += `<div class="shop">`;
    for (const k of keys) { if (cat && defs[k].cat !== cat) continue; const u = defs[k], lv = lvFn(k), maxed = lv >= u.cap, cost = costFn(k), able = !maxed && have >= cost;
      h += `<button class="shopi ${able ? "on" : ""}" ${able ? `onclick="${buyFn}('${k}')"` : "disabled"}><span class="si">${u.icon}</span><b>${u.name}</b><span class="sd">${u.desc}</span><span class="sc" style="color:${color}">${maxed ? "MAX" : (u.cap > 1 ? "Lv" + lv + " · " : "") + fmt(cost) + " " + curIcon}</span></button>`; }
    h += `</div>`;
  }
  return h;
}
function openBloodline() {
  const can = canMigrate(), gain = lineageGain();
  let h = `<div class="ov ovwide"><div class="ovt2" style="color:#ff6fd0">🩸 Bloodline</div>` +
    `<div class="ovs">Lineage 🩸 ${fmt(S.lineage)} · Migration Tier ${S.migTier} (×${fmt(migTierMult())}) · Migrations ${S.migrations}</div>` +
    `<button class="ovbtn ${can ? "" : "dim"}" ${can ? `onclick="doMigrate();openBloodline()"` : "disabled"} style="border-color:rgba(255,111,208,.5);background:rgba(255,111,208,.14)">` +
    (can ? `Migrate now — gain ${fmt(gain)} Lineage 🩸` : (migUnlocked() ? `Need ${fmt(migReq())} Roe to Migrate (have ${fmt(S.roe)})` : `Reach depth 5 with 4+ Rebirths to unlock`)) + `</button>` +
    `<div class="ovs" style="opacity:.75">Migrating resets your Rebirth progress (Roe, Evolution, Apex Tier) for <b>Lineage</b> — deeper permanent power that buffs nearly every stat, and awakens the Bestiary.</div>`;
  h += shopGrid(BL, BL_KEYS, BL_CATS, bl, blCost, S.lineage, "🩸", "buyBl", "#ff6fd0");
  if (ascUnlocked()) h += `<button class="ovbtn" onclick="hideOverlay();openAscension()" style="border-color:rgba(143,240,255,.5);background:rgba(143,240,255,.12)">✦ Ascension &amp; Primordial ›</button>`;
  h += `<button class="ovbtn" onclick="hideOverlay()">Back to the hunt</button></div>`;
  document.getElementById("overlay").innerHTML = h; showOverlay();
}
function openAscension() {
  const can = canAscend(), gain = spiritGain();
  let h = `<div class="ov ovwide"><div class="ovt2" style="color:#8ff0ff">✦ Primordial</div>` +
    `<div class="ovs">Spirit ✦ ${fmt(S.spirit)} · Ascensions ${S.ascensions} (×${fmt(ascTierMult())})</div>` +
    `<button class="ovbtn ${can ? "" : "dim"}" ${can ? `onclick="doAscend();openAscension()"` : "disabled"} style="border-color:rgba(143,240,255,.5);background:rgba(143,240,255,.14)">` +
    (can ? `Ascend now — gain ${fmt(gain)} Spirit ✦` : (ascUnlocked() ? `Need more Lineage to Ascend (have ${fmt(S.lineage)})` : `Reach 2 Migrations &amp; 8 Bestiary stars to unlock`)) + `</button>` +
    `<div class="ovs" style="opacity:.75">Ascending resets Lineage &amp; Bloodline for <b>Spirit</b> — the deepest, rarest multipliers.</div>`;
  h += shopGrid(PRIM, PRIM_KEYS, null, pr, primCost, S.spirit, "✦", "buyPrim", "#8ff0ff");
  h += `<button class="ovbtn" onclick="hideOverlay()">Back to the hunt</button></div>`;
  document.getElementById("overlay").innerHTML = h; showOverlay();
}
function migBanner() {
  document.getElementById("overlay").innerHTML =
    `<div class="ov" style="border-color:rgba(255,111,208,.5)"><div class="ovtag" style="color:#ff6fd0">A DEEPER RESET</div>` +
    `<div class="ovt2">Migration</div><div class="ovs">You've gone deep enough to <b>Migrate</b> — a reset beneath Rebirth. Trade your Roe &amp; Evolution for <b>Lineage</b> and the vast <b>Bloodline</b> tree (it buffs nearly every stat), and awaken the <b>Bestiary</b> as real power.</div>` +
    `<button class="ovbtn" onclick="hideOverlay();openBloodline()">Open Bloodline</button><button class="ovbtn" onclick="hideOverlay()">Later</button></div>`;
  showOverlay();
}
function ascBanner() {
  document.getElementById("overlay").innerHTML =
    `<div class="ov" style="border-color:rgba(143,240,255,.5)"><div class="ovtag" style="color:#8ff0ff">THE DEEPEST RESET</div>` +
    `<div class="ovt2">Ascension</div><div class="ovs">The oldest currents open to you. <b>Ascend</b> to convert your whole Bloodline into <b>Spirit</b> and the <b>Primordial</b> tree — the final multipliers.</div>` +
    `<button class="ovbtn" onclick="hideOverlay();openAscension()">Open Primordial</button><button class="ovbtn" onclick="hideOverlay()">Later</button></div>`;
  showOverlay();
}
function autoTog(key, label) { const on = !!S.autoOn[key]; return `<button class="atog ${on ? "on" : ""}" onclick="S.autoOn['${key}']=!S.autoOn['${key}'];openEvo()">${label}<span>${on ? "ON" : "OFF"}</span></button>`; }
function achHTML() {
  const done = Object.keys(S.ach).length; let rows = "";
  for (const a of ACH) { const u = !!S.ach[a.id]; rows += `<div class="achrow ${u ? "on" : ""}"><span class="ac">${u ? "🏅" : "🔒"}</span><div class="acd"><b>${u ? a.name : "???"}</b><span>${a.desc}</span></div></div>`; }
  return `<div class="ovt2" style="color:#ffd86b">Achievements — ${done}/${ACH.length}</div><div class="ovs">Each grants +6% to all gains. Current ×${fmt(achMult())}.</div><div class="achgrid">${rows}</div>`;
}
function bestiaryHTML() {
  if (!S.bestAwake) return "";
  let rows = "";
  for (const id in FISH) { const cnt = S.best[id] || 0; let r = 0, nxt = 0; for (const t of BEST_THRESH) { if (cnt >= t) r++; else if (!nxt) nxt = t; }
    rows += `<div class="bestrow"><span class="bg">${FISH[id].glyph}</span><span class="bn">${id}</span><b>${fmt(cnt)}</b><span class="bm">${"★".repeat(r)}${"☆".repeat(BEST_THRESH.length - r)}${nxt ? " · " + fmt(nxt) : ""}</span></div>`; }
  return `<div class="ovt2" style="color:#9be7a6">Bestiary — ${bestiaryStars()}★</div><div class="ovs">Each ★ boosts Biomass (×${fmt(bestiaryMult())}), <b>Lineage gain</b>, and unlocks <b>Ascension</b>. Devour every species to master the deep.</div><div class="bestiary">${rows}</div>`;
}
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
    `<div class="ov ovwide">${hub}<div class="ovt2">Logbook</div>` +
    `<div class="ovs">Eaten ${fmt(S.stats.eaten)} · Salvaged ${fmt(S.stats.salvage)} ⛃ · Played ${fmtTime(S.stats.playtime)}</div>` +
    achHTML() +
    `<div class="ovs"><b>Oddities ${eggs}/${EGGS.length}</b></div><div class="eggs">${eg}</div>` +
    bestiaryHTML() +
    `<div class="ovs"><b>Trophies ${Object.keys(S.trophies).length}/${APEX.length}</b> · apex kills give ×${fmt(trophyMult())} to all gains</div>` +
    `<div class="ovs">Pace: ${["relaxed", "diver", "abyssal"].map(k => `<button class="mini ${S.difficulty === k ? "on" : ""}" onclick="S.difficulty='${k}';openMenu()">${k}</button>`).join(" ")}</div>` +
    `<button class="ovbtn" onclick="hideOverlay()">Back to the deep</button>` +
    `<button class="ovbtn danger" onclick="if(confirm('Erase all progress?')){hardReset();hideOverlay();}">Erase progress</button></div>`;
  showOverlay();
}
function buyPerm(k) { const u = PERM[k], cost = permCost(k); if (S.perm[k] >= u.cap || S.relics < cost) return; S.relics -= cost; S.perm[k]++; openMenu(); }
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.className = "show"; clearTimeout(t._t); t._t = setTimeout(() => t.className = "", 3200); }
function showOverlay() { document.getElementById("overlay").style.display = "flex"; }
function hideOverlay() { const o = document.getElementById("overlay"); o.style.display = "none"; o.innerHTML = ""; }

// Start as soon as the DOM is ready. Some offline viewers (Documents, Quick Look)
// never fire window 'load', so don't wait on it — the script is at end of <body>.
function boot() { try { init(); } catch (e) { try { document.getElementById("toast").textContent = "Error: " + e.message; document.getElementById("toast").className = "show"; } catch (_) {} } }
if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
if (typeof module !== "undefined" && module.exports) module.exports = { newState, get S() { return S; }, set S(v) { S = v; } };
