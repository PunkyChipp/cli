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
async function bootSequence(reboot) {
  $("screen").classList.remove("off");
  $("screen").classList.add("boot");
  sfx("boot");
  T.busy = true;
  showLine(false);
  const fresh = !S.name;
  await pause(300);
  print("{dim:HEARTH-80 · 640K · receiver: on}");
  if (reboot) {
    await pause(300);
    for (const l of LOGO) print("{acc:" + esc(l) + "}");
  }
  print("");
  if (fresh) {
    await pause(400);
    let name = "";
    print("{dim:(type your name and press enter)}");
    while (!name) {
      const got = await ask("login: ");
      name = (got || "").trim().replace(/[^\p{L}\p{N} _'.-]/gu, "").slice(0, 18);
      if (name.toLowerCase() === "biscuit") { print("{dim:(no.)}"); name = ""; }
    }
    S.name = name;
    S.min = 6 * 60 + 10;
    S.cwd = "/cottage/study";
    S.cat.room = "study";
    clearScreen();
    // whatever Wren left on the screen is still there
    const last = [
      "{dim:── last session: wren · 11 oct · 11:48pm ──────────}",
      "{dim:wren@hearth:~/cellar$} listen",
      "{dim:  listening} {sky:··:····:···:··} {dim:signal 0.07}",
      "{dim:  heard:} {sky:kettle . three}",
      "{dim:wren@hearth:~/cellar$} listen",
      "{dim:  listening} {sky:·:···::···:·:·} {dim:signal 0.08}",
      "{dim:  heard:} {sky:three . three}",
      "{dim:wren@hearth:~/cellar$} echo \"don't tell them about the noise. let them find it.\" >> ~/.plan",
      "{dim:wren@hearth:~/cellar$} logout",
      "{dim:─────────────────────────────────────────────────}"
    ];
    for (const l of last) { print(l); await pause(60); }
    print("");
    await pause(600);
    await type("Ten past six. You couldn't sleep. When you came down the computer was already on, and the cat was sitting next to it like she'd been waiting.", 70);
    await pause(250);
    await type("There's an envelope propped against the screen. Somewhere below the floor, something is humming.", 70);
    print("");
    print("  {cmd:cat note.txt}    {cmd:look}");
    print("");
    print("{dim:(tap anything underlined, or type it. {cmd:help} if you're stuck.)}");
    S.mailbox = []; S.letters = [];
    deliverMail();
    remember("arrived at the cottage. couldn't sleep. the computer was already on.");
  } else {
    // put them back in the room, and remind them what they were doing, the way a person would
    const r = roomName();
    print("{hi:" + clock(S.min) + ", " + dayName(S.day) + ".} You're " + (["dock", "roof"].includes(r) ? "on" : "in") + " the " + r + ". " + skyLine());
    const lately = S.today.slice(-2).map(x => x.replace(/\.$/, ""));
    if (lately.length) print("{dim:last thing you remember: " + esc(lately.join(". ")) + ".}");
    else if (S.journal.length) print("{dim:from your journal, last night: " + esc(S.journal[S.journal.length - 1].text) + "}");
    if (catHere()) print("{dim:" + catLine() + "}");
    if (S.mailbox.length) print("{acc:There's post.} {cmd:mail}");
    print("{dim:(}{cmd:look}{dim: around, or check the }{cmd:board}{dim:.)}");
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
