/* =====================================================================
   06-content.js — the cottage, room by room. Most of the writing in
   the game lives here. If you want to add a room or hide a note
   somewhere, this is the file. (See MODDING.md.)

   A rule for writing in here: not everything needs a joke. Most real
   things are just things. Let them be plain, and let the odd one be odd.
   ===================================================================== */
"use strict";

const NAME = () => S.name || "you";
const W = s => s + "\n\n{dim:W.}";

/* ---------- little dynamic descriptions ---------- */
function skyLine() {
  const w = weatherNow();
  const night = isNight();
  if (w.snow) return night ? "Snow going past the window, orange where the lamp catches it." : "It's snowing. Big slow flakes.";
  if (w.rain >= 1) return night ? "Rain on the glass." : "Heavy rain. The lake's gone grey and pocked.";
  if (w.rain > 0) return "A thin drizzle.";
  if (w.fog > 0.5) return "Fog. You can't see the far shore, or the end of the dock.";
  if (w.wind > 0.8) return "Windy. The gutter keeps knocking.";
  if (night) return w.cloud > 0.5 ? "Dark, and no stars." : "Clear. A lot of stars.";
  if (S.min < 8 * 60) return "Early light, low over the hill.";
  if (S.min > 17 * 60) return "The light's going.";
  return w.cloud > 0.5 ? "Overcast." : "Bright and cold.";
}
function catHere() { return S.cat.room === roomName(); }
function catLine() {
  const r = roomName();
  const lines = {
    kitchen: "Biscuit is sitting by her bowl.",
    parlour: fireLit() ? "Biscuit is flat out in front of the stove." : "Biscuit is asleep in the armchair.",
    study: "Biscuit is on the desk, on the papers.",
    garden: "Biscuit is in the long grass at the end of the beds. Just her ears.",
    greenhouse: "Biscuit is asleep between two pots.",
    dock: "Biscuit is at the end of the dock, looking down into the water.",
    attic: "Biscuit is up here somewhere. You can hear her.",
    hall: "Biscuit is lying in the middle of the rug.",
    cellar: "Biscuit is curled on top of the humming box. It's warm.",
    roof: "Biscuit has followed you up the ladder."
  };
  return lines[r] || "Biscuit is here.";
}

/* ---------- the note on the screen (the first thing you read) ---------- */
const NOTE = () => `{dim:(biro, on the back of an envelope)}

${NAME()} —

you made it. the bed's made up, the spare key is under the
heron, and the kettle is in the kitchen. thump it on the left.

Biscuit gets fed twice a day. she will tell you otherwise.

the lantern at the end of the dock gets lit on the 25th.
everyone will be watching for it. it's been lit every year
since 1974 and I'd like it to stay that way. everything it
needs is in this house somewhere.

the rest you can work out. you were always cleverer than me.

{acc:W.}

{dim:p.s. ignore the noise in the cellar.}`;

/* ---------- the list (it ticks itself) ---------- */
function todoText() {
  const items = [
    ["tea", () => S.stats.teas > 0, "kitchen"],
    ["feed Biscuit", () => S.flags.fedOnce, "kitchen"],
    ["plant something", () => S.flags.planted, "garden. seeds in your coat"],
    ["the radio needs its disk", () => S.disks.radio, "it's with the bread"],
    ["the oil lamp (cellar)", () => S.flags.lampLit, "matches in the drawer"],
    ["greenhouse door", () => S.flags.ghOpen, "oilcan, shed"],
    ["write back to people", () => S.stats.letters > 0, ""],
    ["the lantern. the 25th.", () => S.flags.lanternLit, ""]
  ];
  let out = "{dim:(Wren's list, pinned by the door)}\n\n";
  for (const [t, ok, hint] of items) {
    const d = ok();
    out += (d ? "{dim:  {s:" + t + "}}" : "  " + t + (hint ? "  {dim:— " + hint + "}" : "")) + "\n";
  }
  return out.trimEnd();
}

const BISCUIT_MANUAL = `{hi:BISCUIT}  {dim:(typed, then corrected in pen)}

  orange. eleven. heavier than she looks.
  fed morning and evening. half a tin. she gets the
  other half {s:tomorrow} at 5pm.
  likes: the armchair, the cellar box, the end of the dock.
  dislikes: the hoover, Fenn, being picked up.
  don't touch the belly.

  the brass key on her collar is the spare for my trunk.
  she won't let you have it until she's decided about you.
  give her a few days.`;

