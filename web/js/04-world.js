/* =====================================================================
   04-world.js — time, weather, warmth, the stove, and the cat's
   daily wanderings. The clock moves one minute per real second while
   you're here, and a few minutes for everything you do.
   ===================================================================== */
"use strict";

const SEASON = d => (d <= SEASON_END ? "autumn" : "winter");
const DAYNAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = d => DAYNAMES[(d + 2) % 7];    // day 1 is a Wednesday. it just is.
const dateStr = d => (d <= 30 ? "October " + (d + 11) : "November " + (d - 19));   // day 1 = Oct 12, day 14 = Oct 25

/* ---------- weather ----------
   Deterministic per day so the radio forecast is never a liar.
   Some days are hand-picked because the story wants them that way.  */
const WEATHER = {
  clear:   { name: "clear",          rain: 0,   wind: 0.1, cloud: 0,    fog: 0,   snow: 0, word: "clear and crisp" },
  cloudy:  { name: "cloudy",         rain: 0,   wind: 0.3, cloud: 0.7,  fog: 0,   snow: 0, word: "grey and soft" },
  drizzle: { name: "drizzle",        rain: 0.5, wind: 0.2, cloud: 0.8,  fog: 0.1, snow: 0, word: "drizzly" },
  rain:    { name: "rain",           rain: 1,   wind: 0.4, cloud: 1,    fog: 0.1, snow: 0, word: "properly rainy" },
  fog:     { name: "fog",            rain: 0,   wind: 0,   cloud: 0.5,  fog: 0.9, snow: 0, word: "foggy, like the lake's thinking" },
  windy:   { name: "windy",          rain: 0,   wind: 1,   cloud: 0.4,  fog: 0,   snow: 0, word: "blustery" },
  snow:    { name: "snow",           rain: 0,   wind: 0.2, cloud: 0.9,  fog: 0.2, snow: 1, word: "snowing, quietly" }
};
const FIXED_WEATHER = { 1: "drizzle", 2: "cloudy", 3: "clear", 5: "rain", 8: "fog", 10: "clear", 11: "clear", 13: "windy", 14: "clear", 15: "snow" };
function weatherFor(day) {
  if (FIXED_WEATHER[day]) return WEATHER[FIXED_WEATHER[day]];
  const r = seeded(day * 7919 + 13)();
  if (day > SEASON_END) return WEATHER[r < 0.45 ? "snow" : r < 0.7 ? "cloudy" : r < 0.85 ? "clear" : "fog"];
  return WEATHER[r < 0.28 ? "clear" : r < 0.48 ? "cloudy" : r < 0.62 ? "drizzle" : r < 0.76 ? "rain" : r < 0.88 ? "fog" : "windy"];
}
function weatherNow() {
  const w = weatherFor(S.day);
  // rain eases off in the small hours; fog burns off by noon
  if (w.fog && S.min > 12 * 60) return Object.assign({}, w, { fog: w.fog * 0.3 });
  return w;
}

const isNight = () => S.min >= 20 * 60 || S.min < 6 * 60;
const isEvening = () => S.min >= 17 * 60 && S.min < 20 * 60;
const isMorning = () => S.min >= 6 * 60 && S.min < 11 * 60;
const fireLit = () => S.fireUntil > now();
const teaWarm = () => now() - S.teaAt < 45;
const roomName = () => (S.cwd.startsWith("/cottage/") ? S.cwd.split("/")[2] : S.cwd === "/cottage" ? "hall" : "elsewhere");

function partOfDay() {
  const m = S.min;
  if (m < 6 * 60) return "the small hours";
  if (m < 9 * 60) return "early morning";
  if (m < 12 * 60) return "morning";
  if (m < 14 * 60) return "midday";
  if (m < 17 * 60) return "afternoon";
  if (m < 20 * 60) return "evening";
  if (m < 23 * 60) return "night";
  return "late, late night";
}

/* ---------- time passing ---------- */
let lastTick = Date.now(), tickAcc = 0;

