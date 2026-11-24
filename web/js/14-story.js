/* =====================================================================
   14-story.js — mornings, the sticky note, the status card, the keys
   under the screen, and Lantern Night.
   ===================================================================== */
"use strict";

const WEATHER_ART = {
  clear:   ["{acc:   \\ | /  }", "{acc: -- O -- }", "{acc:   / | \\  }"],
  cloudy:  ["{dim:    .--.   }", "{dim: .-(    ).  }", "{dim:(___.__)__) }"],
  drizzle: ["{dim:  .-(  ).  }", "{dim: (___.__)) }", "{sky:  ' ' ' '  }"],
  rain:    ["{dim:  .-(  ).  }", "{dim: (___.__)) }", "{sky: ,',',',' }"],
  fog:     ["{dim: _ - _ - _ }", "{dim:  _ - _ -  }", "{dim: _ - _ - _ }"],
  windy:   ["{dim:  ~~~~>    }", "{dim:    ~~~~~> }", "{dim: ~~~>      }"],
  snow:    ["{hi:  *  .  *  }", "{hi: .  *  .  }", "{hi:  *  .  * }"]
};

const MORNINGS = {
  2: "You wake up because something is standing on you. It's Biscuit, on your chest, looking straight at your face and waiting for you to notice.",
  3: "It's clear for the first time since you got here. From the bedroom window you can see the observatory on the far shore, a small white dome on the hill.",
  5: "Rain on the roof all night. When you go downstairs the hum is still there underneath it, the same as always.",
  6: "You had a dream about the lake. You can't remember much of it, except that the water was lit up from below.",
  8: "The fog has come right up to the house. You can't see the end of the garden from the kitchen window.",
  10: "You lie in bed for a while listening. You're fairly sure now that the hum is louder than it was when you arrived.",
  12: "It went cold overnight. There's frost on the inside of the bedroom window, and you can see your breath in the hall.",
  14: "It's Lantern Night. You can already hear someone down on the water testing a boat, and Ottoline's voice carrying across the lake."
};
async function morning(fellAsleep) {
  const w = weatherFor(S.day);
  const art = WEATHER_ART[w.name] || WEATHER_ART.clear;
  print("");
  print(art[0] + "   {hi:" + dayName(S.day) + " " + dateStr(S.day) + "}");
  print(art[1] + "   {dim:" + (S.day < SEASON_END ? (SEASON_END - S.day) + " days to Lantern Night" : S.day === SEASON_END ? "Lantern Night" : "winter") + "}");
  print(art[2] + "   {dim:" + clock(S.min) + ", " + w.word + "}");
  print("");
  await pause(300);
  if (fellAsleep) await type("You wake up at the desk with your face on your arm and a stiff neck. At some point in the night Biscuit got on your back and went to sleep there.", 70);
  else await type(MORNINGS[S.day] || pick([
    w.rain ? "It's raining. You lie and listen to it on the roof for a bit before you get up." : w.snow ? "It's snowed, and everything outside has gone very quiet." : "The sun's coming through the gap in the curtains.",
    "Biscuit is downstairs telling the whole house that she hasn't had breakfast.",
    "Somebody across the lake has lit a fire already. You can smell it from the bed."
  ]), 70);
  const o = S.flags.overnight || [];
  const grew = o.filter(x => x !== "dry");
  if (grew.length) print("{ok:From the window you can see the " + [...new Set(grew)].join(" and the ") + " in the garden " + (grew.length > 1 ? "are" : "is") + " ready.}");
  else if (o.includes("dry")) print("{dim:Something in the garden didn't get watered yesterday, so it hasn't grown.}");
  if (S.mailbox.length) { sfx("mail"); print("{acc:There's post on the mat}, " + (S.mailbox.length === 1 ? "one letter." : plural(S.mailbox.length, "letter") + ".") + " {cmd:mail}"); }
  if (S.day === SEASON_END + 1) print("{dim:It snowed in the night. The first of the winter.}");
  print("");
}

/* ---------- the sticky note on the monitor ---------- */
const POSTITS = [
  "the switch is at the BACK. — W.",
  "LEFT side of the kettle.",
  "Margaret (attic, spider). do not hoover.",
  "tap me if you're stuck",
  "Fenn's bees have names. he won't say what.",
  "fog + dawn = the carp.",
  "Pip will try to hack you. let her.",
  "it's not the freezer.",
  "J. owes me. whatever she says.",
  "rain = no watering. go fishing.",
  "the trunk key is on Biscuit.",
  "look west tonight.",
  "nearly.",
  "tonight. the dock."
];
function updatePostit() {
  const p = $("postit");
  if (!p) return;
  const t = S.flags.answered ? "you answered it. — W." : S.flags.lanternLit ? "thank you. — W." : POSTITS[Math.min(S.day, POSTITS.length) - 1] || "tap me if you're stuck ♥";
  if (p.textContent !== t) p.textContent = t;
}

