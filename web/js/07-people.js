/* =====================================================================
   07-people.js — the neighbours, the post, and the radio.

   Little Hollow has four people within a postcard's throw:
     Ottoline Marsh   — postmistress, radio host, keeper of all gossip
     Abernathy Fenn   — beekeeper. eighty. terse. soft in the middle.
     Pip Okafor       — eleven. a hacker (self-declared).
     Juniper Vale     — retired astronomer in the observatory across the lake
   ===================================================================== */
"use strict";

const PEOPLE = {
  ottoline: { full: "Ottoline Marsh", short: "Ottoline", sign: "Ottoline x", likes: ["pumpkin_pie", "honey_cake", "jam", "mint_biscuits"], color: "acc" },
  fenn: { full: "Abernathy Fenn", short: "Fenn", sign: "A. Fenn.", likes: ["lavender", "fish:trout", "fish_pie", "carrot_soup"], color: "ok" },
  pip: { full: "Pip Okafor", short: "Pip", sign: "PIP (hacker)", likes: ["mint_biscuits", "junk:bottle", "junk:boot", "fish:eel", "jam_toast"], color: "sky" },
  juniper: { full: "Juniper Vale", short: "Juniper", sign: "J.V.", likes: ["carrot_soup", "chamomile", "honey_cake", "moonflower"], color: "hi" }
};
const WHO = n => { n = (n || "").toLowerCase(); for (const [k, p] of Object.entries(PEOPLE)) if (k === n || p.short.toLowerCase() === n || p.full.toLowerCase().includes(n)) return k; return null; };

/* ---------- the letters ----------
   day: the morning it arrives. reward: given when you open it.  */
