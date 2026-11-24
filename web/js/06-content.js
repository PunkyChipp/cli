/* =====================================================================
   06-content.js — the cottage, room by room. Most of the writing in
   the game lives here. If you want to add a room or hide a note
   somewhere, this is the file. (See MODDING.md.)
   ===================================================================== */
"use strict";

const NAME = () => S.name || "you";
const W = s => s + "\n\n{dim:— W.}";

/* ---------- little dynamic descriptions ---------- */
function skyLine() {
  const w = weatherNow();
  const night = isNight();
  if (w.snow) return night ? "Snow is coming down past the window, lit orange where the lamp catches it." : "It's snowing — slow, fat flakes that don't seem in any hurry to land.";
  if (w.rain >= 1) return night ? "Rain ticks against the glass in the dark." : "Rain is coming down properly, the kind that bounces.";
  if (w.rain > 0) return "A fine drizzle is hanging in the air, not quite committing to anything.";
  if (w.fog > 0.5) return "Fog has swallowed the far side of the lake. The world ends about forty feet away.";
  if (w.wind > 0.8) return "Wind is shoving at the trees and rattling the gutter like it wants to come in.";
  if (night) return w.cloud > 0.5 ? "Outside it's a soft, starless dark." : "Outside, the sky is clear and absolutely crowded with stars.";
  if (S.min < 8 * 60) return "Early light, thin and gold, is coming in sideways.";
  if (S.min > 17 * 60) return "The light's gone amber and long. Evening, nearly.";
  return w.cloud > 0.5 ? "The sky is one big soft grey blanket." : "It's a bright, cold, blue sort of day.";
}
function catHere() { return S.cat.room === roomName(); }
function catLine() {
  const r = roomName();
  const lines = {
    kitchen: "Biscuit is sitting next to her bowl with the patience of a tax inspector.",
    parlour: fireLit() ? "Biscuit is stretched in front of the stove, belly to the heat, entirely liquid." : "Biscuit is curled in the armchair. It's her armchair. You're allowed to borrow it.",
    study: "Biscuit is on the desk, lying across exactly the papers you need.",
    garden: "Biscuit is in the garden, stalking a leaf with enormous seriousness.",
    greenhouse: "Biscuit is asleep between two pots, where it's warmest.",
    dock: "Biscuit is at the end of the dock, staring at the water like it owes her money.",
    attic: "Two green eyes in the dark: Biscuit, investigating a box she's been investigating since 2019.",
    hall: "Biscuit is lying in the exact middle of the hall rug, a tripping hazard on purpose.",
    cellar: "Biscuit is curled on top of the humming beige box. It's warm. She knows.",
    roof: "Biscuit has somehow followed you onto the roof and is looking very pleased about it."
  };
  return lines[r] || "Biscuit is here.";
}

/* ---------- Wren's welcome letter ---------- */
const WELCOME = () => `{hi:Dear ${NAME()},}

If you're reading this, you found the computer, you worked out how
to turn it on (the switch is at the BACK, everyone looks at the front),
and you typed {cmd:cat welcome.txt}. Or you tapped it. Either is fine.

Thank you for minding the cottage while I'm away. I'll be gone the
season. I've wanted to see the Faroe Islands since I was nine and
I am seventy-eight, so I've decided that's long enough to wait.

A few things:

 * The cottage runs on HEARTH, which is this machine. I wired it into
   every room in 1987 and I'm still very pleased with myself. Every
   room is a folder. Type {cmd:ls} to look around, {cmd:cd kitchen} to go
   somewhere, and {cmd:cat} a thing to read it. {cmd:look} if you're lost.
 * Biscuit is fed twice a day and will tell you it's four times.
 * I've left you a list. It's called {cmd:todo.txt}. You'll be fine.
 * The kettle needs a thump on the left side. Not the right side.
   The right side is where it keeps its feelings.

Most important: Lantern Night is on the 25th, two weeks from today.
The lantern on our dock is the first one lit every year. It has been
every year since 1974. I'd like that to keep being true. Everything you need
is somewhere in this house, and I've never been very good at
remembering where I put things, so — good luck, love.

Make yourself at home. It is your home, for now.

{dim:all my love,}
{acc:Wren}

{dim:p.s. the radio's broken. the disk for it is wherever I put the bread.}`;

