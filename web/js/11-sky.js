/* =====================================================================
   11-sky.js — Wren's telescope on the roof. Point it north, south,
   east, west, or straight up. The constellations here aren't the ones
   in books: Wren and Juniper named them when they were fourteen.
   ===================================================================== */
"use strict";

const CONSTELLATIONS = {
  kettle: { dir: "south", name: "The Kettle", art: [
    "            *",
    "     *-----*  \\",
    "     |      \\  *",
    "     *-------*"
  ], note: "Four stars in a squat box with a spout. Always on the boil. In autumn it sits low over the hill, as if someone's about to make tea." },
  cat: { dir: "north", name: "The Sleeping Cat", art: [
    "    *.  .*",
    "     \\`'/     ",
    "     ( *   )___*",
    "      *---------*"
  ], note: "Curled up and turning slowly round the pole star all night. She never actually gets up. Wren said that was the most realistic thing in the sky." },
  spoon: { dir: "north", name: "The Long Spoon", art: [
    "  *",
    "   \\",
    "    *--*--*--*"
  ], note: "For stirring the Kettle. A long handle and a little bowl of three faint stars." },
  heron: { dir: "east", name: "The Heron", art: [
    "        *",
    "        |\\",
    "   *----*  *",
    "        |",
    "        *"
  ], note: "Standing on one leg in the eastern reeds. Rises late, like herons do, and stands very still." },
  bicycle: { dir: "west", name: "Wren's Bicycle", art: [
    "      *--*",
    "     /    \\",
    "   (*)----(*)"
  ], note: "Two bright stars for wheels and a crooked frame. Wren insisted on it. Juniper wanted it to be called 'The Wheelbarrow'. They didn't speak for a week in 1962." },
  lantern: { dir: "up", name: "The Lantern", art: [
    "       _*_",
    "      | * |",
    "      |___|",
    "        *"
  ], note: "Straight overhead in autumn. A small box of stars with one bright one inside. The whole Hollow plans Lantern Night by it." }
};
const DIRS = ["north", "east", "south", "west", "up"];
const cometVisible = () => S.day >= 10 && S.day <= 18;

function starfield(dir, w = 40, h = 7) {
  const r = seeded(dir.length * 977 + dir.charCodeAt(0) * 31 + (S.day > SEASON_END ? 5 : 0));
  const rows = [];
  for (let y = 0; y < h; y++) {
    let s = "";
    for (let x = 0; x < w; x++) { const v = r(); s += v < 0.03 ? "." : v < 0.04 ? "+" : v < 0.045 ? "*" : " "; }
    rows.push(s);
  }
  return rows;
}

function skyCan() {
  if (roomName() !== "roof") return "The telescope's up on the roof. {cmd:cd ~/roof}";
  if (!S.disks.sky) return "The telescope's motor needs its disk. {dim:(Juniper has the disk.)}";
  if (!isNight()) return "It's daytime. You look through the telescope anyway and see a very magnified cloud. {dim:(come back after 8pm.)}";
  const w = weatherNow();
  if (w.rain) return "It's raining. You put the cover back on the telescope before it gets wet. {dim:(the weather's on 93.1.)}";
  if (w.fog > 0.5) return "Fog. The telescope can see about as far as your hand, which you can already see.";
  if (w.cloud > 0.6) return "Nothing but cloud tonight. It's very nice cloud. It's not stars, though.";
  return null;
}

async function doSky(args) {
  const no = skyCan();
  if (no) return print(no);
  let dir = (args[0] || "").toLowerCase();
  if (["n", "e", "s", "w", "u"].includes(dir)) dir = DIRS.find(d => d[0] === dir);
  if (["overhead", "zenith", "straight"].includes(dir)) dir = "up";
  if (!dir) {
    print("You take the cover off the telescope. The motor whirrs as it wakes up.");
    print("{dim:Where to point it?}  " + DIRS.map(d => "{cmd:sky " + d + "}").join("  "));
    const found = Object.keys(S.stars).filter(k => CONSTELLATIONS[k]).length;
    print("{dim:(" + found + "/6 of Wren and Juniper's constellations found. notes: {cmd:cat star_notes.txt})}");
    return;
  }
  if (!DIRS.includes(dir)) return print("The telescope can point " + DIRS.join(", ") + ". Not " + esc(dir) + ".");
  sfx("beep");
  print("{dim:whirrrrr... click.} The telescope swings " + (dir === "up" ? "straight up" : dir) + ".");
  await pause(500);
  // the sky is a grid of [char, colour] cells; constellations get stamped on top
  const field = starfield(dir).map(r => r.split("").map(ch => [ch, ch === " " ? null : "dim"]));
  const here = Object.entries(CONSTELLATIONS).filter(([, c]) => c.dir === dir);
  const stamp = (art, x0, y0, cls) => art.forEach((row, i) => {
    const y = y0 + i;
    if (!field[y]) return;
    for (let x = 0; x < row.length; x++) if (row[x] !== " " && field[y][x0 + x]) field[y][x0 + x] = [row[x], cls];
  });
  here.forEach(([, c], i) => stamp(c.art, 3 + i * 20, 1, "hi"));
  const comet = dir === "west" && cometVisible();
  if (comet) stamp(["*==--- -  -"], 24, 5, "acc");
  print("{dim:   .-" + "-".repeat(40) + "-.}");
  for (const row of field) {
    const s = row.map(([ch, cls]) => (cls ? "{" + cls + ":" + esc(ch) + "}" : " ")).join("");
    print("{dim:  |} " + s + "{dim: |}");
  }
  print("{dim:   '-" + "-".repeat(40) + "-'}");
  for (const [k, c] of here) {
    const first = !S.stars[k];
    S.stars[k] = S.stars[k] || S.day;
    print((first ? "{ok:New!} " : "") + "{hi:" + c.name + "} {dim:· " + c.note + "}");
    if (first) remember("found " + c.name + " through the telescope.");
  }
  if (comet) {
    print("{acc:...and there, low and faint, with a tail like a brushstroke: the comet.}");
    if (!S.flags.sawComet) {
      S.flags.sawComet = true;
      await pause(600);
      await type("You watch it for a long time. It doesn't move, and it's moving at thousands of miles an hour, and you think about two fourteen-year-olds at the end of the dock, sixty-four years ago, seeing exactly this.", 45);
      keepsake("comet");
      clue("comet");
      remember("saw the comet. Juniper and Wren saw it from this exact roof in 1962.");
      if (S.quests.jun_comet === "open") print("{dim:(Juniper will want to know. {cmd:send} her something. anything.)}");
    }
  } else if (dir === "west" && S.day < 10) print("{dim:(nothing unusual in the west tonight. it's quiet. like it's waiting.)}");
  if (Object.keys(CONSTELLATIONS).every(k => S.stars[k])) keepsake("allstars");
  spend(15);
  warm(-2);
}

function starNotes() {
  let out = "{hi:STAR NOTES}  {dim:(Juniper's handwriting, very small and very neat)}\n\n";
  for (const [k, c] of Object.entries(CONSTELLATIONS)) out += (S.stars[k] ? "{ok:✓} {hi:" + c.name + "}" : "{dim:·} " + c.name) + "  {dim:— look " + c.dir + "}\n";
  out += "\n{dim:clear nights only. after 8pm. dress warmly, you won't, but do.}";
  if (S.day >= 10) out += "\n{acc:p.s. comet. west. this week only. J.}";
  return out;
}
