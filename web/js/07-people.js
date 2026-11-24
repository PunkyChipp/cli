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
  otto_welcome: { from: "ottoline", day: 1, subject: "Welcome to the Hollow!", text: () => `Dear ${NAME()},

Welcome! I'm Ottoline, I run the post office, the shop, the
radio, and (unofficially) everybody's business.

Three things you need to know:
  1. Post goes out at dawn. Leave things in the box and I'll
     take them. Just type {cmd:send} and it'll sort itself out.
  2. I do the morning show on {acc:101.3}, six till noon. Wren's
     radio has been dead since she left and I've had NOBODY
     to say good morning to on the east shore. Fix it! Tune in!
  3. Lantern Night is the 25th. Wren lights the dock lantern
     first, every year. No pressure. (Some pressure.)

Pop in any time. I'll be listening.

Ottoline x

{dim:p.s. Biscuit has told me several times that she hasn't been fed. I don't believe her and neither should you.}`, onOpen: () => { S.quests.otto_radio = S.quests.otto_radio || "open"; } },

  wren_pc1: { from: "wren", day: 2, file: "1_the_night_train.postcard", subject: "a postcard (a train on the front)", text: () => `{dim:[on the front: a steam train crossing a viaduct, hand-tinted]}

${NAME()} — on the sleeper north. The bunk is
narrower than me and I've had to fold like a deckchair.
A man across the aisle snores in a perfect major third.
I'm having the time of my life.
Is the kettle behaving? Left side!

{acc:W.} x`, onOpen: () => remember("a postcard from Wren. she's on a sleeper train, folded like a deckchair.") },

  fenn_lavender: { from: "fenn", day: 2, subject: "Lavender.", text: () => `${NAME()}.

Fenn. Beekeeper. Up the hill.
Wren promised my bees lavender. That was in 1998.
Three sprigs. Seeds in her shed somewhere. She hides things.
The bees have names. They are waiting. So am I.

{dim:A. Fenn.}

{dim:p.s. welcome.}`, onOpen: () => { S.quests.fenn_lav = S.quests.fenn_lav || "open"; } },

  pip_hello: { from: "pip", day: 3, subject: "HELLO FROM THE OKAFOR HOUSE (hacker)", text: () => `HI!!! I'm Pip. I live by the post office. I'm 11. I'm a hacker.

Wren let me use HEARTH on Saturdays and she taught me {acc:ls} and {acc:cd}
and {acc:cat} and how to make the kettle beep from the study (DO NOT
TELL OTTOLINE, she thinks it's a ghost).

Can you teach me a NEW command?? Write it in a file and send it
to me! Like:

   {cmd:write lesson.txt}       (then type stuff, then a line with just a . )
   {cmd:send lesson.txt to pip}

I will study it EXTREMELY closely.

PIP (hacker)
{dim:p.s. is Biscuit ok. tell her hello from me. she bit me once but it was a nice bite}`, onOpen: () => { S.quests.pip_lesson = S.quests.pip_lesson || "open"; } },

  juniper_soup: { from: "juniper", day: 4, subject: "a request from across the water", text: () => `Dear ${NAME()},

Juniper Vale. The observatory, across the lake — the white dome
you can see from your study window, if the weather's honest.

The heating up here has opinions and none of them are warm.
Wren used to row a flask of soup across on cold weeks. I am not
asking you to row. I am asking whether, if soup were to occur,
it might be posted.

Carrot is traditional. The recipe is in her kitchen; she will
have clipped it to something.

In return I have something of hers I've been "minding" since 1974.

{dim:— J.V.}
{dim:p.s. I can see your light on at night from up here. It's nice to see it on again.}`, onOpen: () => { S.quests.jun_soup = S.quests.jun_soup || "open"; } },

  wren_pc2: { from: "wren", day: 5, file: "2_shetland.postcard", subject: "a postcard (ponies)", text: () => `{dim:[on the front: three Shetland ponies, extremely windswept]}

Shetland. Wind so strong it took my hat and a
bit of my dignity. A pony ate a page of my book.
It was the boring chapter, so I let it.
Have you found the radio disk? Bread. Think bread.

{acc:W.} x`, onOpen: () => remember("a postcard from Shetland. a pony ate her book.") },

  otto_pumpkin: { from: "ottoline", day: 5, subject: "pumpkins (urgent-ish)", text: () => `${NAME()}!

Lantern carving is the night before Lantern Night and my
pumpkins have come up the size of tennis balls. TENNIS BALLS.

Could you grow me one? Just one! I'm not greedy, I'm thrifty.
Enclosed: two pumpkin seeds from my own tin, and Wren's pie
recipe, which she gave me in 1983 and then asked me never to
make in front of her because I "do the crust wrong".

{cmd:send pumpkin to ottoline} when it's ready. Five days, give or take.

Ottoline x

{dim:p.s. the radio! I heard you were tinkering. I'm keeping my fingers crossed and so is everyone in the shop.}`,
    reward: { "seed:pumpkin": 2 }, onOpen: () => { S.quests.otto_pump = S.quests.otto_pump || "open"; S.flags.gotPieCard = true; } },

  pip_weird: { from: "pip", day: 7, subject: "SCIENCE REQUEST", text: () => `${NAME()}!!!

I am doing a SCIENCE PROJECT on the lake. My hypothesis is that
there is WEIRD STUFF in it. Can you fish me up something weird?
Not a normal fish. A WEIRD thing. (A weird fish is ok too, like an eel.)

for science
PIP (hacker, scientist)`, onOpen: () => { S.quests.pip_weird = S.quests.pip_weird || "open"; } },

  wren_pc3: { from: "wren", day: 8, file: "3_torshavn.postcard", subject: "a postcard (grass roofs!)", text: () => `{dim:[on the front: little black houses with grass growing on their roofs]}

TÓRSHAVN. I'm here. The houses have GARDENS ON
THEIR ROOFS. A sheep was on one this morning,
just eating the house. Nobody minded.
I've been thinking about you minding mine.
Thank you. Truly. Is the lantern ready?

{acc:W.} x`, onOpen: () => remember("Wren made it to the Faroes. there was a sheep eating a roof.") },

  fenn_trout: { from: "fenn", day: 8, subject: "Supper.", text: () => `${NAME()}.

Bees thank you, if you've sent the lavender. If you haven't, they
don't thank you, and they've said some things.

Knees bad this week. Can't get to the water.
Would like a trout for supper. Mornings or evenings, clear days.
They don't like it grey.

{dim:A. Fenn.}`, onOpen: () => { S.quests.fenn_trout = S.quests.fenn_trout || "open"; } },

  otto_bake: { from: "ottoline", day: 9, subject: "BAKE SALE", text: () => `${NAME()}, quick one!

Bake sale on the green before the lanterns. Every year Fenn
brings a honey cake and every year it sells first and every
year he is insufferable about it.

Send me something sweet. A pie, a cake, biscuits. Let's beat him.

Ottoline x`, onOpen: () => { S.quests.otto_bake = S.quests.otto_bake || "open"; } },

  juniper_comet: { from: "juniper", day: 10, subject: "look up", text: () => `${NAME()},

There's a comet. Small, faint, and on its way out of our lives
for another sixty-four years. Wren and I saw it last time, in
1962, from the end of that dock. We were fourteen. We named it,
privately, and we have never told anyone else what we named it.

It's low in the {acc:west}, after dark, on clear nights. It
should be clear tonight and tomorrow. ${S.disks.sky ? "Your telescope will find it: {cmd:sky west}." : "You'll need the telescope disk — I'll send it if you send soup. I'm not above bribery."}

Tell me if you see it. Just send word — {cmd:send note to juniper} or anything
you like. I'll know what it means.

{dim:— J.V.}`, onOpen: () => { S.quests.jun_comet = S.quests.jun_comet || "open"; } },

  wren_pc4: { from: "wren", day: 11, file: "4_puffins.postcard", subject: "a postcard (a puffin, looking smug)", text: () => `{dim:[on the front: a single puffin, looking deeply pleased with itself]}

I have made friends with a puffin. Well. I've
made friends with a puffin's general area.
Juniper says there's a comet. If you see it,
don't tell me what it looks like. I want to
remember it the way it was.

{acc:W.} x` },

  pip_game: { from: "pip", day: 12, subject: "I MADE YOU A GAME", text: () => `${NAME()}!!!!

I used what you taught me AND some stuff I learned from the
library computer and I MADE A GAME. It's on the disk in this
envelope. I've put it in your study notes folder for you.

  {cmd:cd ~/study/notes}
  {cmd:./pip_game.sh}

It is VERY HARD. Do not be sad if you lose.

PIP (game developer)`, onOpen: () => { S.files["/cottage/study/notes/pip_game.sh"] = "#!/bin/pip\n# GUESS THE NUMBER by PIP OKAFOR (age 11)\n# run me with ./pip_game.sh\n# (c) PIP. no stealing."; } , when: () => S.quests.pip_lesson === "done" },

  otto_eve: { from: "ottoline", day: 13, subject: "tomorrow!!!", text: () => `${NAME()}!

Tomorrow's the night. Boats are painted, wicks are trimmed,
Fenn has ironed a shirt (I have seen it with my own eyes).

We all row out at dusk and wait on the water for the dock
lantern. When it's lit, we light ours. That's the whole thing.
That's the whole lovely thing.

${S.flags.lanternReady ? "Wren's told me you've got it all in hand. I never doubted you." : "If it's not ready, petal, don't you dare fret. We'll wait as long as it takes. We always have."}

Ottoline x` },

  wren_home: { from: "wren", day: 99, subject: "a letter, hand-delivered", text: () => `${NAME()},

I'm writing this at my own kitchen table, which is strange and
wonderful. You've kept everything so well. The kettle's happy.
Biscuit's fat (fatter). The garden's growing.

I'm going to stay a while, and then I think I'll go again.
Iceland, maybe. Maybe Japan. The thing about seeing the world
at seventy-eight is you find out the world is very big and you
are not as old as you thought.

Stay as long as you like. Really. The house likes you. So do I.
There's a spare key on Biscuit's collar. (There always was.)

{acc:W.} x` }
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
  const thing = item.startsWith("file:") ? "file" : item;
  const say = s => (L.text = s + "\n\n{dim:" + p.sign + "}");

  // --- quests first ---
  if (to === "fenn" && item === "lavender" && S.quests.fenn_lav === "open") {
    S.quests.fenn_lav = "done"; S.flags.gotCakeCard = true; L.reward = { honey: 3 }; L.friend = 3; L.subject = "Bees.";
    say(`${NAME()}.\n\nLavender arrived. Put it by the hives. Bees went quiet, then\nwent loud. That's good. That's the best noise there is.\n\nEnclosed: honey. Three jars. And Wren's honey cake card,\nwhich she stole from my mother in 1979. Stealing it back.\nGiving it to you. Don't tell her.\n\nThank you.`);
    remember("Fenn's bees got their lavender. he said thank you. TWICE.");
    return L;
  }
  if (to === "fenn" && item === "fish:trout" && S.quests.fenn_trout === "open") {
    S.quests.fenn_trout = "done"; L.reward = { candle: 2 }; L.friend = 3; L.subject = "Supper was good.";
    say(`${NAME()}.\n\nTrout. Fried in butter. Ate it at the window with the bees\ngoing to bed. Best supper since I don't know when.\n\nEnclosed: two beeswax candles. Light one when it's cold.\nSmells like summer. Don't argue.`);
    remember("sent Fenn a trout. he sent candles that smell like summer.");
    return L;
  }
  if (to === "ottoline" && item === "pumpkin" && S.quests.otto_pump === "open") {
    S.quests.otto_pump = "done"; L.reward = { "seed:carrot": 3, jam: 1 }; L.friend = 3; L.subject = "THE PUMPKIN";
    say(`${NAME()}!!!\n\nIt is MAGNIFICENT. It's sat on the counter and everyone who\ncomes in for stamps says "oh!" and I say "yes, I know".\n\nI'm going to carve it into a cat. A Biscuit, specifically.\nEnclosed: carrot seeds and a jar of my quince jelly, which\nWren says is "fine" which from her is a medal.`);
    remember("Ottoline's going to carve my pumpkin into a Biscuit.");
    return L;
  }
  if (to === "ottoline" && ["pumpkin_pie", "honey_cake", "mint_biscuits"].includes(item) && S.quests.otto_bake === "open") {
    S.quests.otto_bake = "done"; L.reward = { "seed:mint": 2 }; L.friend = 3; L.subject = "WE WON";
    say(`${NAME()}.\n\nSold out in eleven minutes. ELEVEN. Fenn's cake took fourteen.\nHe said "well done" in a voice like a door closing. I have\nnever been happier in my life. I'm framing the empty plate.\n\nEnclosed: mint seeds from the post office windowbox. Win more.`);
    remember("beat Fenn at the bake sale. (by proxy. Ottoline is thrilled.)");
    return L;
  }
  if (to === "juniper" && item === "carrot_soup" && S.quests.jun_soup === "open") {
    S.quests.jun_soup = "done"; L.reward = { "disk:sky": 1, "seed:moonflower": 2 }; L.friend = 3; L.subject = "soup, received";
    say(`${NAME()},\n\nThe soup arrived still faintly warm, which means Ottoline ran.\nI ate it with my coat on, at the eyepiece, watching Saturn.\nI cannot think of a better way to eat soup.\n\nEnclosed, as promised: the sky disk for Wren's telescope (it's\nmine, I lent it her in 1988, I'm lending it to you now), and\ntwo moonflower seeds. They're for the greenhouse. You'll know\nwhy, or you will soon.\n\nTell Wren she owes me.`);
    remember("Juniper sent the sky disk and moonflower seeds. 'tell Wren she owes me.'");
    return L;
  }
  if (to === "juniper" && S.quests.jun_comet === "open" && S.flags.sawComet) {
    S.quests.jun_comet = "done"; L.reward = { starchart: 1 }; L.friend = 3; L.subject = "you saw it";
    say(`${NAME()},\n\nYou saw it. I could tell before I opened the envelope.\n\nAll right. Since you were there, and she wasn't, and I can't\nask her right now: we called it {acc:"The Lantern Fish"}, because\nit looked like one, swimming. We were fourteen. We thought we'd\nbe the only two people in the world who ever knew.\n\nNow there are three. Enclosed: my chart from 1962. Look after it.`);
    remember("Juniper told me what they named the comet. I'm not telling anyone.");
    return L;
  }
  if (to === "pip" && item.startsWith("file:") && S.quests.pip_lesson === "open") {
    S.quests.pip_lesson = "done"; L.reward = { "disk:pip": 1 }; L.friend = 3; L.subject = "I LEARNED IT";
    const body = (S.files[item.slice(5)] || "").trim();
    const taught = (body.match(/\b(ls|cd|cat|grep|echo|pwd|man|history|ps|kill|sudo|find|tree|wc|head|sort|alias|fortune|sky|radio|brew|fish|look|map|top|date|cal)\b/) || [])[1];
    say(`${NAME()}!!!!!\n\nI READ YOUR FILE ${S.files[item.slice(5)] ? "17 TIMES" : "(it was empty?? is that a hacker thing)"}.\n${taught ? "I tried {acc:" + taught + "} on the library computer and the librarian said\n\"what are you doing\" and I said \"HACKING\" and she said \"ok\"." : "I don't know what all of it means yet but I copied it into my notebook\nin my best writing."}\n\nI made you something to say thank you. It's a disk. Put it in\nHEARTH. It's a PROGRAM. (it's {acc:catsay}. it's like cowsay but\nbetter because it's a cat)\n\nAlso I am starting a RADIO STATION. {acc:104.5}. Tell no one.`);
    remember("taught Pip a command. she's starting a pirate radio station. i've created a monster.");
    return L;
  }
  if (to === "pip" && item.startsWith("junk:") && S.quests.pip_weird === "open" || to === "pip" && item === "fish:eel" && S.quests.pip_weird === "open") {
    S.quests.pip_weird = "done"; L.reward = { bracelet: 1 }; L.friend = 3; L.subject = "SCIENCE RESULTS";
    say(`${NAME()}!!!\n\n${item === "junk:boot" ? "A BOOT. A WHOLE BOOT. whose foot was in it?? (nobody's. I checked.)" : item === "fish:eel" ? "AN EEL. it was SO slippery. Mum screamed. 10/10." : "A BOTTLE. with a NOTE. I won't read it, it's yours. (I read it. sorry. it was nice.)"}\nHypothesis CONFIRMED. The lake is WEIRD.\n\nI made you a friendship bracelet. It's orange because of Biscuit.`);
    remember("Pip's science project is going very well, by her account.");
    return L;
  }

  // --- not a quest: ordinary kindness ---
  const fav = p.likes.includes(item);
  L.friend = fav ? 2 : 1;
  const nice = itemName(item);
  const lines = {
    ottoline: fav ? [`${NAME()}! ${cap(nice)}! My favourite, how did you know? (Wren told you. Wren tells everyone everything. That's MY job.)`, `Oh, ${nice}! It's sitting on the counter and I keep looking at it. Thank you, petal.`]
      : [`Thank you for the ${nice}! I've put it in the shop window with a little sign that says "from the cottage". People keep asking.`, `A ${nice}! You're as bad as Wren. (That's a compliment. It's the highest one I have.)`],
    fenn: fav ? [`${cap(nice)}. Good. Very good. Bees agree.`, `${cap(nice)}. You've been talking to Wren. Thank you.`] : [`Got the ${nice}. Thank you. Didn't need it. Glad of it anyway.`, `${cap(nice)}. Hm. Kind of you. Hens send regards.`],
    pip: fav ? [`${nice.toUpperCase()}!!!! THIS IS THE BEST DAY OF MY LIFE (so far)`, `you sent me ${nice} and I screamed. Mum says I have to say thank you properly so: THANK YOU PROPERLY.`]
      : [`thank you for the ${nice}!! I named it Gary.`, `a ${nice}! I'm going to do SCIENCE to it. (I'm going to look at it.)`],
    juniper: fav ? [`${cap(nice)}. You are dangerously well-informed. Thank you — it's exactly right.`, `I had ${nice} at the eyepiece last night. The rings of Saturn have never looked so good.`]
      : [`Thank you for the ${nice}. It's on the windowsill beside the star charts, where all good things go.`, `${cap(nice)} — how kind. It is very quiet up here; your parcels are a small, warm noise.`]
  };
  if (item.startsWith("junk:")) {
    const jl = { ottoline: "A... boot? Is this a joke? Is it a Wren joke? I've put it in the window anyway.", fenn: "Boot. Hm. Wrong size. Using it as a planter.", pip: "WEIRD STUFF!!! more please", juniper: "Thank you for the boot. I've no idea what it means and I've decided that's the point." };
    L.friend = to === "pip" ? 2 : 0;
    say(`${NAME()},\n\n${jl[to]}`);
    return L;
  }
  if (item.startsWith("file:")) {
    const fl = { ottoline: "I read your note out on the radio! (I didn't. I nearly did.) Lovely to hear from you.", fenn: "Read your note. It was a note. Good one.", pip: "I'm going to frame your file. Can you frame a file? I'm going to try.", juniper: "I read your note twice. Writing things down is how the universe keeps track of us. Keep doing it." };
    L.friend = 1;
    say(`${NAME()},\n\n${fl[to]}`);
    return L;
  }
  say(`${NAME()},\n\n${pick(lines[to])}`);
  return L;
}