const LETTERS = {
  otto_welcome: { from: "ottoline", day: 1, subject: "welcome", text: () => `${NAME()},

Ottoline, from the post office. Welcome to the Hollow.

Post goes at dawn. Leave anything in the box by the gate
and I'll take it. ({cmd:send} it, on Wren's machine.)

I do the radio in the mornings, 101.3, six till twelve. Wren's
set has been off since she went, so nobody on the east shore
has heard me in a week. Get it going and I'll say hello.

Ottoline

{dim:p.s. Biscuit came to the shop on Monday and told me she hadn't been fed since Christmas.}
{dim:p.p.s. if you hear the cellar, don't worry. it's always done that.}`, onOpen: () => { S.quests.otto_radio = S.quests.otto_radio || "open"; } },

  wren_pc1: { from: "wren", day: 2, file: "1_the_night_train.postcard", subject: "a postcard: a train on a viaduct", text: () => `{dim:[a steam train on a viaduct, hand-tinted]}

on the sleeper north. narrow bunk. a man across
the way snores in a perfect third.
did you find my note? left side of the kettle.

{acc:W.}`, onOpen: () => remember("a postcard from Wren, on a sleeper train.") },

  fenn_lavender: { from: "fenn", day: 2, subject: "Lavender.", text: () => `${NAME()}.

Fenn. Bees. The house up the hill.
Wren promised my bees lavender in 1998. Seeds are in her
shed. Three sprigs would do.

{dim:A. Fenn.}`, onOpen: () => { S.quests.fenn_lav = S.quests.fenn_lav || "open"; } },

  pip_hello: { from: "pip", day: 3, subject: "HELLO (from Pip)", text: () => `HELLO. I'm Pip. I'm 11. I live behind the post office.

Wren let me use HEARTH on Saturdays. I know ls and cd and cat.
I ALSO know there's a program in the cellar she wouldn't let
me run. She said "when you're older." I'm older now (by a month).

Can you teach me a new command? Write it in a file and post it:

   {cmd:write lesson.txt}     {dim:(type, then a line with just a dot)}
   {cmd:send lesson.txt to pip}

PIP

{dim:p.s. I saw a light IN the lake on tuesday. under the water. Mum says it was the moon. it was not the moon.}`, onOpen: () => { S.quests.pip_lesson = S.quests.pip_lesson || "open"; clue("lights"); } },

  juniper_soup: { from: "juniper", day: 4, subject: "from across the water", text: () => `${NAME()},

Juniper Vale. The white dome on the far side of the lake.

The heating's gone again. Wren used to row soup over on cold
weeks. If soup were to happen, carrot would be ideal, and the
post would get it here.

I've something of hers I'm supposed to hand on. I've had it
since 1988.

{dim:J.V.}

{dim:p.s. I can see your study light from the eyepiece. Nobody's had it on this late since she left.}`, onOpen: () => { S.quests.jun_soup = S.quests.jun_soup || "open"; } },

  wren_pc2: { from: "wren", day: 5, file: "2_shetland.postcard", subject: "a postcard: ponies", text: () => `{dim:[three Shetland ponies, sideways in the wind]}

Lerwick. the wind took my hat. a pony ate
a page of my book.
how's the noise? louder? it'll get louder.

{acc:W.}`, onOpen: () => { remember("a postcard from Shetland. she asked if the noise was louder."); clue("hum"); } },

  otto_pumpkin: { from: "ottoline", day: 5, subject: "a favour", text: () => `${NAME()},

My pumpkins came up the size of oranges. Could you grow me one
for the carving? Two seeds enclosed, and Wren's pie card,
which she gave me in 1983 and then told me I make wrong.

Ottoline

{dim:p.s. five nights, if you water them.}`,
    reward: { "seed:pumpkin": 2 }, onOpen: () => { S.quests.otto_pump = S.quests.otto_pump || "open"; S.flags.gotPieCard = true; } },

  pip_weird: { from: "pip", day: 7, subject: "SCIENCE", text: () => `I'm doing a SCIENCE PROJECT on the lake. Can you fish me up
something weird? Not a normal fish. (A weird fish counts.)

PIP`, onOpen: () => { S.quests.pip_weird = S.quests.pip_weird || "open"; } },

  wren_pc3: { from: "wren", day: 8, file: "3_torshavn.postcard", subject: "a postcard: grass roofs", text: () => `{dim:[black wooden houses with grass on their roofs]}

Tórshavn. I'm here. Ása met the ferry. thirty-eight
years of talking on the radio and she's shorter
than me, and she was holding a sign with my
callsign on it.
she's heard it too. the whole time. off the harbour.

{acc:W.}`, onOpen: () => { S.flags.metAsa = true; clue("tor"); remember("postcard from the Faroes. Wren has a friend there called Ása who 'has heard it too'."); } },

  fenn_trout: { from: "fenn", day: 8, subject: "Supper.", text: () => `${NAME()}.

Knees bad. Can't get down to the water. Would like a trout.
They come up clear mornings and evenings. Not in the grey.

{dim:A. Fenn.}`, onOpen: () => { S.quests.fenn_trout = S.quests.fenn_trout || "open"; } },

  otto_bake: { from: "ottoline", day: 9, subject: "bake sale", text: () => `${NAME()},

Bake sale on the green before Lantern Night. Fenn's honey cake
sells first every year and he's unbearable about it.

Send me something sweet. Let's beat him.

Ottoline`, onOpen: () => { S.quests.otto_bake = S.quests.otto_bake || "open"; } },

  juniper_comet: { from: "juniper", day: 10, subject: "look west", text: () => `${NAME()},

There's a comet back. Low in the west after dark, clear nights,
for about a week. It goes round every sixty-four years.

The last time, Wren and I watched it from the end of your dock.
We were fourteen. ${S.disks.sky ? "The telescope will find it." : "You'll want the telescope disk. Soup first. I'm not above it."}

If you see it, send me something. Anything. I'll know.

{dim:J.V.}`, onOpen: () => { S.quests.jun_comet = S.quests.jun_comet || "open"; clue("comet"); } },

  wren_pc4: { from: "wren", day: 11, file: "4_harbour.postcard", subject: "a postcard: a harbour at night", text: () => `{dim:[Tórshavn harbour at night. someone has drawn tiny dots on the water in biro.]}

those dots are what we saw on Tuesday. Ása
counted two hundred. I counted more.
it's getting stronger at your end too. I can
see it in her log.

{acc:W.}`, onOpen: () => clue("lights") },

  pip_game: { from: "pip", day: 12, subject: "I MADE A GAME", text: () => `I used what you taught me and I MADE A GAME. It's in your notes
folder now (I asked Ottoline to copy it over, she doesn't know how
computers work so I told her what to type).

  {cmd:cd ~/study/notes}
  {cmd:./pip_game.sh}

It is very hard.

PIP`, onOpen: () => { S.files["/cottage/study/notes/pip_game.sh"] = "#!/bin/pip\n# GUESS THE NUMBER by PIP OKAFOR\n# ./pip_game.sh"; }, when: () => S.quests.pip_lesson === "done" },

  otto_eve: { from: "ottoline", day: 13, subject: "tomorrow", text: () => `${NAME()},

Tomorrow. We row out at dusk and wait on the water for the dock
lantern. When it's lit, we light ours. That's all it is.

Wren started it, you know, in '74. I asked her once who it was
for, and she said "not us," and wouldn't say any more. Forty
years I've been meaning to ask her again.

${S.flags.lanternReady ? "She says you've got it in hand." : "If it's not ready, don't fret. We'll wait. We always do."}

Ottoline`, onOpen: () => clue("origin") },

  wren_home: { from: "wren", day: 99, subject: "a postcard: puffins", text: () => S.flags.answered ? `{dim:[two puffins, very close together]}

coming home on the 2nd. Ása's coming too, for a
week. she wants to see the lake. she wants to
meet the person who answered it.

leave the lantern lit.

{acc:W.}` : `{dim:[two puffins, very close together]}

Ása and I were out on the water on the 25th.
it came close. closer than '62. but it was
waiting for something, and it went down again.

coming home on the 2nd. leave the lantern lit.
I'll show you the cellar properly.

{acc:W.}` }
};

