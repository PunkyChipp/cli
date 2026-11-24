/* =====================================================================
   10-fishing.js — sit on the dock, cast, wait, and press enter (or tap)
   the moment the float dips. Different fish come out in different
   weather and at different times. One of them is a legend.
   ===================================================================== */
"use strict";

const FISH = [
  { id: "minnow", w: 18, win: 1400, size: [3, 6], keep: false, when: () => true, line: "A minnow. You put it back." },
  { id: "perch", w: 30, win: 1200, size: [14, 32], when: () => !isNight(), line: "A perch. Green and striped, spines up." },
  { id: "roach", w: 24, win: 1200, size: [12, 28], when: () => true, line: "A roach. Silver, red-finned." },
  { id: "trout", w: 14, win: 850, size: [25, 48], when: () => (isMorning() || isEvening()) && !weatherNow().rain && weatherNow().cloud < 0.6, line: "A brown trout, speckled, heavier than it looks." },
  { id: "pike", w: 7, win: 700, size: [50, 95], when: () => isEvening() || S.min >= 20 * 60, line: "A pike. All teeth. You get it off the hook very carefully." },
  { id: "eel", w: 16, win: 900, size: [40, 80], when: () => isNight() && weatherNow().rain > 0, line: "An eel. It wraps itself round your wrist." },
  { id: "moonperch", w: 14, win: 900, size: [15, 25], when: () => S.day > SEASON_END && isNight() && weatherNow().cloud < 0.5, line: "A perch, but faintly lit from inside. Blue-gold. It fades as you look at it." },
  { id: "marmalade", w: 3, win: 550, size: [90, 90], keep: false, when: () => S.day >= 4 && (weatherNow().fog > 0.5 || (S.min >= 6 * 60 && S.min < 8 * 60)), line: "" },
  { id: "junk:boot", w: 5, win: 1500, size: [0, 0], junk: true, when: () => true, line: "An old boot. A left one." },
  { id: "junk:can", w: 4, win: 1500, size: [0, 0], junk: true, when: () => true, line: "A rusty tin can with a snail in it." },
  { id: "junk:bottle", w: 6, win: 1500, size: [0, 0], junk: true, when: () => !S.flags.gotBottle && S.day >= 2, line: "" }
];
const KEEPERS = FISH.filter(f => !f.junk && f.id !== "minnow" && f.id !== "marmalade" && f.id !== "moonperch").map(f => f.id).concat(["marmalade"]);

