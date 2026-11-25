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
  first_tea:   ["the teaspoon you used the first morning", "made your first cup of tea"],
  first_fish:  ["a perch scale stuck to your sleeve", "caught your first fish"],
  first_plant: ["the empty seed envelope", "planted something"],
  first_harv:  ["a carrot top you couldn't throw away", "harvested something you grew"],
  pet10:       ["some of Biscuit's orange fur off your jumper", "made friends with the cat"],
  marmalade:   ["one of Wren's old lures, out of the carp's lip", "caught Wren's carp and let him go"],
  radio:       ["the tea towel the radio disk was wrapped in", "got the radio going"],
  allstars:    ["Juniper's star notes, all ticked off", "found every one of the constellations"],
  comet:       ["the back of an envelope with the comet drawn on it", "saw the comet"],
  bottle:      ["the bottle from 1962", "fished up the bottle"],
  baker:       ["a recipe card with your own notes added", "cooked five meals"],
  friend:      ["the first letter that was signed with love", "became close to one of the neighbours"],
  allfriends:  ["a list of everyone's birthdays, from Ottoline", "got close to everyone in the Hollow"],
  fox:         ["a bit of fur off the fence where the fox gets through", "gave the fox a name"],
  lantern:     ["the burnt end of the lantern wick", "lit the lantern on Lantern Night"],
  answered:    ["the sheet of paper you worked the name out on", "answered it"],
  writer:      ["a pencil worn down to a stub", "wrote a file of your own"],
  sudo:        ["the crusts of the sandwich", "used sudo"],
  night_owl:   ["a moth that came in to the desk lamp", "stayed up past one in the morning"],
  greenhouse:  ["the old hinge pin from the greenhouse door", "got the greenhouse door open"],
  attic:       ["a photo from one of the attic boxes", "went up into the attic"],
  fishall:     ["the fish guide, with every fish ticked", "caught every kind of fish in the lake"],
  hacker:      ["a note from Pip that says HACKER", "used a pipe"],
  bookworm:    ["a bus ticket you found as a bookmark", "read every book on the parlour shelf"]
};
function keepsake(id) {
  if (S.keeps[id] || !KEEPSAKES[id]) return;
  S.keeps[id] = S.day;
  toast("you put it in the jar: <b>" + KEEPSAKES[id][0] + "</b>");
  sfx("chime");
  if (Object.keys(S.keeps).length === Object.keys(KEEPSAKES).length) setTimeout(() => toast("the jar is full. <b>you'll need another jar.</b>"), 3500);
}

let toastT = 0;
function toast(html) {
  const t = $("toast"); if (!t) return;
  t.innerHTML = html; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}