function letterText(id) {
  const L = LETTERS[id] || (S.dyn && S.dyn[id]);
  if (!L) return "{dim:(a letter that seems to have gone missing)}";
  return typeof L.text === "function" ? L.text() : L.text;
}
function letterMeta(id) { return LETTERS[id] || (S.dyn && S.dyn[id]); }

/** Every morning: scheduled letters, replies to what you sent, and the outbox. */
function deliverMail() {
  S.dyn = S.dyn || {};
  let n = 0;
  for (const [id, L] of Object.entries(LETTERS)) {
    if (L.day === S.day && !S.letters.includes(id) && (!L.when || L.when())) { S.mailbox.push(id); S.letters.push(id); n++; }
  }
  for (const o of S.outbox) {
    const id = "r" + S.day + "_" + o.to + "_" + Math.random().toString(36).slice(2, 6);
    S.dyn[id] = reply(o.to, o.item);
    S.mailbox.push(id); S.letters.push(id); n++;
  }
  S.outbox = [];
  return n;
}

function openLetter(id) {
  const L = letterMeta(id);
  if (!L) return;
  const p = PEOPLE[L.from];
  print("{dim:from:} " + (p ? "{" + p.color + ":" + p.full + "}" : "{acc:Wren}") + "   {dim:re: " + esc(L.subject) + "}");
  print("{dim:" + "-".repeat(46) + "}");
  print(letterText(id));
  const i = S.mailbox.indexOf(id);
  if (i >= 0) {
    S.mailbox.splice(i, 1);
    if (L.onOpen) L.onOpen();
    if (L.reward) {
      blank();
      for (const [k, n] of Object.entries(L.reward)) { give(k, n); print("{ok:(enclosed: " + itemName(k, n) + ")}"); }
    }
    if (L.friend && PEOPLE[L.from]) befriend(L.from, L.friend);
  }
  sfx("page");
}

