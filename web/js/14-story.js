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

async function morning(fellAsleep) {
  const w = weatherFor(S.day);
  const art = WEATHER_ART[w.name] || WEATHER_ART.clear;
  print("");
  print(art[0] + "   {hi:" + dayName(S.day) + ", " + dateStr(S.day) + "}");
  print(art[1] + "   {dim:" + (S.day <= SEASON_END ? "day " + S.day + " of the season · " + (SEASON_END - S.day === 0 ? "it's LANTERN NIGHT" : (SEASON_END - S.day) + " days to Lantern Night") : "winter, in the Hollow") + "}");
  print(art[2] + "   {dim:" + clock(S.min) + " · " + w.word + "}");
  print("");
  await pause(400);
  if (fellAsleep) await type("You wake at the desk with a crick in your neck and a cat on your back. The screen says hello.", 50);
  else await type(pick([
    "You wake up to " + (w.rain ? "rain on the roof" : w.snow ? "the particular silence of snow" : w.fog ? "a white, muffled world" : "light through the curtains") + " and the sound of Biscuit announcing that she is starving.",
    "Morning. The house creaks itself awake around you. Downstairs, Biscuit is shouting about breakfast.",
    "You wake slowly. For a second you forget where you are — then you smell woodsmoke and remember, and it's good."
  ]), 50);
  const o = S.flags.overnight || [];
  const grew = o.filter(x => x !== "dry");
  if (grew.length) print("{ok:Overnight, in the garden: the " + [...new Set(grew)].join(" and the ") + (grew.length > 1 ? " are" : " is") + " ready.}");
  else if (o.includes("dry")) print("{dim:(something in the garden looked thirsty yesterday and didn't grow. water before bed.)}");
  if (w.rain && S.plots.some(p => p.crop)) print("{sky:(it's raining — the garden's watering itself today.)}");
  if (S.mailbox.length) { sfx("mail"); print("{acc:There's post!} " + plural(S.mailbox.length, "letter") + " on the mat. {cmd:mail}"); }
  if (S.day === SEASON_END) print("{warn:It's Lantern Night.} {dim:(tonight, after dark, on the dock.)}");
  if (S.day === SEASON_END + 1 && S.flags.lanternLit) print("{dim:Downstairs, someone is already making tea. Someone who knows to thump the kettle on the left.}");
  if (S.day === SEASON_END + 1) print("{hi:It snowed in the night.} {dim:(winter's here. the screen's gone frosty to match. {cmd:theme} to change it.)}");
  print("");
}

/* ---------- the sticky note on the monitor ---------- */
const POSTITS = [
  "the switch is at the BACK. everyone looks at the front. — W.",
  "LEFT side of the kettle!! not the right. the right has feelings.",
  "Margaret (spider, attic) pays rent in flies. do NOT hoover.",
  "tap me if you're stuck ♥",
  "Fenn says the bees have names. Fenn won't say what they are.",
  "fog + dawn = Old Marmalade. I'm just saying.",
  "Pip will try to hack you. let her.",
  "the cellar hums. it's the freezer. (it's not the freezer.)",
  "Juniper owes me. whatever she says.",
  "if it rains, the garden waters itself. go fishing instead.",
  "the trunk key is on Biscuit. earn it.",
  "look up tonight, if it's clear.",
  "nearly there, love.",
  "tonight. the dock. the lantern. you've got this."
];
function updatePostit() {
  const p = $("postit");
  if (!p) return;
  const t = S.flags.lanternLit ? "you did it. thank you, love. — W. x" : POSTITS[Math.min(S.day, POSTITS.length) - 1] || "tap me if you're stuck ♥";
  if (p.textContent !== t) p.textContent = t;
}

