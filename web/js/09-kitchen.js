/* =====================================================================
   09-kitchen.js — tea, food, the stove, the cat's dinner, and all the
   things you can carry around in your pockets.
   ===================================================================== */
"use strict";

const ITEMS = {
  mint: ["mint", "sprigs of mint"], carrot: ["carrot", "carrots"], chamomile: ["chamomile", "bunches of chamomile"],
  lavender: ["lavender", "sprigs of lavender"], pumpkin: ["pumpkin", "pumpkins"], moonflower: ["moonflower", "moonflowers"],
  honey: ["jar of honey", "jars of honey"], jam: ["jar of jam", "jars of jam"], candle: ["beeswax candle", "beeswax candles"],
  matches: ["box of matches", "boxes of matches"], lamp: ["oil lamp", "oil lamps"], oilcan: ["oilcan", "oilcans"],
  rod: ["fishing rod", "fishing rods"], umbrella: ["duck umbrella", "duck umbrellas"], wick: ["lantern wick", "lantern wicks"],
  key: ["little brass key", "little brass keys"], starchart: ["star chart (1962)", "star charts"], bracelet: ["orange friendship bracelet", "friendship bracelets"],
  sandwich: ["sandwich", "sandwiches"],
  carrot_soup: ["flask of carrot soup", "flasks of carrot soup"], fish_pie: ["fish pie", "fish pies"], jam_toast: ["jam on toast", "rounds of jam on toast"],
  pumpkin_pie: ["pumpkin pie", "pumpkin pies"], honey_cake: ["honey cake", "honey cakes"], mint_biscuits: ["tin of mint biscuits", "tins of mint biscuits"],
  "junk:boot": ["old boot", "old boots"], "junk:bottle": ["message in a bottle", "messages in bottles"], "junk:can": ["rusty tin can", "rusty tin cans"]
};
function itemName(k, n = 1) {
  if (k.startsWith("seed:")) return (n === 1 ? "a " : n + " ") + k.slice(5) + " seed" + (n === 1 ? "" : "s");
  if (k.startsWith("disk:")) return k.slice(5) + ".dsk";
  if (k.startsWith("fish:")) return (n === 1 ? "a " : n + " ") + k.slice(5);
  if (k.startsWith("file:")) return "your note '" + k.slice(k.lastIndexOf("/") + 1) + "'";
  const e = ITEMS[k];
  if (!e) return (n === 1 ? "" : n + " ") + k.replace(/_/g, " ");
  return n === 1 ? (/^[aeiou]/.test(e[0]) ? "an " : "a ") + e[0] : n + " " + e[1];
}
/** Turn whatever the player typed into an inventory key ("trout" -> "fish:trout"). */
function itemKey(word) {
  if (!word) return null;
  let w = word.toLowerCase().replace(/^(a|an|the|some)\s+/, "").trim().replace(/\s+/g, "_");
  const tries = [w, w.replace(/s$/, ""), w.replace(/es$/, ""), "fish:" + w, "fish:" + w.replace(/s$/, ""), "junk:" + w, "junk:" + w.replace(/s$/, ""), "seed:" + w.replace(/_?seeds?$/, ""), "disk:" + w.replace(/\.dsk$/, "")];
  for (const t of tries) if (S.inv[t]) return t;
  for (const k of Object.keys(S.inv)) if (itemName(k).toLowerCase().includes(w.replace(/_/g, " "))) return k;
  return null;
}

