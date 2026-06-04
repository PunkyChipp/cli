/* ===================================================================
   ABYSS — content data. Pure data + effect functions (no DOM).
   Effect "parts" return arrays of {k, b} (multiply key by 1+b) or
   {k, add} (add to key). Keys: all, tap, prod, yield:<id>, res:<id>,
   cost:<id>, ladcost:<id>, prestige:<id>, offline, autospeed.
   =================================================================== */

var DATA = { zones: [], cards: [], cardMap: {}, achievements: [] };

// ----------------------------------------------------------------- ZONES
DATA.zones = [
  // ============================ ZONE 0 : SUNLIT SHALLOWS ============================
  {
    id: 0, name: "Sunlit Shallows",
    blurb: "Warm light pours through the surface. Plankton bloom in the glow.",
    colors: ["#1aa6c8", "#0a5b86"], accent: "#8ff0ff", glow2: "#fff2a6", light: 1.0,
    base: { res: "lumens", name: "Lumens", tapName: "Tap the water", glyph: "☀" },
    producers: [
      { id: "plankton", name: "Plankton", glyph: "🦠", res: "lumens", baseCost: 10, growth: 1.13, baseYield: 0.4,
        desc: "Drifting blooms that gather light." },
      { id: "coral", name: "Coral", glyph: "🪸", res: "lumens", baseCost: 220, growth: 1.15, baseYield: 3.0,
        desc: "Slow, steady, and feeds the Plankton around it." }
    ],
    ladder: { id: "tide", name: "Tide", res: "lumens", baseCost: 12, growth: 1.32, glyph: "🌊",
              tapPer: 0.08, prodPer: 0.06, cheapenAt: 10, cheapenBy: "plankton" },
    prestige: { id: "ebb", name: "Ebb", gain: "pearls", gainName: "Pearls", threshold: 500,
                resetProducers: ["plankton", "coral"], resetLadder: true,
                startProducer: "plankton", startUpgrade: "p_spawn", startPer: 3,
                desc: "Reset Lumens, Plankton, Coral & Tide for Pearls. Fast and repeatable." },
    apply: function (B, G) {
      // Coral boosts Plankton yield (cross-boost).
      B.m("yield:plankton", 1 + 0.03 * (G.prod.coral || 0));
    },
    upgrades: [
      { id: "r_tap", name: "Sharpened Reach", info: "+1 base tap per level.", res: "lumens", base: 40, growth: 1.35, cap: 20,
        parts: l => [{ k: "tapflat", add: 1 * l }] },
      { id: "r_plk", name: "Bloom Density", info: "Plankton yield +10% per level.", res: "lumens", base: 120, growth: 1.5, cap: 15,
        parts: l => [{ k: "yield:plankton", b: 0.10 * l }] },
      { id: "p_all", name: "Tidal Vigor", info: "All production ×1.08 per level.", res: "pearls", base: 6, growth: 1.6, cap: 25,
        parts: l => [{ k: "prod", b: 0.08 * l }] },
      { id: "p_tap", name: "Pearl Grip", info: "+3 base tap per level.", res: "pearls", base: 5, growth: 1.5, cap: 15,
        parts: l => [{ k: "tapflat", add: 3 * l }] },
      { id: "p_coral", name: "Reefwork", info: "Coral yield +15% per level.", res: "pearls", base: 9, growth: 1.6, cap: 15,
        parts: l => [{ k: "yield:coral", b: 0.15 * l }] },
      { id: "p_undertow", name: "Undertow", info: "Tide cost −3% per level (capped).", res: "pearls", base: 8, growth: 1.55, cap: 20,
        parts: l => [{ k: "ladcost:tide", b: -0.03 * l }] },
      { id: "p_prestige", name: "Mother-of-Pearl", info: "Pearls from Ebb +10% per level.", res: "pearls", base: 14, growth: 1.7, cap: 15,
        parts: l => [{ k: "prestige:pearls", b: 0.10 * l }] },
      { id: "p_spawn", name: "Spawning Grounds", info: "Start each Ebb with +3 Plankton per level.", res: "pearls", base: 12, growth: 1.7, cap: 10,
        parts: l => [] },
      { id: "p_diver", name: "Pearl Diver", info: "Unlocks Auto-Ebb.", res: "pearls", base: 140, growth: 1, cap: 1,
        parts: l => [] }
    ],
    milestones: [
      { level: 3, title: "First Catch", detail: "Auto-Harvest unlocked (Automation tab).", glimmer: 5 },
      { level: 6, title: "Living Current", detail: "Plankton make the Tide cheaper to raise.", glimmer: 5 },
      { level: 9, title: "Schooling", detail: "Plankton now boost your tap.", apply: (B, G) => B.m("tap", 1 + 0.015 * Math.sqrt(G.prod.plankton || 0)) },
      { level: 12, title: "A Strange Glow", detail: "Reliquary specimen found: Angelfish.", card: "angelfish" },
      { level: 15, title: "Self-Seeding", detail: "Auto-Plankton unlocked.", glimmer: 10 },
      { level: 18, title: "Sunbloom", detail: "Plankton yield ×1.6.", apply: B => B.m("yield:plankton", 1.6) },
      { level: 22, title: "Deep Roots", detail: "All production ×1.5.", apply: B => B.m("prod", 1.5) },
      { level: 25, title: "The Drop-Off", detail: "You can Descend to the Twilight Reach.", glimmer: 25, slot: 1 }
    ],
    descend: { level: 25, cost: { res: "pearls", amt: 60 }, to: 1 },
    auto: [
      { key: "autoTap_0", name: "Auto-Harvest", info: "Taps the water for you.", avail: G => (G.maxLadder.tide || 0) >= 3 },
      { key: "autoProd_plankton", name: "Auto-Plankton", info: "Buys Plankton with spare Lumens.", avail: G => (G.maxLadder.tide || 0) >= 15 },
      { key: "autoProd_coral", name: "Auto-Coral", info: "Buys Coral with spare Lumens.", avail: G => (G.maxLadder.tide || 0) >= 18 },
      { key: "autoPrestige_0", name: "Auto-Ebb", info: "Ebbs once it's worth your target Pearls.", avail: G => (G.up.p_diver || 0) >= 1, target: true }
    ]
  },

  // ============================ ZONE 1 : TWILIGHT REACH ============================
  {
    id: 1, name: "Twilight Reach",
    blurb: "The last blue light fades. Down here, things make their own.",
    colors: ["#0a3b6e", "#06173a"], accent: "#6fa8ff", glow2: "#9a6fff", light: 0.55,
    base: { res: "glow", name: "Glow", tapName: "Pulse the dark", glyph: "✦" },
    producers: [
      { id: "lantern", name: "Lanternfish", glyph: "🐟", res: "glow", baseCost: 15, growth: 1.14, baseYield: 0.5,
        desc: "Tiny living lamps." },
      { id: "jelly", name: "Jellyfish", glyph: "🪼", res: "glow", baseCost: 400, growth: 1.16, baseYield: 4.0,
        desc: "Pulsing bells that amplify the Lanternfish nearby." }
    ],
    ladder: { id: "lure", name: "Lure", res: "glow", baseCost: 20, growth: 1.34, glyph: "💡",
              tapPer: 0.09, prodPer: 0.07, cheapenAt: 10, cheapenBy: "lantern" },
    prestige: { id: "flicker", name: "Flicker", gain: "amber", gainName: "Amber", threshold: 2000,
                resetProducers: ["lantern", "jelly"], resetLadder: true,
                startProducer: "lantern", startUpgrade: "f_spawn", startPer: 3,
                desc: "Reset Glow, Lanternfish, Jellyfish & Lure for Amber." },
    apply: function (B, G) {
      B.m("yield:lantern", 1 + 0.03 * (G.prod.jelly || 0));
    },
    upgrades: [
      { id: "t_tap", name: "Brighter Pulse", info: "+2 base pulse per level.", res: "glow", base: 60, growth: 1.36, cap: 20,
        parts: l => [{ k: "tapflat", add: 2 * l }] },
      { id: "t_lan", name: "Lantern Oil", info: "Lanternfish yield +12% per level.", res: "glow", base: 200, growth: 1.5, cap: 15,
        parts: l => [{ k: "yield:lantern", b: 0.12 * l }] },
      { id: "a_all", name: "Amberlight", info: "All production ×1.10 per level.", res: "amber", base: 6, growth: 1.6, cap: 25,
        parts: l => [{ k: "prod", b: 0.10 * l }] },
      { id: "a_jelly", name: "Bloom of Bells", info: "Jellyfish yield +18% per level.", res: "amber", base: 9, growth: 1.6, cap: 15,
        parts: l => [{ k: "yield:jelly", b: 0.18 * l }] },
      { id: "a_lure", name: "Patient Glow", info: "Lure cost −3% per level (capped).", res: "amber", base: 8, growth: 1.55, cap: 20,
        parts: l => [{ k: "ladcost:lure", b: -0.03 * l }] },
      { id: "a_prestige", name: "Fossil Light", info: "Amber from Flicker +10% per level.", res: "amber", base: 14, growth: 1.7, cap: 15,
        parts: l => [{ k: "prestige:amber", b: 0.10 * l }] },
      { id: "f_spawn", name: "Nursery", info: "Start each Flicker with +3 Lanternfish per level.", res: "amber", base: 12, growth: 1.7, cap: 10,
        parts: l => [] },
      { id: "a_diver", name: "Deep Tender", info: "Unlocks Auto-Flicker.", res: "amber", base: 160, growth: 1, cap: 1,
        parts: l => [] }
    ],
    milestones: [
      { level: 4, title: "Lights On", detail: "Auto-Pulse unlocked.", glimmer: 8 },
      { level: 8, title: "Drawn In", detail: "Lanternfish make the Lure cheaper.", glimmer: 8 },
      { level: 12, title: "Bloom", detail: "Reliquary specimen found: Vampire Squid.", card: "vampsquid" },
      { level: 16, title: "Swarm", detail: "Auto-Lanternfish unlocked.", glimmer: 12 },
      { level: 20, title: "Radiance", detail: "All production ×1.8.", apply: B => B.m("prod", 1.8) },
      { level: 26, title: "Into the Black", detail: "You can Descend to the Midnight Zone.", glimmer: 40, slot: 1 }
    ],
    descend: { level: 26, cost: { res: "amber", amt: 80 }, to: 2 },
    auto: [
      { key: "autoTap_1", name: "Auto-Pulse", info: "Pulses the dark for you.", avail: G => (G.maxLadder.lure || 0) >= 4 },
      { key: "autoProd_lantern", name: "Auto-Lanternfish", info: "Buys Lanternfish.", avail: G => (G.maxLadder.lure || 0) >= 16 },
      { key: "autoProd_jelly", name: "Auto-Jellyfish", info: "Buys Jellyfish.", avail: G => (G.maxLadder.lure || 0) >= 20 },
      { key: "autoPrestige_1", name: "Auto-Flicker", info: "Flickers at your target.", avail: G => (G.up.a_diver || 0) >= 1, target: true }
    ]
  },

  // ============================ ZONE 2 : MIDNIGHT ZONE ============================
  {
    id: 2, name: "The Midnight",
    blurb: "True dark. Cold violet lures drift in a starless sea.",
    colors: ["#0a0a24", "#05021a"], accent: "#b46fff", glow2: "#5fd0ff", light: 0.22,
    base: { res: "ichor", name: "Ichor", tapName: "Stir the dark", glyph: "❖" },
    producers: [
      { id: "angler", name: "Anglerfish", glyph: "🎣", res: "ichor", baseCost: 25, growth: 1.15, baseYield: 0.6,
        desc: "Patient hunters of the dark." },
      { id: "vent", name: "Hydrothermal Vent", glyph: "🌋", res: "ichor", baseCost: 800, growth: 1.17, baseYield: 6.0,
        desc: "Raw heat that supercharges everything near it." }
    ],
    ladder: { id: "pulse", name: "Pressure", res: "ichor", baseCost: 30, growth: 1.36, glyph: "❖",
              tapPer: 0.10, prodPer: 0.08, cheapenAt: 10, cheapenBy: "angler" },
    prestige: { id: "seep", name: "Seep", gain: "spectra", gainName: "Spectra", threshold: 8000,
                resetProducers: ["angler", "vent"], resetLadder: true,
                startProducer: "angler", startUpgrade: "s_spawn", startPer: 3,
                desc: "Reset Ichor, Anglerfish, Vents & Pressure for Spectra." },
    apply: function (B, G) {
      B.m("yield:angler", 1 + 0.03 * (G.prod.vent || 0));
    },
    upgrades: [
      { id: "i_tap", name: "Cold Hands", info: "+4 base stir per level.", res: "ichor", base: 90, growth: 1.36, cap: 20,
        parts: l => [{ k: "tapflat", add: 4 * l }] },
      { id: "i_ang", name: "Sharper Teeth", info: "Anglerfish yield +14% per level.", res: "ichor", base: 300, growth: 1.5, cap: 15,
        parts: l => [{ k: "yield:angler", b: 0.14 * l }] },
      { id: "x_all", name: "Spectral Drift", info: "All production ×1.12 per level.", res: "spectra", base: 6, growth: 1.6, cap: 25,
        parts: l => [{ k: "prod", b: 0.12 * l }] },
      { id: "x_vent", name: "Magma Tap", info: "Vent yield +20% per level.", res: "spectra", base: 9, growth: 1.6, cap: 15,
        parts: l => [{ k: "yield:vent", b: 0.20 * l }] },
      { id: "x_lure", name: "Slow Pressure", info: "Pressure cost −3% per level (capped).", res: "spectra", base: 8, growth: 1.55, cap: 20,
        parts: l => [{ k: "ladcost:pulse", b: -0.03 * l }] },
      { id: "x_prestige", name: "Prism Heart", info: "Spectra from Seep +10% per level.", res: "spectra", base: 14, growth: 1.7, cap: 15,
        parts: l => [{ k: "prestige:spectra", b: 0.10 * l }] },
      { id: "s_spawn", name: "Brood", info: "Start each Seep with +3 Anglerfish per level.", res: "spectra", base: 12, growth: 1.7, cap: 10,
        parts: l => [] },
      { id: "x_diver", name: "Abyssal Will", info: "Unlocks Auto-Seep.", res: "spectra", base: 180, growth: 1, cap: 1,
        parts: l => [] }
    ],
    milestones: [
      { level: 4, title: "Eyes Adjust", detail: "Auto-Stir unlocked.", glimmer: 12 },
      { level: 8, title: "The Hunt", detail: "Anglerfish make Pressure cheaper.", glimmer: 12 },
      { level: 12, title: "Heat Bloom", detail: "Reliquary specimen found: Gulper Eel.", card: "gulper" },
      { level: 16, title: "Vent Field", detail: "Auto-Anglerfish unlocked.", glimmer: 18 },
      { level: 22, title: "Pressurised", detail: "All production ×2.2.", apply: B => B.m("prod", 2.2) },
      { level: 30, title: "The Deepening", detail: "Deeper depths await — coming soon.", glimmer: 60, slot: 1 }
    ],
    descend: null,
    auto: [
      { key: "autoTap_2", name: "Auto-Stir", info: "Stirs the dark for you.", avail: G => (G.maxLadder.pulse || 0) >= 4 },
      { key: "autoProd_angler", name: "Auto-Anglerfish", info: "Buys Anglerfish.", avail: G => (G.maxLadder.pulse || 0) >= 16 },
      { key: "autoProd_vent", name: "Auto-Vent", info: "Buys Vents.", avail: G => (G.maxLadder.pulse || 0) >= 22 },
      { key: "autoPrestige_2", name: "Auto-Seep", info: "Seeps at your target.", avail: G => (G.up.x_diver || 0) >= 1, target: true }
    ]
  }
];