/** Spend some minutes doing a thing. Returns false if it's too late to bother. */
function spend(mins) {
  S.min += mins;
  S.warmth = clamp(S.warmth - mins * (fireLit() ? 0.005 : 0.03), 0, 100);
  // (falling asleep at 1:30am is handled in worldTick, between commands)
}

function warm(n, why) {
  const before = S.warmth;
  S.warmth = clamp(S.warmth + n, 0, 100);
  if (why && S.warmth > before + 1) print("{dim:(" + why + ")}");
}

/** Called every second from the main loop. */
function worldTick() {
  const t = Date.now();
  let dt = (t - lastTick) / 1000; lastTick = t;
  if (dt > 5 || document.hidden || !S.name || T.ending) return;   // paused while you're away
  tickAcc += dt;
  while (tickAcc >= 1) {
    tickAcc -= 1;
    S.min += 1;
    S.warmth = clamp(S.warmth - (fireLit() ? 0 : 0.02) + (fireLit() && roomName() === "parlour" ? 0.04 : 0), 0, 100);
    if (S.min === 22 * 60 && !T.busy) { print(""); print("{dim:(it's ten o'clock. somewhere a clock agrees. {cmd:sleep} whenever you're ready.)}"); showLine(!T.busy); }
    if (S.min === 25 * 60 && !T.busy) { print(""); print("{dim:(it's 1am. your eyes are doing that thing.)}"); showLine(!T.busy); keepsake("night_owl"); }
    if (S.min >= 25 * 60 + 30 && !T.busy && !T.asking) { T.busy = true; nodOff().then(() => { T.busy = false; showLine(true); }); }
    catWander();
    maybeCatKeyboard();
    idleMoment();
  }
}

/* ---------- small things that happen while you sit still ---------- */
let lastIdle = Date.now();
function idleMoment() {
  if (T.busy || T.asking || !S.name) return;
  const quiet = Date.now() - Math.max(lastIdle, T.lastCmd || 0);
  if (quiet < 150000 || !chance(1 / 40)) return;
  lastIdle = Date.now();
  const r = roomName(), w = weatherNow(), m = S.min;
  const pool = [
    "the house ticks and settles, like an old dog turning round before it lies down.",
    "somewhere upstairs, a floorboard creaks on its own. it does that.",
    "the mantel clock chimes " + (Math.floor(m / 60) % 12 || 12) + ", slightly late, as if it had to think about it."
  ];
  if (w.rain) pool.push("the rain changes gear — heavier for a moment, then soft again.", "a drip has found its way into the gutter and is practising the same note.");
  if (w.wind > 0.6) pool.push("the wind gets into the chimney and hums one long low note.");
  if (w.fog > 0.5) pool.push("a foghorn, very far away, says something to nobody.");
  if (isNight()) pool.push("an owl, close by. then another, further off, answering.", "a car on the far road sweeps its headlights across the lake and is gone.");
  else pool.push("a blackbird lands on the windowsill, looks in at you, and leaves, unimpressed.", "across the lake, someone is chopping wood. the sound arrives a second after the axe.");
  if (teaWarm()) pool.push("the teapot ticks as it cools.");
  if (fireLit()) pool.push("a log shifts in the stove and sends up a little fountain of sparks.");
  if (r === "kitchen") pool.push("the fridge shudders, thinks about it, and goes quiet.");
  if (r === "study") pool.push("HEARTH's fan spins up, considers something, and spins down again.");
  if (r === "dock") pool.push("a fish jumps, far out. just the ring of it left, spreading.");
  if (r === "garden") pool.push("a robin follows you along the beds at a respectful distance.");
  if (S.cat.room === r) pool.push("Biscuit, asleep, runs a little in a dream. whatever she's chasing, she's winning.", "Biscuit yawns enormously and looks embarrassed about it.");
  print("{dim:(" + pick(pool) + ")}");
  showLine(true);
}

async function nodOff() {
  if (T.ending) return;
  T.ending = true;
  print("");
  await type("your head tips forward. the keyboard is surprisingly comfortable.", 40, "dim");
  await pause(500);
  print("{dim:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz}");
  await pause(800);
  T.ending = false;
  await newDay(true);
}

