/* =====================================================================
   12-commands.js — the shell. Commands register themselves with cmd():

     cmd("name alias1 alias2", "what it does", async (args, ctx) => { ... },
         { group: "living", hidden: false, when: () => true });

   ctx.stdin is an array of lines when something was piped in.
   Supports:  a ; b     a && b     a | b | c     a > file     a >> file
              !!   !3   aliases   tab-completion   "quoted args"
   ===================================================================== */
"use strict";

const CMDS = {};
const ALIAS_OF = {};
function cmd(names, help, fn, o = {}) {
  const [main, ...alts] = names.split(" ");
  CMDS[main] = Object.assign({ name: main, help, fn, group: "other" }, o);
  for (const a of alts) ALIAS_OF[a] = main;
}
const cmdAvailable = n => CMDS[n] && (!CMDS[n].when || CMDS[n].when());
function commandNames() { return Object.keys(CMDS).filter(n => cmdAvailable(n) && !CMDS[n].secret).sort(); }
function findCmd(n) {
  if (CMDS[n] && cmdAvailable(n)) return CMDS[n];
  if (ALIAS_OF[n] && cmdAvailable(ALIAS_OF[n])) return CMDS[ALIAS_OF[n]];
  return null;
}
/** Extra words for tab completion after a command. */
function completeWords(c, pos) {
  c = ALIAS_OF[c] || c;
  const m = {
    brew: Object.keys(TEAS), plant: Object.keys(S.inv).filter(k => k.startsWith("seed:")).map(k => k.slice(5)),
    radio: Object.keys(STATIONS).concat(["off", "scan"]), sky: DIRS, theme: ["amber", "green", "paper", "rose", "frost"],
    send: pos === 2 ? Object.keys(S.inv).map(k => k.replace(/^(fish|junk|disk):/, "").replace(/_/g, " ")) : ["to", "ottoline", "fenn", "pip", "juniper"],
    feed: ["biscuit", "fox"], pet: ["biscuit"], man: commandNames(), help: commandNames(), cook: Object.keys(S.recipes).map(r => r.replace(/_/g, " ")),
    eat: Object.keys(S.inv).map(k => k.replace(/_/g, " ")), insert: Object.keys(S.inv).filter(k => k.startsWith("disk:")).map(k => k.slice(5) + ".dsk"),
    where: ["biscuit"], light: ["lamp", "candle"], cd: Object.keys(ROOMS_SHORT()), sound: ["on", "off"], keys: ["on", "off"]
  };
  return m[c] || [];
}
const ROOMS_SHORT = () => children(HOME);

/* ---------- parsing ---------- */
function splitTop(line, seps) {
  // split on separators outside quotes. returns [{text, sep}]
  const out = []; let cur = "", q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    const sep = seps.find(s => line.startsWith(s, i));
    if (sep) { out.push({ text: cur, sep }); cur = ""; i += sep.length - 1; continue; }
    cur += ch;
  }
  out.push({ text: cur, sep: null });
  return out;
}

function expandHistory(line) {
  if (!line.includes("!")) return line;
  const prev = S.hist.slice(0, -1);
  return line.replace(/!!|!(\d+)/g, (m, n) => {
    if (m === "!!") return prev[prev.length - 1] || "";
    return prev[parseInt(n, 10) - 1] || m;
  });
}

async function shell(line) {
  const expanded = expandHistory(line);
  if (expanded !== line) { print("{dim:" + esc(expanded) + "}"); S.hist[S.hist.length - 1] = expanded; }
  S.stats.cmds++;
  const chain = splitTop(expanded, ["&&", ";"]);
  let ok = true;
  for (let i = 0; i < chain.length; i++) {
    const seg = chain[i].text.trim();
    const prevSep = i > 0 ? chain[i - 1].sep : null;
    if (prevSep === "&&" && !ok) continue;
    if (!seg) continue;
    ok = await pipeline(seg);
    if (T.skip && i < chain.length - 1) { T.skip = false; }
  }
}

async function pipeline(seg, depth = 0) {
  // redirect?
  let redirect = null;
  const rm = seg.match(/^(.*?)\s*(>>?)\s*([^\s>|]+)\s*$/);
  if (rm && !/^\s*echo\s*$/.test(rm[1]) && rm[1].trim()) { redirect = { mode: rm[2], file: rm[3] }; seg = rm[1]; }
  const stages = splitTop(seg, ["|"]).map(s => s.text.trim()).filter(Boolean);
  if (stages.length > 1) keepsake("hacker");
  let stdin = null;
  let ok = true;
  for (let i = 0; i < stages.length; i++) {
    const last = i === stages.length - 1;
    const capture = !last || redirect;
    const lines = [];
    if (capture) T.cap = lines;
    try { ok = await runOne(stages[i], stdin, depth); }
    finally { if (capture) T.cap = null; }
    if (capture) stdin = lines;
  }
  if (redirect) {
    const path = resolve(redirect.file);
    const why = path === "/etc/motd" ? null : writable(path);
    if (why) { print("{warn:can't write there —} " + why); return false; }
    const text = (stdin || []).join("\n");
    S.files[path] = redirect.mode === ">>" && S.files[path] ? S.files[path] + "\n" + text : text;
    print("{dim:(wrote " + plural((stdin || []).length, "line") + " to " + esc(shortPath(path)) + ")}");
    keepsake("writer");
  }
  return ok !== false;
}

async function runOne(text, stdin, depth) {
  let w = words(text);
  if (!w.length) return true;
  // aliases
  if (S.aliases[w[0]] && depth < 5) {
    const a = S.aliases[w[0]] + (w.length > 1 ? " " + w.slice(1).join(" ") : "");
    for (const part of splitTop(a, [";", "&&"])) if (part.text.trim()) await pipeline(part.text.trim(), depth + 1);
    return true;
  }
  w = plainEnglish(w);
  let name = w[0];
  // ./script
  if (name.startsWith("./") || (name.startsWith("/") && nodeAt(resolve(name)) && nodeAt(resolve(name)).exec)) return execFile(name);
  const c = findCmd(name.toLowerCase());
  if (!c) return notFound(name, w);
  const r = await c.fn(w.slice(1), { stdin, raw: text });
  return r !== false;
}

/* ---------- plain English ----------
   People type the way they talk. Before the shell sees a line, we turn the
   common shapes of "read the note" / "go downstairs" / "check the mail" into
   the command they mean. Anything that already looks like a command passes
   straight through untouched, so devs never notice this exists. */