/* ---------- the paper card beside the window ---------- */
let cardSig = "";
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
    '<div class="note">' + esc(goal) + "</div>";
  if (html !== cardSig) { c.innerHTML = html; cardSig = html; }
}
function nextGoal() {
  if (!S.name) return "";
  if (!S.read["/cottage/welcome.txt"]) return "read Wren's letter";
  if (S.mailbox.length) return "you've got post";
  if (S.min >= 22 * 60) return "it's late. bed, maybe?";
  const t = plain(hintText()).replace(/^Wren's voice, in your head: /, "");
  return t.length > 90 ? t.slice(0, 88) + "…" : t;
}

/* ---------- keycaps that change with the room ---------- */
function contextKeys() {
  const r = roomName();
  const k = [];
  const per = {
    hall: ["look", "ls", "map", "todo", "cat welcome.txt"],
    kitchen: ["brew", "feed biscuit", "cook", "ls recipes"],
    parlour: ["stoke", "sit", "play record", "ls bookshelf"],
    study: ["mail", "radio", "insert", "ls desk"],
    garden: ["garden", "water", "harvest", "plant", "chop"],
    greenhouse: ["garden", "harvest", "plant moonflower"],
    dock: ["fish", "row", "sit"],
    cellar: ["take jam", "take lamp", "look"],
    attic: ["look", "ls trunk", "cd ../roof"],
    roof: ["sky", "cat star_notes.txt"]
  };
  if (!S.name) return [];
  k.push(...(per[r] || ["look", "ls"]));
  if (r === "dock" && S.disks.lantern) k.push("lantern");
  if (catHere()) k.push("pet biscuit");
  if (S.mailbox.length && !k.includes("mail")) k.push("mail");
  if (r !== "hall") k.push("cd ..");
  if (S.min >= 20 * 60 || S.min < 6 * 60) k.push("sleep");
  k.push("hint", "map", "⇥ tab", "↑ again");
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
  if (S.flags.lanternLit) return "The lantern is lit, burning a steady blue-gold. Across the water, a hundred little lights answer it.";
  const need = [];
  if (!S.disks.lantern) need.push("the lantern disk installed in HEARTH");
  if (!has("wick")) need.push("a wick");
  if (!has("moonflower")) need.push("a moonflower (for the oil)");
  if (!has("matches")) need.push("matches");
  return "An iron lantern on a pole, black with age, its glass clean. A brass plate on the post: {acc:FIRST LIGHT — LANTERN NIGHT}.\n" +
    (need.length ? "{dim:It'll need: " + need.join(", ") + ".}" : "{ok:Everything's ready.} " + (S.day >= SEASON_END ? "{dim:After dark: {cmd:lantern}.}" : "{dim:Now it just needs to be the 25th.}"));
}

async function doLantern() {
  if (roomName() !== "dock") return print("The lantern's on the dock. {cmd:cd dock}");
  if (S.flags.lanternLit) {
    print("The lantern's lit. You stand by it a while. Out on the water the little lights bob and turn, and somebody — Pip, definitely Pip — is waving a torch at you in circles.");
    return;
  }
  const missing = [];
  if (!has("wick")) missing.push("a wick {dim:(Wren's trunk)}");
  if (!has("moonflower")) missing.push("a moonflower {dim:(greenhouse, harvested at night)}");
  if (!has("matches")) missing.push("matches {dim:(kitchen drawer)}");
  if (S.day < SEASON_END) {
    print("Not yet. It's for Lantern Night — " + dateStr(SEASON_END) + ", " + plural(SEASON_END - S.day, "day") + " away.");
    print(missing.length ? "{dim:You'll need: " + missing.join(", ") + ".}" : "{ok:But you've got everything it needs.} {dim:You can feel it wanting to be lit. Patience.}");
    S.flags.lanternReady = !missing.length;
    return;
  }
  if (missing.length) return print("You'll need: " + missing.join(", ") + ".\n{dim:(no rush. Ottoline says they'll wait on the water as long as it takes. they always have.)}");
  if (S.min < 18 * 60 && S.min >= 6 * 60) return print("It's still light. Lanterns are for after dark. {dim:(come back after 6pm. everyone will be on the water by then.)}");
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
  await type(late ? "It isn't the 25th any more. It doesn't matter. Ottoline said they'd wait, and they have: there are boats out on the dark water, waiting." : "It's dark. Out on the lake you can hear oars, and low voices, and someone laughing. The whole Hollow is out there in the dark, waiting.", 42);
  await pause(800);
  await type("You open the lantern's little glass door. You fit the new wick, and press the moonflower into the oil cup.", 42);
  await type("It glows faintly in the dark, like it's remembering the moon.", 42, "dim");
  await pause(800);
  await type("You strike a match.", 30);
  sfx("crackle");
  await pause(1200);
  print("");
  const frames = [];
  const W2 = 46;
  const lake = (lights) => {
    const sky = "{dim:" + " .    *        .      *    .        *    .   ".slice(0, W2) + "}";
    const hill = "{dim:" + "        ___/^\\___         _/o\\_              ".slice(0, W2) + "}";
    let boats = "", water = "";
    for (let i = 0; i < W2; i++) {
      boats += lights.includes(i) ? "{acc:o}" : " ";
      water += lights.includes(i) ? "{acc:|}" : "{sky:" + (i % 4 === 0 ? "-" : "~") + "}";
    }
    return [sky, hill, boats, water, "{dim:" + "~ ".repeat(W2 / 2) + "}", "{hi:                                        [#]}{dim: <- you}", "{dim:  ======================================|====}"];
  };
  const lit = [];
  const order = [40, 33, 36, 27, 30, 22, 24, 18, 14, 16, 10, 7, 12, 4, 2, 20, 26, 38, 9, 44];
  const box = printRaw("");
  const render = () => { box.innerHTML = lake(lit).map(l => fmt(l)).join("<br>"); scrollDown(); };
  render();
  await pause(900);
  print("{acc:The lantern catches.} A blue-gold flame, small and steady.");
  sfx("chime");
  await pause(1500);
  await type("For a moment, nothing. Then — out on the water — one light. Then another.", 40);
  for (const i of order) { lit.push(i); render(); sfx("tick"); await pause(T.skip ? 0 : 260); }
  await pause(600);
  print("");
  await type("A cheer comes across the water, thin and happy.", 40);
  await pause(500);
  print("{acc:OTTOLINE} {dim:(from a boat, far too loudly):} THERE IT IS! THERE IT IS! I SAID IT WOULD BE!");
  await pause(900);
  print("{sky:PIP} {dim:(waving a torch in circles):} HELLOOOOOOO! THAT'S MY FRIEND! I TAUGHT THEM EVERYTHING!");
  await pause(900);
  print("{ok:FENN} {dim:(from the hill, to nobody):} ...Good.");
  await pause(900);
  print("{hi:JUNIPER} {dim:(the observatory dome, swinging open, a lamp in the slit):} {dim:(she flashes it three times. you don't know what it means. you know exactly what it means.)}");
  await pause(1500);
  print("");
  await type("And then, from further out, a sound you don't expect: a ship's horn. Low, and long.", 40);
  sfx("owl");
  await pause(900);
  await type("The ferry, lit up like a birthday cake, has stopped in the middle of the lake. Someone on the deck in a yellow mac is waving with both arms.", 40);
  await pause(900);
  await type("A rowing boat comes out to meet it. Then, slowly, it comes to your dock.", 40);
  await pause(1200);
  print("");
  await type("She's smaller than you remember, and browner, and her hat is new and terrible.", 40);
  await pause(600);
  print("{acc:WREN:} " + esc(NAME()) + ". Look at you. Look at it.");
  await pause(1000);
  print("{acc:WREN:} I saw it from the ferry. I told the captain, I said, that's my lantern. That's my house. And he said, who lit it, then? And I said —");
  await pause(1400);
  print("{acc:WREN:} — well. I said someone who belongs here.");
  await pause(1500);
  print("");
  await type("Biscuit trots down the dock. She looks up at Wren for a long moment. Then she turns round and sits, very deliberately, on your foot.", 40);
  await pause(900);
  print("{acc:WREN:} {dim:(laughing so hard she has to hold the lantern post)} Well. That settles that, then.");
  await pause(1500);
  print("");
  print("{dim:You stand on the dock together, and the three of you watch the lights on the water for a long, long time.}");
  await pause(2200);
  print("");
  print("{hi:              ~  THE END (of autumn)  ~}");
  print("");
  const keeps = Object.keys(S.keeps).length;
  const st = [
    ["days in the cottage", S.day], ["cups of tea", S.stats.teas], ["fish caught", S.stats.fish], ["things grown", S.stats.harvests],
    ["meals", S.stats.meals], ["parcels sent", S.stats.gifts], ["times you petted Biscuit", S.stats.pets], ["keepsakes in the jar", keeps + "/" + Object.keys(KEEPSAKES).length]
  ];
  for (const [k, v] of st) print("   {dim:" + pad(k, 28, ".") + "} {acc:" + v + "}");
  print("");
  print("{dim:   the season turns. winter comes to the Hollow. the cottage is yours for as long as you like —}");
  print("{dim:   there's still Old Marmalade, and stars, and post, and a jar to fill.}");
  print("");
  S.mailbox.push("wren_home"); S.letters.push("wren_home");
  remember("LANTERN NIGHT. lit the lantern. Wren came home on the ferry. Biscuit sat on MY foot.");
  T.ending = false;
  spend(60);
  save();
}