// ----------------------------------------------------------------- CARDS (Reliquary)
// rarity: common, uncommon, rare, epic, legendary, mythic
DATA.cards = [
  // ---- common (10) ----
  c("krill", "Krill", "common", "🦐", "It glows when no one's looking.", l => [{ k: "all", b: 0.03 * l }]),
  c("copepod", "Copepod", "common", "🦠", "Small, countless, vital.", l => [{ k: "tap", b: 0.06 * l }]),
  c("diatom", "Diatom", "common", "✶", "Glass that breathes light.", l => [{ k: "prod", b: 0.04 * l }]),
  c("anchovy", "Anchovy", "common", "🐟", "Where there's one, there's a thousand.", l => [{ k: "all", b: 0.025 * l }]),
  c("snail", "Sea Snail", "common", "🐚", "Carries its home, slowly.", l => [{ k: "prod", b: 0.035 * l }]),
  c("limpet", "Limpet", "common", "🔘", "Holds fast against the current.", l => [{ k: "offline", b: 0.05 * l }]),
  c("shrimp", "Cleaner Shrimp", "common", "🦐", "Tidies the reef.", l => [{ k: "tap", b: 0.05 * l }]),
  c("urchin", "Urchin", "common", "🌑", "A pincushion of patience.", l => [{ k: "prod", b: 0.03 * l }]),
  c("sardine", "Sardine", "common", "🐠", "Mirror-scaled multitudes.", l => [{ k: "all", b: 0.028 * l }]),
  c("polyp", "Polyp", "common", "🪸", "One day, a reef.", l => [{ k: "prod", b: 0.03 * l }]),
  // ---- uncommon (9) ----
  c("clown", "Clownfish", "uncommon", "🐠", "Bold among the stingers.", l => [{ k: "all", b: 0.05 * l }]),
  c("seahorse", "Seahorse", "uncommon", "🐴", "Tail like a question mark.", l => [{ k: "tap", b: 0.10 * l }]),
  c("starfish", "Starfish", "uncommon", "⭐", "Five arms, no hurry.", l => [{ k: "prod", b: 0.06 * l }]),
  c("crab", "Hermit Crab", "uncommon", "🦀", "Upgrades its shell, like you.", l => [{ k: "all", b: 0.04 * l }, { k: "offline", b: 0.08 * l }]),
  c("ray", "Manta Ray", "uncommon", "🛸", "A wing the size of a sail.", l => [{ k: "prod", b: 0.07 * l }]),
  c("pufferfish", "Pufferfish", "uncommon", "🐡", "All bluff and spikes.", l => [{ k: "tap", b: 0.12 * l }]),
  c("beacon", "Beacon Polyp", "uncommon", "🔆", "Lifts the humble.", null, { scope: "rarity:common", val: 0.12 }),
  c("octolet", "Young Octopus", "uncommon", "🐙", "Eight arms, learning fast.", l => [{ k: "all", b: 0.045 * l }]),
  c("eelet", "Glass Eel", "uncommon", "〰", "Transparent and quick.", l => [{ k: "prod", b: 0.065 * l }]),
  // ---- rare (8) ----
  c("angelfish", "Angelfish", "rare", "🐠", "It seems lit from within.", l => [{ k: "all", b: 0.08 * l }]),
  c("lionfish", "Lionfish", "rare", "🦁", "Beautiful and untouchable.", l => [{ k: "tap", b: 0.20 * l }]),
  c("turtle", "Sea Turtle", "rare", "🐢", "Older than the reef.", l => [{ k: "offline", b: 0.20 * l }, { k: "prod", b: 0.05 * l }]),
  c("nautilus", "Nautilus", "rare", "🐚", "A spiral of perfect math.", l => [{ k: "prod", b: 0.12 * l }]),
  c("cuttle", "Cuttlefish", "rare", "🦑", "Skin that speaks in colour.", l => [{ k: "all", b: 0.07 * l }]),
  c("shoalmind", "Shoalmind", "rare", "🧠", "Boosts its neighbours.", null, { scope: "adj", val: 0.18 }),
  c("hive", "Symbiote", "rare", "♾", "Stronger for company.", l => [{ k: "prod", b: 0.04 * l }], { scope: "all", val: 0.06 }),
  c("moray", "Moray Eel", "rare", "🐍", "Patient in the rocks.", l => [{ k: "all", b: 0.075 * l }]),
  // ---- epic (6) ----
  c("octopus", "Giant Octopus", "epic", "🐙", "Solver of every box.", l => [{ k: "all", b: 0.14 * l }]),
  c("vampsquid", "Vampire Squid", "epic", "🦑", "Cloak of the deep.", l => [{ k: "prod", b: 0.16 * l }, { k: "tap", b: 0.10 * l }]),
  c("dolphin", "Dolphin", "epic", "🐬", "Plays even while it works.", l => [{ k: "all", b: 0.12 * l }, { k: "autospeed", b: 0.10 * l }]),
  c("crown", "Crown Jelly", "epic", "👑", "Lifts the whole loadout.", l => [{ k: "prod", b: 0.05 * l }], { scope: "all", val: 0.10 }),
  c("swordfish", "Swordfish", "epic", "🗡", "Cuts straight to the gain.", l => [{ k: "tap", b: 0.30 * l }]),
  c("oarfish", "Oarfish", "epic", "🎀", "The sea serpent of sailors.", l => [{ k: "prod", b: 0.18 * l }]),
  // ---- legendary (5) ----
  c("gulper", "Gulper Eel", "legendary", "🕳", "A mouth that swallows the dark.", l => [{ k: "all", b: 0.22 * l }]),
  c("whale", "Blue Whale", "legendary", "🐋", "The largest heart that ever beat.", l => [{ k: "prod", b: 0.30 * l }, { k: "offline", b: 0.30 * l }]),
  c("shark", "Goblin Shark", "legendary", "🦈", "Older than trees.", l => [{ k: "tap", b: 0.5 * l }, { k: "all", b: 0.10 * l }]),
  c("dragon", "Dragonfish", "legendary", "🐲", "Teeth like glass, light like blood.", l => [{ k: "all", b: 0.25 * l }]),
  c("siren", "Siren", "legendary", "🧜", "Boosts every other specimen greatly.", l => [{ k: "prod", b: 0.08 * l }], { scope: "all", val: 0.18 }),
  // ---- mythic (2) ----
  c("kraken", "The Kraken", "mythic", "🐙", "It was here before the water.", l => [{ k: "all", b: 0.4 * l }, { k: "prod", b: 0.2 * l }]),
  c("leviathan", "Leviathan", "mythic", "🐉", "The deep itself, awake.", l => [{ k: "all", b: 0.3 * l }], { scope: "adj", val: 0.5 })
];
DATA.cards.forEach(c => DATA.cardMap[c.id] = c);