const FRIDGE_NOTE = () => `On the fridge, under a magnet shaped like a sardine:

  {acc:milk — Ottoline, Tues}
  {acc:eggs — Fenn}
  {acc:${S.day > 3 ? "{s:jam}" : "jam"} — cellar}
  {acc:ring J. about the 25th}`;

const HEARTH_MANUAL = `{hi:HEARTH-80 OPERATOR'S GUIDE}  {dim:(the printed part is three pages. the rest is pencil.)}

  {acc:ls}            what's here (add -a for hidden things)
  {acc:cd} kitchen    go somewhere.  {acc:cd ..}  back out
  {acc:cat} thing     read it, or look at it closely
  {acc:look}          where am I
  {acc:take} thing    pick it up
  {acc:map}           the house
  {acc:board}         what you've worked out so far

  everything underlined can be tapped.
  tab finishes words. the up arrow repeats things.

{dim:  pencil, in the margin: "HEARTH does more than this. it's
  listening, mostly. — W."}`;

/* ---------- books on the parlour shelf ---------- */
const BOOKS = {
  "the_patient_gardener.book": `{hi:THE PATIENT GARDENER}  Mabel Thorne, 1962. {dim:Spine broken at chapter four.}

  "Water them, then go inside. Watching does not help. Plants
  grow at night, when nobody is looking, like most good things.

  Mint will grow anywhere. Carrots take three nights and sulk.
  Lavender wants sun and to be left alone. Rain counts."

{dim:In pencil: "pumpkins are five nights here, not four."}`,
  "knots_for_small_boats.book": `{hi:KNOTS FOR SMALL BOATS}  {dim:a pamphlet}

  THE BOWLINE: the rabbit comes up through the hole, round
  the tree, and back down the hole.

{dim:In pencil: "I tie it like a shoelace. it has been fine since 1981."}`,
  "fishes_of_lake_ilse.book": `{hi:THE FISHES OF LAKE ILSE}  {dim:county field guide, 1971}

  {acc:PERCH}   common. daytime.
  {acc:ROACH}   common. any time.
  {acc:MINNOW}  very common. put back.
  {acc:TROUT}   clear mornings and evenings.
  {acc:PIKE}    evening and after dark.
  {acc:EEL}     night, in rain.
  {acc:CARP}    rare. old fish come up in fog, and at dawn.

  The lake is 41 metres at its deepest point, roughly
  below the centre of the bay. It has never been surveyed
  below that. {dim:(Wren has underlined "never".)}`,
  "the_cat_who_kept_a_lighthouse.book": `{hi:THE CAT WHO KEPT A LIGHTHOUSE}  {dim:a picture book}

  Every night the cat pushed the big switch with her paw,
  and every night the boats came home.

  "Why do you do it?" said the gull. "You don't like boats."
  "No," said the cat. "But I like it when they come home."

{dim:Inside the cover: "for Pip. — W."}`,
  "hearth_80_technical_reference.book": `{hi:HEARTH-80 TECHNICAL REFERENCE}  {dim:412 pages. very annotated.}

  Ch. 2  Memory (640K) ................ {dim:"enough"}
  Ch. 3  Peripherals .................. {dim:"kettle, radio, telescope, cellar"}
  Ch. 7  Receivers .................... {dim:this chapter is mostly pencil}
  Ch. 9  Troubleshooting .............. {dim:"thump it"}
  App. C Pipes ........................ {dim:"ls | grep txt. J. showed me."}

{dim:Ch. 7, in the margin: "the aerial goes down into the lake, not up.
everyone thinks I've wired it backwards. I haven't."}`,
  "wrens_almanac_1987.book": `{hi:WREN'S ALMANAC, 1987}  {dim:a ring binder}

  {acc:Mar 3.}  bought a computer. Fenn says I'm mad.
  {acc:Mar 9.}  cable to the kitchen. the kettle has an address now.
  {acc:Apr 2.}  every room is a directory. J. typed "cd garden" and
          then got up and went into the garden.
  {acc:May 18.} ran the long cable off the end of the dock, weighted.
          forty metres. the cellar box started humming that night.
  {acc:Jun 21.} lost another lure to the carp.
  {acc:Oct 25.} Lantern Night. it answered again. smaller than '62.
          I wrote it all down. nobody but J. believes me and J.
          won't talk about it.`
};

