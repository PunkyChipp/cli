/* =====================================================================
   08-garden.js — six raised beds and three pots in the greenhouse.
   Plants grow overnight if they had water that day. Rain counts.
   Nothing ever dies. (Wren's garden, Wren's rules.)
   ===================================================================== */
"use strict";

const CROPS = {
  mint:       { days: 2, yield: 2, regrow: true,  art: ["%%%%%", "%%|%%"], col: "ok",   note: "comes back after you pick it" },
  carrot:     { days: 3, yield: 2,                art: [" \\|/ ", "  V  "], col: "acc",  note: "sulky but worth it" },
  chamomile:  { days: 3, yield: 2,                art: ["o o o", " \\|/ "], col: "hi",   note: "little daisies that smell like hay" },
  lavender:   { days: 4, yield: 3,                art: ["i i i", " |||" + " "], col: "sky", note: "bees go mad for it" },
  pumpkin:    { days: 5, yield: 1,                art: [" _|_ ", "(___)"], col: "acc",  note: "for lanterns, and pie" },
  moonflower: { days: 3, yield: 1, gh: true,      art: [" (*) ", "  |  "], col: "hi",   note: "greenhouse only. blooms at night." }
};

function stageOf(p) {
  if (!p.crop) return -1;
  const c = CROPS[p.crop];
  if (p.age >= c.days) return 3;
  if (p.age === 0) return 0;
  return p.age >= c.days - 1 ? 2 : 1;
}
const ready = p => p.crop && p.age >= CROPS[p.crop].days;

function plotArt(p, gh) {
  const s = stageOf(p);
  const soil = gh ? "[___]" : "~~~~~";
  if (s === -1) return ["     ", "     ", "{dim:" + soil + "}"];
  if (s === 0) return ["     ", "{dim:  .  }", "{dim:" + soil + "}"];
  if (s === 1) return ["     ", "{ok:  ,  }", "{dim:" + soil + "}"];
  if (s === 2) return ["{ok:  ,  }", "{ok: \\|/ }", "{dim:" + soil + "}"];
  const c = CROPS[p.crop];
  let art = c.art;
  if (p.crop === "moonflower" && !isNight()) art = ["  ^  ", "  |  "];
  return ["{" + c.col + ":" + esc(art[0]) + "}", "{ok:" + esc(art[1]) + "}", "{dim:" + soil + "}"];
}

function plotText(p, n, gh) {
  const where = gh ? "pot" : "plot";
  if (!p.crop) return "{dim:" + where + " " + n + ": empty soil, dark and crumbly. ready for something.}\n{cmd:plant mint}";
  const c = CROPS[p.crop];
  const left = Math.max(0, c.days - p.age);
  const art = plotArt(p, gh).join("\n");
  return art + "\n\n" + where + " " + n + ": {hi:" + p.crop + "} — " + (ready(p) ? (p.crop === "moonflower" && !isNight() ? "{acc:a closed bud. it'll open after dark.}" : "{ok:ready to harvest!} {cmd:harvest}") : "about " + plural(left, "more night") + " to go.") +
    (gh ? "" : "\n" + (p.wet || weatherNow().rain ? "{sky:the soil's damp.}" : "{warn:looks thirsty.} {cmd:water}"));
}

/** The pretty overview. */
function gardenView(gh) {
  const beds = gh ? S.gh : S.plots;
  const arts = beds.map(p => plotArt(p, gh));
  const lines = [];
  for (let r = 0; r < 3; r++) lines.push("  " + arts.map(a => a[r]).join("   "));
  lines.push("  " + beds.map((p, i) => "{dim:" + pad((gh ? "pot" : "plot") + (i + 1), 5) + "}").join("   "));
  lines.push("");
  beds.forEach((p, i) => {
    if (!p.crop) return;
    const c = CROPS[p.crop];
    const st = ready(p) ? (p.crop === "moonflower" && !isNight() ? "{acc:bud (opens at night)}" : "{ok:ready!}") : "{dim:" + plural(c.days - p.age, "night") + " to go}";
    const wet = gh ? "" : p.wet || weatherNow().rain ? " {sky:~ watered}" : " {warn:~ thirsty}";
    lines.push("  " + (gh ? "pot " : "plot ") + (i + 1) + ": {hi:" + pad(p.crop, 10) + "} " + st + wet);
  });
  if (beds.every(p => !p.crop)) lines.push("  {dim:all empty. seeds in your pockets: }" + seedList());
  return lines;
}
function seedList() {
  const s = Object.keys(S.inv).filter(k => k.startsWith("seed:")).map(k => "{cmd:plant " + k.slice(5) + "} {dim:x" + S.inv[k] + "}");
  return s.length ? s.join("  ") : "{dim:none. people send seeds; and the shed hides some.}";
}

function inGarden() { return roomName() === "garden"; }
function inGh() { return roomName() === "greenhouse"; }