/* ---------- friendship ---------- */
function befriend(who, n) {
  const before = S.friends[who];
  S.friends[who] = clamp(before + n, 0, 10);
  if (before < 8 && S.friends[who] >= 8) { keepsake("friend"); toast(PEOPLE[who].short + " thinks of you as <b>a dear friend</b>"); }
  if (Object.values(S.friends).every(v => v >= 8)) keepsake("allfriends");
}
function hearts(n) { const h = Math.floor(n / 2); return "{warn:" + "♥".repeat(h) + "}{dim:" + "♡".repeat(5 - h) + "}"; }

/* ---------- what happens when you send someone something ---------- */
function reply(to, item) {
  const p = PEOPLE[to];
  const L = { from: to, subject: "re: your parcel", reward: null, friend: 1, text: "" };
  const say = s => (L.text = s + "\n\n{dim:" + p.sign + "}");

  // --- quests first ---
  if (to === "fenn" && item === "lavender" && S.quests.fenn_lav === "open") {
    S.quests.fenn_lav = "done"; S.flags.gotCakeCard = true; L.reward = { honey: 3 }; L.friend = 3; L.subject = "Bees.";
    say(`${NAME()}.\n\nPut it by the hives. They went quiet, then loud. That's good.\n\nThree jars of honey. And the honey cake card. Wren took it off\nmy mother in 1979. Have it.`);
    remember("Fenn's bees got their lavender.");
    return L;
  }
  if (to === "fenn" && item === "fish:trout" && S.quests.fenn_trout === "open") {
    S.quests.fenn_trout = "done"; L.reward = { candle: 2 }; L.friend = 3; L.subject = "Trout.";
    say(`${NAME()}.\n\nFried it. Ate it at the window. Good fish.\n\nTwo candles. Beeswax. For the cold.`);
    remember("sent Fenn a trout. he sent candles.");
    return L;
  }
  if (to === "ottoline" && item === "pumpkin" && S.quests.otto_pump === "open") {
    S.quests.otto_pump = "done"; L.reward = { "seed:carrot": 3, jam: 1 }; L.friend = 3; L.subject = "the pumpkin";
    say(`${NAME()},\n\nIt's on the counter and everyone who comes in for stamps says "oh".\nI'm going to carve it into Biscuit.\n\nCarrot seeds, and a jar of quince jelly. Wren says it's "fine".\nFrom her that's a medal.`);
    remember("Ottoline's going to carve my pumpkin into Biscuit.");
    return L;
  }
  if (to === "ottoline" && ["pumpkin_pie", "honey_cake", "mint_biscuits"].includes(item) && S.quests.otto_bake === "open") {
    S.quests.otto_bake = "done"; L.reward = { "seed:mint": 2 }; L.friend = 3; L.subject = "we won";
    say(`${NAME()},\n\nGone in eleven minutes. Fenn's took fourteen. He said "well done"\nlike he was closing a gate. Best day I've had in years.\n\nMint seeds, from the windowbox.`);
    remember("beat Fenn at the bake sale. by proxy.");
    return L;
  }
  if (to === "juniper" && item === "carrot_soup" && S.quests.jun_soup === "open") {
    S.quests.jun_soup = "done"; L.reward = { "disk:sky": 1, "seed:moonflower": 2 }; L.friend = 3; L.subject = "soup";
    say(`${NAME()},\n\nStill warm when it got here, so Ottoline ran. I ate it at the\neyepiece with my coat on.\n\nEnclosed, as promised. The telescope disk, which is mine, and\ntwo moonflower seeds, which are Wren's. She gave them to me in\n1988 and said "give them to whoever's next." I didn't think\nthere'd be a next.\n\nGreenhouse. At night.`);
    remember("Juniper sent the telescope disk and two moonflower seeds. 'whoever's next.'");
    return L;
  }
  if (to === "juniper" && S.quests.jun_comet === "open" && S.flags.sawComet) {
    S.quests.jun_comet = "done"; L.reward = { starchart: 1 }; L.friend = 3; L.subject = "you saw it";
    S.flags.nameKnown = true; clue("name");
    say(`${NAME()},\n\nYou saw it.\n\nWe made a promise not to say its name. I've kept it sixty-four\nyears. But she's not here and you are, and I'm seventy-nine.\n\nWe called it {acc:the Lantern Fish}. Because of what came up out\nof the water to meet it.\n\nMy chart from 1962 is enclosed. Look after it.`);
    remember("Juniper told me the comet's name. I'm not telling anyone.");
    return L;
  }
  if (to === "pip" && item.startsWith("file:") && S.quests.pip_lesson === "open") {
    S.quests.pip_lesson = "done"; L.reward = { "disk:pip": 1 }; L.friend = 3; L.subject = "I LEARNED IT";
    const body = (S.files[item.slice(5)] || "").trim();
    const taught = (body.match(/\b(ls|cd|cat|grep|echo|pwd|man|history|ps|kill|sudo|find|tree|wc|head|sort|alias|fortune|sky|radio|brew|fish|look|map|top|date|cal|listen)\b/) || [])[1];
    say(`${body ? "I read your file seventeen times." : "your file was empty. is that a hacker thing?"}\n${taught ? "I tried {acc:" + taught + "} on the library computer. the librarian asked what I was doing.\nI said hacking. she said ok." : "I copied it into my notebook."}\n\nHere's a disk back. It's a program I made. ({acc:catsay})\nAlso I've started a radio station on {acc:104.5}. Tell nobody.`);
    remember("taught Pip a command. she's started a pirate radio station.");
    return L;
  }
  if (to === "pip" && S.quests.pip_weird === "open" && (item.startsWith("junk:") || item === "fish:eel")) {
    S.quests.pip_weird = "done"; L.reward = { bracelet: 1 }; L.friend = 3; L.subject = "RESULTS";
    say(`${item === "junk:boot" ? "A BOOT. nobody's foot was in it. I checked." : item === "fish:eel" ? "AN EEL. Mum screamed. 10/10." : item === "junk:bottle" ? "a bottle with a NOTE in. I read it. sorry. it's about the lights. I KNEW it." : "a tin can with a snail in. his name is Derek now."}\nHypothesis confirmed: the lake is weird.\n\nFriendship bracelet enclosed. It's orange because of Biscuit.`);
    remember("Pip's science project is going well, she says.");
    return L;
  }

  // --- not a quest ---
  const fav = p.likes.includes(item);
  L.friend = fav ? 2 : 1;
  const nice = itemName(item);
  const lines = {
    ottoline: fav ? [`${cap(nice)}! Wren told you, didn't she.`, `Oh, ${nice}. That's lovely. Thank you.`] : [`Thank you for the ${nice}. It's in the shop window with a card: "from the cottage".`, `${cap(nice)}! You're as bad as Wren.`],
    fenn: fav ? [`${cap(nice)}. Good.`, `${cap(nice)}. Wren's been talking. Thank you.`] : [`Got the ${nice}. Didn't need it. Glad of it.`, `${cap(nice)}. Kind of you. Hens send regards.`],
    pip: fav ? [`${nice.toUpperCase()}!!!`, `you sent me ${nice}. Mum says I have to say thank you properly so: THANK YOU PROPERLY.`] : [`thank you for the ${nice}. I've named it Gary.`, `a ${nice}! I'm going to do science on it.`],
    juniper: fav ? [`${cap(nice)}. Exactly right. Thank you.`, `I had the ${nice} at the eyepiece. Saturn was very good last night.`] : [`Thank you for the ${nice}. It's on the sill by the charts.`, `${cap(nice)}. It's quiet up here. Your parcels help.`]
  };
  if (item.startsWith("junk:")) {
    const jl = { ottoline: "A boot. Is this a Wren joke? It's in the window anyway.", fenn: "Boot. Wrong size. Planting thyme in it.", pip: "WEIRD STUFF. more please", juniper: "A boot. I've decided not to ask." };
    L.friend = to === "pip" ? 2 : 0;
    say(`${NAME()},\n\n${jl[to]}`);
    return L;
  }
  if (item.startsWith("file:")) {
    const fl = { ottoline: "Got your note. Lovely to hear from the cottage.", fenn: "Read your note. Good note.", pip: "I'm going to frame your file. can you frame a file", juniper: "I read your note twice. Keep writing things down. It's how anyone ever finds anything out." };
    say(`${NAME()},\n\n${fl[to]}`);
    return L;
  }
  say(`${NAME()},\n\n${pick(lines[to])}`);
  return L;
}