function c(id, name, rarity, glyph, flavor, parts, syn) {
  const o = { id, name, rarity, glyph, flavor };
  if (parts) o.parts = parts;
  if (syn) o.syn = syn;
  return o;
}

DATA.rarityColor = {
  common: "#9be7a6", uncommon: "#6fb8ff", rare: "#c08bff",
  epic: "#ff8ad0", legendary: "#ffd86b", mythic: "#ff5c6a"
};
DATA.rarityOrder = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

// ----------------------------------------------------------------- ACHIEVEMENTS
DATA.achievements = [
  a("first_tap", "First Light", "Tap once.", G => G.stats.taps >= 1, { glimmer: 2 }),
  a("taps_500", "Busy Hands", "Tap 500 times.", G => G.stats.taps >= 500, { glimmer: 10 }),
  a("first_ebb", "Turning Tide", "Ebb for the first time.", G => (G.prestiges.ebb || 0) >= 1, { glimmer: 8 }),
  a("ebb_25", "Rhythm of the Sea", "Ebb 25 times.", G => (G.prestiges.ebb || 0) >= 25, { glimmer: 20, slot: 1 }),
  a("plankton_100", "Bloom", "Own 100 Plankton.", G => (G.prod.plankton || 0) >= 100, { glimmer: 12 }),
  a("tide_10", "Rising", "Reach Tide 10.", G => (G.maxLadder.tide || 0) >= 10, { glimmer: 10 }),
  a("tide_25", "High Water", "Reach Tide 25.", G => (G.maxLadder.tide || 0) >= 25, { glimmer: 25 }),
  a("first_descend", "The Plunge", "Descend for the first time.", G => (G.prestiges.descend || 0) >= 1, { glimmer: 30, slot: 1 }),
  a("first_card", "Collector", "Find your first specimen.", G => Object.keys(G.cards).length >= 1, { glimmer: 5 }),
  a("cards_10", "Curator", "Collect 10 specimens.", G => Object.keys(G.cards).length >= 10, { glimmer: 25, slot: 1 }),
  a("cards_25", "Naturalist", "Collect 25 specimens.", G => Object.keys(G.cards).length >= 25, { glimmer: 50, slot: 1 }),
  a("cards_all", "Reliquary Complete", "Collect every specimen.", G => Object.keys(G.cards).length >= DATA.cards.length, { glimmer: 200, slot: 1 }),
  a("loadout_full", "Geared", "Fill every loadout slot.", G => { const s = G.presets[G.preset]; let n = 0; for (let i = 0; i < G.slots; i++) if (s[i]) n++; return n >= G.slots && G.slots >= 5; }, { glimmer: 20 }),
  a("zone_2", "Into the Black", "Reach the Midnight Zone.", G => G.maxZone >= 2, { glimmer: 40 }),
  a("amber_100", "Fossil Hunter", "Hold 100 Amber.", G => (G.res.amber || 0) >= 100, { glimmer: 20 }),
  a("pressure_2", "Crushing", "Reach Pressure 2.", G => G.pressure >= 2, { glimmer: 30 }),
  a("legendary", "Legend", "Own a Legendary specimen.", G => DATA.cards.some(c => c.rarity === "legendary" && G.cards[c.id]), { glimmer: 40 }),
  a("mythic", "Myth", "Own a Mythic specimen.", G => DATA.cards.some(c => c.rarity === "mythic" && G.cards[c.id]), { glimmer: 100, slot: 1 })
];
function a(id, name, desc, cond, reward) {
  return { id, name, desc, cond, glimmer: (reward && reward.glimmer) || 0, slot: (reward && reward.slot) || 0,
           apply: null };
}

if (typeof module !== "undefined" && module.exports) module.exports = DATA;
