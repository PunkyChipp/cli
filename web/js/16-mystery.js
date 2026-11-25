/* =====================================================================
   16-mystery.js — what's in the lake.

   In October 1962, two fourteen-year-olds on the end of the dock
   flashed a torch at a comet three times, and the lake flashed back.
   Wren spent the rest of her life trying to answer it properly: the
   cable, the receiver in the cellar, the nightly log, Lantern Night.
   This autumn the comet comes back. Wren has gone to be on the water
   off Tórshavn with the only other person who's been listening.

   Nothing here is told to the player directly. It's found, pinned to
   the corkboard (`board`), and worked out. The real ending only opens
   if the player knows the comet's name — which the game never says
   outright unless Juniper decides to tell you.
   ===================================================================== */
"use strict";

/* ---------- the corkboard ---------- */
const CLUES = {
  // the cellar
  hum:    { thread: "the cellar", title: "The hum", hint: "something in the cellar", links: ["cable", "listen"],
            text: () => "The beige box in the cellar hums all the time, day and night. Someone has taped a note to it saying it's the freezer. The freezer isn't even plugged in." },
  cable:  { thread: "the cellar", title: "The cable", hint: "where does the box's cable go?", links: ["hum", "lights"],
            text: () => "There's a cable from the box in the cellar that goes out under the garden, along the dock, and straight down into the lake. Wren laid it in 1987. In the margin of her manual she wrote \"down, not up.\"" },
  listen: { thread: "the cellar", title: "listen", hint: "Wren ran something down there, at night", links: ["hum", "r777", "log", "ask"],
            text: () => "Wren had a program called {cmd:listen} that she ran in the cellar most nights. As far as I can tell it reads whatever is coming up the cable." },
  r777:   { thread: "the cellar", title: "77.7", hint: "there's something on the radio, between the stations", links: ["listen"],
            text: () => "If you tune the radio to 77.7 there's a flat voice saying one word at a time, kettle, light, three. I'm fairly sure it's HEARTH reading out the signal, using whatever words it happens to know." },
  log:    { thread: "the cellar", title: "The log", hint: "Wren would have written it down", links: ["listen", "tor", "origin"],
            text: () => "Wren has written the signal down every night since 1987, in /var/log/listen. It has never once been zero. It goes up every year on the 25th of October." },
  tor:    { thread: "the cellar", title: "TÓR", hint: "someone else is in the log", links: ["log"],
            text: () => "From 1988 onwards the log mentions another station picking up the same signal, call sign TÓR, in the Faroe Islands. So somebody else has been listening all this time." + (S.flags.metAsa ? " Her name is Ása, and that's where Wren has gone." : "") },
  // the lake
  lights: { thread: "the lake", title: "Lights in the water", hint: "people say they've seen things in the lake at night", links: ["cable", "colour", "count"],
            text: () => "Some nights there's a light a long way down in the lake, blue-gold, moving slowly. Pip says she's seen it. I've seen it now too." },
  colour: { thread: "the lake", title: "The colour", hint: "Wren left a note in the greenhouse", links: ["lights"],
            text: () => "Moonflowers give off the same blue-gold as the light in the lake. Wren noticed. Her note says it isn't a coincidence but she doesn't know what it is." },
  count:  { thread: "the lake", title: "Count the lights", hint: "an old photograph", links: ["lights", "origin"],
            text: () => "There's a photo of the first Lantern Night, in 1974. If you count, there are more lights on the water than there were boats." },
  origin: { thread: "the lake", title: "Why Lantern Night", hint: "how did Lantern Night start?", links: ["count", "log"],
            text: () => "Lantern Night was Wren's idea, in 1974, and the signal has jumped on that night every year since. I don't think the lanterns are for the village. I think they're an answer." },
  // 1962
  bottle: { thread: "1962", title: "The bottle", hint: "the lake keeps things. go fishing", links: ["1962", "comet"],
            text: () => "I fished a bottle out of the lake with a note from 1962 in it, from Wren and Juniper when they were fourteen. They flashed a torch at the comet three times, and the lake flashed back." },
  "1962": { thread: "1962", title: "October 1962", hint: "Wren kept a diary, somewhere locked", links: ["bottle", "name"],
            text: () => "In Wren's diary from 1962 she says the whole bay lit up that night, \"like a shoal of lamps, all swimming the same way.\"" },
  comet:  { thread: "1962", title: "The comet", hint: "Juniper knows the sky", links: ["bottle", "name"],
            text: () => "The comet comes back every sixty-four years, so 1962 and now. It\'s low in the west after dark." + (S.flags.sawComet ? " I\'ve seen it through the telescope." : "") },
  name:   { thread: "1962", title: "Its name", hint: "what did they call it?", links: ["1962", "comet", "ask"],
            text: () => S.flags.nameKnown ? "Juniper told me in the end. They called it {acc:the Lantern Fish}, after what came up out of the water." : "They gave the comet a name, after whatever they saw in the lake. Wren promised not to write it down, so the diary only has the first letters, L and F." },
  ask:    { thread: "1962", title: "If it asks", hint: "Wren left something in her trunk", links: ["name", "listen"],
            text: () => "From Wren\'s letter in the trunk: \"if it ever asks you something, answer with its name. you\'ll know when.\"" }
};
const THREADS = ["the cellar", "the lake", "1962"];

