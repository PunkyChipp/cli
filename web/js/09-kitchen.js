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
  carrot_soup:   { name: "carrot soup",   needs: { carrot: 2 }, warm: 25, card: "CARROT SOUP\n  2 carrots, 1 onion, butter, a bay leaf.\n  soften the onion. carrots in. water to cover. 25 min. blend.\n  {dim:in pen: J. likes it thin.}", eat: "You have the soup at the kitchen table with a heel of bread, holding the bowl in both hands to warm them." },
  fish_pie:      { name: "fish pie",      needs: { "fish:*": 1, carrot: 1 }, warm: 30, card: "FISH PIE\n  1 fish, any. 1 carrot. mash on top. more butter than you think.\n  {dim:in pen: Fenn's favourite. he'll say it isn't.}", eat: "You burn the roof of your mouth on the first forkful of fish pie, then eat the rest of it anyway, slightly more carefully." },
  jam_toast:     { name: "jam on toast",  needs: { jam: 1 }, warm: 10, card: "JAM ON TOAST\n  {dim:this one's just a card that says TOAST, JAM. it's in a child's writing.}", eat: "You eat jam on toast standing over the sink so you don't have to wash a plate." },
  pumpkin_pie:   { name: "pumpkin pie",   needs: { pumpkin: 1 }, warm: 25, card: "PUMPKIN PIE  {dim:Ottoline's copy}\n  1 pumpkin, roasted. eggs, sugar, spice tin. pastry.\n  45 min. don't keep opening the oven.", eat: "You have a slice of the pumpkin pie. There's probably too much cinnamon in it, but you don't mind." },
  honey_cake:    { name: "honey cake",    needs: { honey: 1 }, warm: 20, card: "HONEY CAKE  {dim:Mrs Fenn's, 1979}\n  1 jar of honey, butter, flour, eggs. low oven, a long time.", eat: "The honey cake is dark and heavy and sticks to your fingers. You end up licking them." },
  mint_biscuits: { name: "mint biscuits", needs: { mint: 2 }, warm: 15, card: "MINT BISCUITS\n  2 sprigs mint, butter, sugar, flour. roll, cut, 12 min.", eat: "You eat a mint biscuit. When you say the word out loud, the cat looks up." }
};
function recipeCard(id) { return "{hi:" + RECIPES[id].card.split("\n")[0] + "}\n" + RECIPES[id].card.split("\n").slice(1).join("\n"); }
function learn(id) {
  if (S.recipes[id]) return;
  S.recipes[id] = true;
  setTimeout(() => { print("{ok:You know how to make " + RECIPES[id].name + " now.} {cmd:cook " + id.replace(/_/g, " ") + "}"); }, 0);
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
    if (!known.length) return print("You don't know any recipes yet. {dim:the recipe cards are in {cmd:ls recipes}. read one with {cmd:cat}.}");
    print("{hi:You know how to make:}");
    for (const r of known) print("  " + (canMake(r) ? "{ok:✓}" : "{dim:·}") + " {cmd:cook " + r.replace(/_/g, " ") + "}  {dim:· " + needsText(r) + "}");
    return;
  }
  const id = Object.keys(RECIPES).find(r => r === want || r === want + "s" || RECIPES[r].name.replace(/ /g, "_") === want || r.startsWith(want));
  if (!id) return print("There's no card for that in Wren's box. {cmd:cook} on its own lists what you can make.");
  if (!S.recipes[id]) return print("You'd need the recipe for that first. Wren's recipes are on cards in the kitchen. {cmd:ls recipes}");
  if (!canMake(id)) return print("You need " + needsText(id) + " for " + RECIPES[id].name + ".");
  for (const [k, n] of Object.entries(RECIPES[id].needs)) {
    if (k === "fish:*") take(Object.keys(S.inv).find(x => x.startsWith("fish:")));
    else take(k, n);
  }
  give(id);
  spend(40); S.stats.meals++;
  sfx("pour");
  print(pick([
    "You cook. By the time it's done the kitchen windows have steamed up and you can't see the garden.",
    "You cook with the radio off. Under the sound of the pan you can hear the hum coming up through the floor.",
    "You cook. It takes about twice as long as the card says it will, which you suspect is normal."
  ]));
  print("{ok:(made " + itemName(id) + ". {cmd:eat " + id.replace(/_/g, " ") + "}, or {cmd:send} it to someone.)}");
  if (S.stats.meals >= 5) keepsake("baker");
  remember("made " + RECIPES[id].name + ".");
}

