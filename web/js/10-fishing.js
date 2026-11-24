/* =====================================================================
   10-fishing.js — sit on the dock, cast, wait, and press enter (or tap)
   the moment the float dips. Different fish come out in different
   weather and at different times. One of them is a legend.
   ===================================================================== */
"use strict";

const FISH = [
  { id: "minnow", w: 18, win: 1400, size: [3, 6], keep: false, when: () => true, line: "A minnow. A tiny, furious minnow. You put it back. It seemed relieved." },
  { id: "perch", w: 30, win: 1200, size: [14, 32], when: () => !isNight(), line: "A perch! Striped like a tiger and twice as cross about it." },
  { id: "roach", w: 24, win: 1200, size: [12, 28], when: () => true, line: "A roach — silver, neat, slightly embarrassed to be here." },
  { id: "trout", w: 14, win: 850, size: [25, 48], when: () => (isMorning() || isEvening()) && !weatherNow().rain && weatherNow().cloud < 0.6, line: "A brown trout, speckled like a thrush's egg. Beautiful. It knows it, too." },
  { id: "pike", w: 7, win: 700, size: [50, 95], when: () => isEvening() || S.min >= 20 * 60, line: "A pike. Long as your arm, all teeth and disapproval. It looks at you like you're the one who should be explaining yourself." },
  { id: "eel", w: 16, win: 900, size: [40, 80], when: () => isNight() && weatherNow().rain > 0, line: "An eel! It ties itself in a knot around the line, then around your wrist, then around the concept of holding things." },
  { id: "moonperch", w: 14, win: 900, size: [15, 25], when: () => S.day > SEASON_END && isNight() && weatherNow().cloud < 0.5, line: "A perch — but it's glowing, faintly, a pale blue-gold, the colour of the lantern. You've never seen anything like it." },
  { id: "marmalade", w: 3, win: 550, size: [90, 90], keep: false, when: () => S.day >= 4 && (weatherNow().fog > 0.5 || (S.min >= 6 * 60 && S.min < 8 * 60)), line: "" },
  { id: "junk:boot", w: 5, win: 1500, size: [0, 0], junk: true, when: () => true, line: "An old boot. A left one. Somewhere, presumably, a right one is waiting." },
  { id: "junk:can", w: 4, win: 1500, size: [0, 0], junk: true, when: () => true, line: "A rusty tin can. A snail lives in it. You put it back, snail and all. Rent-free, the snail." },
  { id: "junk:bottle", w: 4, win: 1500, size: [0, 0], junk: true, when: () => !S.flags.gotBottle && S.day >= 3, line: "" }
];
const KEEPERS = FISH.filter(f => !f.junk && f.id !== "minnow" && f.id !== "marmalade" && f.id !== "moonperch").map(f => f.id).concat(["marmalade"]);

function rollFish() {
  const pool = FISH.filter(f => f.when());
  let tot = pool.reduce((a, f) => a + f.w, 0), r = Math.random() * tot;
  for (const f of pool) { r -= f.w; if (r <= 0) return f; }
  return pool[0];
}

function waterLine(phase, bob) {
  let a = "", b = "";
  for (let i = 0; i < 14; i++) a += (i + phase) % 5 === 0 ? "-" : "~";
  for (let i = 0; i < 14; i++) b += (i + phase + 2) % 5 === 0 ? "-" : "~";
  const float = bob ? "{warn:!}" : "{acc:" + (phase % 6 < 3 ? "o" : "°") + "}";
  return "    {sky:" + a + "}" + float + "{sky:" + b + "}";
}