function clue(id) {
  if (!S.clues) S.clues = {};
  if (S.clues[id] || !CLUES[id]) return;
  S.clues[id] = S.day;
  toast("pinned to the board: <b>" + CLUES[id].title + "</b>");
  sfx("page");
  if (!S.flags.boardHinted) { S.flags.boardHinted = true; setTimeout(() => { if (!T.busy) { print("{dim:you pin it to the corkboard in the study. {cmd:board} to see it.}"); showLine(true); } }, 50); }
}

function doBoard() {
  const found = S.clues || {};
  const n = Object.keys(found).length, total = Object.keys(CLUES).length;
  print("{hi:THE CORKBOARD}  {dim:cork, drawing pins, red wool · " + n + " of " + total + " pinned}");
  if (!n) { print(""); print("{dim:Nothing pinned yet. Wren's note said to ignore the noise in the cellar.}"); return; }
  for (const th of THREADS) {
    const cards = Object.entries(CLUES).filter(([, c]) => c.thread === th);
    const seen = cards.filter(([k]) => found[k]);
    const near = cards.filter(([k, c]) => !found[k] && c.links.some(l => found[l]));
    if (!seen.length && !near.length) continue;
    print("");
    print("{acc:── " + th + " " + "─".repeat(Math.max(2, 34 - th.length)) + "}");
    for (const [, c] of seen) { print("  {hi:" + c.title + "}"); printRaw(fmt(c.text()), "ind"); }
    for (const [, c] of near) print("  {dim:?  " + c.hint + "}");
  }
  const hidden = Object.entries(CLUES).filter(([k, c]) => !found[k] && !c.links.some(l => found[l])).length;
  if (hidden) { print(""); print("{dim:and some string going off the edge of the board, to nothing yet.}"); }
}

/* ---------- the signal ---------- */
const cometNear = () => S.day >= 10 && S.day <= 18;
const asking = () => S.flags.lanternLit && isNight() && !S.flags.answered;
function signalLevel() {
  if (S.flags.answered) return 0.31;
  if (asking()) return 1;
  let s = 0.06 + Math.min(S.day, 14) / 14 * 0.55;
  if (isNight()) s += 0.08;
  if (cometNear()) s += 0.12;
  if (S.day > 18) s *= 0.6;
  return Math.min(0.97, s + (seeded(S.day * 31 + Math.floor(S.min / 30))() - 0.5) * 0.04);
}
const WORDS_LOW = ["kettle", "kettle", "water", "light", "cat", "three"];
const WORDS_HIGH = ["three", "three", "light", "light", "water", "home", "soon"];
function heard(level) {
  const pool = level > 0.5 ? WORDS_HIGH : WORDS_LOW;
  const r = seeded(S.day * 7 + Math.floor(S.min / 20));
  const n = level > 0.6 ? 4 : level > 0.3 ? 3 : 2;
  return Array.from({ length: n }, () => pool[Math.floor(r() * pool.length)]).join(" . ");
}