function doEat(args) {
  const k = itemKey(args.join(" "));
  if (!k) {
    const foods = Object.keys(S.inv).filter(x => RECIPES[x] || x === "honey" || x === "carrot" || x === "jam" || x === "sandwich" || x === "mint");
    return print(foods.length ? "Eat what? You've got: " + foods.map(f => "{cmd:eat " + f.replace(/_/g, " ") + "}").join("  ") : "You've nothing to eat on you. {dim:cook something: {cmd:cook}}");
  }
  if (k.startsWith("fish:")) return print("Raw? No. {dim:cook it into a fish pie, or give it to Biscuit.}");
  if (k.startsWith("junk:") || k.startsWith("disk:") || k.startsWith("seed:") || ["lamp", "matches", "oilcan", "rod", "umbrella", "wick", "candle", "starchart", "bracelet", "key", "moonflower", "lavender", "pumpkin", "chamomile"].includes(k)) return print(pick(["You think about it for a second and put it back in your pocket.", "That's not food. You know that's not food.", "Biscuit watches to see if you'll really do it. You don't."]));
  take(k);
  const r = RECIPES[k];
  if (r) { print(r.eat); warm(r.warm, "warmer"); }
  else if (k === "honey") { print("You eat honey off a teaspoon, standing at the counter. Nobody's watching except the cat."); warm(8, "warmer"); }
  else if (k === "jam") { print("You eat jam straight out of the jar with a spoon. It's blackberry, and very good."); warm(6, "warmer"); }
  else if (k === "carrot") { print("You rinse the soil off a carrot under the tap and eat it raw. It's sweeter than shop ones."); warm(3); }
  else if (k === "mint") { print("You chew a mint leaf. It's so strong it makes your eyes water a bit."); }
  else if (k === "sandwich") { print("You eat the sandwich HEARTH made you. It's cheese and pickle, which is fine."); warm(10, "warmer"); }
  spend(10); S.stats.meals++;
  remember("ate " + itemName(k) + ".");
}

/* ---------- tea ---------- */
const TEAS = {
  black: { need: null, line: "You make it strong with a bit of milk and drink it standing at the window.", warm: 12 },
  mint: { need: "mint", line: "You put a sprig of mint from the garden in a mug and pour the water on. It's too hot to drink for ages.", warm: 12 },
  chamomile: { need: "chamomile", line: "You make chamomile tea. It smells like hay, and makes you want to sit down.", warm: 15 },
  lavender: { need: "lavender", line: "Lavender tea tastes a bit like soap, if you're honest. You drink it anyway.", warm: 14 },
  honey: { need: "honey", line: "You make tea and put a spoonful of Fenn's honey in it, then another one.", warm: 18 }
};
async function doBrew(args) {
  if (roomName() !== "kitchen") return print("The kettle's in the kitchen. {cmd:cd ~/kitchen} {dim:or {cmd:cd /cottage/kitchen}, if you like typing.}");
  let kind = (args[0] || "black").toLowerCase();
  if (kind === "tea") kind = args[1] || "black";
  if (["builders", "english", "normal", "regular", "plain", "breakfast"].includes(kind)) kind = "black";
  if (!TEAS[kind]) return print("You haven't got " + esc(kind) + " tea. You can brew: " + Object.keys(TEAS).map(t => "{cmd:brew " + t + "}").join("  "));
  const t = TEAS[kind];
  if (t.need && !has(t.need)) return print("You'd need some " + t.need + " for that." + (kind === "honey" ? " {dim:Fenn has bees. Fenn has opinions about lavender.}" : " {dim:grow some in the garden.}"));
  if (S.stats.teas > 0 && !S.flags.thumped && chance(0.25)) {
    S.flags.kettleSulk = true;
    return print("You put the kettle on. Nothing happens.\n{dim:Wren's note said something about the left side. {cmd:thump kettle}}");
  }
  S.flags.thumped = false; S.flags.kettleSulk = false;
  if (t.need) take(t.need);
  print("You fill the kettle at the sink and put it on the range.");
  sfx("kettle");
  await pause(600); print("{dim:It takes a couple of minutes to get going, and then it whistles.}"); await pause(300);
  await pause(400);
  sfx("pour");
  print(t.line);
  S.teaAt = now(); S.teaKind = kind; S.stats.teas++;
  spend(6);
  warm(t.warm, "warmer");
  if (kind === "chamomile" && S.min > 20 * 60) print("{dim:you're very sleepy.}");
  keepsake("first_tea");
  remember(pick(["had a cup of " + kind + " tea.", "made " + kind + " tea. drank it at the window."]));
}
function doThump(args) {
  if (roomName() !== "kitchen") return print("Thump what? {dim:the thing that needs thumping is the kettle, in the kitchen.}");
  const side = (args[1] || args[0] || "").toLowerCase();
  if (side.includes("right")) { print("You thump it on the right. Nothing. Then, grudgingly, a gurgle.\n{dim:{cmd:brew}}"); S.flags.thumped = true; return; }
  print("{hi:Thunk.} The kettle gurgles and comes on. {dim:{cmd:brew}}");
  S.flags.thumped = true; sfx("chop");
}