/* ---------- recipes ---------- */
const RECIPES = {
  carrot_soup:   { name: "carrot soup",   needs: { carrot: 2 }, warm: 25, card: "CARROT SOUP\n  2 carrots, 1 onion (pantry), butter, a bay leaf if you're fancy.\n  soften the onion. add carrots. add water. wait. blend. done.\n  {dim:\"tastes like a hug from someone who means it.\" — W.}", eat: "You eat the soup slowly, with bread, both hands around the bowl. It tastes like being looked after." },
  fish_pie:      { name: "fish pie",      needs: { "fish:*": 1, carrot: 1 }, warm: 30, card: "FISH PIE\n  1 fish (any. not the boot.), 1 carrot, mashed potato (pantry),\n  a suspicious amount of butter.\n  {dim:\"Fenn's favourite. he'll say it isn't.\" — W.}", eat: "Fish pie, crispy on top, molten in the middle. You burn your tongue and don't regret it." },
  jam_toast:     { name: "jam on toast",  needs: { jam: 1 }, warm: 10, card: "JAM ON TOAST\n  this is not a recipe. this is a lifestyle.\n  toast. butter. jam. eat over the sink like a person with things to do.", eat: "Jam on toast over the sink. A crumb lands on Biscuit. She takes it as a personal insult." },
  pumpkin_pie:   { name: "pumpkin pie",   needs: { pumpkin: 1 }, warm: 25, card: "PUMPKIN PIE  {dim:(Ottoline's copy. she does the crust wrong.)}\n  1 pumpkin, eggs, sugar, the spice tin, pastry (pantry).\n  roast, mash, mix, bake, try not to open the oven every two minutes.", eat: "Pumpkin pie with too much cinnamon, which is the correct amount of cinnamon." },
  honey_cake:    { name: "honey cake",    needs: { honey: 1 }, warm: 20, card: "HONEY CAKE  {dim:(stolen from Fenn's mother, 1979)}\n  1 jar of honey, butter, flour, eggs, a long time in a low oven.\n  {dim:\"don't tell Abernathy.\"}", eat: "Honey cake, sticky and dark and tasting faintly of lavender. Fenn's bees did good work." },
  mint_biscuits: { name: "mint biscuits", needs: { mint: 2 }, warm: 15, card: "MINT BISCUITS\n  2 sprigs mint, butter, sugar, flour. roll, cut, bake.\n  {dim:\"don't say the word biscuits out loud near the cat.\"}", eat: "A mint biscuit. Biscuit hears the word 'biscuit' and looks up, then looks deeply betrayed." }
};
function recipeCard(id) { return "{hi:" + RECIPES[id].card.split("\n")[0] + "}\n" + RECIPES[id].card.split("\n").slice(1).join("\n"); }
function learn(id) {
  if (S.recipes[id]) return;
  S.recipes[id] = true;
  setTimeout(() => { print("{ok:(you learned a recipe: " + RECIPES[id].name + " — {cmd:cook " + id.replace(/_/g, " ") + "})}"); }, 0);
}
function canMake(id) {
  for (const [k, n] of Object.entries(RECIPES[id].needs)) {
    if (k === "fish:*") { if (!Object.keys(S.inv).some(x => x.startsWith("fish:"))) return false; }
    else if (!has(k, n)) return false;
  }
  return true;
}
function needsText(id) {
  return Object.entries(RECIPES[id].needs).map(([k, n]) => (k === "fish:*" ? "any fish" : itemName(k, n))).join(" + ");
}

function doCook(args) {
  if (roomName() !== "kitchen") return print("The stove's in the kitchen. {cmd:cd ~/kitchen}");
  const known = Object.keys(RECIPES).filter(r => S.recipes[r]);
  const want = args.join("_").toLowerCase().replace(/s$/, "");
  if (!want) {
    if (!known.length) return print("You don't know any recipes yet. {dim:(the recipe cards are in {cmd:ls recipes}. read one with {cmd:cat}.)}");
    print("{hi:You know how to make:}");
    for (const r of known) print("  " + (canMake(r) ? "{ok:✓}" : "{dim:·}") + " {cmd:cook " + r.replace(/_/g, " ") + "}  {dim:— " + needsText(r) + "}");
    return;
  }
  const id = Object.keys(RECIPES).find(r => r === want || r === want + "s" || RECIPES[r].name.replace(/ /g, "_") === want || r.startsWith(want));
  if (!id) return print("You don't know how to make that. {dim:(yet.)}");
  if (!S.recipes[id]) return print("You'd need the recipe for that first. Wren's recipes are on cards — {cmd:ls recipes}.");
  if (!canMake(id)) return print("You need " + needsText(id) + " for " + RECIPES[id].name + ".");
  for (const [k, n] of Object.entries(RECIPES[id].needs)) {
    if (k === "fish:*") take(Object.keys(S.inv).find(x => x.startsWith("fish:")));
    else take(k, n);
  }
  give(id);
  spend(40); S.stats.meals++;
  sfx("pour");
  print(pick([
    "You cook. The kitchen windows steam up. The radio would be nice right now.",
    "You cook, humming something you didn't know you knew. The whole cottage starts to smell of it.",
    "You cook, making a terrible mess and then a lovely meal, in that order."
  ]));
  print("{ok:(made " + itemName(id) + ". {cmd:eat " + id.replace(/_/g, " ") + "}, or {cmd:send} it to someone.)}");
  if (S.stats.meals >= 5) keepsake("baker");
  remember("made " + RECIPES[id].name + ".");
}

