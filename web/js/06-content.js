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
  if (w.snow) return night ? "Outside, snow is going past the window, orange where the lamp light catches it." : "It's snowing, big slow flakes that take ages to land.";
  if (w.rain >= 1) return night ? "Rain is hitting the glass." : "It's raining hard, and the lake has gone grey and pocked all over.";
  if (w.rain > 0) return "There's a fine drizzle that isn't quite rain.";
  if (w.fog > 0.5) return "The fog is so thick you can't see the far shore, or the end of the dock.";
  if (w.wind > 0.8) return "It's windy, and something on the gutter keeps knocking.";
  if (night) return w.cloud > 0.5 ? "It's dark and overcast, no stars." : "It's a clear night with more stars than you're used to.";
  if (S.min < 8 * 60) return "The sun's only just over the hill.";
  if (S.min > 17 * 60) return "The light's starting to go.";
  return w.cloud > 0.5 ? "It's overcast." : "It's bright and cold.";
}
function catHere() { return S.cat.room === roomName(); }
function catLine() {
  const r = roomName();
  const lines = {
    kitchen: "Biscuit is sitting next to her bowl, looking at it.",
    parlour: fireLit() ? "Biscuit is lying flat out in front of the stove with her belly to the heat." : "Biscuit is asleep in the armchair, in the dip Wren's left in it.",
    study: "Biscuit is lying on the desk, on top of whatever paper you were about to need.",
    garden: "Biscuit is in the long grass at the end of the beds. You can just see her ears.",
    greenhouse: "Biscuit is asleep between two of the pots, where it's warmest.",
    dock: "Biscuit is sitting at the end of the dock, looking down into the water.",
    attic: "You can hear Biscuit moving around up here somewhere among the boxes.",
    hall: "Biscuit is lying right in the middle of the hall rug.",
    cellar: "Biscuit is curled up on top of the humming box. It must be warm.",
    roof: "Biscuit has followed you up the ladder, which you didn't know she could do."
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
    out += (d ? "{dim:  {s:" + t + "}}" : "  " + t + (hint ? "  {dim:· " + hint + "}" : "")) + "\n";
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
    cottage: D(() => "A narrow hall with a long rug worn pale down the middle, where fifty years of feet have gone between the kitchen and the study. Wren's coats are still on the hooks, and her list is pinned up by the light switch.", {
      "todo.txt": F(todoText, { owner: "wren" }),
      coat_hooks: F("Wren's yellow mac is still here, so wherever she's gone she's taken the good coat. There's a waxed jacket with string in the pockets, and on the last hook a tiny knitted jumper in green wool that can only have been made for the cat. It doesn't look like it's ever been worn."),
      umbrella: F("A big black umbrella with a wooden duck's head for a handle. One of the spokes is bent. You'll want it if you go out in the rain.", { item: "umbrella" }),
      kitchen: D(() => "The kitchen is the warmest room in the house and smells faintly of toast. There's a cream range with the kettle on it, a long table with one end cleared for eating and the other buried in seed catalogues, and a window over the sink that looks down the garden to the lake.", {
        kettle: F(() => (teaWarm() ? "Still warm." : "A cream enamel kettle with a green rim. There's a dent on the left side about the size of a fist, which explains the note.") + " {cmd:brew}"),
        bread_bin: D("A tin bread bin with BREAD on the lid in case anyone was unsure.", {
          "radio.dsk": F("Under the half loaf, wrapped in a tea towel for some reason, is a floppy disk with RADIO written on it in red pen. Disks go in HEARTH's drive in the study.", { item: "disk:radio" }),
          half_a_loaf: F("Half a loaf of something brown and seeded. It's gone hard enough to knock on.")
        }),
        drawer: D("The drawer by the cooker, the one every kitchen has, full of things that might come in handy.", {
          matches: F("A box of kitchen matches, nearly full. Someone has written STOVE on the side in case there was any doubt.", { item: "matches" }),
          string: F("A ball of garden string that's been rewound so many times it's more knot than ball."),
          rubber_bands: F("Rubber bands, the red ones the postman drops. Wren has clearly been picking them up off the path for years."),
          "IOU.txt": F(`A torn-off bit of envelope:

  {acc:IOU one jar of honey. to A.F.}
  {acc:1996}

It's been folded and unfolded a lot.`)
        }),
        recipes: D("A stack of recipe cards held together with a bulldog clip, some of them spotted with grease.", () => {
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
        cat_bowl: F(() => (S.cat.fed ? "Empty, licked clean." : "Empty.") + " It's a white china bowl with BISCUIT painted on the side, chipped where she's pushed it round the floor. {cmd:feed biscuit}"),
        pantry: F("A tall cupboard with flour, oats, a string of onions, a lot of tins and a tub of butter on the cold shelf. There's enough in here for anything on Wren's recipe cards.")
      }, { room: true }),

      parlour: D(() => "The parlour has a ceiling low enough to touch flat-handed, an orange armchair with a dent in it the shape of Wren, and a wood stove that's " + (fireLit() ? "going nicely." : "gone cold.") + " Every wall that isn't a window is books. The record player by the window has its lid up.", {
        stove: F(() => fireLit() ? "Lit. It'll go until about " + clock(S.fireUntil % 1440) + "." : "Cold. " + plural(S.wood, "log") + " in the basket. {cmd:stoke}"),
        wood_basket: F(() => S.wood ? plural(S.wood, "log") + "." : "Empty. The woodpile's in the garden. {cmd:chop}"),
        armchair: F("The orange armchair has a dip in the seat and a darker patch on the right arm where a mug has been put down every evening for a very long time. {cmd:sit}"),
        record_player: F("A red suitcase record player. The record on it is {acc:Nocturnes for a Wet Tuesday}, and there are about thirty more in a box underneath, mostly piano. {cmd:play record}"),
        mantel_photo: F(PHOTO_1974, { onRead: () => clue("count") }),
        mantel_clock: F(() => "A wooden clock that ticks loudly enough to hear from the hall. It says " + clock(S.min) + ", which you check against HEARTH. It's right."),
        bookshelf: D("Paperbacks, field guides, a ring binder, a dictionary holding up the short leg of the shelf.",
          Object.fromEntries(Object.entries(BOOKS).map(([n, t]) => [n, F(t, { onRead: () => { checkBooks(); if (n.startsWith("wrens_almanac")) clue("cable"); if (n.startsWith("hearth_80")) clue("cable"); } })])))
      }, { room: true }),

      study: D(() => "The study is only just big enough for the desk. HEARTH sits on it, beige and humming quietly, with the disk drive underneath. Above it there's a corkboard" + (Object.keys(S.clues || {}).length ? " with a few things pinned to it now" : ", empty except for the drawing pins") + ", and the window looks straight out over the lake.", {
        "note.txt": F(NOTE, { owner: "wren", onRead: f => f && remember("found Wren's note on the screen.") }),
        "hearth.manual": F(HEARTH_MANUAL),
        corkboard: F(() => "A corkboard with a tin of drawing pins and a reel of red wool hanging off a nail beside it. Wren must have used it for something, because the cork is full of tiny holes. {cmd:board}"),
        disk_drive: F(() => {
          const d = Object.keys(S.disks).filter(k => S.disks[k]);
          return "A 3.5\" drive. Installed: " + (d.length ? d.map(x => "{acc:" + x + "}").join(", ") : "{dim:nothing}") + ". {cmd:insert}";
        }),
        desk: D("Wren's desk has a green-shaded lamp, a mug of pencils and a pile of envelopes she was clearly going to get round to.", {
          "torn_page.txt": F("A page torn out of something:\n\n  {acc:the good seeds are in the shed. use your -a's.}\n\n{dim:(as in {cmd:ls -a})}"),
          pencils: F("A mug of pencils. All of them have been sharpened at both ends, which you didn't know was a thing people did."),
          floppy_box: D("A box of floppy disks.", {
            "BLANK.DSK": F("BLANK, it says on the label, and underneath in smaller writing, 'actually blank'."),
            "GAMES.DSK": F("The label says GAMES. The only thing on it is a spreadsheet of who owes Wren money from cards. Fenn owes the most."),
            "LOG-87.DSK": F("Labelled LOG 87–. Empty. {dim:(whatever was on it has been copied somewhere. /var/log, maybe.)}", { onRead: () => clue("log") })
          })
        }),
        postcards: D("A shoebox with POSTCARDS written on the lid. Wren must have left it out for you.", () => {
          const k = {};
          for (const id of S.letters) { const L = LETTERS[id]; if (L && L.from === "wren") k[L.file] = F(() => letterText(id)); }
          return k;
        }),
        notes: D("An empty folder labelled {acc:yours}. ({cmd:write} something.)", {})
      }, { room: true }),

      garden: D(() => "The garden runs downhill in six raised beds. There's a shed with a crooked roof, a woodpile under a tarp, a stone birdbath, and a path worn through the long grass down to the dock. " + skyLine(), () => Object.assign(plotKids(), {
        shed: D("The shed smells of creosote. Every tool hangs on its own nail with its outline painted on the wall behind it, so you'd know straight away if one went missing.", {
          fishing_rod: F("Wren's old split-cane fishing rod, with a red and white float hooked onto the bottom ring. The cork handle is worn smooth where her hand goes.", { item: "rod" }),
          oilcan: F("A small brass oilcan with a long spout, about half full. It's the kind of thing you use on hinges.", { item: "oilcan" }),
          watering_can: F("A green metal watering can with a rose on the end. It's what you use when you {cmd:water}."),
          trowel: F("A trowel with a wooden handle that's gone dark and smooth. The blade has worn down on one side from always being used the same way."),
          ".seed_tin": D("An old shortbread tin pushed to the back of the top shelf. Inside are paper envelopes of seeds, each labelled in Wren's capitals.", {
            lavender_seeds: F("{acc:LAVENDER}, for Fenn's bees.", { item: "seed:lavender", count: 3 }),
            pumpkin_seeds: F("An envelope marked {acc:PUMPKIN} in capitals, with 'for the carving' underneath.", { item: "seed:pumpkin", count: 2 }),
            chamomile_seeds: F("An envelope marked {acc:CHAMOMILE}. It smells of hay even through the paper.", { item: "seed:chamomile", count: 2 })
          })
        }),
        woodpile: F(() => "Logs stacked against the shed wall under a green tarp held down with bricks. The axe is leaning against them. {cmd:chop} {dim:(" + plural(S.wood, "log") + " in the basket inside)}"),
        birdbath: F(() => "A stone birdbath with moss up the stem. " + pick(["There's a robin in it, splashing about.", "Two sparrows are arguing on the rim.", "There's a single yellow leaf floating in it."])),
        fox: F(() => "A fox" + (S.fox ? " (" + esc(S.fox) + ")" : "") + " at the edge of the long grass, watching you." + (S.fox ? "" : " {dim:({cmd:name fox} her?)}"), { when: () => isNight() || isEvening() })
      }), { room: true }),

      greenhouse: D(() => "It's noticeably warmer in here. The glass is whitewashed on the inside, a brass mister on the ceiling hisses every so often, and three clay pots are lined up on the bench.", () => Object.assign(potKids(), {
        "moonflower_note.txt": F(W("{hi:moonflowers}\n\npots only. they want warm and dark.\nthey open after dark and shut again at dawn, so pick them at night.\none flower gives enough oil for the lantern.\n\nthe light they give off is the same colour as the other light.\nthat's not a coincidence. I don't know what it is."), { onRead: () => clue("colour") }),
        mister: F("A brass pipe along the ceiling with little nozzles in it. Every few minutes it hisses and mists the pots, so you never need to water in here.")
      }), { room: true, lock: () => (S.flags.ghOpen ? null : "The door won't budge. The hinges have rusted.\n{dim:(the oilcan's in the shed: {cmd:oil greenhouse})}") }),

      dock: D(() => "The dock is grey boards on old posts, thirty feet or so of it, with Wren's green rowing boat tied up alongside. At the far end there's an iron lantern on a pole" + (S.flags.lanternLit ? ", lit." : ".") + " A thick black cable is stapled along the boards the whole way out and drops over the end into the water. " + skyLine(), {
        lantern: F(() => lanternStatus()),
        cable: F("A thick black cable, stapled along the dock, going over the end and straight down into the water. It's warm to touch. Faintly. {dim:(it goes back up the garden towards the house.)}", { onRead: () => clue("cable") }),
        water: F(() => lakeLook()),
        rowboat: F("A green wooden rowing boat with a bit of water in the bottom. Someone has painted {acc:THE SECOND OPINION} on the back in white. The oars are under the seat. {cmd:row}"),
        tackle_box: D("A green metal tackle box with trays that fold out like stairs.", {
          "carp.txt": F(W("{hi:the carp}\n\ngolden. huge. older than me.\nseen in fog, at dawn, and once on my birthday.\nhe has four of my lures in his lip.\n\nif you catch him, let him go.")),
          lures: F("A tangle of spinners and feathered lures, and one that's just an old teaspoon with a hook soldered on. That one looks the most used.")
        }),
        bench: F("A wooden bench at the land end of the dock. Someone has screwed a little brass plaque onto the back that says {acc:FOR SITTING}. {cmd:sit}")
      }, { room: true }),

      cellar: D(() => "You have to duck under the beam at the bottom of the steps. It's cold down here and smells of earth and jam, and there are shelves of jars along both walls. In the corner is a beige metal box about the size of a suitcase, and that's where the hum is coming from. A cable comes in through the wall and plugs into the back of it.", {
        jam_shelf: F(() => "Blackberry, damson, plum, one labelled MYSTERY 2019. " + (jamLeft() ? "{cmd:take jam}" : "The rest are labelled 'winter'."), { item: "jam" }),
        oil_lamp: F("A brass oil lamp with a glass chimney, full of oil. The attic has no light up there, so you'll want this.", { item: "lamp" }),
        box: F(() => "Beige steel, warm, humming. A label in Wren's capitals: {acc:HEARTH RECEIVER — DO NOT UNPLUG}. A small green light blinks, slowly. " + (S.flags.lanternLit ? "Faster than it used to." : "") + "\n{dim:(there's a program for it. Wren used to run it down here: {cmd:listen})}", { onRead: () => { clue("hum"); clue("listen"); } }),
        "the_hum.txt": F("{dim:(taped to the box)}\n\nit's the freezer.\n\n{dim:(the freezer is unplugged.)}", { onRead: () => clue("hum") })
      }, { room: true }),

      attic: D(() => S.flags.atticLit ? "The attic runs the whole length of the house. Boxes are stacked under the eaves, there's a rocking horse missing one eye, and under the round window there's a heavy leather trunk. A ladder goes up to a hatch onto the roof." : "It's completely dark up here. Something small walks across the boards and stops.", () => (S.flags.atticLit ? {
        trunk: D("A leather trunk with brass corners and a small padlock.", {
          "lantern.dsk": F("A floppy disk with {acc:LANTERN} written on it in gold pen and a lot of little stars drawn round the edge.", { item: "disk:lantern" }),
          wick: F("A coil of thick cotton lantern wick, still with the shop's paper band round it.", { item: "wick" }),
          "letter.txt": F(TRUNK_LETTER, { onRead: f => { clue("ask"); if (f) remember("found Wren's letter in the trunk. read it twice."); } }),
          "diary_1962.txt": F(DIARY_1962, { onRead: () => { clue("1962"); clue("name"); } }),
          "photo_1974.txt": F(PHOTO_1974, { onRead: () => clue("count") })
        }, { lock: () => (S.flags.trunkOpen ? null : "Padlocked.\n{dim:(the key is on Biscuit's collar.)}") }),
        rocking_horse: F("A dapple-grey rocking horse missing one glass eye. Someone wrote GERALD on the saddle in felt tip a long time ago."),
        margaret: F("In the corner of the rafters there's a big spider in a big web, and pinned to the beam next to it a note in Wren's writing: {acc:MARGARET. do not hoover.}"),
        boxes: F("Cardboard boxes labelled XMAS, XMAS (REAL), TAX and NOT TAX. One at the back just says {acc:NO}, and you decide to leave it.")
      } : {}), { room: true, dark: () => !S.flags.atticLit }),

      roof: D(() => "There's a flat bit of roof between the two chimneys with a railing round it and a weathervane shaped like a heron. Wren's brass telescope stands there under an oilskin cover. " + skyLine(), {
        telescope: F(() => S.disks.sky ? "Cover off. {cmd:sky}" + (isNight() ? "" : " {dim:(after dark.)}") : "A brass telescope. The motor has a slot for a disk. A label: {acc:SKY.DSK (J. has it)}."),
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