function doPlant(args) {
  if (!inGarden() && !inGh()) return print("You'll need to be out in the {cmd:cd garden} to plant anything, or in the greenhouse.");
  const seeds = Object.keys(S.inv).filter(k => k.startsWith("seed:")).map(k => k.slice(5));
  let crop = (args[0] || "").toLowerCase().replace(/s$/, "").replace(/^seed:/, "");
  if (crop === "carrots") crop = "carrot";
  if (!crop) {
    if (!seeds.length) return print("You haven't got any seeds left. {dim:there might be some in the shed, if you look properly.}");
    if (seeds.length === 1) crop = seeds[0];
    else return print("Plant what? You've got: " + seedList());
  }
  if (!CROPS[crop]) { const g = closest(crop, Object.keys(CROPS)); return print("There's no such thing as " + esc(crop) + " seeds." + (g ? " {dim:did you mean {cmd:plant " + g + "}?}" : "")); }
  if (!has("seed:" + crop)) return print("You're out of " + crop + " seeds." + (seeds.length ? " You have: " + seedList() : ""));
  const gh = inGh();
  if (CROPS[crop].gh && !gh) return print("Moonflowers won't grow out here. According to Wren they need the warmth of the greenhouse.");
  const beds = gh ? S.gh : S.plots;
  let i = args[1] ? parseInt(String(args[1]).replace(/\D/g, ""), 10) - 1 : beds.findIndex(p => !p.crop);
  if (isNaN(i) || i < 0 || i >= beds.length) i = beds.findIndex(p => !p.crop);
  if (i < 0) return print("Every " + (gh ? "pot" : "bed") + " has something in it already. You'll have to harvest something first.");
  if (beds[i].crop) return print((gh ? "Pot " : "Plot ") + (i + 1) + " already has " + beds[i].crop + " in it.");
  take("seed:" + crop);
  beds[i] = { crop, age: 0, wet: gh || weatherNow().rain > 0 };
  spend(6); sfx("dig");
  print(pick([
    "You make a hole with your finger, drop the " + crop + " seed in and press the soil back over it.",
    "You plant the " + crop + " in " + (gh ? "pot " : "plot ") + (i + 1) + " and pat the soil down with the flat of your hand.",
    "You plant the " + crop + ". A worm comes up to see what's going on and then goes back down again."
  ]));
  if (!gh && !beds[i].wet) print("{dim:It could do with some {cmd:water} before tonight.}");
  if (!S.flags.planted) { S.flags.planted = true; keepsake("first_plant"); }
  remember("planted " + crop + ".");
}

function doWater() {
  if (inGh()) return print("You don't need to water in here. The mister on the ceiling does it every few minutes.");
  if (!inGarden()) return print("There's nothing to water in here. The beds are out in the garden.");
  const thirsty = S.plots.filter(p => p.crop && !p.wet);
  if (weatherNow().rain) { S.plots.forEach(p => (p.wet = true)); return print("It's raining, so the beds are getting watered anyway."); }
  if (!S.plots.some(p => p.crop)) return print("There's nothing planted yet, so there's nothing to water.");
  if (!thirsty.length) return print("You've already watered everything today.");
  S.plots.forEach(p => { if (p.crop) p.wet = true; });
  spend(8); sfx("water");
  print("You fill the watering can from the water butt by the shed and go along the beds." + pick(["", " A blackbird follows you from bed to bed, hoping you'll turn up a worm.", " You accidentally water a snail, which doesn't seem to mind."]));
  remember("watered the garden.");
}

function doHarvest() {
  const gh = inGh();
  if (!inGarden() && !gh) return print("There's nothing to harvest in here. {dim:{cmd:cd garden}}");
  const beds = gh ? S.gh : S.plots;
  const got = [];
  let closedBud = false;
  beds.forEach((p, i) => {
    if (!ready(p)) return;
    if (p.crop === "moonflower" && !isNight()) { closedBud = true; return; }
    const c = CROPS[p.crop];
    give(p.crop, c.yield); got.push(itemName(p.crop, c.yield));
    if (p.crop === "moonflower" && chance(0.6)) { give("seed:moonflower"); got.push("a moonflower seed"); }
    S.stats.harvests++;
    if (c.regrow) beds[i] = { crop: p.crop, age: 0, wet: p.wet };
    else beds[i] = { crop: null, age: 0, wet: false };
  });
  if (!got.length) return print(closedBud ? "The moonflower is still shut tight. It only opens after dark, so you'll have to come back tonight." : "Nothing's ready yet. Plants grow overnight, and {cmd:garden} will tell you how long each one has left.");
  spend(10); sfx("dig");
  print("You pick " + got.join(", ") + " and put " + (got.length > 1 ? "them" : "it") + " in your coat pocket.");
  if (got.some(g => g.includes("moonflower"))) print("{dim:The moonflower keeps glowing after you've picked it, a faint blue-gold, enough to see your fingers by.}");
  keepsake("first_harv");
  remember("harvested " + got.join(", ") + ".");
}

/** Overnight growth. Returns a little summary for the morning. */
function growGarden() {
  const yesterday = weatherFor(S.day - 1);
  const winterSlow = S.day - 1 > SEASON_END && (S.day % 2 === 0);
  const notes = [];
  S.plots.forEach(p => {
    if (!p.crop) return;
    const was = ready(p);
    if ((p.wet || yesterday.rain) && !winterSlow) p.age++;
    else if (!p.wet && !yesterday.rain) notes.push("dry");
    p.wet = false;
    if (!was && ready(p)) notes.push(p.crop);
  });
  S.gh.forEach(p => { if (!p.crop) return; const was = ready(p); p.age++; if (!was && ready(p)) notes.push(p.crop); });
  S.flags.overnight = notes;
}