/* ---------- the paper card beside the window ---------- */
let cardSig = "";
/** The bottom of the card: what's in your coat, and what you last pinned up. Scribbled. */
function cardNotes() {
  const carried = Object.keys(S.inv).filter(k => !k.startsWith("seed:")).map(k => itemName(k, S.inv[k]).replace(/^an? /, ""));
  const seeds = Object.keys(S.inv).filter(k => k.startsWith("seed:")).reduce((n, k) => n + S.inv[k], 0);
  if (seeds) carried.push(plural(seeds, "seed"));
  const pinned = Object.entries(S.clues || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => CLUES[k] && CLUES[k].title).filter(Boolean);
  let h = "";
  if (carried.length) h += '<div class="scrawl"><b>in my coat</b> ' + esc(carried.slice(0, 6).join(", ")) + (carried.length > 6 ? "…" : "") + "</div>";
  if (pinned.length) h += '<div class="scrawl"><b>on the board</b> ' + esc(pinned.join(" · ")) + "</div>";
  return h;
}
function updateCard() {
  const c = $("card");
  if (!c) return;
  const w = weatherNow();
  const unread = S.mailbox.length;
  const goal = nextGoal();
  const html =
    '<div class="ttl">day ' + S.day + " · " + dayName(S.day) + "</div>" +
    '<div class="big">' + clock(S.min) + "</div>" +
    '<div class="row"><span>' + dateStr(S.day) + "</span><span>" + w.name + "</span></div>" +
    '<div class="sep"></div>' +
    '<div class="row"><span>warmth</span><span>' + (fireLit() ? "fire lit" : teaWarm() ? "tea's on" : "") + "</span></div>" +
    '<div class="meter"><i style="width:' + Math.round(S.warmth) + '%"></i></div>' +
    '<div class="sep"></div>' +
    '<div class="row pk"><span>Biscuit</span><span>' + S.cat.room + "</span></div>" +
    '<div class="row pk opt"><span>post</span><span>' + (unread ? unread + " new!" : "—") + "</span></div>" +
    '<div class="row pk opt"><span>lantern night</span><span>' + (S.flags.lanternLit ? "lit ✓" : S.day > SEASON_END ? "waiting" : SEASON_END - S.day === 0 ? "TONIGHT" : "in " + (SEASON_END - S.day) + " days") + "</span></div>" +
    '<div class="note">' + esc(goal) + "</div>" + cardNotes();
  if (html !== cardSig) { c.innerHTML = html; cardSig = html; }
}
function nextGoal() {
  if (!S.name) return "";
  if (!S.read["/cottage/study/note.txt"]) return "read Wren's note";
  if (S.mailbox.length) return "you've got post";
  if (S.min >= 22 * 60) return "it's late. bed, maybe?";
  const t = plain(hintText()).replace(/^hint: /, "");
  return t.length > 90 ? t.slice(0, 88) + "…" : t;
}

/* ---------- keycaps that change with the room ---------- */
function contextKeys() {
  const r = roomName();
  const k = [];
  const per = {
    hall: ["look", "ls", "todo"],
    kitchen: ["brew", "feed biscuit", "cook"],
    parlour: ["stoke", "sit", "play record", "ls bookshelf"],
    study: ["board", "mail", "radio"],
    garden: ["garden", "water", "harvest", "plant"],
    greenhouse: ["garden", "harvest", "plant moonflower"],
    dock: ["fish", "row", "look water"],
    cellar: ["listen", "take lamp", "look"],
    attic: ["look", "ls trunk", "cd ../roof"],
    roof: ["sky", "cat star_notes.txt"]
  };
  if (!S.name) return [];
  k.push(...(per[r] || ["look", "ls"]));
  if (r === "dock" && S.disks.lantern) k.push("lantern");
  if (catHere()) k.push("pet biscuit");
  if (S.mailbox.length && !k.includes("mail")) k.push("mail");
  const nd = nodeAt(S.cwd);
  if (nd && (nd.room || S.cwd === HOME)) for (const d of doorsOf(r)) k.push("cd " + d);
  else k.push("cd ..");
  if (S.min >= 20 * 60 || S.min < 6 * 60) k.push("sleep");
  if (!S.read["/cottage/study/note.txt"] && r === "study") k.unshift("cat note.txt");
  k.push("hint", "⇥ tab", "↑ again");
  return [...new Set(k)];
}

function applyTheme() {
  document.body.dataset.theme = S.theme;
  if (S.fs) document.documentElement.style.setProperty("--fs", S.fs + "px");
}

function checkBooks() {
  if (Object.keys(BOOKS).every(b => S.read["/cottage/parlour/bookshelf/" + b])) keepsake("bookworm");
}

/** Runs after every command. */
function afterCommand() {
  updateCard();
  updatePostit();
  setKeys(contextKeys());
  if (S.min >= 25 * 60 + 30 && !T.ending) { T.busy = true; nodOff().then(() => { T.busy = false; showLine(true); }); }
  save();
}