const FILLER = new Set(["the", "a", "an", "my", "at", "to", "on", "into", "in", "inside", "of", "some", "this", "that", "with", "please", "up"]);
function plainEnglish(w) {
  if (!w.length || findCmd(w[0].toLowerCase()) && !["look", "open", "read", "go", "check", "get", "pick", "take", "turn", "play", "give"].includes(w[0].toLowerCase())) return w;
  const lo = w.map(x => x.toLowerCase());
  const rest = () => lo.slice(1).filter(x => !FILLER.has(x));
  const v = lo[0], line = lo.join(" ");
  const obj = rest().join("_");
  if (/^(check|read|open|get|see)\s+(the\s+)?(mail|post|letters?|inbox|envelopes?)$/.test(line)) return ["mail"];
  if (/^(turn|switch)\s+(on|off)?\s*(the\s+)?radio/.test(line) || /^listen\s+to\s+(the\s+)?radio/.test(line)) return ["radio"].concat(/off/.test(line) ? ["off"] : []);
  if (/^(go|head|walk|climb)\s+(down|downstairs)\b/.test(line) || line === "downstairs" || line === "down") return ["cd", "cellar"];
  if (/^(go|head|walk|climb)\s+(up|upstairs)\b/.test(line) || line === "upstairs") return ["cd", "attic"];
  if (/^(go|walk|head)\s+(back|out)$/.test(line)) return ["cd", ".."];
  if (/^(go\s+to\s+)?(bed|sleep)$/.test(line)) return ["sleep"];
  if (/^(use|turn on|switch on)\s+(the\s+)?(computer|hearth|screen|terminal)/.test(line)) return ["help"];
  if (/^(examine|inspect|x|check|study|view|read)$/.test(v) && obj) return ["cat", obj];
  if (v === "look" && lo[1] === "at" && obj) return ["cat", obj];
  if (v === "look" && ["in", "inside", "into"].includes(lo[1]) && obj) return ["ls", obj];
  if (v === "open" && obj) { const f = findHere(obj); return f && f.node.kind === "dir" ? ["cd", obj] : ["cat", obj]; }
  if (["take", "get", "grab", "pick"].includes(v) && obj) return ["take", obj.replace(/^up_/, "")];
  if (/^(what|whats|what's|who|why)\b/.test(v)) {
    if (/hum|noise|sound|box|cellar/.test(line)) return ["cat", "/cottage/cellar/the_hum.txt"];
    if (/do|now|next/.test(line)) return ["hint"];
    return ["look"];
  }
  if (/^(talk|speak|chat|say)$/.test(v) && obj) {
    const who = WHO(obj.replace(/^to_/, ""));
    if (who) return ["echo", "(" + PEOPLE[who].short + " isn't here. people in the Hollow write. try: send <thing> to " + who + ")"];
  }
  return w;
}

function notFound(name, w) {
  // natural-ish language: "go to the kitchen", "make tea", "read welcome"
  const l = w.join(" ").toLowerCase();
  if (/^(go|walk|enter|head)\b/.test(l)) return runOne("cd " + w.slice(1).filter(x => !["to", "the", "into", "in"].includes(x.toLowerCase())).join(" "));
  if (/^(make|have|drink)\s+(a\s+)?(cup|tea|pot)/.test(l) || l === "tea") return runOne("brew " + (w.find(x => TEAS[x.toLowerCase()]) || ""));
  if (/^(hi|hello|hey|hiya)\b/.test(l)) { print(pick(["hello.", "hello. {dim:(from somewhere in the house: mrrp.)}"])); return true; }
  if (/^(thank|thanks|ty)\b/.test(l)) { print("{dim:(you say thank you to a computer. nobody saw.)}"); return true; }
  if (/^(ok|okay|yes|no|y|n)$/.test(l)) { print("{dim:(the cursor blinks.)}"); return true; }
  if (/biscuit|cat/.test(l) && w.length > 1) { print("Biscuit doesn't look round. {dim:({cmd:pet biscuit}, {cmd:feed biscuit})}"); return true; }
  const all = Object.keys(CMDS).filter(n => cmdAvailable(n) && !CMDS[n].secret).concat(Object.keys(ALIAS_OF).filter(a => cmdAvailable(ALIAS_OF[a]) && !CMDS[ALIAS_OF[a]].secret && a.length > 1));
  const g = closest(name.toLowerCase(), all, name.length > 4 ? 2 : 1);
  sfx("bonk");
  if (/^[a-z;'\]\[,.]{12,}$/.test(name) && /(.)\1{4,}/.test(name)) { print("hearth: command not found: " + esc(name) + "\n{dim:(that was Biscuit, on the keyboard.)}"); return false; }
  print("hearth: command not found: {warn:" + esc(name) + "}" + (g ? "   {dim:did you mean} {cmd:" + g + "}{dim:?}" : "   {dim:(try {cmd:help}, or {cmd:hint} if you're stuck)}"));
  return false;
}

/* ---------- moving about ---------- */
const ROOM_NAMES = ["kitchen", "parlour", "study", "garden", "greenhouse", "dock", "cellar", "attic", "roof"];
/** Which rooms open onto which. (cd <room> works from anywhere; this is just what's next door.) */
const DOORS = {
  hall: ["study", "kitchen", "parlour", "cellar", "attic"], study: ["hall"], kitchen: ["hall", "garden", "cellar"],
  parlour: ["hall"], cellar: ["kitchen"], attic: ["hall", "roof"], roof: ["attic"],
  garden: ["kitchen", "greenhouse", "dock"], greenhouse: ["garden"], dock: ["garden"]
};
const doorsOf = r => (DOORS[r] || ["hall"]);
function doCd(args) {
  args = args.filter(x => !["to", "the", "into", "in", "back"].includes(x.toLowerCase()));
  let target = args.join("_") || undefined;
  if (!target || target === "~") target = HOME;
  let path = resolve(target);
  let node = nodeAt(path);
  if (!node) {
    // friendly: "cd kitchen" works from anywhere
    const n = target.replace(/^\.?\/?/, "").replace(/\/$/, "").toLowerCase();
    const syn = { "living_room": "parlour", "lounge": "parlour", "living": "parlour", "office": "study", "lake": "dock", "jetty": "dock", "basement": "cellar", "loft": "attic", "outside": "garden", "yard": "garden", "hall": "", "hallway": "", "home": "" };
    const room = ROOM_NAMES.includes(n) ? n : syn[n] != null ? syn[n] : closest(n, ROOM_NAMES, 2);
    if (room != null && (room === "" || ROOM_NAMES.includes(room))) { path = HOME + (room ? "/" + room : ""); node = nodeAt(path); }
  }
  if (!node) { sfx("bonk"); print("cd: no such place: {warn:" + esc(target) + "}  {dim:(try {cmd:ls} to see what's here, or {cmd:map})}"); return false; }
  if (node.kind !== "dir") { print("cd: " + esc(target) + " isn't a place, it's a thing. {dim:(read it: {cmd:cat " + esc(target) + "})}"); return false; }
  const lock = node.lock && node.lock();
  if (lock) {
    if (path.endsWith("/trunk") && has("key")) { S.flags.trunkOpen = true; print("You fit the little brass key into the padlock. It turns with a satisfying {acc:click}."); }
    else { sfx("bonk"); print(lock); return false; }
  }
  if (path === S.cwd) { print("{dim:you're already here.}"); return true; }
  const fromRoom = roomName();
  S.prevCwd = S.cwd; S.cwd = path;
  const toRoom = roomName();
  if (toRoom !== fromRoom) {
    spend(1);
    sfx("door");
    if (["garden", "dock", "roof"].includes(toRoom) && weatherNow().rain >= 1 && !has("umbrella")) print("{dim:(it's pouring. there's an umbrella in the hall.)}"), warm(-2);
    if (toRoom === "attic" && !S.flags.atticSeen && S.flags.atticLit) { S.flags.atticSeen = true; keepsake("attic"); }
    if (toRoom === "greenhouse" && !S.flags.ghSeen) { S.flags.ghSeen = true; keepsake("greenhouse"); }
    print("{dim:" + esc(shortPath(path)) + "}");
    const d = val(node.desc);
    if (d && (!S.flags["seen" + toRoom] || isDark(path))) {
      print(d);
      if (!node.room && !isDark(path) && Object.keys(children(path)).length) doLs([]);
      if (node.room && !isDark(path)) print("{dim:doors:} " + doorsOf(toRoom).map(x => '<span class="cmd" data-c="cd ' + x + '">' + x + "</span>").join("{dim: · }"));
      S.flags["seen" + toRoom] = true;
    }
    if (catHere()) print("{dim:" + catLine() + "}");
    if (toRoom === "garden" && (isNight() || isEvening()) && chance(0.6)) print("{dim:(a fox is sitting at the edge of the long grass, watching you. {cmd:cat fox})}");
    if (isDark(path)) print("{dim:(you'll want some light. {cmd:cd ..} back down.)}");
  } else if (!S.flags["seen:" + path]) {
    // a shed, a drawer, a trunk: say what it is and what's in it, once
    S.flags["seen:" + path] = true;
    const d = val(node.desc);
    if (d) print(d);
    const ks = Object.keys(children(path));
    if (ks.length) doLs([]);
  }
  return true;
}

function lsLine(name, node, long, dir) {
  const isD = node.kind === "dir";
  const full = (dir && dir !== "/" ? dir : "") + "/" + name;
  const tap = node.exec ? (dir === "/bin" ? name : full) : isD ? "cd " + (dir ? full : name) : "cat " + (dir ? full : name);
  const cls = isD ? "sky" : node.item ? "acc" : node.exec ? "ok" : node.user ? "hi" : "fg";
  const span = "{" + cls + ':<span class="cmd" data-c="' + esc(tap).replace(/"/g, "&quot;") + '">' + esc(name) + (isD ? "/" : node.exec ? "*" : "") + "</span>}";
  if (!long) return span;
  const owner = node.owner || (node.user ? "you" : "wren");
  return "{dim:" + perm(node) + "  " + pad(owner, 7) + padL(sizeOf(node), 6) + "  oct " + padL(Math.min(31, 11 + S.day), 2) + "}  " + span;
}

function doLs(args) {
  const flags = args.filter(a => a.startsWith("-")).join("");
  const all = flags.includes("a"), long = flags.includes("l");
  const targets = args.filter(a => !a.startsWith("-"));
  const path = resolve(targets[0] || ".");
  const node = nodeAt(path);
  if (!node) { print("ls: can't find {warn:" + esc(targets[0]) + "}"); return false; }
  if (node.kind === "file") { print(lsLine(path.split("/").pop(), node, long, path.slice(0, path.lastIndexOf("/")))); return true; }
  const lock = node.lock && node.lock();
  if (lock) { print(lock); return false; }
  if (isDark(path)) { print("It's too dark to see anything in here. {dim:(something rustles. probably fine.)}"); return true; }
  const kids = children(path, all);
  let names = Object.keys(kids).sort((a, b) => (kids[a].kind === kids[b].kind ? a.localeCompare(b) : kids[a].kind === "dir" ? -1 : 1));
  if (all) names = [".", ".."].concat(names), kids["."] = node, kids[".."] = nodeAt(resolve(path + "/..")) || node;
  if (!names.length) { print("{dim:(empty)}"); return true; }
  if (long || T.cap) { for (const n of names) print(long ? lsLine(n, kids[n], true, path) : n); return true; }
  // columns-ish: just space them out
  const cells = names.map(n => (n === "." || n === ".." ? "{dim:" + n + "}" : lsLine(n, kids[n], false, path)));
  let line = "", len = 0;
  const maxw = Math.max(28, Math.floor(($("term") ? $("term").clientWidth : 800) / (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fs")) * 0.5 || 11)) - 4);
  for (let i = 0; i < names.length; i++) {
    const w = names[i].length + 4;
    if (len + w > maxw && line) { print(line); line = ""; len = 0; }
    line += cells[i] + "    "; len += w;
  }
  if (line) print(line);
  if (path === HOME && !S.flags.lsHinted) { S.flags.lsHinted = true; print("{dim:(blue things are places — {cmd:cd} into them. orange things you can {cmd:take}. tap anything.)}"); }
  return true;
}

function doCat(args, ctx) {
  if (!args.length) {
    if (ctx.stdin) { for (const l of ctx.stdin) print(esc(l)); return true; }
    print("cat what? {dim:(try {cmd:cat welcome.txt}. or, if you meant the cat: {cmd:pet biscuit})}"); return false;
  }
  for (const a of args) {
    if (["biscuit", "the_cat", "cat"].includes(a.toLowerCase()) && !findHere(a)) { print(catHere() ? catLine() : "Biscuit isn't here. She's in the " + S.cat.room + "."); continue; }
    const path = resolve(a);
    let node = nodeAt(path);
    let p = path;
    if (!node) { const f = findHere(a); if (f) { node = f.node; p = f.path; } }
    if (!node) {
      const where = whereIs(a);
      if (where) print("There's no " + esc(a.replace(/_/g, " ")) + " here. {dim:(there's one in the " + where.room + ": {cmd:cd " + where.room + "})}");
      else print("cat: {warn:" + esc(a) + "}: no such file. {dim:(" + "{cmd:ls}" + " shows what's here.)}");
      return false;
    }
    if (node.kind === "dir") {
      const lock = node.lock && node.lock();
      print(lock || ("{dim:" + esc(a) + " is a place, not a thing. you look in:}\n" + (isDark(p) ? "it's dark." : val(node.desc) || "")));
      if (!lock && !isDark(p)) doLs([a]);
      continue;
    }
    const text = readFile(p);
    sfx("page");
    print(text === "" ? "{dim:(empty. as expected. very calming.)}" : text);
    if (node.item && !T.cap) {
      print("{dim:(you could {cmd:take " + esc(p.split("/").pop()) + "}.)}");
    }
  }
  spend(1);
  return true;
}

/** Somewhere else in the house with a thing by this name? (for "x kettle" in the wrong room) */
function whereIs(name) {
  const want = name.toLowerCase().replace(/\.(txt|dsk|card|book)$/, "");
  for (const room of ROOM_NAMES) {
    const p = HOME + "/" + room;
    if (lockMsg(p) || isDark(p)) continue;
    const f = findHere(want, p);
    if (f && f.node.kind === "file") return { room, path: f.path };
  }
  return null;
}

function doTake(args) {
  const what = args.join(" ").replace(/^(the|a|an)\s+/, "").trim();
  if (!what) return print("Take what? {dim:(orange things in {cmd:ls} can be taken.)}");
  if (what.startsWith("key")) return takeKey();
  if (isDark(S.cwd)) return print("You fumble about in the dark and find a cobweb. You don't take it.");
  let f = findHere(what.replace(/ /g, "_")) || findHere(what) || findHere(what.split(" ")[0]);
  if (!f && what.includes("/")) { const p = resolve(what); const n = nodeAt(p); if (n) f = { name: p.split("/").pop(), path: p, node: n }; }
  if (!f) {
    // friendly: look one level down, in drawers and bins and tins
    for (const [dn, dnode] of Object.entries(children(S.cwd, true))) {
      const dp = (S.cwd === "/" ? "" : S.cwd) + "/" + dn;
      if (dnode.kind !== "dir" || (dnode.lock && dnode.lock()) || isDark(dp)) continue;
      const g = findHere(what.replace(/ /g, "_"), dp) || findHere(what, dp);
      if (g && g.node.item) { f = g; print("{dim:(from the " + dn.replace(/^\./, "") + ")}"); break; }
    }
  }
  if (!f) {
    if (what === "biscuit" || what === "cat") return print(catHere() ? "You try to pick Biscuit up. She goes heavy and slides out of your arms." : "Biscuit isn't here.");
    return print("You can't see " + esc(what) + " here. {dim:(" + "{cmd:ls -a}" + "?)}");
  }
  const n = f.node;
  if (n.kind === "dir") return print("You can't carry the " + f.name + ". {dim:(look inside: {cmd:cd " + f.name + "})}");
  if (!n.item) {
    return print(pick(["You'd rather leave that where Wren put it.", "That stays here.", "It's not the kind of thing you take."]));
  }
  if (n.item === "jam") {
    if (!jamLeft()) return print("The rest are labelled 'winter'. You leave them.");
    S.flags.jamTaken = (S.flags.jamTaken || 0) + 1; give("jam");
    return print("You take a jar of " + pick(["blackberry", "damson", "plum", "MYSTERY 2019"]) + " jam. {dim:(" + jamLeft() + " left that you're allowed.)}");
  }
  give(n.item, n.count || 1);
  S.taken[f.path] = true;
  spend(1);
  print("Taken: {acc:" + itemName(n.item, n.count || 1) + "}." + (n.item.startsWith("disk:") ? " {dim:(disks go in HEARTH's drive in the study: {cmd:insert " + n.item.slice(5) + ".dsk})}" : n.item === "lamp" ? " {dim:(now {cmd:light lamp}.)}" : n.item === "rod" ? " {dim:(down to the {cmd:cd ~/dock}, then {cmd:fish}.)}" : n.item === "oilcan" ? " {dim:(the greenhouse door is right next to the garden: {cmd:oil greenhouse})}" : ""));
  if (n.item === "seed:lavender") remember("found Wren's hidden seed tin. she really does hide things.");
  return true;
}
function takeKey() {
  if (S.flags.gotKey) return print("You've already got the key.");
  if (!catHere()) return print("The key's on Biscuit's collar, and Biscuit's in the " + S.cat.room + ".");
  if (S.cat.mood < 75 || S.stats.pets < 8 || S.day < 3) {
    S.flags.keyTried = true;
    return print(pick(["You reach for her collar. She bites your hand, not hard. Not yet.", "She leans away from your hand.", "She moves off before you can get to the collar."]) + "\n{dim:(give her a few days. {cmd:pet biscuit}, {cmd:feed biscuit}, a fish.)}");
  }
  S.flags.gotKey = true; give("key");
  sfx("chime");
  print("You reach for her collar, slowly. She lifts her chin and lets you unclip the brass key. Then she bumps her head against your hand, once, and walks off.");
  print("{dim:(it's the key to Wren's trunk, in the attic.)}");
  remember("Biscuit let me have the key.");
}

function doLook(args) {
  if (args.length && !["around", "here", "room"].includes(args[0])) {
    const w = args.join(" ").toLowerCase();
    if (["biscuit", "cat"].includes(w)) return print(catHere() ? catLine() : "Biscuit isn't here. She's in the " + S.cat.room + ".");
    if (["lake", "water", "down", "into the water", "in the water"].includes(w) && roomName() === "dock") return print(lakeLook());
    if (["window", "outside", "out", "sky", "lake", "water"].includes(w)) return print(skyLine());
    return doCat([args.join("_")], {});
  }
  const node = nodeAt(S.cwd);
  print("{hi:" + (roomName() === "hall" ? "The Hall" : cap(roomName())) + "}  {dim:" + esc(shortPath(S.cwd)) + " · " + clock(S.min) + "}");
  print(val(node.desc) || "");
  if (catHere()) print("{dim:" + catLine() + "}");
  if (isDark(S.cwd)) return print("{dim:(it's too dark to see. find a light, then come back.)}");
  const kids = children(S.cwd);
  const things = Object.entries(kids).filter(([, n]) => n.kind === "file");
  const places = Object.entries(kids).filter(([, n]) => n.kind === "dir");
  if (things.length) print("{dim:here:} " + things.map(([n, x]) => "{" + (x.item ? "acc" : "hi") + ":" + '<span class="cmd" data-c="cat ' + esc(n) + '">' + esc(n) + "</span>}").join("{dim:,} "));
  const node2 = nodeAt(S.cwd);
  const inside = places.filter(([, n]) => !n.room).map(([n]) => "{cmd:cd " + esc(n) + "}");
  if (inside.length) print("{dim:in here:} " + inside.join("  "));
  if (node2.room || S.cwd === HOME) print("{dim:doors:} " + doorsOf(roomName()).map(d => '<span class="cmd" data-c="cd ' + (d === "hall" ? "~" : d) + '">' + d + "</span>").join("{dim: · }"));
  else print("{dim:back:} {cmd:cd ..}");
  return true;
}

function doMap() {
  const here = roomName();
  const r = (name, w) => {
    const label = pad(name, w);
    const cls = here === name ? "acc" : S.cat.room === name ? "ok" : "hi";
    return "{" + cls + ":" + '<span class="cmd" data-c="cd ' + (name === "hall" ? "~" : name) + '">' + label + "</span>}";
  };
  const m = [
    "                  {dim:.------------.}",
    "                  {dim:|} " + r("roof", 10) + " {dim:|}",
    "                  {dim:'-----+------'}",
    "                  {dim:.-----+------.}",
    "                  {dim:|} " + r("attic", 10) + " {dim:|}",
    "   {dim:.---------.  .-----+------.  .---------.}",
    "   {dim:|} " + r("study", 7) + " {dim:|--|} " + r("hall", 10) + " {dim:|--|} " + r("kitchen", 7) + " {dim:|}",
    "   {dim:'---------'  '--+------+--'  '----+----'}",
    "            {dim:.------+--. .-+-------.   |}",
    "            {dim:|} " + r("parlour", 7) + " {dim:| |} " + r("cellar", 7) + " {dim:|   |}",
    "            {dim:'---------' '---------'   |}",
    " {dim:.------------.  .---------.  .-----+---.}",
    " {dim:|} " + r("greenhouse", 10) + " {dim:|--|} " + r("garden", 7) + " {dim:|--|} " + r("dock", 7) + " {dim:|}{sky:~~~~~}",
    " {dim:'------------'  '---------'  '---------'}{sky:~ lake ~}",
    "",
    "  {acc:you're " + (["dock", "roof"].includes(here) ? "on the " : "in the ") + here + ".}  {ok:Biscuit is in the " + S.cat.room + ".}  {dim:(tap a room to go there)}"
  ];
  for (const l of m) print(l);
}

/* ---------- registering the everyday commands ---------- */
cmd("help ?", "what you can do", (a) => doHelp(a), { group: "help" });
cmd("hint stuck", "a nudge from Wren, if you're stuck", () => print(hintText()), { group: "help" });
cmd("todo", "Wren's list of things to do", () => print(todoText()), { group: "help" });
cmd("ls dir", "list what's here (-a for hidden, -l for detail)", doLs, { group: "around" });
cmd("cd go goto", "go somewhere (cd kitchen, cd .., cd ~)", doCd, { group: "around" });
cmd("pwd", "where am I, exactly", () => print(S.cwd), { group: "around" });
cmd("look l", "describe where you are", doLook, { group: "around" });
cmd("cat read open less more view", "read a file / look at a thing", doCat, { group: "around" });
cmd("map", "a map of the cottage", doMap, { group: "around" });
cmd("take get grab pick", "pick something up", doTake, { group: "around" });
cmd("pockets inv inventory i bag", "what you're carrying", () => { for (const l of pocketsText()) print(l); }, { group: "around" });
cmd("where whereis", "where is... (where biscuit)", (a) => {
  const w = (a[0] || "").toLowerCase();
  if (!w || w === "am" || w === "i") return print("You're in the " + roomName() + " ({dim:" + esc(S.cwd) + "}).");
  if (["biscuit", "cat"].includes(w)) return print("HEARTH checks the collar tracker... Biscuit is in the {acc:" + S.cat.room + "}." + (S.cat.room === roomName() ? " {dim:(right here, in fact. she's pretending you're not.)}" : " {cmd:cd " + S.cat.room + "}"));
  if (w === "wren" && S.flags.lanternLit) return print("She's home. Probably in the kitchen, thumping the kettle. Or on the dock, telling Fenn he's wrong about something.");
  if (w === "wren") return print("Last postcard: " + (S.day >= 8 ? "the Faroe Islands." : S.day >= 5 ? "Shetland." : S.day >= 2 ? "a sleeper train going north." : "somewhere between here and the Faroes."));
  if (w === "fox") return print(isNight() || isEvening() ? "Probably in the garden, at the edge of the long grass." : "Asleep somewhere. Foxes keep evening hours.");
  return doFind([w]);
}, { group: "around" });
cmd("brew tea kettle", "put the kettle on (brew mint, brew chamomile...)", doBrew, { group: "living" });
cmd("thump hit bang", "thump something (the kettle, ideally)", doThump, { group: "living", secret: true });
cmd("cook bake make", "cook a recipe you know", doCook, { group: "living" });
cmd("eat", "eat something", doEat, { group: "living" });
cmd("feed", "feed the cat (or the fox)", doFeed, { group: "living" });
cmd("pet stroke cuddle scratch", "pet Biscuit", doPet, { group: "living" });
cmd("plant sow", "plant seeds (in the garden)", doPlant, { group: "garden" });
cmd("water", "water the garden", doWater, { group: "garden" });
cmd("harvest pick", "harvest what's ready", doHarvest, { group: "garden" });
cmd("garden beds", "see how the garden's growing", () => {
  if (inGh()) return gardenView(true).forEach(l => print(l));
  if (!inGarden()) { print("{dim:(from the window:)}"); }
  gardenView(false).forEach(l => print(l));
  if (S.flags.ghOpen) { print("{dim:greenhouse:}"); gardenView(true).forEach(l => print(l)); }
}, { group: "garden" });
cmd("chop", "chop firewood (garden)", doChop, { group: "living" });
cmd("stoke fire", "light or feed the wood stove (parlour)", doStoke, { group: "living" });
cmd("light", "light something (lamp, candle)", doLight, { group: "living" });
cmd("fish cast", "go fishing (on the dock)", doFish, { group: "living" });
cmd("row boat", "take the rowing boat out", doRow, { group: "living" });
cmd("sky telescope stars", "look through the telescope (on the roof, at night)", doSky, { group: "living", when: () => true });
cmd("sit", "sit down for a bit", doSit, { group: "living" });
cmd("nap", "a quick nap (an hour)", doNap, { group: "living" });
cmd("sleep bed", "go to bed and start a new day", doSleep, { group: "living" });
cmd("time clock date", "what time is it", () => {
  const left = SEASON_END - S.day;
  print("It's {hi:" + clock(S.min) + "}, " + partOfDay() + ". " + dayName(S.day) + ", " + dateStr(S.day) + ".");
  print("{dim:" + (left > 1 ? left + " days until Lantern Night." : left === 1 ? "Lantern Night is TOMORROW." : left === 0 ? "It's LANTERN NIGHT." : "Winter, now. The lake's quiet.") + "}");
}, { group: "living" });
cmd("weather window", "look out of the window", () => {
  print(skyLine());
  print("{dim:today is " + weatherNow().word + ". warmth: " + Math.round(S.warmth) + "%" + (fireLit() ? ", the stove is lit" : "") + (teaWarm() ? ", there's tea in the pot" : "") + ".}");
}, { group: "living" });
cmd("oil", "oil something squeaky", doOil, { group: "living" });
cmd("unlock", "unlock something", (a) => {
  if ((a[0] || "").includes("trunk")) { if (roomName() !== "attic") return print("The trunk's in the attic."); return doCd(["trunk"]); }
  if ((a[0] || "").includes("greenhouse")) return doOil(["greenhouse"]);
  print("Unlock what? {dim:(most doors here aren't locked. they're just stuck, or sulking.)}");
}, { group: "living" });
cmd("insert disk mount", "put a disk in HEARTH (in the study)", doInsert, { group: "living" });
cmd("radio tune", "the radio (radio 101.3, radio off)", doRadio, { group: "living", when: () => true });
cmd("play record music", "play a record (parlour)", doRecord, { group: "living" });
cmd("stop", "stop the music", () => { if (S.flags.radioOn) { S.flags.radioOn = null; print("Click. Quiet. The house fills back up with its own small noises."); } else print("Nothing's playing. Just the rain" + (weatherNow().rain ? "." : ". (and there isn't any.)")); }, { group: "living", secret: true });
cmd("mail letters post inbox", "read your post", doMail, { group: "people" });
cmd("send post give", "send something to someone (send carrot to fenn)", doSend, { group: "people" });
cmd("friends people neighbours neighbors", "how you're getting on with everyone", doFriends, { group: "people" });
cmd("write edit nano vim vi emacs pico notepad", "write your own note (write diary.txt)", doWrite, { group: "people" });
cmd("journal diary", "your journal, one entry a day", doJournal, { group: "people" });
cmd("jar keepsakes achievements", "the jar of keepsakes on the windowsill", doJar, { group: "people" });
cmd("fishlog fishing", "every fish you've caught", doFishlog, { group: "people" });
cmd("name", "name something (name fox Clementine)", (a) => {
  if ((a[0] || "").toLowerCase() !== "fox") return print("You can name the fox: {cmd:name fox} something. ");
  const n = a.slice(1).join(" ").trim();
  if (!n) return print("Name her what? {dim:(name fox Clementine)}");
  if (roomName() !== "garden" || !(isNight() || isEvening())) return print("You should probably meet her first. She's in the garden in the evenings.");
  S.fox = n.slice(0, 24);
  keepsake("fox");
  print("You decide the fox is called {acc:" + esc(S.fox) + "}. She looks at you as if she's always been called " + esc(S.fox) + " and is surprised it took you this long.");
  remember("named the fox " + S.fox + ".");
}, { group: "living" });

/* ---------- implementations ---------- */
function doHelp(a) {
  if (a[0] && a[0] !== "all") return doMan(a);
  if (a[0] !== "all") {
    const row = (c, d) => "  " + '<span class="cmd" data-c="' + c + '">' + pad(c, 14) + "</span>" + " {dim:" + d + "}";
    print("{hi:the few things you need}  {dim:(tap any of them)}");
    for (const [c, d] of [["look", "where am I, what's here"], ["ls", "list what's here"], ["cd kitchen", "go somewhere (any room's name works)"],
      ["cat note.txt", "read or look closely at something"], ["take", "pick something up"], ["pockets", "what you're carrying"],
      ["map", "the house"], ["board", "what you've worked out"], ["hint", "a nudge, if you're stuck"]]) print(row(c, d));
    print("");
    print("{dim:rooms have their own things to do: try them and see. everything else:} {cmd:help all}");
    return;
  }
  const groups = [
    ["around", "getting around"], ["living", "living here"], ["garden", "the garden"], ["people", "people & paper"], ["help", "when stuck"]
  ];
  for (const [g, title] of groups) {
    const list = Object.values(CMDS).filter(c => c.group === g && cmdAvailable(c.name) && !c.secret);
    if (!list.length) continue;
    print("{acc:" + title + "}");
    let line = "  ";
    for (const c of list) { line += '<span class="cmd" data-c="' + c.name + '">' + c.name + "</span>   "; if (plain(line.replace(/<[^>]+>/g, "")).length > 58) { print(line); line = "  "; } }
    if (line.trim()) print(line);
  }
  print("{acc:the computer-ish bits}");
  let line = "  ";
  for (const c of Object.values(CMDS).filter(c => c.group === "system" && cmdAvailable(c.name) && !c.secret)) { line += "{cmd:" + c.name + "}  "; if (plain(line).length > 58) { print(line); line = "  "; } }
  if (line.trim()) print(line);
  print("{dim:pipes (a | b), ; and &&, > and >>, !!, history, tab-completion, aliases. {cmd:man} anything.}");
}

function hintText() {
  const H = s => "{acc:hint:} " + s;
  if (!S.read["/cottage/study/note.txt"]) return H("there's a note from Wren, in the study. {cmd:cat ~/study/note.txt}");
  if (S.mailbox.length) return H("you've got post. {cmd:mail}");
  if (!S.stats.teas) return H("the kettle's in the kitchen. {cmd:cd kitchen}, {cmd:brew}.");
  if (!S.flags.fedOnce) return H("Biscuit wants feeding. {cmd:feed biscuit}");
  if (!S.disks.radio && !has("disk:radio")) return H("the radio disk is \"with the bread\". {cmd:ls ~/kitchen/bread_bin}");
  if (has("disk:radio")) return H("disks go in the drive in the study. {cmd:cd study}, {cmd:insert}.");
  if (!S.flags.planted) return H("you've seeds in your coat. {cmd:cd garden}, {cmd:plant}. then {cmd:water}.");
  if (S.quests.otto_radio === "open" && S.disks.radio && S.min < 12 * 60) return H("Ottoline's on {cmd:radio 101.3} until noon.");
  if (!has("rod") && !S.stats.fish) return H("Wren's fishing rod is in the shed. {cmd:ls ~/garden/shed}");
  if (S.quests.fenn_lav === "open" && !has("seed:lavender") && !has("lavender") && !S.plots.some(p => p.crop === "lavender")) return H("Wren hid the good seeds. \"use your -a's.\" {cmd:ls -a ~/garden/shed}");
  if (S.quests.fenn_lav === "open" && has("lavender")) return H("{cmd:send lavender to fenn}");
  if (S.quests.pip_lesson === "open") return H("Pip wants a lesson. {cmd:write lesson.txt}, then {cmd:send lesson.txt to pip}.");
  if (!S.flags.lampLit) return H(has("lamp") ? (has("matches") ? "{cmd:light lamp}" : "you need matches. kitchen drawer.") : "the attic's dark. there's an oil lamp in the {cmd:cd cellar}.");
  if (!S.flags.ghOpen) return H(has("oilcan") ? "{cmd:cd garden}, {cmd:oil greenhouse}" : "the greenhouse door needs oil. the oilcan's in the shed.");
  if (S.quests.jun_soup === "open") return H(S.recipes.carrot_soup ? (has("carrot_soup") ? "{cmd:send carrot soup to juniper}" : canMake("carrot_soup") ? "{cmd:cd kitchen}, {cmd:cook carrot soup}" : "soup needs two carrots. they take three nights.") : "there's a soup card in the kitchen: {cmd:cat ~/kitchen/recipes/carrot_soup.card}");
  if (has("disk:sky") || has("disk:pip") || has("disk:lantern")) return H("there's a disk in your pocket. {cmd:cd study}, {cmd:insert}.");
  if (!S.flags.gotKey) return H("the trunk key is on Biscuit's collar. she'll part with it when she trusts you. that takes days, and a fish wouldn't hurt.");
  if (!S.taken["/cottage/attic/trunk/lantern.dsk"]) return H("the trunk, in the attic.");
  if (has("seed:moonflower") && S.gh.every(p => p.crop !== "moonflower")) return H("moonflowers go in the greenhouse.");
  if (!has("moonflower") && !S.flags.lanternLit && S.gh.some(p => p.crop === "moonflower")) return H("moonflowers open at night. harvest after dark.");
  if (!S.flags.lanternLit && S.day < SEASON_END) return H("the lantern's ready, or nearly. the 25th is " + plural(SEASON_END - S.day, "day") + " away. there's a lot in this house you haven't looked at yet. {cmd:board}");
  if (!S.flags.lanternLit) return H(isNight() ? "{cmd:cd dock}. {cmd:lantern}." : "tonight, after dark, on the dock.");
  if (!S.flags.answered) return H(S.flags.sawAsk ? "it asked you something. Wren said what to answer with. the board has what you know: {cmd:board}" : "did you hear the cellar change, after the lantern?");
  return H(pick(["the carp comes up in fog, or at dawn.", "your jar's not full. {cmd:jar}", "write to someone.", "{cmd:sit}. that's allowed."]));
}

function doOil(a) {
  const what = (a.join(" ") || "").toLowerCase();
  if (!has("oilcan")) return print("You'd need the oilcan. {dim:(it's in the garden shed.)}");
  if (what.includes("greenhouse") || what.includes("door") || what.includes("hinge") || (!what && roomName() === "garden")) {
    if (S.flags.ghOpen) return print("The greenhouse door swings like a dream already. You give it another drop for luck.");
    if (roomName() !== "garden") return print("The greenhouse is off the garden. {cmd:cd garden}");
    S.flags.ghOpen = true;
    sfx("door");
    print("You drip oil onto each rusted hinge, wait, then try the door. It groans... and then gives, swinging open with a sigh of warm, earthy air.\n{ok:The greenhouse is open.} {cmd:cd greenhouse}");
    remember("got the greenhouse door open. it smells of tomato leaves in there, even though there aren't any.");
    return;
  }
  if (what.includes("kettle")) return print("You oil the kettle. It doesn't help. The kettle's problems are emotional.");
  if (what.includes("biscuit") || what.includes("cat")) return print("Absolutely not.");
  if (what.includes("rocking") || what.includes("gerald")) return print("You oil Gerald. He rocks a little smoother. He seems grateful, in a glass-eyed way.");
  print("You oil the " + esc(what || "air") + ". It's now slightly oily.");
}

async function doInsert(a) {
  if (roomName() !== "study") return print("HEARTH's disk drive is in the study. {cmd:cd study}");
  let k = a.length ? itemKey(a.join(" ").replace(/\.dsk$/i, "")) : Object.keys(S.inv).find(x => x.startsWith("disk:"));
  if (k && !k.startsWith("disk:")) k = null;
  if (!k) return print(Object.keys(S.inv).some(x => x.startsWith("disk:")) ? "Insert which disk? " + Object.keys(S.inv).filter(x => x.startsWith("disk:")).map(x => "{cmd:insert " + x.slice(5) + ".dsk}").join(" ") : "You haven't got any disks. {dim:(they turn up in odd places. a bread bin, for instance.)}");
  const id = k.slice(5);
  take(k);
  print("You push " + id.toUpperCase() + ".DSK into the drive. {dim:clunk.}");
  sfx("beep");
  await pause(400);
  const bar = printRaw("");
  for (let i = 0; i <= 20; i++) {
    bar.innerHTML = fmt("{dim:installing}  [" + "{acc:" + "#".repeat(i) + "}" + "-".repeat(20 - i) + "] " + i * 5 + "%");
    if (i % 4 === 0) sfx("tick");
    await pause(60);
  }
  if (T.skip) bar.innerHTML = fmt("{dim:installing}  [{acc:####################}] 100%");
  S.disks[id] = true;
  const msgs = {
    radio: "{ok:RADIO installed.} On the shelf, the old radio clicks and starts to warm up. {cmd:radio}",
    sky: "{ok:SKY installed.} Up on the roof, faintly, you hear the telescope motor whirr awake. {dim:(on clear nights: {cmd:cd roof}, {cmd:sky})}",
    lantern: "{ok:LANTERN installed.} Nothing happens. Then — down at the dock, through the window — the lantern's little brass shutter clicks open and shut, once, like a wink.",
    pip: "{ok:PIP.DSK installed.} The screen fills with a pixel cat that waves and says HI FROM PIP!!! — then vanishes. {dim:(new command: {cmd:catsay hello})}"
  };
  print(msgs[id] || "{ok:installed.}");
  if (id === "radio") { keepsake("radio"); remember("fixed the radio. it was a disk wrapped in a tea towel all along."); }
  if (id === "lantern") { S.flags.lanternReady = !!(has("wick") && has("moonflower")); remember("installed the lantern disk. it winked at me."); }
  spend(3);
}

async function doRadio(a) {
  if (!S.disks.radio) return print("The radio on the shelf doesn't come on. {dim:(it needs its disk. Wren's list says it's with the bread.)}");
  const arg = (a[0] || "").toLowerCase();
  if (arg === "off") { S.flags.radioOn = null; return print("You switch the radio off. The click is very loud in the quiet."); }
  if (!arg) {
    print("{dim:the dial glows a soft orange:}");
    const st = S.flags.radioOn;
    print("  {dim:FM} 77 . . . . 88 . . . . 93 . . . . 101 . . . 104 . . 108");
    const known = Object.keys(STATIONS).filter(f => f !== "104.5" || S.disks.pip);
    print("  " + known.map(f => "{cmd:radio " + f + "} {dim:" + STATIONS[f] + "}").join("\n  "));
    print("  {cmd:radio off}" + (st ? "   {dim:(now playing: " + st + ")}" : ""));
    return;
  }
  if (arg === "scan") {
    print("You turn the dial slowly from one end to the other...");
    sfx("beep");
    for (const f of ["77.7", "88.8", "93.1", "101.3", "104.5"]) { await pause(350); print("  " + f + "  " + (STATIONS[f] && (f !== "104.5" || S.disks.pip) ? "{acc:" + STATIONS[f] + "}" : f === "77.7" ? "{dim:...something faint? {cmd:radio 77.7}}" : "{dim:static}")); }
    return;
  }
  let f = arg.replace(/[^0-9.]/g, "");
  if (!f.includes(".") && f.length >= 3) f = f.slice(0, -1) + "." + f.slice(-1);
  if (!f) return print("Tune to what? {dim:(try {cmd:radio 101.3})}");
  S.flags.radioOn = f;
  sfx("beep");
  print("{dim:kssshh—} You tune to " + f + ".");
  await pause(300);
  for (const l of radioOut(f)) { print(l); await pause(220); }
  spend(5);
  if (f === "88.8") remember("listened to the night piano on 88.8.");
}

function doRecord() {
  if (roomName() !== "parlour") return print("The record player's in the parlour.");
  S.flags.radioOn = "88.8";
  print("You lift the lid, set down {acc:'Nocturnes for a Wet Tuesday'}, and lower the needle. A crackle, a hiss, and then piano, soft and slow and in no hurry at all.");
  if (!A.ctx) print("{dim:(tap the screen once to let the sound in.)}");
  warm(4);
  spend(2);
  remember("played one of Wren's records.");
}

async function doSit() {
  const r = roomName();
  const spots = { parlour: "the orange armchair", dock: "the bench at the end of the dock", garden: "the edge of a raised bed", kitchen: "the kitchen chair with the wobbly leg", study: "the desk chair", hall: "the bottom stair", greenhouse: "an upturned flowerpot", roof: "the roof, back against the warm chimney", attic: "a box marked TAX", cellar: "the cellar steps" };
  print("You sit on " + (spots[r] || "the floor") + " for a while.");
  await pause(800);
  const thoughts = [
    "You don't think about much.",
    "You listen to the house. Under everything, the hum.",
    "You think about Wren, somewhere north, on a boat probably.",
    r === "dock" ? "Water against the posts. The cable going down into it." : "You watch the window. " + skyLine(),
    fireLit() && r === "parlour" ? "You watch the stove until you forget what you came in for." : "You notice you've stopped hurrying."
  ];
  await type(pick(thoughts), 45);
  if (r === "parlour" && S.cat.room === "parlour" && chance(0.7)) { await pause(500); print("{dim:Biscuit gets into your lap, turns round three times, and settles. You're not getting up for a while.}"); catMood(5); warm(5); sfx("purr"); }
  spend(15);
  warm(r === "parlour" && fireLit() ? 8 : 4, "warmer");
}
async function doNap() {
  if (S.min > 22 * 60) return print("At this hour that's just sleeping. {cmd:sleep}");
  print("You close your eyes for a minute.");
  await pause(900);
  print("{dim:z z z . . .}");
  await pause(900);
  spend(60);
  warm(5);
  print("An hour later" + (S.cat.room === roomName() ? ", with Biscuit on your feet." : ".") + " It's " + clock(S.min) + ".");
}

async function doSleep() {
  if (S.min < 19 * 60 && S.min >= 5 * 60) return print("It's only " + clock(S.min) + ". {dim:(bed from 7pm. or {cmd:nap}.)}");
  print("You check the back door, turn the lamp off, and go up.");
  await pause(700);
  if (S.today.length) {
    print("");
    print("{dim:you write in your journal:}");
    const entry = composeJournal(false);
    S.pendingEntry = entry;
    await type("  " + dateStr(S.day).toLowerCase() + ". " + entry, 70, "hi");
    await pause(600);
  }
  print("");
  await type("Under the house, the hum.", 40, "dim");
  await pause(900);
  await newDay(false);
}

function doMail(a) {
  const arg = (a[0] || "").toLowerCase();
  if (arg === "all" || arg === "old") {
    if (!S.letters.length) return print("No letters yet.");
    print("{hi:every letter you've had:}");
    S.letters.forEach((id, i) => { const L = letterMeta(id); if (L) print("  {cmd:mail " + (i + 1) + "} {dim:from} " + (PEOPLE[L.from] ? PEOPLE[L.from].short : "Wren") + " {dim:— " + esc(L.subject) + "}"); });
    return;
  }
  if (arg && /^\d+$/.test(arg)) {
    const id = S.letters[parseInt(arg, 10) - 1];
    if (!id) return print("No letter number " + arg + ".");
    return openLetter(id);
  }
  if (!S.mailbox.length) return print("No new post. {dim:(post comes in the morning.)} {cmd:mail all} for old letters." + (S.outbox.length ? "\n{dim:in the outbox, waiting for Ottoline at dawn: " + S.outbox.map(o => itemName(o.item) + " → " + PEOPLE[o.to].short).join(", ") + "}" : ""));
  openLetter(S.mailbox[0]);
  if (S.mailbox.length) {
    print("");
    print("{dim:(" + plural(S.mailbox.length, "more letter") + " waiting:} " + S.mailbox.map(id => { const L = letterMeta(id); return PEOPLE[L.from] ? PEOPLE[L.from].short : "Wren"; }).join(", ") + "{dim:) —} {cmd:mail}");
  }
}

function doSend(a) {
  const ti = a.map(x => x.toLowerCase()).lastIndexOf("to");
  if (ti < 1 || ti === a.length - 1) return print("Send what to whom? {dim:like: {cmd:send carrot to fenn} or {cmd:send lesson.txt to pip}}\n{dim:(neighbours: ottoline, fenn, pip, juniper)}");
  const what = a.slice(0, ti).join(" ");
  const who = WHO(a.slice(ti + 1).join(" "));
  if (!who) return print("There's nobody called " + esc(a.slice(ti + 1).join(" ")) + " in the Hollow. {dim:(ottoline, fenn, pip, juniper.)}" + (/wren/i.test(a.join(" ")) ? "\n{dim:(Wren's travelling. no fixed address. she'd like that you thought of it, though.)}" : ""));
  let key = itemKey(what);
  if (!key) {
    const f = nodeAt(resolve(what)) ? resolve(what) : (findHere(what) || {}).path;
    if (f && S.files[f] != null) key = "file:" + f;
    else if (f && nodeAt(f) && nodeAt(f).kind === "file") return print("That's one of Wren's. You'd rather keep it here. {dim:(you can send things you {cmd:write} yourself.)}");
  }
  if (!key) return print("You haven't got " + esc(what) + ". {dim:({cmd:pockets} shows what you have.)}");
  if (key === "key" || key.startsWith("disk:") || ["rod", "lamp", "oilcan", "matches", "umbrella"].includes(key)) return print("You'll need that. Better keep it.");
  if (!key.startsWith("file:")) take(key);
  S.outbox.push({ to: who, item: key, day: S.day });
  S.stats.letters++; S.stats.gifts++;
  spend(5);
  sfx("mail");
  print("You wrap " + (key.startsWith("file:") ? "a copy of your note" : itemName(key)) + " in brown paper, write {acc:" + PEOPLE[who].full.toUpperCase() + "} on it in your best capitals, and pop it in the post box by the gate.");
  print("{dim:(Ottoline collects at dawn. you'll hear back tomorrow.)}");
  remember("sent " + (key.startsWith("file:") ? "a note" : itemName(key)) + " to " + PEOPLE[who].short + ".");
}

function doFriends() {
  print("{hi:the Hollow}");
  const q = {
    ottoline: S.quests.otto_bake === "open" ? "wants something sweet for the bake sale" : S.quests.otto_pump === "open" ? "is waiting on a pumpkin" : S.quests.otto_radio === "open" ? "wants you to tune in to 101.3" : "",
    fenn: S.quests.fenn_lav === "open" ? "wants lavender for his bees" : S.quests.fenn_trout === "open" ? "would like a trout for supper" : "",
    pip: S.quests.pip_lesson === "open" ? "wants you to teach her a command (in a file)" : S.quests.pip_weird === "open" ? "wants something weird from the lake" : "",
    juniper: S.quests.jun_soup === "open" ? "would love some carrot soup" : S.quests.jun_comet === "open" ? (S.flags.sawComet ? "is waiting to hear about the comet" : "wants you to see the comet (west, clear night)") : ""
  };
  for (const [k, p] of Object.entries(PEOPLE)) {
    const met = S.letters.some(id => (letterMeta(id) || {}).from === k);
    print("  " + "{" + p.color + ":" + pad(p.full, 16) + "}" + " " + (met ? hearts(S.friends[k]) : "{dim:not met yet}") + (q[k] ? "  {dim:— " + q[k] + "}" : ""));
  }
  print("  {acc:" + pad("Biscuit", 16) + "} " + hearts(S.cat.mood / 10) + "  {dim:— " + (S.cat.mood > 80 ? "adores you, privately" : S.cat.mood > 55 ? "warming to you" : "reserving judgement") + "}");
  if (S.fox) print("  {acc:" + pad(S.fox + " (fox)", 16) + "} " + hearts(Math.min(10, (S.flags.foxFed || 0) * 2)) );
  print("{dim:(send people things they'd like. {cmd:send} — and read their letters, they drop hints.)}");
}

async function doWrite(a, ctx) {
  let name = a[0];
  if (!name) { print("Write what? Give it a name: {cmd:write diary.txt}"); return; }
  if (!/\.[a-z0-9]+$/i.test(name) && !name.includes("/")) name += ".txt";
  const path = resolve(name);
  const why = writable(path);
  if (why) return print("{warn:can't write there —} " + why);
  const old = S.files[path];
  print("{hi:writing " + esc(shortPath(path)) + "}  {dim:— type your lines. a line with just a  {acc:.}  finishes. (" + (old != null ? "this replaces what was there" : "new file") + ")}");
  const lines = [];
  while (true) {
    const l = await ask("  " + padL(lines.length + 1, 2) + "| ");
    if (l === null) { print("{dim:(cancelled. nothing saved.)}"); return; }
    if (l.trim() === "." || l.trim() === ":wq" || l.trim() === ":x" || l.trim() === "EOF") break;
    if (l.trim() === ":q!") { print("{dim:(cancelled. nothing saved. very vim of you.)}"); return; }
    lines.push(l);
    if (lines.length > 60) { print("{dim:(that's a lot. saving here.)}"); break; }
  }
  S.files[path] = lines.join("\n");
  print("{ok:saved.} {dim:" + plural(lines.length, "line") + " in " + esc(shortPath(path)) + ". read it back with {cmd:cat " + esc(name) + "}.}");
  keepsake("writer");
  remember("wrote something of my own.");
}

function doJournal(a) {
  if ((a[0] || "") === "today") return print(S.today.length ? "{dim:so far today:} " + S.today.join(" ") : "{dim:nothing yet today. the day's young.}");
  if (!S.journal.length) return print("Your journal's empty — tonight's entry gets written when you {cmd:sleep}.\n{dim:so far today:} " + (S.today.join(" ") || "{dim:nothing yet.}"));
  print("{hi:your journal}");
  for (const e of S.journal.slice(-10)) print("  {acc:" + dateStr(e.day).toLowerCase() + ".} " + esc(e.text));
  if (S.journal.length > 10) print("{dim:  (earlier pages: " + (S.journal.length - 10) + " more. {cmd:journal | head} works too.)}");
}

function doJar() {
  const got = Object.entries(KEEPSAKES).filter(([k]) => S.keeps[k]);
  print("{dim:       ___________}");
  print("{dim:      (___________)}");
  print("{dim:      |}  " + pad(got.length + " / " + Object.keys(KEEPSAKES).length, 9) + "{dim:|}");
  print("{dim:      |___________|}");
  print("");
  print("{hi:the keepsake jar} {dim:— little things, from the season:}");
  for (const [k, [thing, why]] of Object.entries(KEEPSAKES)) if (S.keeps[k]) print("  {acc:" + thing + "}  {dim:— " + why + "}");
  const left = Object.keys(KEEPSAKES).length - got.length;
  if (left) print("  {dim:...and room for " + left + " more.}");
}

function doFishlog() {
  print("{hi:fish caught}");
  for (const f of FISH) {
    const L = S.fishlog[f.id];
    if (f.junk) continue;
    const name = f.id === "marmalade" ? "the carp" : f.id;
    print("  " + (L ? "{ok:" + pad(name, 14) + "}" + " {dim:x" + L.n + (L.best ? ", best " + L.best + "cm" : "") + "}" : "{dim:" + pad("?????", 14) + "}"));
  }
  print("{dim:(different fish bite at different times and in different weather. the fish book in the parlour knows.)}");
}

function doFind(a) {
  const q = (a.filter(x => !x.startsWith("-"))[0] || "").toLowerCase().replace(/^-name$/, "");
  const name = a.includes("-name") ? (a[a.indexOf("-name") + 1] || "") : q;
  if (!name) return print("find what? {dim:(find jam, find .dsk, find biscuit)}");
  if (["biscuit", "cat"].includes(name.toLowerCase())) return print("/proc/biscuit  {dim:(she's in the " + S.cat.room + ")}");
  const pat = name.replace(/\*/g, "").toLowerCase();
  const hits = [];
  const walk = (p, depth) => {
    if (depth > 6 || hits.length > 40) return;
    const n = nodeAt(p);
    if (!n || n.kind !== "dir" || (n.lock && n.lock()) || isDark(p)) return;
    for (const [k, ch] of Object.entries(children(p, true))) {
      const fp = (p === "/" ? "" : p) + "/" + k;
      if (k.toLowerCase().includes(pat)) hits.push(fp);
      if (ch.kind === "dir" && !fp.startsWith("/bin")) walk(fp, depth + 1);
    }
  };
  walk(HOME, 0);
  if (!hits.length) return print("find: nothing called '" + esc(name) + "'. {dim:(somewhere locked, maybe. or dark.)}");
  for (const h of hits) print('<span class="cmd" data-c="' + (isDir(h) ? "cd " : "cat ") + esc(h) + '">' + esc(h) + "</span>");
}
cmd("find locate", "search the cottage for something", doFind, { group: "around" });