async function doFish() {
  if (roomName() !== "dock") return print("You'll want to be on the dock for that. {cmd:cd ~/dock} {dim:(fish don't live in " + roomName() + "s.)}");
  if (!has("rod")) return print("You haven't got a rod. {dim:(Wren's is in the garden shed: {cmd:cd ~/garden/shed})}");
  if (T.cap) return print("you can't fish inside a pipe. you tried, though, and that's what matters.");
  if (weatherNow().rain >= 1 && !has("umbrella")) warm(-3, "cold. wet. you should've brought the duck umbrella.");
  print(pick(["You cast. The float sails out and lands with a soft {acc:plip}.", "You flick the line out over the water. Plip. Ripples, then nothing.", "A good cast — the float lands exactly where you meant it to, which never happens."]));
  sfx("plip");
  const d = printRaw(fmt(waterLine(0, false)));
  let early = false;
  T.keyWait = () => { early = true; };
  const waitMs = T.autoFish ? 10 : rand(2200, 6500);
  const t0 = Date.now();
  let phase = 0;
  const musings = ["a heron lands further down the shore and pretends not to watch.", "a leaf drifts past the float. not a fish. a leaf.", "somewhere across the lake, a dog barks twice and thinks better of it.", "the float bobs. just the wind. probably.", "a dragonfly lands on your rod, considers you, leaves.", "you hear the observatory dome creak round across the water."];
  let mused = false;
  while (Date.now() - t0 < waitMs && !early && !T.skip) {
    phase++;
    d.innerHTML = fmt(waterLine(phase, false));
    if (!mused && Date.now() - t0 > 1600 && chance(0.12)) { mused = true; print("{dim:" + pick(musings) + "}"); }
    await wait(180);
  }
  T.keyWait = null;
  if (T.skip) { print("{dim:you reel in. another time.}"); spend(5); return; }
  if (early) {
    spend(5);
    return print(pick(["You strike too early! The float wasn't even moving. The lake seems faintly amused.", "Too eager! You yank the line out of the water with nothing on it. A duck looks away, embarrassed for you.", "Whoops — nothing was biting. Wait for the {warn:!} next time."]) + " {dim:(" + "{cmd:fish}" + " again?)}");
  }
  const f = rollFish();
  d.innerHTML = fmt(waterLine(phase, true));
  sfx("plip");
  print("{warn:!! the float dips — NOW!}  {dim:(enter, space, or tap)}");
  const got = T.autoFish ? true : await new Promise(res => {
    let done = false;
    T.keyWait = () => { if (!done) { done = true; res(true); } };
    setTimeout(() => { if (!done) { done = true; T.keyWait = null; res(false); } }, f.win + (S.warmth > 70 ? 150 : 0));
  });
  T.keyWait = null;
  spend(randi(10, 25));
  if (!got) {
    return print(pick(["Too slow — the float pops back up and whatever it was has gone. You'll get the next one.", "You blink and miss it. The water closes over the spot like nothing happened.", "Gone! Something stole the bait with tremendous skill."]) + " {cmd:fish}");
  }
  sfx("reel");
  await pause(300);
  if (f.id === "marmalade") return catchMarmalade();
  if (f.id === "junk:bottle") return catchBottle();
  const size = randi(f.size[0], f.size[1]);
  print(f.line + (f.size[1] ? " {dim:(" + size + "cm)}" : ""));
  const L = S.fishlog[f.id] || { n: 0, best: 0 };
  const best = size > L.best && L.n > 0;
  L.n++; L.best = Math.max(L.best, size); S.fishlog[f.id] = L;
  if (best) print("{ok:(your biggest " + f.id + " yet!)}");
  if (f.keep !== false) { give(f.junk ? f.id : "fish:" + f.id); }
  if (!f.junk) { S.stats.fish++; keepsake("first_fish"); }
  if (KEEPERS.every(k => S.fishlog[k])) keepsake("fishall");
  if (catHere() && !f.junk && f.keep !== false) print("{dim:Biscuit has materialised at your elbow. She's very interested. Extremely interested. ({cmd:feed biscuit " + f.id + "}?)}");
  remember(f.junk ? "fished up " + itemName(f.id) + ". the lake has a sense of humour." : "caught " + (f.keep === false ? "and released " : "") + "a " + f.id + ".");
}

