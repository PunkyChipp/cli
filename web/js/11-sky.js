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
  ], note: "Four stars in a squat box, and a fifth off to one side for the spout. Low over the hill in autumn. Wren named it, obviously." },
  cat: { dir: "north", name: "The Sleeping Cat", art: [
    "    *.  .*",
    "     \\`'/     ",
    "     ( *   )___*",
    "      *---------*"
  ], note: "Curled round the pole star, so she goes round all night without ever getting up. Wren said it was the most accurate thing in the sky." },
  spoon: { dir: "north", name: "The Long Spoon", art: [
    "  *",
    "   \\",
    "    *--*--*--*"
  ], note: "A long handle with three faint stars at the end for the bowl. Next to the Kettle, for stirring it." },
  heron: { dir: "east", name: "The Heron", art: [
    "        *",
    "        |\\",
    "   *----*  *",
    "        |",
    "        *"
  ], note: "A tall one on the eastern side that comes up late in the evening. I named this one. It's a heron standing in the reeds on one leg." },
  bicycle: { dir: "west", name: "Wren's Bicycle", art: [
    "      *--*",
    "     /    \\",
    "   (*)----(*)"
  ], note: "Two bright stars for the wheels and a crooked frame between them. I wanted to call it the Wheelbarrow. We didn't speak for a week." },
  lantern: { dir: "up", name: "The Lantern", art: [
    "       _*_",
    "      | * |",
    "      |___|",
    "        *"
  ], note: "Straight overhead in October. A small square of stars with a bright one in the middle. Lantern Night is always when this is highest." }
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
  if (!S.disks.sky) return "The telescope's motor won't turn without its disk, and Juniper has that.";
  if (!isNight()) return "It's still light. You'll need to come back up after dark, from about eight.";
  const w = weatherNow();
  if (w.rain) return "It's raining, so you leave the cover on the telescope. The forecast is on 93.1 if you want to know about tomorrow.";
  if (w.fog > 0.5) return "It's foggy. You can barely see the chimney, never mind the stars.";
  if (w.cloud > 0.6) return "It's too cloudy tonight to see anything.";
  return null;
}

async function doSky(args) {
  const no = skyCan();
  if (no) return print(no);
  let dir = (args[0] || "").toLowerCase();
  if (["n", "e", "s", "w", "u"].includes(dir)) dir = DIRS.find(d => d[0] === dir);
  if (["overhead", "zenith", "straight"].includes(dir)) dir = "up";
  if (!dir) {
    print("You pull the oilskin off the telescope. The motor makes a whirring noise as it warms up.");
    print("{dim:Where to point it?}  " + DIRS.map(d => "{cmd:sky " + d + "}").join("  "));
    const found = Object.keys(S.stars).filter(k => CONSTELLATIONS[k]).length;
    print("{dim:" + found + "/6 of Wren and Juniper's constellations found. notes: {cmd:cat star_notes.txt}}");
    return;
  }
  if (!DIRS.includes(dir)) return print("The telescope can point " + DIRS.join(", ") + ". Not " + esc(dir) + ".");
  sfx("beep");
  print("The motor whirrs and the telescope swings round to point " + (dir === "up" ? "straight up" : dir) + ".");
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
    print("{hi:" + c.name + "}" + (first ? "  {ok:you copy it into the margin of Juniper's notes}" : ""));
    print("{dim:Juniper's note: " + c.note + "}");
    if (first) remember("found " + c.name + " through the telescope.");
  }
  if (comet) {
    print("{acc:And low down, faint, with a short smudge of tail behind it, there's the comet.}");
    if (!S.flags.sawComet) {
      S.flags.sawComet = true;
      await pause(600);
      await type("You watch it until your neck aches from bending to the eyepiece. Across the lake, Juniper is probably doing the same. The last time it came round, she and Wren were fourteen and watching it from the end of your dock.", 45);
      keepsake("comet");
      clue("comet");
      remember("saw the comet. Juniper and Wren saw it from this exact roof in 1962.");
      if (S.quests.jun_comet === "open") print("{dim:Juniper said to send her something if you saw it. It doesn't matter what. {cmd:send}}");
    }
  } else if (dir === "west" && S.day < 10) print("{dim:There's nothing unusual in the west tonight.}");
  if (Object.keys(CONSTELLATIONS).every(k => S.stars[k])) keepsake("allstars");
  spend(15);
  warm(-2);
}

function starNotes() {
  let out = "{hi:STAR NOTES}  {dim:Juniper's handwriting, very small and very neat}\n\n";
  for (const [k, c] of Object.entries(CONSTELLATIONS)) out += (S.stars[k] ? "{ok:✓} {hi:" + c.name + "}" : "{dim:·} " + c.name) + "  {dim:— look " + c.dir + "}\n";
  out += "\n{dim:clear nights only. after 8pm. dress warmly, you won't, but do.}";
  if (S.day >= 10) out += "\n{acc:p.s. comet. west. this week only. J.}";
  return out;
}