function doEat(args) {
  const k = itemKey(args.join(" "));
  if (!k) {
    const foods = Object.keys(S.inv).filter(x => RECIPES[x] || x === "honey" || x === "carrot" || x === "jam" || x === "sandwich" || x === "mint");
    return print(foods.length ? "Eat what? You've got: " + foods.map(f => "{cmd:eat " + f.replace(/_/g, " ") + "}").join("  ") : "You've nothing to eat on you. {dim:(cook something: {cmd:cook})}");
  }
  if (k.startsWith("fish:")) return print("Raw? No. {dim:(cook it into a fish pie, or give it to Biscuit.)}");
  if (k.startsWith("junk:") || k.startsWith("disk:") || k.startsWith("seed:") || ["lamp", "matches", "oilcan", "rod", "umbrella", "wick", "candle", "starchart", "bracelet", "key", "moonflower", "lavender", "pumpkin", "chamomile"].includes(k)) return print(pick(["You consider it. You decide against it.", "That's not food. You know that's not food.", "Biscuit watches to see if you'll really do it. You don't."]));
  take(k);
  const r = RECIPES[k];
  if (r) { print(r.eat); warm(r.warm, "warmer"); }
  else if (k === "honey") { print("You eat honey straight from the jar with a teaspoon. You feel eight years old in the best way."); warm(8, "warmer"); }
  else if (k === "jam") { print("Jam from the jar with a spoon. Nobody saw. (Biscuit saw.)"); warm(6, "warmer"); }
  else if (k === "carrot") { print("You crunch a raw carrot like a horse. A good horse."); warm(3); }
  else if (k === "mint") { print("You chew a mint leaf. Your whole head goes cold and fresh."); }
  else if (k === "sandwich") { print("The sudo sandwich. It tastes of power. And cheese."); warm(10, "warmer"); }
  spend(10); S.stats.meals++;
  remember("ate " + itemName(k) + ".");
}