/** What you see if you look into the water off the dock. */
function lakeLook() {
  const w = weatherNow();
  if (roomName() !== "dock") return "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~";
  if (!isNight()) return w.fog > 0.5 ? "Grey water going into grey fog." : "Brown-green water, clear for a metre or so, then dark. The cable goes down into it.";
  const lvl = signalLevel();
  if (S.flags.answered) return "The lake is dark and calm. Every so often, far down, something gold turns over, like it's asleep.";
  if (w.rain >= 1 || w.fog > 0.6) return "Black water, rain-pocked. You can't see into it.";
  // patience: keep looking and your eyes adjust. a minute's staring is worth more than one glance.
  const streak = S.flags.lookAt === S.day * 1440 + Math.floor(S.min / 30) ? (S.flags.lookStreak || 0) + 1 : 1;
  S.flags.lookAt = S.day * 1440 + Math.floor(S.min / 30); S.flags.lookStreak = streak;
  spend(3);
  if (lvl > 0.3 && (streak >= 3 || (lvl > 0.45 && chance(0.25 + lvl * 0.6)))) {
    clue("lights");
    return "You keep looking. Your eyes get used to the dark.\n\nThen, a long way down, further than the water should go, there's a light. Blue-gold. It turns slowly, and goes out.";
  }
  if (streak === 2) return lvl > 0.3 ? "You crouch at the edge and wait. The stars in the water settle. There's something down there, or your eyes are making it up." : "You wait. Nothing but your reflection and the cable.";
  return pick(["Black water, the stars in it, and the cable going down.", "Black water. Your face in it, and the stars.", "Dark. The cable disappears into it after about a foot."]);
}

/* ---------- listen ---------- */
async function doListen(args) {
  const a = args.join(" ");
  if (/^(-h|--help|help)/.test(a)) {
    print("{hi:listen}  read the receiver in the cellar");
    print("  {cmd:listen}               take a reading");
    print("  {cmd:listen --log}         readings since you arrived");
    print("  listen --reply WORDS   send words back down the cable {dim:disabled until it asks}");
    return;
  }
  if (roomName() !== "cellar") return print("listen: the receiver's in the cellar. {dim:{cmd:cd cellar}}");
  clue("listen"); clue("hum");
  if (/^--log/.test(a)) return listenLog();
  const rm = a.match(/^(--reply|-r|reply)\s*(.*)$/);
  if (rm) return doReply(rm[2]);
  const lvl = signalLevel();
  print("{dim:the box clicks. the hum changes pitch, very slightly.}");
  const bar = printRaw("");
  let dots = "";
  for (let i = 0; i < 22; i++) {
    dots += Math.random() < lvl ? ":" : "·";
    bar.innerHTML = fmt("  listening {sky:" + dots + "}");
    await pause(70);
  }
  print("  signal {hi:" + lvl.toFixed(2) + "}" + (lvl > 0.5 ? "  {acc:(strong)}" : lvl > 0.25 ? "  {dim:rising}" : ""));
  if (S.flags.answered) { print("  heard: {dim:...}"); print("{dim:it's quiet now. not gone. resting.}"); return; }
  if (asking()) {
    await pause(400);
    print("  heard: {acc:three . three . three}");
    await pause(500);
    print("  heard: {warn:NAME ?}");
    await pause(300);
    print("{dim:the green light on the box has stopped blinking. it's on. it's waiting.}");
    print("{dim:listen --reply ...}");
    S.flags.sawAsk = true;
    return;
  }
  print("  heard: {sky:" + heard(lvl) + "}");
  if (!S.flags.listenedOnce) { S.flags.listenedOnce = true; remember("ran Wren's listen program in the cellar. it said 'kettle'. I don't know what to do with that."); }
}

function listenLog() {
  print("{dim:readings, this month (full log: {cmd:ls /var/log/listen}):}");
  for (let d = Math.max(1, S.day - 9); d <= S.day; d++) {
    const r = seeded(d * 13)();
    const v = Math.min(0.97, 0.06 + Math.min(d, 14) / 14 * 0.55 + (d >= 10 && d <= 18 ? 0.12 : 0) + r * 0.05);
    print("  " + pad(dateStr(d).toLowerCase(), 12) + " " + "{sky:" + "▮".repeat(Math.round(v * 20)) + "}" + "{dim:" + "·".repeat(20 - Math.round(v * 20)) + "} " + v.toFixed(2));
  }
  clue("log");
}

