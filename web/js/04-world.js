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
    "a floorboard upstairs.",
    "the mantel clock chimes " + (Math.floor(m / 60) % 12 || 12) + ", a bit late.",
    "under the floor, the hum dips, and comes back.",
    "the hum. you'd stopped hearing it. now you can't stop."
  ];
  if (w.rain) pool.push("the rain gets heavier for a minute, then eases.", "a drip in the gutter, the same note over and over.");
  if (w.wind > 0.6) pool.push("wind in the chimney.");
  if (w.fog > 0.5) pool.push("a foghorn, a long way off.");
  if (isNight()) pool.push("an owl. another, further off.", "headlights on the far road, sweeping across the lake.");
  else pool.push("a blackbird on the sill. it looks in, and goes.", "someone across the lake chopping wood. the sound comes a second late.");
  if (teaWarm()) pool.push("the teapot ticks as it cools.");
  if (fireLit()) pool.push("a log settles in the stove.");
  if (r === "kitchen") pool.push("the fridge shudders and goes quiet.");
  if (r === "study") pool.push("HEARTH's fan spins up and down again.", "the radio on the shelf crackles once, by itself.");
  if (r === "dock") pool.push("a fish jumps, far out.", "the cable at your feet ticks.");
  if (r === "cellar") pool.push("the box's green light blinks three times, and then once.");
  if (S.cat.room === r) pool.push("Biscuit, asleep, twitches.", "Biscuit yawns.");
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

/* The journal should read like a person wrote it at the end of a long day:
   the one or two things that mattered, the ordinary stuff squashed into a
   list, and whatever was on their mind when they put the pen down. */
const ORDINARY = [
  [/tea/, () => "tea"], [/fed Biscuit/, () => "fed B."], [/watered/, () => "watered"],
  [/planted (\w+)/, m => m[1] + " in"], [/harvested (.*?)\.$/, m => "picked " + m[1]],
  [/made (.*?)\.$/, m => m[1]], [/^ate /, () => null], [/stove|fire going/, () => "fire"],
  [/petted Biscuit/, () => "B. purred"], [/rowed|took the boat/, () => "out in the boat"],
  [/caught (?:and released )?a (\w+)/, m => "a " + m[1] + " off the dock"], [/sent .* to (\w+)/, m => "post for " + m[1]],
  [/record|piano/, () => "records"], [/chopped|logs/, () => "wood"], [/a postcard from/, () => "card from W."]
];
function composeJournal(fellAsleep) {
  if (S.pendingEntry) return S.pendingEntry;
  const r = seeded(S.day * 101);
  const notable = [], small = [];
  for (const line of S.today) {
    const hit = ORDINARY.find(([re]) => re.test(line));
    if (hit) { const t = hit[1](line.match(hit[0])); if (t && !small.includes(t)) small.push(t); }
    else notable.push(line.replace(/\.$/, ""));
  }
  const parts = [];
  if (!notable.length && !small.length) parts.push(["quiet day.", "didn't do much.", "nothing to report. good."][Math.floor(r() * 3)]);
  for (const n of notable.slice(0, 2)) parts.push(n + ".");
  if (small.length) parts.push((notable.length ? "also " : "") + small.slice(0, 4).join(", ") + ".");
  if (fellAsleep) parts.push("fell asleep at the desk.");
  const w = weatherFor(S.day);
  const closers = [];
  if (S.day >= 4 && !S.flags.answered) closers.push("the hum again tonight.", "can hear the cellar from the bed.");
  if (w.rain) closers.push("rain all evening.");
  if (w.name === "clear" && S.day >= 10) closers.push("clear tonight. went out and looked for the comet.");
  if (S.cat.mood > 80) closers.push("B. on the bed.");
  if (closers.length && r() < 0.6) parts.push(closers[Math.floor(r() * closers.length)]);
  return parts.join(" ");
}
function writeJournal(fellAsleep) {
  const text = composeJournal(fellAsleep);
  S.pendingEntry = null;
  S.journal.push({ day: S.day, text });
  S.today = [];
}
