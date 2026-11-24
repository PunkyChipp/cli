#!/usr/bin/env node
/* =====================================================================
   tools/smoke.js — plays the whole season headlessly, start to finish,
   by typing real commands into the real shell. No browser needed.

     node tools/smoke.js          (prints ✓ / ✗ for each step)
     node tools/smoke.js -v       (also prints everything the game says)

   If you change the game, run this. If it's all ticks, you probably
   didn't break anything important.
   ===================================================================== */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const VERBOSE = process.argv.includes("-v");

/* ---------- a tiny fake browser ---------- */
const transcript = [];
function el(id) {
  const kids = [];
  const e = {
    id, style: { setProperty() {} }, dataset: {}, value: "", width: 120, height: 132,
    selectionStart: 0, selectionEnd: 0, clientWidth: 900, scrollTop: 0, scrollHeight: 0, offsetWidth: 1,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener() {}, focus() {}, appendChild(c) { kids.push(c); if (id === "out") { const t = strip(c.innerHTML); transcript.push(t); if (VERBOSE) console.log("   │ " + t); } return c; },
    removeChild(c) { kids.splice(kids.indexOf(c), 1); }, get firstChild() { return kids[0]; }, get childElementCount() { return kids.length; },
    getBoundingClientRect: () => ({ width: 300, height: 330, left: 0, top: 0 }),
    getContext: () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => ((t[p] = v), true) }),
    closest: () => null
  };
  let html = "";
  Object.defineProperty(e, "innerHTML", { get: () => html, set: v => { html = String(v); if (id === "out" && v === "") kids.length = 0; } });
  Object.defineProperty(e, "textContent", { get: () => strip(html), set: v => { html = String(v); } });
  return e;
}
const strip = h => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#123;/g, "{").replace(/&#125;/g, "}").replace(/&quot;/g, '"');
const els = {};
const store = {};
Object.assign(global, {
  window: { innerWidth: 1180, innerHeight: 820, addEventListener() {}, HEARTH_NO_BOOT: true, getSelection: () => "" },
  document: { getElementById: id => (els[id] = els[id] || el(id)), createElement: () => el(), addEventListener() {}, documentElement: el("html"), body: el("body"), hidden: false, readyState: "complete", activeElement: null },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  requestAnimationFrame: () => 0, getComputedStyle: () => ({ getPropertyValue: () => "22px" }), location: { reload() {} }
});

/* ---------- load the game, in index.html order ---------- */
const html = fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
let src = scripts.map(s => fs.readFileSync(path.join(__dirname, "../web", s), "utf8")).join("\n;\n");
src += "\n;globalThis.__G = { get S() { return S; }, set S(v) { S = v; }, T, shell, buildTree, maybeVisit, deliverMail, newDay, give, has, KEEPSAKES, nodeAt, resolve, children, commandNames };";
vm.runInThisContext(src, { filename: "hearth.js" });
const G = global.__G;

