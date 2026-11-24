/* =====================================================================
   99-boot.js — switching it on. The BIOS checks the kettle, asks your
   name, and lets you in. After that it just keeps time.
   ===================================================================== */
"use strict";

const LOGO = [
  " _  _ ___   _   ___ _____ _  _ ",
  "| || | __| /_\\ | _ \\_   _| || |",
  "| __ | _| / _ \\|   / | | | __ |",
  "|_||_|___/_/ \\_\\_|_\\ |_| |_||_|"
];
const HOUSE = [
  "            (  )",
  "             ) (",
  "        _____|_|______",
  "       /              \\",
  "      /   _        _   \\",
  "     |   |#|  __  |#|   |",
  "     |        ||        |",
  "  ~~~|________||________|~~~~~~~~"
];

async function bootSequence(reboot) {
  $("screen").classList.remove("off");
  $("screen").classList.add("boot");
  sfx("boot");
  T.busy = true;
  showLine(false);
  const fresh = !S.name;
  const quick = !fresh && !reboot;
  await pause(quick ? 200 : 500);
  print("{dim:HEARTH-80 BIOS v2.1   (c) 1987 Ashdown Home Systems}");
  if (!quick) {
    await pause(250);
    const mem = printRaw("");
    for (let k = 0; k <= 640; k += 64) { mem.innerHTML = fmt("{dim:memory test:} " + k + "K"); await pause(45); }
    mem.innerHTML = fmt("{dim:memory test:} 640K {ok:OK}  {dim:(plenty)}");
    await pause(200);
    print("{dim:detecting peripherals...}");
    const per = [
      ["kettle", "{ok:ok}"],
      ["radio", S.disks.radio ? "{ok:ok}" : "{warn:no disk}"],
      ["telescope", S.disks.sky ? "{ok:ok}" : "{dim:not found}"],
      ["cat", "{acc:detected (unsupported)}"],
      ["rain", weatherNow().rain ? "{ok:yes}" : "{dim:none today}"]
    ];
    for (const [n, s] of per) { await pause(160); print("  " + pad(n, 12, ".") + " " + s); }
    await pause(200);
    print("{dim:mounting /cottage ...} {ok:ok}");
    await pause(400);
  }
  print("");
  for (const l of LOGO) print("{acc:" + esc(l) + "}");
  print("{dim:      personal home computer · Wren's build}");
  print("");
  if (fresh) {
    for (const l of HOUSE) { print("{hi:" + esc(l) + "}"); await pause(40); }
    print("");
    await pause(500);
    await type("There's a note taped to the keyboard, in loopy handwriting:", 45, "dim");
    await pause(300);
    print("{acc:  \"type your name, love, and press enter. it'll remember you. — W.\"}");
    print("");
    let name = "";
    while (!name) {
      const got = await ask("login: ");
      name = (got || "").trim().replace(/[^\p{L}\p{N} _'.-]/gu, "").slice(0, 18);
      if (!name) print("{dim:(go on. any name. Biscuit won't tell.)}");
      if (name.toLowerCase() === "biscuit") { print("{dim:(nice try, Biscuit.)}"); name = ""; }
    }
    S.name = name;
    sfx("chime");
    print("");
    print("Welcome home, {hi:" + esc(name) + "}.");
    print("");
    await pause(500);
    await type("You arrived last night, late, in the rain. You remember a key under a flowerpot, a cold dark hall, a cat who looked at you like you were an unexpected parcel, and then sleep.", 55);
    await pause(400);
    await type("Now it's 7 o'clock on a drizzly Wednesday in October. The cottage is quiet and smells of woodsmoke and old paper. Grey light on the lake.", 55);
    await pause(400);
    await type("On the desk, propped against the screen, there's an envelope with your name on it.", 55);
    print("");
    print("  {cmd:cat welcome.txt}   {dim:← type that and press enter, or just tap it}");
    print("");
    print("{dim:(new to typing commands? that's fine. tap anything that's underlined. the keys under the screen help too.)}");
    S.mailbox = []; S.letters = [];
    deliverMail();
    remember("arrived at the cottage. Biscuit looked at me like I was a parcel.");
  } else {
    await pause(200);
    print("Welcome back, {hi:" + esc(S.name) + "}.  {dim:It's " + clock(S.min) + " on " + dayName(S.day) + ", " + dateStr(S.day) + ". " + weatherNow().word + ".}");
    if (S.mailbox.length) print("{acc:You have post.} {cmd:mail}");
    print("{dim:You're in the " + roomName() + ". " + (catHere() ? "Biscuit is here, pretending not to have noticed you." : "Biscuit is in the " + S.cat.room + ".") + "}  {cmd:look}");
  }
  print("");
  T.busy = false;
  afterCommand();
  showLine(true);
  focusInput();
}

function main() {
  load();
  buildTree();
  applyTheme();
  termInit();
  sceneInit();
  updatePostit();
  updateCard();
  $("postit").addEventListener("click", () => { if (!T.busy && S.name) runTyped("hint"); });
  // the browser only allows sound after you've touched or typed something
  const wake = () => audioWake();
  document.addEventListener("pointerdown", wake);
  document.addEventListener("keydown", wake);
  setInterval(() => {
    worldTick();
    ambience();
    updateCard();
    if (S.name && !T.busy) setKeys(contextKeys());
  }, 1000);
  setInterval(() => { if (S.name) save(); }, 15000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); lastTick = Date.now(); });
  window.addEventListener("pagehide", save);
  setTimeout(() => bootSequence(false), 350);
}

if (typeof window !== "undefined" && !window.HEARTH_NO_BOOT) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
}