/* ---------- the to-do list (it ticks itself) ---------- */
function todoText() {
  const items = [
    ["make a cup of tea", () => S.stats.teas > 0, "kitchen → {cmd:brew}"],
    ["feed Biscuit (she will lie about this)", () => S.flags.fedOnce, "{cmd:feed biscuit}"],
    ["plant something in the garden", () => S.flags.planted, "garden → {cmd:plant mint}"],
    ["fix the radio (the disk is with the bread)", () => S.disks.radio, "kitchen → bread_bin"],
    ["say hello to Ottoline on 101.3 in the morning", () => S.quests.otto_radio === "done", "{cmd:radio 101.3} before noon"],
    ["fish off the dock. it's good for you.", () => S.stats.fish > 0, "dock → {cmd:fish}"],
    ["find the oil lamp & light it (cellar? probably cellar)", () => S.flags.lampLit, "you'll need matches"],
    ["the greenhouse door sticks. it needs oil, not swearing.", () => S.flags.ghOpen, "the shed has an oilcan"],
    ["write back to people. they like that.", () => S.stats.letters > 0, "{cmd:mail}, then {cmd:send}"],
    ["light the lantern on Lantern Night", () => S.flags.lanternLit, "the 25th. everything's in the attic trunk."]
  ];
  let out = "{hi:THINGS TO DO}   {dim:(in no particular order, except the last one)}\n\n";
  let done = 0;
  for (const [t, ok, hint] of items) {
    const d = ok();
    if (d) done++;
    out += (d ? "{ok:[x]} {dim:" + t + "}" : "{acc:[ ]} " + t + "  {dim:" + hint + "}") + "\n";
  }
  out += "\n{dim:" + (done === items.length ? "...you did all of it. I'm so proud I could burst. — W." : done >= 5 ? "you're doing wonderfully. don't let Biscuit tell you otherwise." : "one thing at a time. tea first, always.") + "}";
  return out;
}

const BISCUIT_MANUAL = `{hi:BISCUIT: A USER'S MANUAL}  {dim:(rev. 6)}

MODEL ........ domestic shorthair, orange, "large-boned"
AGE .......... eleven (claims three)
FIRMWARE ..... stubborn

FEEDING
  Twice a day. Morning and evening. She will tell you she has
  not been fed. She has been fed. She was fed by me before I left
  and she will STILL tell you she has not been fed.
  {cmd:feed biscuit}

AFFECTION
  Head and cheeks: yes. Belly: it's a trap. It's always a trap.
  {cmd:pet biscuit}

KNOWN ISSUES
  - walks on the keyboard. there is no fix. it is a feature now.
  - sits on whatever you are reading.
  - is PID 1. everything else in this house is a child of Biscuit.
    try {cmd:ps} if you don't believe me.

LOCATION
  She moves around. {cmd:where biscuit} will tell you, roughly.
  HEARTH tracks her by her collar. She knows, and she resents it.

{dim:p.s. the little brass key on her collar is the spare for the
attic trunk. she won't give it to just anybody. be decent to her
for a few days and she'll let you have it.}`;

const FRIDGE_NOTE = () => `a note under a magnet shaped like a sardine:

  {acc:MILK — Ottoline brings it Tues}
  {acc:EGGS — Fenn's hens, he says "they're not for sale" then sells them}
  {acc:FISH — me, the lake, patience}
  {acc:${S.day > 3 ? "{s:JAM} jam is in the CELLAR, not here, stop looking" : "JAM — the cellar, obviously"}}`;

const HEARTH_MANUAL = `{hi:HEARTH-80 — OPERATOR'S GUIDE}   {dim:(handwritten addendum: W.)}

  The cottage is the filesystem. Don't think about it too hard.
  I didn't, and it works fine.

  {acc:GETTING AROUND}
    {cmd:ls}            what's here           {cmd:ls -a}  what's hiding
    {cmd:cd kitchen}    go to the kitchen     {cmd:cd ..}  go back out
    {cmd:look}          describe where I am   {cmd:map}    see the whole house
    {cmd:cat} <thing>   read it / look at it  {cmd:take} <thing>  pick it up

  {acc:LIVING HERE}
    {cmd:brew}  {cmd:cook}  {cmd:eat}  {cmd:plant}  {cmd:water}  {cmd:harvest}  {cmd:fish}
    {cmd:stoke}  {cmd:pet biscuit}  {cmd:mail}  {cmd:send}  {cmd:sleep}  {cmd:pockets}

  {acc:WHEN STUCK}
    {cmd:help}    {cmd:todo}    {cmd:hint}

  Tap anything that's {u:underlined} and it'll do it for you.
  The little keys under the screen change depending on the room.

  The {cmd:tab} key finishes words for you. The up arrow remembers
  things you said. (I wish people did that.)

{dim:  BUGS: Biscuit.}`;