async function doReply(words) {
  const w = (words || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return print("reply with what? {dim:listen --reply WORDS}");
  if (!asking()) {
    sfx("bonk");
    return print("listen: reply disabled. {dim:hearth.conf: reply = disabled  # until it asks}");
  }
  if (!["lanternfish", "thelanternfish"].includes(w)) {
    S.flags.wrongReplies = (S.flags.wrongReplies || 0) + 1;
    print("{dim:you send it.} The hum holds the same note, patient. That wasn't it.");
    if (S.flags.wrongReplies >= 2) print("{dim:Wren: \"answer with its name.\" the name of what? what did they see, in 1962? the board might help: {cmd:board}}");
    return;
  }
  await trueEnding();
}

/* ---------- the other ending ---------- */
async function trueEnding() {
  T.ending = true;
  S.flags.answered = true;
  clue("name");
  print("You type it in, slowly, and press enter.");
  await pause(900);
  print("");
  print("{dim:the hum stops.}");
  await pause(1600);
  await type("The hum stops, and you realise you've never heard the cellar completely quiet before. The box clicks three times. The green light goes out.", 38);
  await pause(800);
  await type("You go up the cellar steps two at a time and out of the back door and down the garden. You're in your socks and the grass is soaking and you don't care.", 38);
  await pause(800);
  await type("The boats are all still out on the water, and nobody on any of them is saying anything.", 38);
  await pause(1000);
  print("");
  const W2 = 46;
  const box = printRaw("");
  for (let f = 0; f <= 14; f++) {
    const rows = [];
    rows.push("{dim:" + " .    *        .      *   " + "{acc:*==--- -  -}" + "      .  }");
    rows.push("{dim:        ___/^\\___         _/o\\_              }");
    let boats = "", water = "", deep = "", deeper = "";
    for (let i = 0; i < W2; i++) {
      boats += i % 5 === 2 ? "{acc:o}" : " ";
      water += "{sky:~}";
      const lit = Math.abs(((i + f * 3) % W2) - W2 / 2) < f * 1.6;
      deep += lit && (i + f) % 3 === 0 ? "{acc:*}" : lit ? "{hi:.}" : " ";
      deeper += lit && (i * 7 + f) % 5 === 0 ? "{acc:°}" : " ";
    }
    rows.push(boats, water, deep, deeper);
    box.innerHTML = rows.map(r => fmt(r)).join("<br>");
    scrollDown();
    if (f % 3 === 0) sfx("tick");
    await pause(T.skip ? 0 : 280);
  }
  print("");
  await type("The whole bay is lit up from underneath, from the deep part right out to the reeds. Thousands of small blue-gold lights, all moving the same way, slowly, the way fish do when there are a lot of them together.", 38);
  await pause(800);
  await type("They turn round once, right under the boats. You hear Pip say \"oh\" very quietly, which you didn't think Pip could do.", 38);
  await pause(800);
  await type("Then they all go down together, and the lake goes dark again, and the comet is still there over the hill, the same as it was.", 38);
  await pause(1500);
  print("");
  print("{dim:Across the water, from the open door of the observatory, you hear Juniper say Wren's name. Just that.}");
  await pause(1600);
  print("");
  await type("When you get back to the house you can hear the radio in the study before you're through the door. It's come on by itself, on a shortwave band you've never touched, and through all the static someone is talking.", 38);
  sfx("beep");
  await pause(900);
  print("{acc:WREN:} {dim:kshhh} ...hear me? It's Wren. Is that you, at the house?");
  await pause(1300);
  print("{acc:WREN:} We saw it from here. Me and Ása, we're out in her boat in the harbour at Tórshavn, and the whole lot lit up. All of it, all at once.");
  await pause(1500);
  print("{acc:WREN:} Sixty-four years I've been trying to say the right thing to it, and you went and worked it out in a fortnight.");
  await pause(1500);
  print("{acc:WREN:} I'm home on the second. Leave the lantern on for me. And thank you, love. I mean it.");
  await pause(1200);
  print("{dim:kshhhhh}");
  await pause(1800);
  print("");
  print("{hi:              ~  THE END  ~}");
  print("");
  endStats();
  print("");
  print("{dim:   the comet goes. the season turns. the cottage is yours for as long as you like.}");
  keepsake("answered");
  S.flags.metAsa = true;
  remember("answered it. the whole lake lit up. Wren heard it from the Faroes. I don't have words for it yet.");
  S.mailbox.push("wren_home"); S.letters.push("wren_home");
  T.ending = false;
  save();
}

function endStats() {
  const keeps = Object.keys(S.keeps).length;
  const st = [
    ["days in the cottage", S.day], ["cups of tea", S.stats.teas], ["fish caught", S.stats.fish], ["things grown", S.stats.harvests],
    ["parcels sent", S.stats.gifts], ["pinned to the board", Object.keys(S.clues || {}).length + "/" + Object.keys(CLUES).length], ["keepsakes in the jar", keeps + "/" + Object.keys(KEEPSAKES).length]
  ];
  for (const [k, v] of st) print("   {dim:" + pad(k, 24, ".") + "} {acc:" + v + "}");
}

/* ---------- the files ---------- */
const DIARY_1962 = `{dim:a school exercise book, water-stained. "WREN ASHDOWN, 3B" on the cover.}

{acc:25 oct 1962.}

J. and me on the end of the dock, gone midnight, freezing.
the comet low over the hill with its tail out behind it like
a fin.

J. flashed her torch at it three times, as a joke.

then the lake flashed back. three times. from under the water,
blue-gold, deep down where the deep bit is. then the whole bay
lit up, like a shoal of lamps, all swimming the same way. it
went round once under the dock and then it went down.

we named the comet after what we saw. J. made me swear not
to write the name down, so I'm only putting the letters:

    {hi:the L——— F———}

we're not telling anyone. ever.`;

function mysteryTree() {
  // a hidden file in the hall: Wren's .plan
  ROOT.kids.cottage.kids[".plan"] = F(`{dim:~/.plan — last edited 11 oct}

  - ferry from Aberdeen on the 9th
  - meet Á. at last. thirty-eight years of tuesdays.
  - be on the water off Tórshavn on the 25th, when it comes back
  - don't tell them about the noise. let them find it.`, { owner: "wren", onRead: () => { clue("tor"); S.flags.planRead = true; } });

  const days = () => {
    const k = {};
    for (let d = 1; d < S.day; d++) {
      const r = seeded(d * 13)();
      const v = Math.min(0.97, 0.06 + Math.min(d, 14) / 14 * 0.55 + (d >= 10 && d <= 18 ? 0.12 : 0) + r * 0.05);
      k[dateStr(d).toLowerCase().replace(" ", "-") + ".log"] = F(() => "night of " + dateStr(d) + "\n  max " + v.toFixed(2) + "\n  heard: " + (v > 0.5 ? "three . light . three" : "kettle . water") + (d === S.day - 1 && d >= 10 ? "\n  {dim:comet visible}" : ""), { owner: "hearth" });
    }
    return k;
  };
  return {
    var: D("variable things.", {
      log: D("logs.", {
        listen: D("Wren's receiver log. One file a night.", () => Object.assign({
          "README": F(W("every night since may 1987. 0.00 would mean nothing's there.\nit has never read 0.00."), { onRead: () => clue("log") }),
          "1987-2025.summary": F(`{dim:yearly peaks}

  1987   0.11   {dim:first year. it spiked on the 25th. I'd lit a lantern.}
  1988   0.12   {dim:second station on the same signal from march. TÓR. faroes.}
  1991   0.12   {dim:"TÓR" is a woman called Ása. we talk tuesdays. in numbers, mostly.}
  1999   0.13   {dim:every 25th, the same. the more lanterns, the higher.}
  2010   0.14
  2025   0.15   {dim:next year it comes back. 0.15 is the most it's been.}
  ...
  {dim:every single peak is on the 25th of october. Lantern Night.}`, { onRead: () => { clue("log"); clue("tor"); clue("origin"); } })
        }, days()))
      })
    })
  };
}

/* ---------- commands ---------- */
cmd("board corkboard clues notes", "the corkboard: what you've worked out", () => doBoard(), { group: "help" });
cmd("listen", "Wren's receiver program (in the cellar)", doListen, { group: "living" });
cmd("reply answer", "", (a) => doListen(["--reply"].concat(a)), { secret: true });