/* ---------- the radio ---------- */
const STATIONS = {
  "101.3": "Ottoline, mornings",
  "93.1": "weather",
  "88.8": "piano, nights",
  "104.5": "PIP FM"
};
function forecastFor(day) {
  const w = weatherFor(day);
  return w.word + (w.rain ? ". gardens can water themselves" : "") + (w.fog ? ". old fish weather" : "") + (w.name === "clear" ? ". stars tonight" : "");
}
const OTTO_DAYS = {
  1: ["Morning, Hollow. Drizzle, and the post van has a flat, so if your parcel's late, that's why.", "Fourteen days to Lantern Night.", "And if the cottage on the east shore can hear this: hello. Welcome."],
  2: ["Morning. Grey today.", "Fenn's asking about lavender again. He's been asking since 1998.", "Somebody's dog has been at my bins. I know whose. I'm not saying."],
  3: ["Morning, all. Clear and cold. Get your washing out.", "Pip Okafor came into the shop and asked for a modem. I gave her a lolly.", "Here's one for the cottage."],
  4: ["Morning. Juniper's heating has gone again.", "If anyone's making soup this week, the observatory would have some.", "Weather's on 93.1. Piano on 88.8 at night. Me, here."],
  5: ["Morning, Hollow. Proper rain, so leave the watering can.", "Postcard on the counter for the cottage, from Shetland. Ponies.", "My pumpkins are the size of oranges. Don't."],
  6: ["Morning. Nothing much happening, which I like.", "Fenn says his bees are agitated. He says the lake's been loud at night. I said lakes aren't loud. He said 'this one is.'", "Eight days."],
  7: ["Morning. Pip's doing a science project on the lake. Lock up your boots.", "Bake sale's the day before the lanterns.", "Here's a song for whoever's still in their dressing gown."],
  8: ["Morning. Fog. Can't see the hill, can't see the observatory.", "Wren always said the old fish come up in fog. The golden one.", "Postcard in from the Faroes for the cottage. Grass on the roofs."],
  9: ["Morning. Bake sale entries open.", "Fenn's knees are bad. If anyone has a trout spare.", "Five days."],
  10: ["Morning. Juniper rang, on the actual telephone, to say there's a comet back. Low in the west after dark.", "She said last time it came round she and Wren watched it from the cottage dock. Sixty-four years ago.", "Clear tonight."],
  11: ["Morning. Clear again. Last good night for the comet, Juniper says.", "Boats being painted all along the shore.", "Three days."],
  12: ["Morning. Pip says she's 'released a game'.", "Carving tomorrow night.", "Juniper says Lantern Night will be clear. She's not been wrong about the sky yet."],
  13: ["Morning. Windy. Hold on to your pumpkins.", "Tomorrow, if you're new: we row out at dusk and wait for the dock lantern at the cottage. When it's lit, we light ours.", "That's all it is."],
  14: ["It's Lantern Night. Morning, everyone.", "Boats out from dusk. Watch the cottage dock.", "Whoever's minding the cottage this year: we'll be there. Take your time."]
};
function ottoMorning() {
  if (S.day > SEASON_END) return ["Morning, Hollow. Snow on the hill and the post van's in a ditch.", pick(["Biscuit was seen sitting in the post office window yesterday. Nobody let her in.", "Fenn's bees are asleep for the winter. He says pop up the hill if you like.", "Juniper says the sky's never clearer than in winter.", "The lake's been quiet since the 25th. Quieter than I can remember."]), "Keep warm."];
  return OTTO_DAYS[S.day] || ["Morning, Hollow.", "Nothing to report.", "Have a nice day."];
}
const PIP_FM = [
  "THIS IS PIP FM. 104.5. PIRATE RADIO.",
  "hacker tip: {acc:ls -a} shows hidden files. that's where the secrets are. that's ALWAYS where they are.",
  "hacker tip: {acc:history} shows everything you ever typed. so be careful.",
  "hacker tip: a | sends what one command says into another one. {acc:ls | grep txt}.",
  "news: I saw the light in the lake AGAIN. it was further out this time. it was bigger. nobody believes me.",
  "news: Fenn says the bees won't go near the water this week. that is SCIENTIFIC EVIDENCE.",
  "news: Wren's cellar has a program I'm not allowed to run. it's called listen. if you're listening: run it.",
  "this has been PIP FM. I have to go, it's tea."
];