/* ---------- books on the parlour shelf ---------- */
const BOOKS = {
  "the_patient_gardener.book": `{hi:THE PATIENT GARDENER}  by Mabel Thorne, 1962
{dim:(dog-eared at chapter four)}

"...and the beginner will water her seedlings and then stand over them,
as though watching will help. It does not help. It has never helped.
Water them, go inside, put the kettle on. Plants grow in the dark
and when you're not looking, like most good things.

Mint will grow anywhere, including places you do not want it.
Carrots are slow and sulky but worth it. Lavender wants sun and
to be left alone, which is also true of most of my relatives.

Rain counts as watering. Do not let anyone tell you otherwise."

{dim:in the margin, in pencil: "Mabel was right about everything except
pumpkins. pumpkins take five days here, not four. — W."}`,
  "knots_for_small_boats.book": `{hi:KNOTS FOR SMALL BOATS}  {dim:(a pamphlet, really)}

  THE BOWLINE: the rabbit comes out of the hole, goes round
  the tree, and back down the hole.

{dim:Wren has added: "the rabbit has never once come out of the hole for me.
I tie the boat with a bow, like a shoelace, and it has been fine since 1981."}`,
  "fishes_of_lake_ilse.book": `{hi:A FIELD GUIDE TO THE FISHES OF LAKE ILSE}

  {acc:PERCH}   common. bold. bites at anything, any time.
  {acc:ROACH}   common. silver. slightly embarrassed-looking.
  {acc:MINNOW}  very common. very small. put it back.
  {acc:TROUT}   likes clean mornings and quiet evenings.
  {acc:PIKE}    the evening fish. long. toothy. disapproving.
  {acc:EEL}     comes out at night, likes rain. slippery in every sense.
  {acc:CARP}    rare. slow. old. some say a golden one has lived in
          the lake since before the war. most say this is nonsense.

{dim:Wren has circled CARP so many times the pencil went through the page.
"HE IS REAL. HIS NAME IS OLD MARMALADE. he likes FOG. and DAWN. — W."}`,
  "the_cat_who_kept_a_lighthouse.book": `{hi:THE CAT WHO KEPT A LIGHTHOUSE}  {dim:(a picture book)}

  Once there was a cat who kept a lighthouse.
  Every night she pushed the big switch with her paw,
  and every night the ships came safely home.

  "Why do you do it?" asked the gull. "You don't even LIKE ships."

  "No," said the cat. "But I like it when everyone comes home."

{dim:inside the cover: "for Pip, when she's old enough. which is now, probably.
she's been old enough since she was four. — W."}`,
  "hearth_80_technical_reference.book": `{hi:HEARTH-80 TECHNICAL REFERENCE}  {dim:(412 pages, very annotated)}

  Chapter 1: Installation ......................... {dim:"done. ish."}
  Chapter 2: Memory (640K) ........................ {dim:"plenty."}
  Chapter 3: Peripherals .......................... {dim:"kettle. radio. cat (unsupported)."}
  Chapter 9: Troubleshooting ...................... {dim:"thump it."}
  Appendix C: Pipes ............................... {dim:"you can join commands with a | like
                                                    {cmd:ls | grep txt}. Juniper showed me.
                                                    she thinks I don't use it. I use it."}
  Appendix F: sudo ................................ {dim:"the password is not 'password'."}`,
  "wrens_almanac_1987.book": `{hi:WREN'S ALMANAC, 1987}  {dim:(a ring binder. a diary, really.)}

  {acc:Mar 3.}  Bought a computer. Fenn says I'm mad. Fenn keeps bees.
  {acc:Mar 9.}  Ran a cable to the kitchen. Kettle now has an IP address.
          Kettle does not know what to do with this. Neither do I.
  {acc:Apr 2.}  Every room is a directory now. Juniper came for supper and
          typed "cd garden" and then stood up and went into the garden.
          We laughed until we had to sit down.
  {acc:Jun 21.} Old Marmalade took my best lure. Again. I saw him. I SAW him.
  {acc:Oct 25.} Lantern Night. Lit the dock lantern with the computer this
          year. Ottoline said it was cheating. It was a bit.
          It was so beautiful I cried into the lake.`
};