/* ---------- the radio ---------- */
const STATIONS = {
  "101.3": "Hollow Morning with Ottoline",
  "93.1": "the Lake Ilse weather",
  "88.8": "night piano from somewhere",
  "104.5": "PIP FM (pirate)"
};
function forecastFor(day) {
  const w = weatherFor(day);
  return w.word + (w.rain ? ", so the garden can water itself" : "") + (w.fog ? ", good for old fish" : "") + (w.name === "clear" ? ", stars tonight" : "");
}
const OTTO_DAYS = {
  1: ["...is this thing on? It's always on. Good morning, Hollow!", "Drizzle today, and the post van's got a flat, so if your parcel's late, blame the van, not me.", "And if anyone on the east shore can hear this — the cottage! — welcome. Biscuit says she hasn't been fed."],
  2: ["Good morning, Hollow! Grey and soft out there, like a good jumper.", "Fenn's asking after lavender again. He's been asking since 1998. Somebody help that man.", "Lantern Night is twelve days away. Twelve! Start painting your boats."],
  3: ["Morning, all! Clear as a bell today, so get your washing out.", "Little Pip Okafor came into the shop and asked for 'a modem'. I gave her a lolly. She seemed satisfied.", "And a request: 'something cosy' for the cottage. That's you, love. Here's the kettle song."],
  4: ["Good morning! Juniper's heating has broken again, she says, and she says it like it's the heating's fault.", "If anyone's making soup this week: think of the old dear in the dome.", "Weather on 93.1, music on 88.8 after dark, gossip right here. Always here."],
  5: ["Morning, Hollow — and it's RAINING, properly, so your gardens can water themselves today.", "My pumpkins are the size of tennis balls. I've written to the cottage. No pressure. (Some pressure.)", "Postcard on the counter from Shetland for the cottage. A pony's on the front. I didn't read it. (I read it.)"],
  6: ["Good morning! Lovely and ordinary today. I like an ordinary day. They don't get enough credit.", "Fenn says his bees are 'agitated'. He also says that about the weather and me.", "Eight days to lanterns, everyone."],
  7: ["Morning, Hollow! Pip says she's doing a 'science project on the lake'. Lock up your boots.", "Bake sale's the day before Lantern Night. Fenn's cake will win. Fenn's cake always wins. Unless...?", "Here's a song for anyone who's still in their dressing gown. You know who you are."],
  8: ["Good morning! Foggy one — can't see the observatory, can't see the hill, can barely see my own tea.", "Fog means the old fish come up, Wren always said. The golden one. Old Marmalade. She's not here to deny it.", "Postcard in from the Faroes! Grass on the roofs, apparently. Sheep on the grass."],
  9: ["Morning! Bake sale entries now open. I'm looking at the cottage. I'm looking right at you.", "Fenn's knees are bad this week, so if you've got a trout going spare...", "Five days to Lantern Night."],
  10: ["Good morning! Juniper rang — rang! on the telephone! — to say there's a COMET. Low in the west, tonight and tomorrow, clear skies.", "She says the last time it came round, she and Wren saw it from the cottage dock. They were fourteen.", "Telescopes out, Hollow!"],
  11: ["Morning, all. Clear again, so if you missed the comet, tonight's your last good chance.", "Boats are being painted all down the shore. Smells like varnish and excitement.", "Three days!"],
  12: ["Good morning! Little Pip has 'released a game', she says. She says it like a film studio.", "Lantern carving's tomorrow night. Bring your knives and your patience.", "And the forecast for Lantern Night: CLEAR. Juniper says so, and Juniper's never been wrong about the sky. About other things, yes."],
  13: ["Morning, Hollow! Windy today — hold onto your hats and your pumpkins.", "Tomorrow's the night. If you're new: we row out at dusk, we wait for the dock lantern at the cottage, and then we all light ours. That's all. It's everything.", "Get some sleep tonight. I won't, but you should."],
  14: ["It's LANTERN NIGHT, Hollow! Good morning, good morning, good morning!", "Boats on the water from dusk. Watch the cottage dock. When it's lit, light yours.", "And to whoever's minding the cottage this year — Wren would be so proud. No pressure. (All the pressure.) (No, none. Have a lovely day.)"]
};
function ottoMorning() {
  if (S.day > SEASON_END) return ["Good morning, Hollow! Snow on the hill and the post van's in a ditch again.", pick(["Biscuit was seen sitting in the post office window yesterday. Nobody knows how she got in. She seemed to feel she'd paid for it.", "Fenn's bees are asleep for the winter and he's lonely, he says, so pop up the hill.", "Juniper says the sky's never clearer than in winter. Wrap up and look up.", "Pip's found a new command. She won't say what. The library's banned her for a week."]), "Have a warm one, everybody."];
  return OTTO_DAYS[S.day] || ["Good morning, Hollow!", "Nothing to report. Glorious.", "Have a lovely day."];
}
const PIP_FM = [
  "THIS IS PIP FM. 104.5. THE ONLY PIRATE RADIO STATION IN LITTLE HOLLOW. probably in the world.",
  "today's hacker tip: if you type {acc:history} it shows everything you typed. so be careful what you type. (I typed 'ottoline is nosy' and then deleted it.)",
  "today's hacker tip: {acc:ls -a} shows HIDDEN files. that's where the secrets are. that's where they ALWAYS are.",
  "today's hacker tip: you can put a | between commands to make them talk. like {acc:ls | grep txt}. like walkie-talkies.",
  "today's hacker tip: {acc:man} means manual, not man. it's for everyone.",
  "news: Biscuit was spotted on the post office roof. how. HOW.",
  "news: I saw a GOLDEN fish in the fog by the cottage dock. nobody believes me. it was the size of a DOG.",
  "today's hacker tip: if you press TAB it finishes the word for you. it's like the computer is your friend. it IS your friend.",
  "this has been PIP FM. I have to go, it's tea."
];