/* ---------- Lantern Night ---------- */
function lanternStatus() {
  if (S.flags.lanternLit) return "Lit. A steady blue-gold flame." + (S.flags.answered ? "" : " The cable beside it is warm.");
  const need = [];
  if (!S.disks.lantern) need.push("the lantern disk installed in HEARTH");
  if (!has("wick")) need.push("a wick");
  if (!has("moonflower")) need.push("a moonflower (for the oil)");
  if (!has("matches")) need.push("matches");
  return "An iron lantern on a pole. The glass has been cleaned recently.\n" +
    (need.length ? "{dim:It needs: " + need.join(", ") + ".}" : "{ok:It has everything it needs.} " + (S.day >= SEASON_END ? "{dim:After dark: {cmd:lantern}.}" : "{dim:The 25th.}"));
}

async function doLantern() {
  if (roomName() !== "dock") return print("The lantern's on the dock. {cmd:cd dock}");
  if (S.flags.lanternLit) {
    print("It's lit. You stand by it for a while." + (S.flags.answered ? "" : " {dim:(up at the house, the cellar is still humming that new note.)}"));
    return;
  }
  const missing = [];
  if (!has("wick")) missing.push("a wick {dim:(Wren's trunk)}");
  if (!has("moonflower")) missing.push("a moonflower {dim:(greenhouse, harvested at night)}");
  if (!has("matches")) missing.push("matches {dim:(kitchen drawer)}");
  if (S.day < SEASON_END) {
    print("Not yet. It's for Lantern Night, " + dateStr(SEASON_END) + ", " + plural(SEASON_END - S.day, "day") + " away.");
    print(missing.length ? "{dim:You'll need: " + missing.join(", ") + ".}" : "{ok:You've got everything it needs.}");
    S.flags.lanternReady = !missing.length;
    return;
  }
  if (missing.length) return print("You'll need: " + missing.join(", ") + ".\n{dim:(they'll wait. Ottoline said.)}");
  if (S.min < 18 * 60 && S.min >= 6 * 60) return print("It's still light. After dark. {dim:(from 6pm.)}");
  await lanternFinale();
}

async function lanternFinale() {
  T.ending = true;
  const late = S.day > SEASON_END;
  take("wick"); take("moonflower");
  S.flags.lanternLit = true;
  S.flags.radioOn = null;
  keepsake("lantern");
  clearScreen();
  await pause(500);
  await type(late ? "It isn't the 25th any more. They've waited anyway. There are boats on the water, in the dark." : "It's dark. Out on the lake there are oars, and low voices, and somebody laughing and being shushed. The whole Hollow is out there, waiting.", 45);
  await pause(700);
  await type("You open the little glass door, fit the wick, and press the moonflower into the oil cup. It glows faintly in your fingers. Blue-gold.", 45);
  await pause(700);
  await type("You strike a match.", 35);
  sfx("crackle");
  await pause(1200);
  print("");
  const W2 = 46;
  const lake = (lights) => {
    const sky = "{dim:" + " .    *        .      *    .        *    .   ".slice(0, W2) + "}";
    const hill = "{dim:" + "        ___/^\\___         _/o\\_              ".slice(0, W2) + "}";
    let boats = "", water = "";
    for (let i = 0; i < W2; i++) {
      boats += lights.includes(i) ? "{acc:o}" : " ";
      water += lights.includes(i) ? "{acc:|}" : "{sky:" + (i % 4 === 0 ? "-" : "~") + "}";
    }
    return [sky, hill, boats, water, "{dim:" + "~ ".repeat(W2 / 2) + "}", "{hi:                                        [#]}{dim: <- you}"];
  };
  const lit = [];
  const order = [40, 33, 36, 27, 30, 22, 24, 18, 14, 16, 10, 7, 12, 4, 2, 20, 26, 38, 9, 44];
  const box = printRaw("");
  const render = () => { box.innerHTML = lake(lit).map(l => fmt(l)).join("<br>"); scrollDown(); };
  render();
  await pause(900);
  print("{acc:It catches.} A small steady flame, blue-gold.");
  sfx("chime");
  await pause(1400);
  await type("Then, out on the water, one light. Then another.", 45);
  for (const i of order) { lit.push(i); render(); sfx("tick"); await pause(T.skip ? 0 : 240); }
  await pause(600);
  print("");
  print("{acc:OTTOLINE} {dim:(far too loud):} There it is!");
  await pause(900);
  print("{sky:PIP} {dim:(waving a torch in circles):} HELLO! HELLO!");
  await pause(900);
  print("{ok:FENN} {dim:(from the hill, to nobody):} Good.");
  await pause(900);
  print("{hi:JUNIPER} {dim:(the dome opens across the water. a lamp in the slit flashes three times.)}");
  await pause(1600);
  print("");
  await type("You count the boats. Twenty.", 45);
  await pause(800);
  await type("You count the lights on the water.", 45);
  await pause(1200);
  await type("Twenty-one. One of them is a long way under the surface, and it isn't moving with the others.", 45);
  clue("count"); clue("lights");
  await pause(1500);
  print("");
  await type("Up at the house, through the open back door, you hear the hum in the cellar change its note.", 45);
  print("");
  print("{dim:(the lantern is lit. Lantern Night is done. the night isn't, if you want it.)}");
  remember("lit the lantern. twenty boats, twenty-one lights. the cellar changed its note.");
  T.ending = false;
  spend(30);
  save();
}