/* ---------- the cat ----------
   Biscuit has a schedule. It is not a schedule you get a copy of.  */
const CAT_SPOTS = {
  morning: ["kitchen", "kitchen", "garden", "study"],
  day: ["garden", "study", "parlour", "attic", "greenhouse", "dock"],
  evening: ["parlour", "parlour", "kitchen", "study"],
  night: ["parlour", "study", "attic", "hall"]
};
function catWander() {
  if (!chance(1 / 50)) return;
  const pool = isMorning() ? CAT_SPOTS.morning : isEvening() ? CAT_SPOTS.evening : isNight() ? CAT_SPOTS.night : CAT_SPOTS.day;
  let next = pick(pool);
  if (next === "greenhouse" && !S.flags.ghOpen) next = "garden";
  if (next === "attic" && !S.flags.atticLit) next = "study";
  if (next === "garden" && weatherNow().rain > 0.6) next = "parlour";   // she is not a fool
  if (next === S.cat.room) return;
  const was = S.cat.room;
  S.cat.room = next;
  if (!T.busy && !T.asking && S.name) {
    if (roomName() === was) { print("{dim:(Biscuit gets up, stretches every part of herself, and wanders off toward the " + next + ".)}"); showLine(true); }
    else if (roomName() === next) { print("{dim:(Biscuit pads in and pretends she was always here.)}"); showLine(true); }
  }
}
let catKeyT = 0;
function maybeCatKeyboard() {
  // if she's in the study with you, now and then she walks across the keys
  if (roomName() !== "study" || S.cat.room !== "study" || T.busy || T.asking) return;
  if (Date.now() - catKeyT < 240000 || !chance(1 / 180)) return;
  catKeyT = Date.now();
  const mash = pick(["ghhhhhhhhhhhhhhhhhhhjk", "aaaaaaa;;;;;;''''", "zxcvbnm,,,,,,,,,,,", "]]]]]]]]]]]]]]]]p", "qqqqqqqqqqqqqqqqqqqq2222222", "hhhhhhhhhh   bbbbbbbbbb"]);
  const inp = $("cmd");
  if (inp.value) return;
  inp.value = mash; drawMirror();
  setTimeout(() => {
    if (inp.value !== mash || T.busy) return;
    submit(mash);
  }, 700);
}

/* ---------- a new day ---------- */
async function newDay(fellAsleep) {
  // write tonight's journal entry before the day turns over
  writeJournal(fellAsleep);
  S.day += 1; S.stats.days = S.day;
  S.min = START_MIN + (fellAsleep ? 45 : 0);
  S.cwd = fellAsleep ? "/cottage/study" : "/cottage";
  S.fireUntil = 0; S.flags.radioOn = null;
  S.cat.petsToday = 0; S.cat.fed = 0; S.cat.room = "kitchen";
  S.cat.mood = Math.max(35, S.cat.mood - 6);
  S.warmth = clamp(S.warmth * 0.5 + (fellAsleep ? 20 : 35), 0, 100);
  growGarden();
  deliverMail();
  if (S.day === SEASON_END + 1) S.theme = S.theme === "amber" ? "frost" : S.theme, applyTheme();
  save();
  clearScreen();
  $("screen").classList.remove("boot"); void $("screen").offsetWidth; $("screen").classList.add("boot");
  sfx("boot");
  await morning(fellAsleep);
}

function writeJournal(fellAsleep) {
  const bits = S.today.slice();
  let text;
  if (!bits.length) text = pick(["quiet day. didn't do much. that's allowed.", "a nothing sort of day. the good kind.", "today happened. i was there for most of it."]);
  else text = bits.slice(0, 5).join(" ");
  if (fellAsleep) text += " fell asleep at the desk again. Biscuit sat on my back.";
  if (S.warmth > 75) text += " felt warm right through.";
  S.journal.push({ day: S.day, text });
  S.today = [];
}
