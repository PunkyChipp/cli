/* =====================================================================
   01-state.js — the save file. Everything that should survive closing
   the app lives in S. Everything else is allowed to forget.
   ===================================================================== */
"use strict";

const SAVE_KEY = "hearth.save.v1";
const START_MIN = 7 * 60;        // every day starts at 7:00am
const SEASON_END = 14;           // Lantern Night

function newState() {
  return {
    v: 1,
    name: "",
    day: 1,
    min: START_MIN,            // minutes since midnight
    cwd: "/cottage",
    prevCwd: "/cottage",
    warmth: 55,                // 0..100, how cosy you feel
    fireUntil: 0,              // absolute minute the stove burns out
    teaAt: -9999,              // absolute minute the last tea was brewed
    teaKind: null,
    inv: { "seed:mint": 3, "seed:carrot": 2 },
    plots: Array.from({ length: 6 }, () => ({ crop: null, age: 0, wet: false })),
    gh: Array.from({ length: 3 }, () => ({ crop: null, age: 0, wet: false })),
    flags: {},                 // story switches: anything boolean goes here
    disks: {},                 // radio, sky, lantern, pip
    taken: {},                 // paths of things you picked up
    files: {},                 // files YOU wrote: path -> text
    read: {},                  // paths you've cat'ed
    recipes: {},
    fishlog: {},               // species -> { n, best }
    stars: {},                 // constellations found
    friends: { ottoline: 0, fenn: 0, pip: 0, juniper: 0 },
    mailbox: [],               // unread letter ids
    letters: [],               // every letter id you've received
    outbox: [],                // { to, item, day }
    dyn: {},                   // replies people wrote you: id -> letter
    quests: {},                // id -> "open" | "done"
    aliases: {},
    hist: [],
    theme: "amber",
    sound: true,
    keys: true,
    cat: { room: "parlour", mood: 60, fed: 0, petsToday: 0 },
    fox: null,                 // name you gave the fox
    keeps: {},                 // keepsakes (achievements) -> day found
    clues: {},                 // the corkboard: clue id -> day pinned
    journal: [],               // [{ day, text }]
    today: [],                 // events that become tonight's journal entry
    stats: { cmds: 0, teas: 0, fish: 0, harvests: 0, pets: 0, letters: 0, gifts: 0, meals: 0, days: 1 },
    wood: 3,
    ended: false,
    created: Date.now()
  };
}

let S = newState();

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* private mode: we'll live */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const got = JSON.parse(raw);
    S = Object.assign(newState(), got);
    // merge nested defaults so old saves don't explode when we add things
    const d = newState();
    for (const k of ["flags", "friends", "stats", "cat", "clues"]) S[k] = Object.assign({}, d[k], got[k] || {});
    return true;
  } catch (e) { return false; }
}
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} S = newState(); }

/** Absolute time in minutes since the very first morning. */
const now = () => S.day * 1440 + S.min;

/** Inventory helpers. Keys are like "carrot", "seed:mint", "fish:perch". */
const has = (k, n = 1) => (S.inv[k] || 0) >= n;
function give(k, n = 1) { S.inv[k] = (S.inv[k] || 0) + n; }
function take(k, n = 1) {
  if (!has(k, n)) return false;
  S.inv[k] -= n; if (S.inv[k] <= 0) delete S.inv[k];
  return true;
}

/** Remember something for tonight's journal entry. */
function remember(line) { if (!S.today.includes(line)) S.today.push(line); }

/** Keepsakes: little things that go in the jar on the windowsill. */
const KEEPSAKES = {
  first_tea:   ["a tea-stained spoon", "brewed your first cup"],
  first_fish:  ["a perch scale, shiny", "caught your first fish"],
  first_plant: ["a muddy seed packet", "planted something"],
  first_harv:  ["a carrot top", "harvested your first crop"],
  pet10:       ["a tuft of orange fur", "petted Biscuit ten times"],
  marmalade:   ["a golden scale the size of a coin", "caught Wren's carp, and let him go"],
  radio:       ["a radio dial knob", "got the radio working"],
  allstars:    ["a hand-drawn star chart", "found every constellation"],
  comet:       ["a pencil sketch of a comet", "saw Wren's Comet"],
  bottle:      ["a message in a bottle", "fished up a bottle"],
  baker:       ["a flour handprint", "cooked five meals"],
  friend:      ["a pressed flower", "became dear friends with someone"],
  allfriends:  ["a village photograph", "befriended the whole Hollow"],
  fox:         ["a fox whisker (you think)", "named the fox"],
  lantern:     ["a lantern wick, burned down", "lit the lantern on Lantern Night"],
  answered:    ["a scale of light, which fades if you look straight at it", "answered it"],
  writer:      ["a pencil stub", "wrote your own file"],
  sudo:        ["a sandwich crust", "used sudo for good"],
  night_owl:   ["a moth", "stayed up past 1am"],
  greenhouse:  ["a rusty hinge", "opened the greenhouse"],
  attic:       ["a dusty photograph", "explored the attic"],
  fishall:     ["a laminated fish poster", "caught every kind of fish"],
  hacker:      ["a tiny paper crown", "used a pipe |"],
  bookworm:    ["a bookmark", "read every book on the shelf"]
};
function keepsake(id) {
  if (S.keeps[id] || !KEEPSAKES[id]) return;
  S.keeps[id] = S.day;
  toast("into the jar: <b>" + KEEPSAKES[id][0] + "</b>");
  sfx("chime");
  if (Object.keys(S.keeps).length === Object.keys(KEEPSAKES).length) setTimeout(() => toast("the jar is full. <b>you should be very proud.</b>"), 3500);
}

let toastT = 0;
function toast(html) {
  const t = $("toast"); if (!t) return;
  t.innerHTML = html; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}