/* ---------- tea ---------- */
const TEAS = {
  black: { need: null, line: "Strong, brown, a splash of milk. Tea the way tea was meant to be: without fuss.", warm: 12 },
  mint: { need: "mint", line: "Fresh mint tea, bright and green. It clears your head right out.", warm: 12 },
  chamomile: { need: "chamomile", line: "Chamomile, gold in the cup, smelling of hay and summer. Your shoulders drop an inch.", warm: 15 },
  lavender: { need: "lavender", line: "Lavender tea, faintly purple. It tastes a bit like soap and a lot like calm.", warm: 14 },
  honey: { need: "honey", line: "Tea with a big spoon of Fenn's honey. Sweet, golden, a little bit smug.", warm: 18 }
};
async function doBrew(args) {
  if (roomName() !== "kitchen") return print("The kettle's in the kitchen. {cmd:cd ~/kitchen} {dim:(or {cmd:cd /cottage/kitchen}, if you like typing.)}");
  let kind = (args[0] || "black").toLowerCase();
  if (kind === "tea") kind = args[1] || "black";
  if (["builders", "english", "normal", "regular", "plain", "breakfast"].includes(kind)) kind = "black";
  if (!TEAS[kind]) return print("You haven't got " + esc(kind) + " tea. You can brew: " + Object.keys(TEAS).map(t => "{cmd:brew " + t + "}").join("  "));
  const t = TEAS[kind];
  if (t.need && !has(t.need)) return print("You'd need some " + t.need + " for that." + (kind === "honey" ? " {dim:(Fenn has bees. Fenn has opinions about lavender.)}" : " {dim:(grow some in the garden.)}"));
  if (S.stats.teas > 0 && !S.flags.thumped && chance(0.25)) {
    S.flags.kettleSulk = true;
    return print("You switch the kettle on. Nothing. It sits there, cold and silent, sulking about something.\n{dim:(Wren said something about the left side... {cmd:thump kettle})}");
  }
  S.flags.thumped = false; S.flags.kettleSulk = false;
  if (t.need) take(t.need);
  print("You fill the kettle and set it on the range.");
  sfx("kettle");
  await pause(700); print("{dim:...}"); await pause(700);
  print("{dim:it starts to tick and grumble...}"); await pause(900);
  print("{acc:...and whistles!}");
  await pause(400);
  sfx("pour");
  print(t.line);
  S.teaAt = now(); S.teaKind = kind; S.stats.teas++;
  spend(6);
  warm(t.warm, "warmer");
  if (kind === "chamomile" && S.min > 20 * 60) print("{dim:(you could sleep right now, honestly.)}");
  if (catHere()) print("{dim:Biscuit watches the steam rise. She does not want tea. She wants to be asked.}");
  keepsake("first_tea");
  remember(pick(["had a cup of " + kind + " tea.", "made " + kind + " tea. drank it at the window."]));
}
function doThump(args) {
  if (roomName() !== "kitchen") return print("Thump what? {dim:(there's nothing in here that deserves it.)}");
  const side = (args[1] || args[0] || "").toLowerCase();
  if (side.includes("right")) { print("You thump the kettle on the {warn:right} side. It goes very still. You've hurt its feelings.\n{dim:(...it'll boil. but it'll remember.)}"); S.flags.thumped = true; return; }
  print("{hi:THUNK.} You give the kettle a firm thump on the left side. It wakes with a gurgle, like nothing happened.\n{dim:(now {cmd:brew}.)}");
  S.flags.thumped = true; sfx("chop");
}

/* ---------- the cat ---------- */
function catMood(n) { S.cat.mood = clamp(S.cat.mood + n, 0, 100); }
function doFeed(args) {
  const who = (args[0] || "").toLowerCase();
  if (who === "fox" || who === (S.fox || "").toLowerCase()) return feedFox(args.slice(1));
  if (who && !["biscuit", "cat", "the"].includes(who)) return print("Feed " + esc(who) + "? It's not hungry. Or not here. Or not real.");
  const rest = args.slice(who === "the" ? 2 : 1);
  const fishKey = itemKey(rest.join(" ")) || (rest.length ? null : null);
  const giveFish = fishKey && fishKey.startsWith("fish:");
  if (roomName() !== "kitchen" && !catHere()) return print("Biscuit's not here — she's in the " + S.cat.room + ". {dim:(or go to the kitchen and rattle the tin; she'll come.)}");
  if (!catHere()) { S.cat.room = roomName(); print("You rattle the food tin. From somewhere in the house: a thump, a skitter, and then Biscuit arrives at speed, as if summoned by the gods."); }
  if (giveFish) {
    take(fishKey);
    catMood(30);
    print("You give Biscuit " + itemName(fishKey) + ". She looks at you like you have finally, after all this time, understood her.\n{acc:prrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.}");
    sfx("purr");
    remember("gave Biscuit a fish. she might love me now.");
    S.flags.fedOnce = true;
    return;
  }
  if (S.cat.fed >= 2) {
    catMood(-2);
    return print(pick(["Biscuit has had breakfast and dinner. She is looking at you like she hasn't. She has.", "You've fed her twice today. She's lying. Look at her lying.", "No. She's had two meals. Biscuit sighs the sigh of a cat in a famine."]));
  }
  S.cat.fed++; S.flags.fedOnce = true;
  catMood(12);
  spend(3);
  print(pick([
    "You fill Biscuit's bowl. She eats with the focus of a surgeon, then looks at you like you've never fed her in her life.",
    "You put food down. Biscuit inspects it, decides it'll do, and eats it with tremendous dignity.",
    "Biscuit's bowl: full. Biscuit's face: in it. Biscuit's opinion of you: improving."
  ]));
  if (S.cat.fed === 1) remember("fed Biscuit. she said she hadn't been fed. she had.");
}
function feedFox(rest) {
  if (roomName() !== "garden" || !(isNight() || isEvening())) return print("The fox isn't around. She comes to the garden in the evenings.");
  const k = itemKey(rest.join(" ")) || Object.keys(S.inv).find(x => x.startsWith("fish:") || x === "jam_toast" || x === "carrot");
  if (!k) return print("You've nothing a fox would want. {dim:(foxes like fish. and toast, apparently.)}");
  take(k);
  befriendFox();
  print("You put " + itemName(k) + " down at the edge of the grass and step back. The fox" + (S.fox ? ", " + S.fox + "," : "") + " waits a polite amount of time, then trots over and takes it, and looks at you for one long second before going.");
  remember("fed the fox" + (S.fox ? " (" + S.fox + ")" : "") + ".");
}
function befriendFox() { S.flags.foxFed = (S.flags.foxFed || 0) + 1; }