/* ---------- Wren's letter in the attic trunk ---------- */
const TRUNK_LETTER = () => `{hi:to whoever is minding the cottage —}
{dim:(so: to you, ${NAME()}. I knew it would be you.)}

You found the trunk, which means Biscuit gave you the key, which
means she likes you, which means you're all right. She's a
better judge of people than I am. She hated my second husband
on sight and she was correct.

In here: the lantern disk, a wick, and a photo of all of us from
the first Lantern Night. Look how young Fenn was. Look at his HAIR.

The lantern burns moonflower oil. One bloom is enough. Moonflowers
only open at night and only in the greenhouse, which is why I've
been telling everybody for years that the greenhouse is important.
Juniper has the seeds. She's had them since 1974. She will pretend
she doesn't know what you're talking about, and then she'll give
you them, and she'll say "tell Wren she owes me."

I don't owe her. She owes me. Tell her I said so.

The lantern is lit from the dock, after dark, on the 25th. Put the
disk in, then go down to the water and type {cmd:lantern}.
Everyone across the lake will be watching for it. No pressure.

{dim:I wanted someone to love this place the way I do.}
{dim:I think it might be you. — W.}`;

const PHOTO_1974 = `a black and white photo, soft at the corners.

    .  *    .       *   .      .     *
       ___                 _
      ( o )   o   o  o    ( )   o      {dim:<- lanterns on the water}
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      [W] [O] [F] [J]     {dim:<- four people on a dock}

On the back, in pencil:
  {acc:"Lantern Night 1974. me, Ottoline, Abernathy Fenn (THE HAIR),}
  {acc: Juniper. first one we ever did. it rained. we didn't care."}`;

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

  ROOT = D("the root of everything. there's not much up here but wiring.", {
    cottage: D(() => "The hall. Coats on hooks, boots in a line that's mostly straight, and a smell of woodsmoke and old paper. The rug is worn pale down the middle from fifty years of the same route: kitchen, study, kitchen.", {
      "welcome.txt": F(WELCOME, { owner: "wren", onRead: f => f && remember("read Wren's letter. she's in the Faroes, or getting there.") }),
      "todo.txt": F(todoText, { owner: "wren" }),
      coat_hooks: F("Three coats. A yellow mac (Wren's), a waxed jacket (also Wren's), and one small hand-knitted jumper on its own hook, which can only be Biscuit's, and which she has very clearly never worn."),
      umbrella: F("A black umbrella with a duck's head for a handle. The duck looks worried. Keeps the rain off outside.", { item: "umbrella" }),
      kitchen: D(() => "The kitchen is the warmest room, even when it isn't. A chipped enamel kettle sits on the range. Jars line the windowsill, each labelled in Wren's handwriting. Some of the labels are lying. ('SUGAR' is buttons.)", {
        kettle: F(() => (teaWarm() ? "The kettle's still warm. There's tea in the pot." : "A big enamel kettle, cream with a green rim, dented on the left side where it gets thumped.") + "\nPut it on with {cmd:brew}. Or {cmd:brew mint}, {cmd:brew chamomile}... whatever you've got."),
        bread_bin: D("A wooden bread bin with BREAD painted on the lid, in case of confusion.", {
          "radio.dsk": F("A 3.5\" floppy disk, wrapped in a tea towel for some reason. The label says {acc:RADIO} in red pen, underlined twice.\nTake it with {cmd:take radio.dsk}, then {cmd:insert radio.dsk} in the study.", { item: "disk:radio" }),
          half_a_loaf: F("Half a loaf, gone hard. Biscuit has licked it, probably. Leave it for the birds.")
        }),
        drawer: D("The kitchen drawer. Every house has one. This is that drawer.", {
          matches: F("A box of matches. 'BRYANT & MAY', almost full.", { item: "matches" }),
          string: F("A ball of string, tangled into what is now technically a new kind of knot."),
          rubber_bands: F("Forty rubber bands. You count them. You're not sure why."),
          "IOU.txt": F(`{acc:IOU}\n  one (1) jar of honey back to Fenn\n  {dim:(written 1996. still haven't. he hasn't asked. he's waiting for me to remember. I remember.)}`)
        }),
        recipes: D("Recipe cards, held together with a bulldog clip and optimism.", () => {
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
        "biscuit_manual.txt": F(BISCUIT_MANUAL),
        fridge_note: F(FRIDGE_NOTE),
        cat_bowl: F(() => (S.cat.fed ? "Licked clean. Polished, almost." : "Empty. Pointedly empty.") + " A bowl with BISCUIT written on it, in case she forgets her own name. {cmd:feed biscuit}"),
        pantry: F("Flour, butter, sugar, oats, an onion, tins of things. Somehow it's always just stocked enough. Wren's doing, probably. Staples are on the house.")
      }, { room: true }),

      parlour: D(() => "The parlour: a low ceiling, a rag rug, a squashy armchair the colour of marmalade, and a cast-iron wood stove " + (fireLit() ? "glowing and ticking away happily." : "sitting cold and a bit sorry for itself.") + " Books everywhere. A record player under the window.", {
        stove: F(() => fireLit() ? "The fire's going. Little orange windows in the stove door. It'll burn till about " + clock(S.fireUntil % 1440) + "." : "Cold. There's ash from Wren's last fire. {cmd:stoke} it, if you've got wood (" + S.wood + " logs in the basket)."),
        wood_basket: F(() => S.wood ? "A wicker basket with " + plural(S.wood, "log") + " in it." : "Empty. The woodpile's in the garden — {cmd:chop} some."),
        armchair: F("Marmalade-coloured, soft as a held breath, and shaped exactly like Wren. {cmd:sit} in it."),
        record_player: F("A suitcase record player and a short stack of records. The top one is {acc:'Nocturnes for a Wet Tuesday'}. {cmd:play record}"),
        mantel_photo: F(PHOTO_1974),
        mantel_clock: F(() => "The mantel clock says " + clock(S.min) + ". It's right, which surprises everyone, including the clock."),
        bookshelf: D("Floor to ceiling. Paperbacks, field guides, a ring binder, a dictionary propping up the short leg of the shelf itself.",
          Object.fromEntries(Object.entries(BOOKS).map(([n, t]) => [n, F(t, { onRead: () => checkBooks() })])))
      }, { room: true }),

      study: D(() => "The study. Your desk, and on it HEARTH: beige, humming, the screen you're looking at now. A disk drive with a mouth like a letterbox. A window over the lake. Piles of paper with a system known only to Wren.", {
        "hearth.manual": F(HEARTH_MANUAL),
        disk_drive: F(() => {
          const d = Object.keys(S.disks).filter(k => S.disks[k]);
          return "A 3.5\" disk drive. It clunks satisfyingly.\nInstalled: " + (d.length ? d.map(x => "{acc:" + x + "}").join(", ") : "{dim:nothing yet}") + "\nPut a disk in with {cmd:insert}.";
        }),
        desk: D("Wren's desk. A green lamp, a mug full of pencils, a stack of envelopes she'll get to.", {
          "almanac_page.txt": F("A loose page, torn from somewhere:\n\n  {acc:\"the good seeds are hidden in the shed. use your -a's.\"}\n\n{dim:...what does that mean? (it means {cmd:ls -a})}"),
          pencils: F("Eleven pencils, all sharpened at both ends. Wren doesn't trust a pencil with only one plan."),
          floppy_box: D("A plastic box of floppy disks.", {
            "BLANK.DSK": F("Blank. Labelled 'BLANK' and then, underneath, 'really blank'."),
            "GAMES.DSK": F("Labelled GAMES. It contains one file: a spreadsheet of who owes Wren money at cards."),
            "BACKUP.DSK": F("Labelled BACKUP, 1993. Wren has never needed it. Wren has never needed anything.")
          })
        }),
        postcards: D("A shoebox Wren left out for postcards. Your postcards.", () => {
          const k = {};
          for (const id of S.letters) { const L = LETTERS[id]; if (L && L.from === "wren") k[L.file] = F(() => letterText(id)); }
          return k;
        }),
        notes: D("An empty folder Wren made for you. There's a label: {acc:'yours. write things. — W.'}  ({cmd:write} a note here.)", {})
      }, { room: true }),

      garden: D(() => "The garden: six raised beds in a row, a crooked shed, a woodpile, a birdbath, and a path that goes down through the long grass to the dock. " + skyLine(), () => Object.assign(plotKids(), {
        shed: D("The shed smells of creosote and string. Tools on nails, outlines painted behind each one so you know where they go. (One outline is shaped like Biscuit. Nobody knows why.)", {
          fishing_rod: F("Wren's split-cane rod, with a red-and-white float. Take it with {cmd:take rod}. The dock's where fish live.", { item: "rod" }),
          oilcan: F("A little brass oilcan with a long nose. For hinges, bikes, and anything that squeaks out of spite.", { item: "oilcan" }),
          watering_can: F("A green watering can with a rose on the spout. You'll use it automatically with {cmd:water}."),
          trowel: F("A trowel, worn to a perfect curve by fifty years of one particular hand."),
          ".seed_tin": D("A biscuit tin (not that Biscuit). Inside, paper envelopes in Wren's handwriting.", {
            lavender_seeds: F("{acc:LAVENDER} — for Fenn's bees. He's been asking for years.", { item: "seed:lavender", count: 3 }),
            pumpkin_seeds: F("{acc:PUMPKIN} — 'for lanterns, and pie, in that order.'", { item: "seed:pumpkin", count: 2 }),
            chamomile_seeds: F("{acc:CHAMOMILE} — 'for sleeping. or for pretending to.'", { item: "seed:chamomile", count: 2 })
          })
        }),
        woodpile: F(() => "Split logs under a tarp, and an axe leaning just so. {cmd:chop} some for the stove. (" + plural(S.wood, "log") + " inside.)"),
        birdbath: F(() => pick(["A robin is using the birdbath as a mirror. It's going well for him.", "Two sparrows are having an argument in the birdbath.", "The birdbath has a single leaf in it, turning slowly, like it's thinking."])),
        fox: F(() => "A fox, " + (S.fox ? "{acc:" + S.fox + "}, " : "") + "sitting at the edge of the long grass, watching you with an expression of polite expectation." + (S.fox ? "" : "\nShe doesn't have a name yet. You could {cmd:name fox} something."), { when: () => isNight() || isEvening() })
      }), { room: true }),

      greenhouse: D(() => "The greenhouse: whitewashed glass, the smell of warm soil and tomato leaves, an old mister on the ceiling that hisses now and then. Three clay pots on the bench. It's three degrees warmer in here than anywhere else in the world.", () => Object.assign(potKids(), {
        "moonflower_note.txt": F(W("{hi:MOONFLOWERS}\n\nOnly in here. Only in the pots. They need the warm and they need the dark.\nThey open after nightfall and close at dawn, so harvest them at night.\nOne bloom = enough oil for the lantern. Juniper has the seeds.")),
        mister: F("A brass mister. It keeps the pots damp on its own, so you only need to {cmd:water} out in the garden. Wren built it. It hisses at you if you stand too close.")
      }), { room: true, lock: () => (S.flags.ghOpen ? null : "the greenhouse door won't budge. the hinges have rusted solid.\n{dim:(it needs oil, not swearing. try {cmd:oil greenhouse} with the oilcan from the shed.)}") }),

      dock: D(() => "The dock: grey boards, warm in the sun and slippery in the rain, running out into Lake Ilse. A rowing boat knocks gently against a post. At the very end stands an iron lantern on a pole, " + (S.flags.lanternLit ? "burning blue-gold." : "unlit.") + " " + skyLine(), {
        lantern: F(() => lanternStatus()),
        rowboat: F("A green rowing boat. Painted on the back: {acc:THE SECOND OPINION}. Wren named it after an argument. {cmd:row} out for a bit, if you like."),
        tackle_box: D("A tackle box that opens like a staircase.", {
          "nemesis.txt": F(W("{hi:OLD MARMALADE}\n\nGolden carp. Enormous. Older than me (rude).\nSeen: fog, dawn, and once on my birthday, which was personal.\nHe has four of my lures in his lip like earrings.\n\nIf you catch him, {u:let him go}. Then tell me EVERYTHING.")),
          lures: F("A tangle of spinners, feathers, and one lure that's just a teaspoon with a hook.")
        }),
        bench: F("A bench at the land end of the dock, with a little brass plaque: {acc:'FOR SITTING. — W.'} {cmd:sit}")
      }, { room: true }),

      cellar: D(() => "The cellar. Stone walls, a single bulb on a string, and shelves and shelves of jam. In the corner there's a beige box the size of a suitcase, humming to itself, warm to the touch.", {
        jam_shelf: F(() => "Jars and jars. Blackberry, damson, plum, 'MYSTERY 2019'. " + (jamLeft() ? jamLeft() + " you could take. {cmd:take jam}" : "You've taken all the ones you're allowed. The rest are 'for winter'."), { item: "jam" }),
        oil_lamp: F("A brass oil lamp with a glass chimney. Full of oil. Would be very useful somewhere dark, like the attic. {cmd:take lamp} and then {cmd:light lamp} — you'll need matches.", { item: "lamp" }),
        mainframe: F("A beige box, humming. A label in Wren's capitals: {acc:HEARTH — DO NOT UNPLUG. NOT EVEN IF IT ASKS.}\nIt's never asked. You find that you're checking."),
        "the_hum.txt": F("There's a hum down here. It's the freezer.\n\n{dim:It's always been the freezer.}\n\n{dim:(the freezer has been unplugged since 2011.)}")
      }, { room: true }),

      attic: D(() => S.flags.atticLit ? "The attic, in lamplight. Rafters, boxes, a rocking horse with one glass eye, and the smell of a hundred summers. Under the round window sits a heavy old trunk with a brass padlock. A ladder leads up through a hatch to the roof." : "It's pitch black up here. You can hear the rafters creak and something small and many-legged going about its business.", () => (S.flags.atticLit ? {
        trunk: D("Wren's trunk. Leather straps, brass corners, a padlock about the size of a walnut.", {
          "lantern.dsk": F("A floppy disk labelled {acc:LANTERN} in gold pen. The label has little stars drawn round it.", { item: "disk:lantern" }),
          wick: F("A coil of thick cotton wick, new, still with the shop's string on it.", { item: "wick" }),
          "letter_to_whoever.txt": F(TRUNK_LETTER, { onRead: f => f && remember("found Wren's letter in the trunk. had to sit down for a minute.") }),
          "photo_1974.txt": F(PHOTO_1974)
        }, { lock: () => (S.flags.trunkOpen ? null : "the trunk is padlocked. a little brass padlock.\n{dim:(Biscuit's collar has a key on it. {cmd:cat biscuit_manual.txt} in the kitchen if you haven't.)}") }),
        rocking_horse: F("A rocking horse with one glass eye. Someone has written {acc:GERALD} on his saddle. Don't ask. You ask anyway: there's no answer."),
        margaret: F("A spider in the corner of the rafters with a magnificent web. Wren's note pinned beside her: {acc:'MARGARET. pays rent in flies. do NOT hoover.'}"),
        boxes: F("Boxes labelled XMAS, XMAS (REAL), TAX, NOT TAX, and one just labelled {acc:'NO'}. You leave that one.")
      } : {}), { room: true, dark: () => !S.flags.atticLit }),

      roof: D(() => "The flat bit of roof between the chimneys, with a railing and a weathervane shaped like a heron. A brass telescope on a tripod, under an oilskin cover. " + skyLine(), {
        telescope: F(() => S.disks.sky ? "A brass telescope, cover off, pointed at the sky. {cmd:sky} to look up." + (isNight() ? "" : " (it works better at night, obviously.)") : "A brass telescope. The motor housing has a slot for a disk and a label: {acc:'SKY.DSK — Juniper has it.'}"),
        weathervane: F(() => "The heron weathervane is pointing " + pick(["north-west", "west", "south-west", "north"]) + ". Today is " + weatherNow().word + "."),
        "star_notes.txt": F(starNotes, { when: () => S.disks.sky })
      }, { room: true, lock: () => (S.flags.atticLit ? null : "the ladder to the roof goes up from the attic, and the attic is pitch dark.\n{dim:(find a light first.)}") })
    }),

    dev: D("devices. everything in the house that HEARTH can talk to.", {
      kettle: F(() => (teaWarm() ? "warm. content. 92°C and falling." : "cold. waiting. ready when you are.")),
      cat: F(() => pick(["mrrp.", "mrrrrrp?", "...", "mrow.", "(a slow blink. that means I love you, in cat.)", "prrrrrrrrrrrrrrrrrrr"])),
      null: F(""),
      rain: F(() => (weatherNow().rain ? "tik tik tik. tk. tiktiktik. tik. tk tk tik." : "nothing. the rain's taken the day off.")),
      lake: F(() => "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n" + (chance(0.2) ? "              ><>" : "")),
      random: F(() => Array.from({ length: 6 }, () => pick(["teacup", "moss", "lantern", "heron", "toast", "wool", "puddle", "marmalade", "owl", "pinecone", "soup", "mitten", "kindling", "drizzle"])).join(" ")),
      hum: F("mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm\n{dim:(it's the freezer.)}")
    }),

    etc: D("configuration. Wren's settings, mostly.", {
      motd: F(() => S.files["/etc/motd"] || "Welcome home.", { user: true }),
      "hearth.conf": F(() => "[cottage]\nowner      = wren\nminder     = " + NAME() + "\nkettle     = enabled\ncat        = enabled  # cannot be disabled. have tried.\ntimezone   = lake/ilse\nlantern    = 25-oct\n\n[radio]\nspoon_on_aerial = yes   # don't remove the spoon"),
      hosts: F("127.0.0.1    cottage hearth\n10.0.0.2     post-office      # ottoline\n10.0.0.3     apiary           # fenn & 40,000 bees\n10.0.0.4     okafor-house     # pip. (she's 11. she will try to hack you.)\n10.0.0.5     observatory      # juniper\n10.0.0.99    the-lake         # doesn't reply. dignified."),
      passwd: F("wren:x:1000:1000:Wren Ashdown:/cottage:/bin/tea\nbiscuit:x:1:1:Biscuit (cat):/cottage/parlour/armchair:/bin/purr\n{dim:you:x:1001:1001:the minder:/cottage:/bin/hearth}\n\n{dim:(the actual passwords aren't in here. don't be nosy.)}"),
      fstab: F("/dev/kettle   /kitchen   tea    defaults   0 1\n/dev/cat      /          cat    everywhere 0 0\n/dev/lake     /dock      water  noatime    0 2")
    }),

    proc: D("running things. live information.", {
      biscuit: D("process 1. the cat.", {
        status: F(() => `Name:     biscuit
Pid:      1
State:    ${pick(["S (sleeping)", "S (sleeping)", "R (running, briefly)", "D (dreaming)"])}
Location: ${S.cat.room}
Mood:     ${S.cat.mood > 80 ? "adores you (won't admit it)" : S.cat.mood > 55 ? "content" : S.cat.mood > 30 ? "tolerating you" : "aloof"}
Fed:      ${S.cat.fed ? "yes (will claim no)" : "no (will claim no)"}
Collar:   ${S.flags.gotKey ? "a little bell" : "a little bell, a small brass key"}`)
      }),
      uptime: F(() => "up " + S.day + " days. load average: 1 cat, 0.5 kettle, " + (weatherNow().rain ? "rain" : "0.0 rain")),
      weather: F(() => "today: " + weatherNow().word + "\nwarmth: " + Math.round(S.warmth) + "%\nfire: " + (fireLit() ? "lit" : "out"))
    }),

    bin: D("all the programs HEARTH knows.", () => {
      const k = {};
      for (const n of commandNames()) k[n] = F("#!/bin/hearth\n# " + (CMDS[n].help || "a program.") + "\n{dim:(run it by typing its name: {cmd:" + n + "})}", { exec: true });
      return k;
    }),
    tmp: D("temporary files. Wren cleans up after herself. It's empty, apart from a crumb.", { crumb: F("A crumb. Shortbread, you'd guess. Biscuit can't reach up here, so it's safe. For now.") }),
    "lost+found": D("things the system found, lost again, and found.", { sock: F("A single wool sock. It's been here since 1991. Its partner is presumably out there, living its best life.") })
  });
}