function radioOut(st) {
  const lines = [];
  if (st === "101.3") {
    if (S.min < 12 * 60 && S.min >= 6 * 60) {
      lines.push("{dim:(a jingle on a slightly out-of-tune piano. then:)}");
      for (const l of ottoMorning()) lines.push("{acc:OTTOLINE:} " + l);
      if (S.quests.otto_radio !== "done") {
        S.quests.otto_radio = "done"; befriend("ottoline", 2); give("seed:chamomile", 2);
        lines.push("{acc:OTTOLINE:} ...and I'm told — Pip's just run in — the cottage radio is ON! Hello, cottage! Hello! I'm leaving some chamomile seeds in your box. For sleeping, or pretending to.");
        lines.push("{ok:(you got 2 chamomile seeds)}");
        remember("got the radio going. Ottoline said hello on air and i felt ridiculous and happy.");
      }
    } else if (S.min >= 12 * 60 && S.min < 20 * 60) {
      lines.push("{dim:(the afternoon request show. a scratchy record:)} {acc:'" + pick(["Moonlight on the Water", "The Kettle's On (Instrumental)", "I'll Row Across to You", "A Small Cup of Something", "Wellington Boot Waltz", "Song for a Wet Dog"]) + "'} {dim:— requested by " + pick(["Fenn, for the bees", "a mystery caller (Pip)", "Ottoline, for Ottoline", "the observatory", "'someone on the hill'"]) + ".}");
    } else lines.push("{dim:(off air. just a recording of Ottoline saying}{acc: 'goodnight, Hollow' }{dim:on a loop, very gently.)}");
  } else if (st === "93.1") {
    lines.push("{sky:And now the weather for Lake Ilse and the Hollow, issued by the observatory.}");
    lines.push("{sky:Today: " + forecastFor(S.day) + ".}");
    lines.push("{sky:Tomorrow: " + forecastFor(S.day + 1) + ".}");
    lines.push("{sky:Lake: " + pick(["calm, mostly", "slight, occasionally moderate", "thoughtful", "glassy at dawn"]) + ". Heron: present.}");
  } else if (st === "88.8") {
    lines.push("{dim:(soft piano drifts in, slow chords, unhurried. somewhere in the recording someone quietly asks for more toast.)}");
    if (!A.ctx) lines.push("{dim:(tap the screen once to let the sound in.)}");
  } else if (st === "104.5" && S.disks.pip) {
    lines.push("{sky:PIP:} " + PIP_FM[0]);
    lines.push("{sky:PIP:} " + pick(PIP_FM.slice(1, -1)));
    lines.push("{sky:PIP:} " + PIP_FM[PIP_FM.length - 1]);
  } else {
    lines.push("{dim:kkhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh}");
    if (st === "77.7") lines.push("{dim:(...very faintly, under the static, a voice is reading numbers. \"seven. seven. kettle. seven.\" you decide not to think about it.)}");
    else if (st === "104.5") lines.push("{dim:(a little static, and very faintly, a child going \"is this on? IS THIS ON?\" — not yet, apparently.)}");
    else lines.push("{dim:(just static. it sounds a lot like the rain.)}");
  }
  return lines;
}