function doPet(args) {
  const who = (args[0] || "biscuit").toLowerCase();
  if (who === "fox" || who === (S.fox || "").toLowerCase()) return print(S.flags.foxFed >= 3 ? "The fox lets you get close — very close — and then sneezes at you and leaves. That's basically a hug, from a fox." : "The fox steps back exactly as far as you step forward. Not yet.");
  if (!["biscuit", "cat", "the"].includes(who)) return print("You pet the " + esc(who) + ". It doesn't do much for either of you.");
  if (!catHere()) return print("Biscuit isn't here. She's in the " + S.cat.room + ". {dim:({cmd:where biscuit})}");
  const belly = args.join(" ").includes("belly") || args.join(" ").includes("tummy");
  S.stats.pets++; S.cat.petsToday++;
  spend(2);
  if (belly) { catMood(-6); sfx("bonk"); return print("You go for the belly. {warn:IT'S A TRAP.} Four sets of claws, a bunny-kick, and an expression of deep betrayal. You knew. You knew it was a trap."); }
  if (S.cat.petsToday > 6) { catMood(-1); return print(pick(["Biscuit has had enough affection for one day. She moves exactly one inch out of reach.", "Biscuit gives you a look that says 'we've discussed this'."])); }
  catMood(6);
  warm(3);
  sfx("purr");
  const m = S.cat.mood;
  print(m > 80 ? pick(["Biscuit leans her whole head into your hand and purrs so loudly the desk vibrates.", "Biscuit flops over, purring, and slow-blinks at you. That's cat for 'I love you'. You slow-blink back.", "Biscuit headbutts your chin. You've been chosen."])
    : m > 50 ? pick(["You scratch behind Biscuit's ears. A small, rusty purr starts up.", "Biscuit allows this. She purrs, quietly, like she's not sure she should.", "You stroke Biscuit from head to tail. She arches. Approval, cautiously granted."])
      : pick(["Biscuit tolerates one stroke, then gets up and sits somewhere else.", "Biscuit looks at your hand, then at you. You withdraw your hand.", "Biscuit permits a single pat. It is clearly a favour."]));
  if (S.stats.pets === 10) keepsake("pet10");
  if (m > 75 && !S.flags.gotKey && S.stats.pets >= 8 && S.day >= 3 && !S.flags.keyHinted) { S.flags.keyHinted = true; print("{dim:(she turns her head and the little brass key on her collar glints. she's letting you see it. {cmd:take key})}"); }
  if (S.cat.petsToday === 1) remember("petted Biscuit. she purred. (she purred!)");
}