async function catchMarmalade() {
  await type("The line goes tight. Not fish-tight. {warn:Tree-tight.}", 40);
  await pause(500);
  await type("The rod bends double. Something huge and slow and gold rolls under the water.", 40);
  await pause(700);
  print("");
  print("{acc:        _.---._}");
  print("{acc:    .-'`  o    `'-._       ___}");
  print("{acc:   (  ))))           `-.-'  _/}");
  print("{acc:    '-._ ___    _.-' `-._   \\_}");
  print("{acc:        `'---'``         `-'}");
  print("");
  await type("It's him. Old Marmalade. A carp the size of a labrador, gold as a sovereign,", 40);
  await type("with four of Wren's lures in his lip like earrings.", 40);
  await pause(600);
  await type("He looks at you. You look at him. Neither of you says anything, because one of you is a fish.", 40);
  await pause(600);
  await type("You unhook him, very gently, and let him go. He sinks back into the fog like a coin into a well.", 40);
  const L = S.fishlog.marmalade || { n: 0, best: 0 };
  L.n++; L.best = 90; S.fishlog.marmalade = L;
  S.stats.fish++;
  keepsake("marmalade");
  S.flags.marmalade = true;
  remember("CAUGHT OLD MARMALADE. let him go. he's real. Wren is going to scream.");
}
async function catchBottle() {
  S.flags.gotBottle = true;
  print("A bottle — green glass, corked, with a curl of paper inside.");
  await pause(500);
  print("You ease the cork out. The paper is soft as cloth. It's dated {acc:1962}:");
  print("");
  print("{hi:   \"to whoever finds this:}");
  print("{hi:    the lake keeps things. be kind to it.}");
  print("{hi:    we saw a comet tonight. we named it. we're not telling.}");
  print("{hi:    — W.A. & J.V., aged 14 and three-quarters\"}");
  print("");
  print("{dim:(you put the paper back in the bottle and keep it.)}");
  give("junk:bottle");
  keepsake("bottle");
  remember("fished up a bottle from 1962. Wren and Juniper wrote it.");
}

async function doRow() {
  if (roomName() !== "dock") return print("The boat's tied up at the dock.");
  if (weatherNow().wind > 0.8) return print("Far too windy. The Second Opinion bucks at her rope like she's got somewhere to be. Not today.");
  print("You untie The Second Opinion, step in (wobble, wobble, fine), and pull out onto the lake.");
  sfx("splash");
  await pause(900);
  const w = weatherNow();
  const lines = [];
  if (w.fog > 0.5) lines.push("The fog closes round you. Just you, the oars, the drip of water, and a grey that goes on forever. It's the quietest you've ever been.");
  else if (isNight()) lines.push(w.cloud < 0.5 ? "The stars are in the water as well as the sky. You're rowing through them." : "It's dark and soft and the lake is very big. The cottage window is a small square of gold behind you.");
  else lines.push(pick(["The water's like glass. Your oars leave little whirlpools that spin away and vanish.", "Out in the middle, the cottage looks like a toy someone loved very much."]));
  lines.push(pick([
    "A heron lifts off the reeds as you pass, folding itself up into the air like a deckchair.",
    "Across the water, the observatory dome is " + (isNight() ? "open, a sliver of light in it. Juniper's at the eyepiece." : "white against the hill. A tiny figure waves from the door. You wave back."),
    "Up on the hill you can see Fenn's hives, a little row of white boxes, and Fenn himself, standing among them like a lighthouse keeper.",
    "You ship the oars and just drift for a while. The boat turns slowly. So does the whole world.",
    "A pair of grebes are doing a ridiculous dance. You give them privacy."
  ]));
  if (S.day > SEASON_END) lines.push("Thin ice has started at the edges. It sings when your oars touch it.");
  for (const l of lines) { await type(l, 48); await pause(700); }
  print("You row home, slowly, because there's no reason not to.");
  spend(40);
  warm(6, "calmer");
  remember(pick(["rowed out on the lake.", "took the boat out. drifted. thought about nothing."]));
}