/* ---------- the cat ---------- */
function catMood(n) { S.cat.mood = clamp(S.cat.mood + n, 0, 100); }
function doFeed(args) {
  const who = (args[0] || "").toLowerCase();
  if (who === "fox" || who === (S.fox || "").toLowerCase()) return feedFox(args.slice(1));
  if (who && !["biscuit", "cat", "the"].includes(who)) return print("You can feed Biscuit, or the fox if it's evening and you're in the garden. Not " + esc(who) + ".");
  const rest = args.slice(who === "the" ? 2 : 1);
  const fishKey = itemKey(rest.join(" ")) || (rest.length ? null : null);
  const giveFish = fishKey && fishKey.startsWith("fish:");
  if (roomName() !== "kitchen" && !catHere()) return print("Biscuit's in the " + S.cat.room + ". {dim:or rattle her tin in the kitchen and she'll come.}");
  if (!catHere()) { S.cat.room = roomName(); print("You rattle the tin. Somewhere in the house there's a thump, and then Biscuit is in the doorway."); }
  if (giveFish) {
    take(fishKey);
    catMood(30);
    print("You give Biscuit " + itemName(fishKey) + ". She takes it under the table and you don't see her for twenty minutes. When she comes back she sits on your foot.");
    sfx("purr");
    remember("gave Biscuit a fish. she might love me now.");
    S.flags.fedOnce = true;
    return;
  }
  if (S.cat.fed >= 2) {
    catMood(-2);
    return print(pick(["She's had two meals today. She's looking at you like she hasn't.", "Not again. She's had breakfast and dinner."]));
  }
  S.cat.fed++; S.flags.fedOnce = true;
  catMood(12);
  spend(3);
  print(pick([
    "Half a tin in the bowl. She eats it fast, then looks at you like you haven't fed her.",
    "You put the bowl down. She smells it, walks away, comes back, eats it.",
    "Biscuit eats. You stand there while she does, which she seems to want."
  ]));
  if (S.cat.fed === 1) remember("fed Biscuit.");
}
function feedFox(rest) {
  if (roomName() !== "garden" || !(isNight() || isEvening())) return print("The fox isn't around. She comes to the garden in the evenings.");
  const k = itemKey(rest.join(" ")) || Object.keys(S.inv).find(x => x.startsWith("fish:") || x === "jam_toast" || x === "carrot");
  if (!k) return print("You've nothing a fox would want. {dim:she likes fish. Wren's notes say toast as well.}");
  take(k);
  befriendFox();
  print("You put " + itemName(k) + " down at the edge of the grass and step back. The fox" + (S.fox ? ", " + S.fox + "," : "") + " waits a polite amount of time, then trots over and takes it, and looks at you for one long second before going.");
  remember("fed the fox" + (S.fox ? " (" + S.fox + ")" : "") + ".");
}
function befriendFox() { S.flags.foxFed = (S.flags.foxFed || 0) + 1; }