function rollFish() {
  // the lake wants you to have the bottle. by the sixth bite, it's yours.
  S.flags.bites = (S.flags.bites || 0) + 1;
  if (!S.flags.gotBottle && S.day >= 2 && S.flags.bites >= 6) return FISH.find(f => f.id === "junk:bottle");
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
  print(pick(["You cast. {acc:plip.}", "The float lands a little short. Fine.", "A good cast, for once."]));
  if (!S.flags.fishTaught) { S.flags.fishTaught = true; print("{dim:(watch the float. when it goes under, press enter, or tap the screen. not before.)}"); }
  sfx("plip");
  const d = printRaw(fmt(waterLine(0, false)));
  let early = false;
  T.keyWait = () => { early = true; };
  const waitMs = T.autoFish ? 10 : rand(2200, 6500);
  const t0 = Date.now();
  let phase = 0;
  const musings = ["a heron further down the shore.", "a leaf drifts past the float.", "a dog barks twice across the lake.", "the float bobs. wind.", "a dragonfly lands on the rod.", "the cable at your feet ticks, very faintly."];
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
    return print(pick(["Nothing's biting yet. You pull the float out.", "Too soon. The float hadn't moved.", "You strike at nothing. The ripples settle."]) + " {dim:(wait until it goes under.)} {cmd:fish}");
  }
  const f = rollFish();
  d.innerHTML = fmt(waterLine(phase, true));
  sfx("plip");
  print("{warn:the float goes under —}  {dim:now! (enter, space or tap)}");
  const got = T.autoFish ? true : await new Promise(res => {
    let done = false;
    T.keyWait = () => { if (!done) { done = true; res(true); } };
    setTimeout(() => { if (!done) { done = true; T.keyWait = null; res(false); } }, f.win + (S.warmth > 70 ? 150 : 0));
  });
  T.keyWait = null;
  spend(randi(10, 25));
  if (!got) {
    return print(pick(["Too slow. The float bobs back up and the bait's gone.", "Missed it. The float comes back up, empty.", "Whatever it was, it's had the bait."]) + " {cmd:fish}");
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
  await type("The line goes tight and stays tight.", 40);
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
  await type("The carp. Wren's carp. He's the size of a dog, and gold, and there are four old lures in his lip.", 40);
  await pause(600);
  await type("He lies in the shallows by the dock and doesn't fight. His eye is the size of a coin and it's looking at you.", 40);
  await pause(600);
  await type("You take the hook out as gently as you can. He stays a moment longer. Then he goes down into the fog.", 40);
  const L = S.fishlog.marmalade || { n: 0, best: 0 };
  L.n++; L.best = 90; S.fishlog.marmalade = L;
  S.stats.fish++;
  keepsake("marmalade");
  S.flags.marmalade = true;
  remember("caught Wren's carp. let him go. he looked at me for a long time.");
}
async function catchBottle() {
  S.flags.gotBottle = true;
  print("A bottle. Green glass, corked and waxed, with a curl of paper inside.");
  await pause(500);
  print("The paper's dry. Pencil, two different handwritings:");
  print("");
  print("{hi:   25 oct 1962}");
  print("{hi:   to whoever finds this.}");
  print("{hi:   we flashed a torch at the comet three times}");
  print("{hi:   and the lake flashed back. three times.}");
  print("{hi:   from underneath.}");
  print("{hi:   we're not mad. W.A. & J.V. (14)}");
  print("");
  give("junk:bottle");
  keepsake("bottle");
  clue("bottle");
  remember("fished up a bottle from 1962. Wren and Juniper. 'the lake flashed back.'");
}

async function doRow() {
  if (roomName() !== "dock") return print("The boat's tied up at the dock.");
  if (weatherNow().wind > 0.8) return print("Too windy. The boat's pulling at its rope. Not today.");
  print("You untie the boat, get in, and push off.");
  sfx("splash");
  await pause(900);
  const w = weatherNow();
  const lines = [];
  if (w.fog > 0.5) lines.push("Fog all round. The oars, the drips off them, and nothing else. You can't see the dock behind you.");
  else if (isNight()) lines.push(w.cloud < 0.5 ? "Stars in the water. You row through them." : "Dark, and the lake feels much bigger than it does in the day. The study window is a small yellow square behind you.");
  else lines.push(pick(["Flat calm. Each stroke leaves two little whirlpools.", "From the middle of the lake the cottage looks small and very old."]));
  lines.push(pick([
    "A heron gets up out of the reeds as you pass.",
    "The observatory dome on the far side is " + (isNight() ? "open, with a light in the slit." : "white against the hill. Someone waves from the door. You wave back."),
    "Up the hill, Fenn is standing among his hives, not moving.",
    "You stop rowing and drift for a while.",
    "Two grebes, doing their dance."
  ]));
  if (S.day > SEASON_END) lines.push("Thin ice at the edges. It creaks when the oars touch it.");
  if (isNight() && !S.flags.answered && signalLevel() > 0.4 && w.cloud < 0.8) {
    lines.push("Over the deep part you stop and look down. A long way under the boat, something blue-gold turns over, slowly, and goes still.");
    clue("lights");
  }
  for (const l of lines) { await type(l, 55); await pause(600); }
  print("You row back.");
  spend(40);
  warm(6, "calmer");
  remember(pick(["rowed out on the lake.", "took the boat out."]));
}