function radioOut(st) {
  const lines = [];
  if (st === "101.3") {
    if (S.min < 12 * 60 && S.min >= 6 * 60) {
      lines.push("{dim:(a jingle on an out-of-tune piano)}");
      for (const l of ottoMorning()) lines.push("{acc:OTTOLINE:} " + l);
      if (S.quests.otto_radio !== "done") {
        S.quests.otto_radio = "done"; befriend("ottoline", 2); give("seed:chamomile", 2);
        lines.push("{acc:OTTOLINE:} Oh, Pip's just put her head round the door. She says the cottage radio's on. Hello, cottage. I've left chamomile seed in your box.");
        lines.push("{ok:(2 chamomile seeds)}");
        remember("got the radio going. Ottoline said hello on air.");
      }
    } else if (S.min >= 12 * 60 && S.min < 20 * 60) {
      lines.push("{dim:(afternoon requests. a scratchy record:)} {acc:" + pick(["Moonlight on the Water", "The Kettle's On", "I'll Row Across to You", "Wellington Boot Waltz"]) + "} {dim:— for " + pick(["Fenn's bees", "the observatory", "'someone on the hill'", "whoever's at the cottage"]) + ".}");
    } else lines.push("{dim:(off air. a tape loop of Ottoline saying \"goodnight, Hollow.\")}");
  } else if (st === "93.1") {
    lines.push("{sky:Weather for Lake Ilse, from the observatory.}");
    lines.push("{sky:Today: " + forecastFor(S.day) + ".}");
    lines.push("{sky:Tomorrow: " + forecastFor(S.day + 1) + ".}");
  } else if (st === "88.8") {
    lines.push("{dim:(slow piano. somebody in the background of the recording asks for more toast.)}");
    if (!A.ctx) lines.push("{dim:(tap the screen once to let the sound in.)}");
  } else if (st === "104.5" && S.disks.pip) {
    lines.push("{sky:PIP:} " + PIP_FM[0]);
    const tip = pick(PIP_FM.slice(1, -1));
    lines.push("{sky:PIP:} " + tip);
    if (tip.includes("light in the lake")) clue("lights");
    if (tip.includes("listen")) clue("listen");
    lines.push("{sky:PIP:} " + PIP_FM[PIP_FM.length - 1]);
  } else if (st === "77.7") {
    lines.push("{dim:kshhhhhhhh}");
    lines.push("{dim:(under the static, a flat voice, one word at a time:)} {sky:" + heard(signalLevel()) + "}");
    lines.push("{dim:(it's HEARTH's voice. the same one that reads the error messages.)}");
    clue("r777");
  } else {
    lines.push("{dim:kshhhhhhhhhhhhhhhhhhhhh}");
    if (st === "104.5") lines.push("{dim:(very faintly, a kid's voice: \"is this on? IS THIS ON?\" not yet, apparently.)}");
    else if (Math.abs(parseFloat(st) - 77.7) < 1.5) lines.push("{dim:(something, nearby on the dial. a voice? lower.)}");
  }
  return lines;
}