/* ---------- Wren's letter in the attic trunk ---------- */
const TRUNK_LETTER = () => `{dim:(folded in four, in the lid of the trunk)}

${NAME()},

if you're reading this then Biscuit gave you the key, so
she's decided about you. good.

the lantern disk and a wick are in here. the lantern burns
moonflower oil. one flower is enough. they only grow in the
greenhouse and only open at night. Juniper has the seeds,
and has had them since 1974, and will say she doesn't.

you've heard the cellar by now. I said ignore it. I didn't
mean it. I've been listening to that noise since I was
fourteen, and I've never been able to answer it properly.

if it ever asks you something, answer with its name.
you'll know when. I can't tell you the name. I promised.

{acc:W.}`;

const PHOTO_1974 = `A photograph, soft at the corners.

  Four people on the end of the dock in the rain, holding jam
  jars with candles in. Behind them, out on the water, more
  lights. A lot more lights than there are boats.

On the back, in pencil:
  {acc:"Lantern Night, the first. me, O., A.F., J."}
  {acc:"count the lights. then count the boats."}`;

/* ---------- the tree itself ---------- */
function buildTree() {
  const plotKids = () => {
    const k = {};
    S.plots.forEach((p, i) => { k["plot" + (i + 1)] = F(() => plotText(p, i + 1), { owner: "garden" }); });
    return k;
  };
  const potKids = () => {
    const k = {};
    S.gh.forEach((p, i) => { k["pot" + (i + 1)] = F(() => plotText(p, i + 1, true), { owner: "garden" }); });
    return k;
  };

  ROOT = D("the root. wiring, mostly.", {
    cottage: D(() => "The hall. Coats, boots, a long rug worn pale down the middle. The front door, the stairs, and a list pinned by the light switch.", {
      "todo.txt": F(todoText, { owner: "wren" }),
      coat_hooks: F("A yellow mac, a waxed jacket, and a small knitted jumper on its own hook. The jumper is cat-sized. It's never been worn."),
      umbrella: F("A black umbrella with a duck's head handle. For going out in the rain.", { item: "umbrella" }),
      kitchen: D(() => "The kitchen. Range, kettle, a long table with one end cleared. Jars on the windowsill with Wren's labels on. The window looks out over the garden to the lake.", {
        kettle: F(() => (teaWarm() ? "Still warm." : "Cream enamel, green rim, dented on the left.") + " {cmd:brew}"),
        bread_bin: D("A bread bin.", {
          "radio.dsk": F("A floppy disk wrapped in a tea towel. RADIO, in red pen. {dim:(disks go in HEARTH, in the study.)}", { item: "disk:radio" }),
          half_a_loaf: F("Half a loaf, gone hard.")
        }),
        drawer: D("The kitchen drawer.", {
          matches: F("A box of matches, nearly full.", { item: "matches" }),
          string: F("A ball of string."),
          rubber_bands: F("Rubber bands. A lot of them."),
          "IOU.txt": F(`{acc:IOU}  one jar of honey back to Fenn  {dim:(1996)}`)
        }),
        recipes: D("Recipe cards, in a bulldog clip.", () => {
          const k = {
            "carrot_soup.card": F(recipeCard("carrot_soup"), { onRead: () => learn("carrot_soup") }),
            "fish_pie.card": F(recipeCard("fish_pie"), { onRead: () => learn("fish_pie") }),
            "jam_toast.card": F(recipeCard("jam_toast"), { onRead: () => learn("jam_toast") })
          };
          if (S.flags.gotPieCard) k["pumpkin_pie.card"] = F(recipeCard("pumpkin_pie"), { onRead: () => learn("pumpkin_pie") });
          if (S.flags.gotCakeCard) k["honey_cake.card"] = F(recipeCard("honey_cake"), { onRead: () => learn("honey_cake") });
          if (S.flags.gotBiscuitCard) k["mint_biscuits.card"] = F(recipeCard("mint_biscuits"), { onRead: () => learn("mint_biscuits") });
          return k;
        }),
        "biscuit.txt": F(BISCUIT_MANUAL),
        fridge_note: F(FRIDGE_NOTE),
        cat_bowl: F(() => (S.cat.fed ? "Empty, licked clean." : "Empty.") + " It says BISCUIT on the side. {cmd:feed biscuit}"),
        pantry: F("Flour, butter, oats, onions, tins. Enough for anything on the recipe cards.")
      }, { room: true }),

      parlour: D(() => "The parlour. Low ceiling, rag rug, an orange armchair, and a wood stove that's " + (fireLit() ? "lit." : "cold.") + " Books on every wall. A record player by the window.", {
        stove: F(() => fireLit() ? "Lit. It'll go until about " + clock(S.fireUntil % 1440) + "." : "Cold. " + plural(S.wood, "log") + " in the basket. {cmd:stoke}"),
        wood_basket: F(() => S.wood ? plural(S.wood, "log") + "." : "Empty. The woodpile's in the garden. {cmd:chop}"),
        armchair: F("Orange, and shaped like Wren. {cmd:sit}"),
        record_player: F("A suitcase record player. On top: {acc:Nocturnes for a Wet Tuesday}. {cmd:play record}"),
        mantel_photo: F(PHOTO_1974, { onRead: () => clue("count") }),
        mantel_clock: F(() => "It says " + clock(S.min) + ". It's right."),
        bookshelf: D("Paperbacks, field guides, a ring binder, a dictionary holding up the short leg of the shelf.",
          Object.fromEntries(Object.entries(BOOKS).map(([n, t]) => [n, F(t, { onRead: () => { checkBooks(); if (n.startsWith("wrens_almanac")) clue("cable"); if (n.startsWith("hearth_80")) clue("cable"); } })])))
      }, { room: true }),

      study: D(() => "The study. HEARTH on the desk, the screen you're looking at. A disk drive. A corkboard on the wall with nothing pinned to it" + (Object.keys(S.clues || {}).length ? " — well, not much." : ".") + " A window over the lake.", {
        "note.txt": F(NOTE, { owner: "wren", onRead: f => f && remember("found Wren's note on the screen.") }),
        "hearth.manual": F(HEARTH_MANUAL),
        corkboard: F(() => "Cork, drawing pins, a reel of red wool. {cmd:board}"),
        disk_drive: F(() => {
          const d = Object.keys(S.disks).filter(k => S.disks[k]);
          return "A 3.5\" drive. Installed: " + (d.length ? d.map(x => "{acc:" + x + "}").join(", ") : "{dim:nothing}") + ". {cmd:insert}";
        }),
        desk: D("Wren's desk. A green lamp, pencils in a mug, a stack of envelopes.", {
          "torn_page.txt": F("A page torn out of something:\n\n  {acc:the good seeds are in the shed. use your -a's.}\n\n{dim:(as in {cmd:ls -a})}"),
          pencils: F("Eleven pencils, all sharpened at both ends."),
          floppy_box: D("A box of floppy disks.", {
            "BLANK.DSK": F("Labelled BLANK, and underneath, 'really blank'."),
            "GAMES.DSK": F("Labelled GAMES. It's a spreadsheet of who owes Wren money at cards."),
            "LOG-87.DSK": F("Labelled LOG 87–. Empty. {dim:(whatever was on it has been copied somewhere. /var/log, maybe.)}", { onRead: () => clue("log") })
          })
        }),
        postcards: D("A shoebox for postcards.", () => {
          const k = {};
          for (const id of S.letters) { const L = LETTERS[id]; if (L && L.from === "wren") k[L.file] = F(() => letterText(id)); }
          return k;
        }),
        notes: D("An empty folder labelled {acc:yours}. ({cmd:write} something.)", {})
      }, { room: true }),

      garden: D(() => "Six raised beds, a shed, a woodpile, a birdbath. A path down through the long grass to the dock. " + skyLine(), () => Object.assign(plotKids(), {
        shed: D("Creosote and string. Tools on nails, each with its outline painted behind it.", {
          fishing_rod: F("Wren's split-cane rod, red and white float.", { item: "rod" }),
          oilcan: F("A small brass oilcan.", { item: "oilcan" }),
          watering_can: F("Green. You'll use it when you {cmd:water}."),
          trowel: F("Worn to the shape of one hand."),
          ".seed_tin": D("A biscuit tin full of paper seed envelopes.", {
            lavender_seeds: F("{acc:LAVENDER} — for Fenn's bees.", { item: "seed:lavender", count: 3 }),
            pumpkin_seeds: F("{acc:PUMPKIN}", { item: "seed:pumpkin", count: 2 }),
            chamomile_seeds: F("{acc:CHAMOMILE}", { item: "seed:chamomile", count: 2 })
          })
        }),
        woodpile: F(() => "Split logs under a tarp. An axe. {cmd:chop} {dim:(" + plural(S.wood, "log") + " inside)}"),
        birdbath: F(() => pick(["A robin, bathing.", "Two sparrows.", "One leaf, turning slowly."])),
        fox: F(() => "A fox" + (S.fox ? " — " + esc(S.fox) + " —" : "") + " at the edge of the long grass, watching you." + (S.fox ? "" : " {dim:({cmd:name fox} her?)}"), { when: () => isNight() || isEvening() })
      }), { room: true }),

      greenhouse: D(() => "Whitewashed glass, warm soil, a brass mister that hisses now and then. Three clay pots on the bench.", () => Object.assign(potKids(), {
        "moonflower_note.txt": F(W("{hi:moonflowers}\n\npots only. they want warm and dark.\nthey open after nightfall and close at dawn — pick them at night.\none flower gives enough oil for the lantern.\n\nthe light they give off is the same colour as the other light.\nthat's not a coincidence. I don't know what it is."), { onRead: () => clue("colour") }),
        mister: F("A brass mister on the ceiling. It keeps the pots wet, so they never need watering.")
      }), { room: true, lock: () => (S.flags.ghOpen ? null : "The door won't budge. The hinges have rusted.\n{dim:(the oilcan's in the shed: {cmd:oil greenhouse})}") }),

      dock: D(() => "Grey boards out over the water. A green rowing boat. At the end, an iron lantern on a pole, " + (S.flags.lanternLit ? "lit." : "unlit.") + " A thick black cable runs along the boards and over the edge into the lake. " + skyLine(), {
        lantern: F(() => lanternStatus()),
        cable: F("A thick black cable, stapled along the dock, going over the end and straight down into the water. It's warm to touch. Faintly. {dim:(it goes back up the garden towards the house.)}", { onRead: () => clue("cable") }),
        water: F(() => lakeLook()),
        rowboat: F("Green. {acc:THE SECOND OPINION} painted on the back. {cmd:row}"),
        tackle_box: D("A tackle box.", {
          "carp.txt": F(W("{hi:the carp}\n\ngolden. huge. older than me.\nseen in fog, at dawn, and once on my birthday.\nhe has four of my lures in his lip.\n\nif you catch him, let him go.")),
          lures: F("Spinners, feathers, and a teaspoon with a hook on.")
        }),
        bench: F("A bench with a small plaque: {acc:FOR SITTING}. {cmd:sit}")
      }, { room: true }),

      cellar: D(() => "Stone walls, a bulb on a string, shelves of jam. In the corner, a beige metal box the size of a suitcase. It hums. The cable from the dock comes in through the wall and goes into the back of it.", {
        jam_shelf: F(() => "Blackberry, damson, plum, one labelled MYSTERY 2019. " + (jamLeft() ? "{cmd:take jam}" : "The rest are labelled 'winter'."), { item: "jam" }),
        oil_lamp: F("A brass oil lamp, full. {dim:(the attic is dark.)}", { item: "lamp" }),
        box: F(() => "Beige steel, warm, humming. A label in Wren's capitals: {acc:HEARTH RECEIVER — DO NOT UNPLUG}. A small green light blinks, slowly. " + (S.flags.lanternLit ? "Faster than it used to." : "") + "\n{dim:(there's a program for it. Wren used to run it down here: {cmd:listen})}", { onRead: () => { clue("hum"); clue("listen"); } }),
        "the_hum.txt": F("{dim:(taped to the box)}\n\nit's the freezer.\n\n{dim:(the freezer is unplugged.)}", { onRead: () => clue("hum") })
      }, { room: true }),

      attic: D(() => S.flags.atticLit ? "Rafters, boxes, a rocking horse with one glass eye. A heavy trunk under the round window. A ladder up to a hatch in the roof." : "Pitch black. Something small walks across the boards.", () => (S.flags.atticLit ? {
        trunk: D("A leather trunk with brass corners and a small padlock.", {
          "lantern.dsk": F("A floppy disk labelled {acc:LANTERN} in gold pen.", { item: "disk:lantern" }),
          wick: F("A coil of new lantern wick.", { item: "wick" }),
          "letter.txt": F(TRUNK_LETTER, { onRead: f => { clue("ask"); if (f) remember("found Wren's letter in the trunk. read it twice."); } }),
          "diary_1962.txt": F(DIARY_1962, { onRead: () => { clue("1962"); clue("name"); } }),
          "photo_1974.txt": F(PHOTO_1974, { onRead: () => clue("count") })
        }, { lock: () => (S.flags.trunkOpen ? null : "Padlocked.\n{dim:(the key is on Biscuit's collar.)}") }),
        rocking_horse: F("One glass eye. GERALD, on the saddle, in a child's writing."),
        margaret: F("A spider with a big web in the corner. A note pinned beside it: {acc:MARGARET. do not hoover.}"),
        boxes: F("XMAS. XMAS (REAL). TAX. NOT TAX. One labelled {acc:NO}.")
      } : {}), { room: true, dark: () => !S.flags.atticLit }),

      roof: D(() => "The flat bit of roof between the chimneys. A railing, a heron weathervane, and a brass telescope under an oilskin. " + skyLine(), {
        telescope: F(() => S.disks.sky ? "Cover off. {cmd:sky}" + (isNight() ? "" : " {dim:(after dark.)}") : "A brass telescope. The motor has a slot for a disk. A label: {acc:SKY.DSK — J. has it}."),
        weathervane: F(() => "The heron points " + pick(["north-west", "west", "south-west", "north"]) + ". " + cap(weatherNow().word) + "."),
        "star_notes.txt": F(starNotes, { when: () => S.disks.sky })
      }, { room: true, lock: () => (S.flags.atticLit ? null : "The ladder to the roof is in the attic, and the attic is dark.") })
    }),

    dev: D("devices.", {
      kettle: F(() => (teaWarm() ? "warm." : "cold.")),
      cat: F(() => pick(["mrrp.", "...", "mrrp?"])),
      null: F(""),
      rain: F(() => (weatherNow().rain ? "tk tk tik tk tik" : "")),
      lake: F(() => lakeLook()),
      receiver: F(() => "signal " + signalLevel().toFixed(2), { onRead: () => clue("listen") })
    }),

    etc: D("settings.", {
      motd: F(() => S.files["/etc/motd"] || "Welcome home.", { user: true }),
      "hearth.conf": F(() => "[cottage]\nowner   = wren\nminder  = " + NAME() + "\n\n[receiver]\naerial  = /dock/cable   # down, not up\ndepth   = 40m\nlog     = /var/log/listen\nreply   = disabled      # until it asks", { onRead: () => clue("listen") }),
      hosts: F("127.0.0.1    hearth\n10.0.0.2     post-office      # ottoline\n10.0.0.3     apiary           # fenn\n10.0.0.4     okafor-house     # pip\n10.0.0.5     observatory      # juniper\n{dim:# 10.0.0.99  the-lake     # doesn't reply. not to ping, anyway}"),
      passwd: F("wren:x:1000:1000:Wren Ashdown:/cottage:/bin/tea\nbiscuit:x:1:1:Biscuit:/cottage/parlour/armchair:/bin/purr\nyou:x:1001:1001::/cottage:/bin/hearth")
    }),

    proc: D("running things.", {
      biscuit: D("process 1.", {
        status: F(() => `Name:     biscuit
Pid:      1
Location: ${S.cat.room}
Mood:     ${S.cat.mood > 80 ? "fond of you" : S.cat.mood > 55 ? "content" : S.cat.mood > 30 ? "undecided" : "aloof"}
Fed:      ${S.cat.fed ? "yes" : "no"}
Collar:   ${S.flags.gotKey ? "bell" : "bell, small brass key"}`)
      }),
      uptime: F(() => "up " + S.day + " days.")
    }),

    bin: D("programs.", () => {
      const k = {};
      for (const n of commandNames()) k[n] = F("#!/bin/hearth\n# " + (CMDS[n].help || "") + "\n{dim:({cmd:" + n + "})}", { exec: true });
      return k;
    }),
    tmp: D("empty, apart from a crumb.", { crumb: F("Shortbread.") }),
    "lost+found": D("", { sock: F("One wool sock. Here since 1991.") })
  });
  if (typeof mysteryTree === "function") Object.assign(ROOT.kids, mysteryTree());
}