/* ---------- fire & warmth ---------- */
function doStoke() {
  if (roomName() !== "parlour") return print("The wood stove's in the parlour. {cmd:cd ~/parlour}");
  if (!S.wood) return print("The wood basket's empty. {dim:(there's a woodpile in the garden — {cmd:chop} some.)}");
  if (!fireLit() && !has("matches")) return print("You've got wood but nothing to light it with. {dim:(matches. every house has a drawer for this.)}");
  S.wood--;
  const was = fireLit();
  S.fireUntil = Math.max(S.fireUntil, now()) + 180;
  if (S.fireUntil - now() > 360) S.fireUntil = now() + 360;
  spend(5); sfx("crackle"); sfx("crackle");
  print(was ? "You open the stove door, feed it another log, and it roars a little, pleased." : "You build a little nest of kindling, strike a match, and wait. A curl of smoke. A crackle. Then it catches, and the whole room changes colour.");
  warm(10, "much warmer");
  if (S.cat.room !== "parlour" && chance(0.6)) { S.cat.room = "parlour"; print("{dim:(within a minute, Biscuit appears and arranges herself in front of it. she heard. she always hears.)}"); }
  remember(was ? "kept the fire going." : "lit the stove.");
}
function doChop() {
  if (roomName() !== "garden") return print("The woodpile's out in the garden.");
  if (S.wood >= 8) return print("The basket inside is full. You'd only be chopping for the joy of it. {dim:(which is valid, but no.)}");
  spend(20); sfx("chop"); setTimeout(() => sfx("chop"), 350);
  S.wood = Math.min(8, S.wood + 2);
  warm(4);
  print(pick(["You split two logs. The axe goes in with a crack that echoes off the lake. Chopping wood warms you twice, Wren says. She's right.", "Thock. Thock. Two good logs. A robin watches, judging your form.", "You chop. You miss once, badly, and are glad nobody saw. Two logs."]) + " {dim:(" + plural(S.wood, "log") + " in the basket.)}");
}
function doLight(args) {
  const what = (args[0] || "").toLowerCase();
  if (what === "lamp" || what === "oil_lamp") {
    if (!has("lamp")) return print("You haven't got the lamp. {dim:(it's in the cellar.)}");
    if (S.flags.lampLit) return print("The lamp's already lit, glowing in your hand.");
    if (!has("matches")) return print("You need matches. {dim:(kitchen drawer.)}");
    S.flags.lampLit = true; S.flags.atticLit = true;
    sfx("crackle");
    print("You lift the glass chimney, strike a match, and touch it to the wick. A small flame, then a steady warm light. {ok:The attic won't be dark any more.}");
    remember("found the oil lamp and lit it. it smells like 1970.");
    return;
  }
  if (what === "candle") {
    if (!has("candle")) return print("You haven't got a candle. {dim:(somebody up the hill makes them.)}");
    if (!has("matches")) return print("You need matches.");
    take("candle");
    warm(18, "much warmer");
    print("You light one of Fenn's beeswax candles. It smells like summer, and honey, and slightly like Fenn. The room feels smaller in a good way.");
    remember("lit one of Fenn's candles.");
    return;
  }
  if (what === "fire" || what === "stove") return doStoke();
  if (what === "lantern") return print("That's for Lantern Night. {dim:(on the dock: {cmd:lantern})}");
  print("Light what? {dim:(the {cmd:light lamp}, a {cmd:light candle}, the {cmd:stoke} stove...)}");
}

function jamLeft() { return Math.max(0, 4 - (S.flags.jamTaken || 0)); }

function pocketsText() {
  const keys = Object.keys(S.inv).sort();
  if (!keys.length) return ["Your pockets are empty, apart from fluff."];
  const groups = { "seeds": [], "from the garden": [], "food": [], "fish": [], "things": [], "disks": [] };
  for (const k of keys) {
    const s = "{hi:" + itemName(k, S.inv[k]) + "}";
    if (k.startsWith("seed:")) groups.seeds.push(s);
    else if (k.startsWith("fish:")) groups.fish.push(s);
    else if (k.startsWith("disk:")) groups.disks.push(s);
    else if (CROPS[k]) groups["from the garden"].push(s);
    else if (RECIPES[k] || k === "honey" || k === "jam" || k === "sandwich") groups.food.push(s);
    else groups.things.push(s);
  }
  const out = ["{dim:your pockets (and a basket, and a coat with a lot of pockets):}"];
  for (const [g, list] of Object.entries(groups)) if (list.length) out.push("  {acc:" + pad(g, 16) + "}" + list.join(", "));
  out.push("  {acc:" + pad("logs inside", 16) + "}" + S.wood);
  return out;
}