function doPet(args) {
  const who = (args[0] || "biscuit").toLowerCase();
  if (who === "fox" || who === (S.fox || "").toLowerCase()) return print(S.flags.foxFed >= 3 ? "The fox lets you get within a few feet. Then she goes." : "The fox steps back exactly as far as you step forward. Not yet.");
  if (!["biscuit", "cat", "the"].includes(who)) return print("You pet the " + esc(who) + ". It doesn't do much for either of you.");
  if (!catHere()) return print("Biscuit isn't here. She's in the " + S.cat.room + ". {dim:{cmd:where biscuit}}");
  const belly = args.join(" ").includes("belly") || args.join(" ").includes("tummy");
  S.stats.pets++; S.cat.petsToday++;
  spend(2);
  if (belly) { catMood(-6); sfx("bonk"); return print("You go for the belly. Claws, all four sets. Wren did say."); }
  if (S.cat.petsToday > 6) { catMood(-1); return print("She's had enough. She moves just out of reach."); }
  catMood(6);
  warm(3);
  sfx("purr");
  const m = S.cat.mood;
  print(m > 80 ? pick(["She leans her whole head into your hand and purrs.", "She slow-blinks at you. You slow-blink back.", "She headbutts your chin."])
    : m > 50 ? pick(["You scratch behind her ears and get a small rusty purr.", "She allows it. A quiet purr.", "You stroke her from her head to the end of her tail and she lifts her back up to meet your hand."])
      : pick(["One stroke, then she gets up and sits somewhere else.", "She looks at your hand. You take it back.", "She lets you, once."]));
  if (S.stats.pets === 10) keepsake("pet10");
  if (m > 75 && !S.flags.gotKey && S.stats.pets >= 8 && S.day >= 3 && !S.flags.keyHinted) { S.flags.keyHinted = true; print("{dim:she turns her head so the brass key on her collar is facing you. {cmd:take key}}"); }
  if (S.cat.petsToday === 1) remember("petted Biscuit. she purred. (she purred!)");
}

/* ---------- fire & warmth ---------- */
function doStoke() {
  if (roomName() !== "parlour") return print("The wood stove's in the parlour. {cmd:cd ~/parlour}");
  if (!S.wood) return print("The wood basket's empty. {dim:there's a woodpile in the garden. {cmd:chop}}");
  if (!fireLit() && !has("matches")) return print("You've got wood but nothing to light it with. {dim:matches are in the kitchen drawer.}");
  S.wood--;
  const was = fireLit();
  S.fireUntil = Math.max(S.fireUntil, now()) + 180;
  if (S.fireUntil - now() > 360) S.fireUntil = now() + 360;
  spend(5); sfx("crackle"); sfx("crackle");
  print(was ? "Another log on." : "You build it up with kindling and newspaper and use three matches. It smokes for a while before it catches.");
  warm(10, "much warmer");
  if (S.cat.room !== "parlour" && chance(0.6)) { S.cat.room = "parlour"; print("{dim:a minute later Biscuit comes in and lies down in front of it.}"); }
  remember(was ? "kept the fire going." : "lit the stove.");
}
function doChop() {
  if (roomName() !== "garden") return print("The woodpile's out in the garden.");
  if (S.wood >= 8) return print("The basket's full.");
  spend(20); sfx("chop"); setTimeout(() => sfx("chop"), 350);
  S.wood = Math.min(8, S.wood + 2);
  warm(4);
  print(pick(["You split two logs. The sound of the axe comes back off the lake a second later.", "You split two logs. You miss the first swing and the axe goes into the ground.", "You split two logs. A robin sits on the fence and waits to see if you turn up any worms."]) + " {dim:" + plural(S.wood, "log") + " in the basket.}");
}
function doLight(args) {
  const what = (args[0] || "").toLowerCase();
  if (what === "lamp" || what === "oil_lamp") {
    if (!has("lamp")) return print("You haven't got the lamp. {dim:it's in the cellar.}");
    if (S.flags.lampLit) return print("The lamp's already lit, glowing in your hand.");
    if (!has("matches")) return print("You need matches. {dim:kitchen drawer.}");
    S.flags.lampLit = true; S.flags.atticLit = true;
    sfx("crackle");
    print("You lift the glass chimney, strike a match, and touch it to the wick. A small flame, then a steady warm light. {ok:The attic won't be dark any more.}");
    remember("found the oil lamp and lit it. it smells like 1970.");
    return;
  }
  if (what === "candle") {
    if (!has("candle")) return print("You haven't got a candle. {dim:somebody up the hill makes them.}");
    if (!has("matches")) return print("You need matches.");
    take("candle");
    warm(18, "much warmer");
    print("You light one of Fenn's beeswax candles. It smells of honey, and the flame is very still.");
    remember("lit one of Fenn's candles.");
    return;
  }
  if (what === "fire" || what === "stove") return doStoke();
  if (what === "lantern") return print("That's for Lantern Night. {dim:on the dock: {cmd:lantern}}");
  print("Light what? {dim:the {cmd:light lamp}, a {cmd:light candle}, the {cmd:stoke} stove...}");
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
