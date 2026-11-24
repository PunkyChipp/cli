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
  if (!inGarden() && !inGh()) return print("You need to be in the {cmd:cd ~/garden} (or the greenhouse) to plant things. Seeds don't take to carpet.");
  const seeds = Object.keys(S.inv).filter(k => k.startsWith("seed:")).map(k => k.slice(5));
  let crop = (args[0] || "").toLowerCase().replace(/s$/, "").replace(/^seed:/, "");
  if (crop === "carrots") crop = "carrot";
  if (!crop) {
    if (!seeds.length) return print("You haven't got any seeds. {dim:(check the shed. check it thoroughly.)}");
    if (seeds.length === 1) crop = seeds[0];
    else return print("Plant what? You've got: " + seedList());
  }
  if (!CROPS[crop]) { const g = closest(crop, Object.keys(CROPS)); return print("There's no such thing as " + esc(crop) + " seeds." + (g ? " {dim:(did you mean {cmd:plant " + g + "}?)}" : "")); }
  if (!has("seed:" + crop)) return print("You're out of " + crop + " seeds." + (seeds.length ? " You have: " + seedList() : ""));
  const gh = inGh();
  if (CROPS[crop].gh && !gh) return print("Moonflowers only grow in the greenhouse. They need the warm and the dark. {dim:(Wren's note in there says so too.)}");
  const beds = gh ? S.gh : S.plots;
  let i = args[1] ? parseInt(String(args[1]).replace(/\D/g, ""), 10) - 1 : beds.findIndex(p => !p.crop);
  if (isNaN(i) || i < 0 || i >= beds.length) i = beds.findIndex(p => !p.crop);
  if (i < 0) return print("Every " + (gh ? "pot" : "bed") + " is full. {dim:(harvest something first.)}");
  if (beds[i].crop) return print((gh ? "Pot " : "Plot ") + (i + 1) + " already has " + beds[i].crop + " in it.");
  take("seed:" + crop);
  beds[i] = { crop, age: 0, wet: gh || weatherNow().rain > 0 };
  spend(6); sfx("dig");
  print(pick([
    "You make a little hole with your finger, drop the " + crop + " seed in, and pat it down like you're tucking it in.",
    "In goes the " + crop + ". You tell it, quietly, that it's going to do great.",
    "You plant the " + crop + " in " + (gh ? "pot " : "plot ") + (i + 1) + ". A worm surfaces, assesses your work, and leaves."
  ]));
  if (!gh && !beds[i].wet) print("{dim:(it'll want some {cmd:water} before tonight.)}");
  if (!S.flags.planted) { S.flags.planted = true; keepsake("first_plant"); }
  remember("planted " + crop + ".");
}

function doWater() {
  if (inGh()) return print("The mister hisses at you. It's got this. {dim:(the greenhouse waters itself.)}");
  if (!inGarden()) return print("Nothing to water in here, unless you count Biscuit, and you shouldn't.");
  const thirsty = S.plots.filter(p => p.crop && !p.wet);
  if (weatherNow().rain) { S.plots.forEach(p => (p.wet = true)); return print("It's raining. The sky's doing it for you. You stand there holding the watering can anyway, feeling supportive."); }
  if (!S.plots.some(p => p.crop)) return print("You water the empty beds. The soil appreciates the thought.");
  if (!thirsty.length) return print("Everything's already watered. You give the mint an extra splash. It didn't need it. It's mint.");
  S.plots.forEach(p => { if (p.crop) p.wet = true; });
  spend(8); sfx("water");
  print("You fill the green can at the butt and go along the beds. The soil goes dark and smells like rain. " + pick(["A blackbird follows you, hoping.", "You water a snail by accident. It doesn't seem to mind.", "Biscuit watches from a dry spot, deeply unimpressed by water."]));
  remember("watered the garden.");
}

function doHarvest() {
  const gh = inGh();
  if (!inGarden() && !gh) return print("Nothing to harvest here. {dim:(the garden's that way: {cmd:cd ~/garden})}");
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
  if (!got.length) return print(closedBud ? "The moonflower's still a tight little bud. It only opens after dark. {dim:(come back tonight.)}" : "Nothing's ready yet. {dim:(things grow overnight — {cmd:garden} shows how long.)}");
  spend(10); sfx("dig");
  print("You harvest: {ok:" + got.join(", ") + "}.");
  if (got.some(g => g.includes("moonflower"))) print("{dim:The moonflower glows faintly in your hand, a pale blue-gold, like it's remembering the moon.}");
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