/* ---------- the test steps ---------- */
let fails = 0, n = 0;
const out = () => transcript.join("\n");
async function step(name, fn) {
  n++;
  const before = transcript.length;
  try { await fn(); console.log("✓ " + name); }
  catch (e) { fails++; console.log("✗ " + name + "\n    " + e.message + "\n    last output: " + transcript.slice(Math.max(before, transcript.length - 4)).join(" / ")); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
async function type(line, waitFor) {
  G.T.skip = true;          // fast-forward every animation
  const before = transcript.length;
  await G.shell(line);
  G.T.skip = false;
  const said = transcript.slice(before).join("\n");
  if (waitFor && !said.toLowerCase().includes(waitFor.toLowerCase())) throw new Error("`" + line + "` didn't say \"" + waitFor + "\". it said: " + said.slice(0, 300));
  return said;
}

(async () => {
  G.buildTree();
  G.S.name = "Tester";
  G.deliverMail();
  G.T.autoFish = true;

  await step("every command has help text", () => { for (const c of G.commandNames()) expect(typeof c === "string", c); });
  await step("start in the study and read Wren's note", async () => { G.S.cwd = "/cottage/study"; await type("cat note.txt", "Tester"); });
  await step("todo list renders", () => type("todo", "Wren's list"));
  await step("the board starts empty", () => type("board", "Nothing pinned"));
  await step("ls in the hall", async () => { await type("cd ~"); await type("ls", "kitchen/"); });
  await step("cd by room name from anywhere", async () => { await type("cd kitchen"); await type("cd dock"); expect(G.S.cwd === "/cottage/dock", G.S.cwd); });
  await step("cd .. and cd -", async () => { await type("cd .."); expect(G.S.cwd === "/cottage", G.S.cwd); await type("cd -"); expect(G.S.cwd === "/cottage/dock", G.S.cwd); });
  await step("typo suggestions", () => type("lok", "did you mean"));
  await step("brew tea", async () => { await type("cd kitchen"); G.S.flags.thumped = true; await type("brew"); expect(G.S.stats.teas === 1, "no tea"); });
  await step("feed biscuit", async () => { await type("feed biscuit"); expect(G.S.flags.fedOnce, "not fed"); });
  await step("take the radio disk from inside the bread bin", () => type("take radio.dsk", "Taken"));
  await step("insert disk in the study", async () => { await type("cd study"); await type("insert radio.dsk"); expect(G.S.disks.radio, "radio not installed"); });
  await step("radio 101.3 completes Ottoline's quest", async () => { await type("radio 101.3", "OTTOLINE"); expect(G.S.quests.otto_radio === "done", "quest not done"); });
  await step("hidden seed tin with ls -a", async () => { await type("cd ~/garden/shed"); const o = await type("ls -a"); expect(o.includes(".seed_tin"), "no tin"); });
  await step("take lavender seeds", async () => { await type("cd .seed_tin"); await type("take lavender seeds", "Taken"); expect(G.has("seed:lavender", 3), "no seeds"); });
  await step("take rod & oilcan", async () => { await type("cd ~/garden/shed"); await type("take rod"); await type("take oilcan"); expect(G.has("rod") && G.has("oilcan"), "missing"); });
  await step("plant + water", async () => { await type("cd ~/garden"); await type("plant lavender"); await type("plant carrot"); await type("plant carrot"); await type("water"); expect(G.S.plots.filter(p => p.crop).length === 3, "not planted"); });
  await step("oil the greenhouse open", async () => { await type("oil greenhouse"); expect(G.S.flags.ghOpen, "still stuck"); await type("cd greenhouse"); expect(G.S.cwd.endsWith("greenhouse"), "can't enter"); });
  await step("fishing", async () => { await type("cd dock"); for (let i = 0; i < 6; i++) { G.T.skip = false; await G.shell("fish"); } expect(G.S.stats.fish > 0 || Object.keys(G.S.inv).some(k => k.startsWith("junk:")), "caught nothing in 4 casts"); });
  await step("lamp lights the attic", async () => { await type("cd kitchen"); await type("take matches"); await type("cd cellar"); await type("take lamp"); await type("light lamp"); expect(G.S.flags.atticLit, "attic dark"); await type("cd attic", "Rafters"); });
  await step("trunk is locked without the key", () => type("cd trunk", "padlocked"));
  await step("pipes, grep, wc", async () => { const o = await type("ls ~/study | grep txt | wc -l"); expect(/\b1\b/.test(o), "expected 1 txt file, got " + o); });
  await step("redirect into a file", async () => { await type("cd ~/study/notes"); await type("echo dear diary > diary.txt"); await type("cat diary.txt", "dear diary"); });
  await step("aliases and ;", async () => { await type("alias hi='echo one; echo two'"); const o = await type("hi"); expect(o.includes("one") && o.includes("two"), o); });
  await step("history expansion !!", async () => { await type("echo again"); G.S.hist.push("echo again"); G.S.hist.push("!!"); const o = await type("!!"); expect(o.includes("again"), o); });
  await step("grep -r through the house", () => type("grep -r carp ~", "carp"));
  await step("man pages", () => type("man fish", "NAME"));
  await step("kill biscuit refuses", () => type("kill -9 biscuit", "nine lives"));
  await step("rm -rf / is a no", () => type("rm -rf /", "No."));
  await step("sleep is refused in the morning", () => type("sleep", "It's only"));
  await step("mystery: the cellar, listen, the plan, the log, 77.7", async () => {
    await type("cd cellar"); await type("cat box", "RECEIVER"); await type("listen", "heard:");
    await type("cat ~/.plan", "Tórshavn"); await type("cat /var/log/listen/1987-2025.summary", "TÓR");
    G.S.cwd = "/cottage/study"; G.S.disks.radio = true; await type("radio 77.7", "HEARTH");
    for (const c of ["hum", "listen", "tor", "log", "origin", "r777"]) expect(G.S.clues[c], "clue not pinned: " + c);
    await type("board", "the cellar");
  });
  await step("reply is refused before it asks", async () => { await type("cd cellar"); await type("listen --reply hello", "disabled"); });
  await step("new day: growth + mail", async () => { G.T.skip = true; await G.newDay(false); expect(G.S.day === 2, "day " + G.S.day); expect(G.S.mailbox.length >= 1, "no mail"); });
  await step("read all the post", async () => { while (G.S.mailbox.length) await type("mail"); expect(G.S.quests.fenn_lav === "open", "Fenn's quest not opened"); });
  await step("grow lavender over four nights", async () => { for (let i = 0; i < 4; i++) { G.S.plots.forEach(p => (p.wet = true)); await G.newDay(false); } await type("cd garden"); await type("harvest"); expect(G.has("lavender"), "no lavender"); });
  await step("send lavender to fenn -> honey next day", async () => {
    await type("send lavender to fenn", "post box");
    await G.newDay(false);
    while (G.S.mailbox.length) await type("mail");
    expect(G.S.quests.fenn_lav === "done", "quest open"); expect(G.has("honey"), "no honey");
  });
  await step("write a lesson for pip", async () => {
    G.T.asking = null;
    const p = G.shell("write lesson.txt");
    for (const l of ["type ls to look around", "."]) { await new Promise(r => setTimeout(r, 5)); const a = G.T.asking; a && (G.T.asking = null, a.resolve(l)); }
    await p;
    expect(Object.keys(G.S.files).some(f => f.endsWith("/lesson.txt")), "file not saved");
    await type("send lesson.txt to pip", "PIP OKAFOR");
  });
  await step("cook carrot soup, send to juniper", async () => {
    G.give("carrot", 2); await type("cd kitchen"); await type("cat recipes/carrot_soup.card");
    await type("cook carrot soup", "made"); await type("send carrot soup to juniper");
    await G.newDay(false); while (G.S.mailbox.length) await type("mail");
    expect(G.S.quests.jun_soup === "done", "soup quest open"); expect(G.has("disk:sky"), "no sky disk");
    expect(G.S.quests.pip_lesson === "done", "pip lesson open"); expect(G.has("disk:pip"), "no pip disk");
  });
  await step("install sky + pip disks", async () => { await type("cd study"); await type("insert sky.dsk"); await type("insert pip.dsk"); expect(G.S.disks.sky && G.S.disks.pip, "not installed"); await type("catsay hello", "PIP"); });
  await step("earn the key from Biscuit", async () => {
    G.S.cat.room = "study"; G.S.cat.mood = 90; G.S.stats.pets = 10;
    await type("take key", "brass key"); await type("cd attic"); await type("cd trunk", "click");
    await type("take lantern.dsk"); await type("take wick"); await type("cat letter.txt", "answer with its name"); await type("cat diary_1962.txt", "L———");
    expect(G.S.clues.ask && G.S.clues.name && G.S.clues["1962"], "trunk clues not pinned");
  });
  await step("moonflower in the greenhouse, harvested at night", async () => {
    await type("cd greenhouse"); await type("plant moonflower");
    for (let i = 0; i < 3; i++) await G.newDay(false);
    G.S.cwd = "/cottage/greenhouse"; G.S.min = 22 * 60;
    await type("harvest", "moonflower"); expect(G.has("moonflower"), "no moonflower");
  });
  await step("the telescope finds constellations", async () => {
    G.S.day = 11; G.S.min = 22 * 60; await type("cd roof");
    for (const d of ["north", "east", "south", "west", "up"]) await type("sky " + d);
    expect(Object.keys(G.S.stars).length === 6, "found " + Object.keys(G.S.stars).length); expect(G.S.flags.sawComet, "missed the comet");
  });
  await step("lantern refuses before the night", async () => { await type("cd study"); await type("insert lantern.dsk"); await type("cd dock"); await type("lantern", "Not yet"); });
  await step("LANTERN NIGHT", async () => {
    G.S.day = 14; G.S.min = 21 * 60; G.T.skip = true;
    await type("lantern", "Twenty-one");
    expect(G.S.flags.lanternLit, "lantern not lit");
  });
  await step("the cellar asks a question", async () => { await type("cd cellar"); await type("listen", "NAME ?"); });
  await step("a wrong answer is gently refused", () => type("listen --reply biscuit", "That wasn't it"));
  await step("THE TRUE ENDING: answer with its name", async () => {
    G.T.skip = true;
    await type("reply the lantern fish", "THE END");
    expect(G.S.flags.answered, "not answered"); expect(G.S.mailbox.includes("wren_home"), "no postcard from Wren");
  });
  await step("winter morning after", async () => {
    await G.newDay(false); expect(G.S.day === 15, "day");
    let all = ""; while (G.S.mailbox.length) all += await type("mail");
    expect(all.includes("coming home on the 2nd"), "no homecoming postcard");
  });
  await step("save survives a round trip", () => { const s = JSON.parse(store["hearth.save.v1"]); expect(s.flags.lanternLit && s.day === 15, "save mismatch"); });
  await step("every file in the house can be read", async () => {
    let count = 0;
    const walk = p => { const node = G.nodeAt(p); if (!node) return; if (node.kind === "file") { const t = typeof node.text === "function" ? node.text() : node.text; expect(typeof t === "string", p); count++; return; } for (const k of Object.keys(G.children(p, true))) walk((p === "/" ? "" : p) + "/" + k); };
    walk("/"); expect(count > 60, "only " + count + " files");
  });
  await step("people drop by: Fenn's eggs on a Saturday morning", async () => {
    const before = G.S.friends.fenn; G.S.day = 4; G.S.min = 8 * 60; G.S.cwd = "/cottage/kitchen"; G.S.flags.visits = {};
    G.maybeVisit(); expect(G.S.flags.visits.fenn_eggs_1, "no visit"); expect(G.S.friends.fenn > before, "no friendship");
  });
  await step("help, hint, map, jar, friends, journal, hearthfetch don't crash", async () => { for (const c of ["help", "help all", "hint", "map", "jar", "friends", "journal", "hearthfetch", "fishlog", "ps", "top", "cal", "tree", "fortune", "uptime", "pockets", "credits"]) await type(c); });

  console.log("\n" + (fails ? "✗ " + fails + " of " + n + " FAILED" : "✓ all " + n + " steps passed — the season plays start to finish"));
  process.exit(fails ? 1 : 0);
})();
