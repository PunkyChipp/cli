/* =====================================================================
   13-devtoys.js — the computer-ish commands. You never need any of
   these to finish the game. They're here because they're fun, and
   because Wren was a nerd in 1987 and never stopped.
   ===================================================================== */
"use strict";

const SYS = { group: "system" };

/* ---------- text filters (work on piped input or on files) ---------- */
function inputLines(args, ctx) {
  const files = args.filter(a => !a.startsWith("-"));
  if (ctx.stdin && !files.length) return ctx.stdin;
  const out = [];
  for (const f of files) {
    const t = readFile(resolve(f));
    if (t == null) { print("{warn:" + esc(f) + ": no such file}"); continue; }
    for (const l of String(t).split("\n")) out.push(plain(l));
  }
  return out;
}
const emit = lines => { for (const l of lines) print(esc(l)); };

cmd("grep", "find lines that match (ls | grep txt, grep -r love)", (a, ctx) => {
  const flags = a.filter(x => /^-[a-z]+$/.test(x)).join("");
  const rest = a.filter(x => !/^-[a-z]+$/.test(x));
  const pat = rest.shift();
  if (pat == null) { print("usage: grep [-i -v -n -r] pattern [file]  {dim:or pipe into it: {cmd:ls | grep txt}}"); return false; }
  let re;
  try { re = new RegExp(pat, flags.includes("i") ? "i" : ""); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags.includes("i") ? "i" : ""); }
  const hit = l => re.test(l) !== flags.includes("v");
  const show = (l, pre) => print((pre ? "{acc:" + esc(pre) + "}" + "{dim::}" : "") + (T.cap || flags.includes("v") ? esc(l) : esc(l).replace(new RegExp(re.source.replace(/&/g, "&amp;"), re.flags + "g"), m => "{warn:" + m + "}")));
  if (flags.includes("r")) {
    let n = 0;
    const walk = p => {
      const node = nodeAt(p);
      if (!node || (node.lock && node.lock()) || isDark(p)) return;
      if (node.kind === "file") { const t = val(node.text); if (t) plain(t).split("\n").forEach(l => { if (hit(l) && n++ < 60) show(l.trim(), shortPath(p)); }); return; }
      for (const k of Object.keys(children(p, true))) walk((p === "/" ? "" : p) + "/" + k);
    };
    walk(rest[0] ? resolve(rest[0]) : S.cwd);
    if (!n) print("{dim:nothing.}");
    return n > 0;
  }
  const lines = inputLines(rest, ctx);
  let n = 0;
  lines.forEach((l, i) => { if (hit(l)) { n++; show(l, flags.includes("n") ? String(i + 1) : ""); } });
  return n > 0;
}, SYS);
cmd("head", "first few lines (head -n 5)", (a, ctx) => { const n = parseInt((a.find(x => /^-?\d+$/.test(x)) || a[a.indexOf("-n") + 1] || "10").replace("-", ""), 10) || 10; emit(inputLines(a.filter(x => !/^-?\d+$/.test(x) && x !== "-n"), ctx).slice(0, n)); }, SYS);
cmd("tail", "last few lines", (a, ctx) => { const n = parseInt((a.find(x => /^-?\d+$/.test(x)) || a[a.indexOf("-n") + 1] || "10").replace("-", ""), 10) || 10; emit(inputLines(a.filter(x => !/^-?\d+$/.test(x) && x !== "-n"), ctx).slice(-n)); }, SYS);
cmd("wc", "count lines, words, letters", (a, ctx) => {
  const L = inputLines(a, ctx);
  const w = L.join(" ").split(/\s+/).filter(Boolean).length, c = L.join("\n").length;
  if (a.includes("-l")) print(String(L.length)); else print(padL(L.length, 6) + padL(w, 7) + padL(c, 8));
}, SYS);
cmd("sort", "sort lines", (a, ctx) => { const L = inputLines(a, ctx).slice().sort((x, y) => x.localeCompare(y)); emit(a.includes("-r") ? L.reverse() : L); }, SYS);
cmd("uniq", "drop repeated lines", (a, ctx) => emit(inputLines(a, ctx).filter((l, i, arr) => l !== arr[i - 1])), SYS);
cmd("rev", "reverse each line", (a, ctx) => emit(inputLines(a, ctx).map(l => [...l].reverse().join(""))), SYS);
cmd("tac", "lines, backwards", (a, ctx) => emit(inputLines(a, ctx).slice().reverse()), SYS);
cmd("shout upper", "SAY IT LOUDER", (a, ctx) => emit((ctx.stdin && !a.length ? ctx.stdin : [a.join(" ")]).map(l => l.toUpperCase())), SYS);
cmd("echo say", "say something back", (a) => print(esc(a.join(" "))), SYS);
cmd("tee", "pass it on and also save it", (a, ctx) => {
  const L = ctx.stdin || [];
  if (a[0]) { const p = resolve(a[0]); const why = writable(p); if (why) print("{warn:" + why + "}"); else S.files[p] = L.join("\n"); }
  emit(L);
}, SYS);

/* ---------- files ---------- */
cmd("touch", "make an empty file", (a) => {
  if (!a[0]) return print("touch what?");
  const p = resolve(a[0]); const why = writable(p);
  if (why) { const n = nodeAt(p); return print(n && !n.user ? "You touch it. Gently. It's one of Wren's." : "{warn:" + why + "}"); }
  if (S.files[p] == null) S.files[p] = "";
  print("{dim:" + esc(shortPath(p)) + " exists now. it's empty. it's full of potential.}");
}, SYS);
cmd("rm del delete", "remove a file you wrote", (a, ctx) => {
  const raw = ctx.raw;
  if (/-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r/.test(raw) && /\s\/(\s|$|\*)/.test(raw + " ")) {
    print("There's a note taped to the inside of the hard drive. It says:");
    print("");
    print("{hi:                       No.}");
    print("");
    print("{dim:                                    — W.}");
    return false;
  }
  const targets = a.filter(x => !x.startsWith("-"));
  if (!targets.length) return print("rm what?");
  for (const t of targets) {
    const p = resolve(t);
    if (S.files[p] != null) { delete S.files[p]; print("{dim:removed " + esc(shortPath(p)) + ". gone, like a sock in a dryer.}"); continue; }
    const n = nodeAt(p) || (findHere(t) || {}).node;
    if (!n) { print("rm: no such file: " + esc(t)); continue; }
    if (p.includes("biscuit") || t === "biscuit") { print("You can't remove Biscuit. Biscuit removes you. (from the armchair, mostly.)"); continue; }
    print(n.kind === "dir" ? "You can't remove a whole " + esc(t) + ". Wren would come home to a hole in the house." : "You can't bring yourself to throw away one of Wren's things.");
  }
}, SYS);
cmd("cp copy", "copy a file (into your own notes)", (a) => {
  const [src, dst] = a.filter(x => !x.startsWith("-"));
  if (!src || !dst) return print("usage: cp <from> <to>   {dim:e.g. {cmd:cp ~/welcome.txt ~/study/notes/}}");
  const t = readFile(resolve(src));
  if (t == null) return print("cp: no such file: " + esc(src));
  let p = resolve(dst);
  if (isDir(p)) p = p + "/" + resolve(src).split("/").pop();
  const why = writable(p);
  if (why) return print("{warn:can't —} " + why);
  S.files[p] = plain(t);
  print("{dim:copied to " + esc(shortPath(p)) + "}");
}, SYS);
cmd("mv rename", "move or rename a file you wrote", (a) => {
  const [src, dst] = a;
  if (!src || !dst) return print("usage: mv <from> <to>");
  const s = resolve(src);
  if (S.files[s] == null) return print(nodeAt(s) ? "That's Wren's. It lives where it lives." : "mv: no such file: " + esc(src));
  let p = resolve(dst);
  if (isDir(p)) p = p + "/" + s.split("/").pop();
  const why = writable(p);
  if (why) return print("{warn:can't —} " + why);
  S.files[p] = S.files[s]; delete S.files[s];
  print("{dim:moved to " + esc(shortPath(p)) + "}");
}, SYS);
cmd("mkdir", "make a directory", () => print("You can't add a room to Wren's house. You think about a reading nook for a minute, then think about the planning office."), SYS);
cmd("chmod chown", "change permissions", (a) => {
  const t = a.join(" ");
  if (t.includes("greenhouse")) {
    if (S.flags.ghOpen) return print("drwxr-xr-x. It's open. It's very open.");
    if (has("oilcan")) { print("{dim:the door doesn't care about chmod. it cares about oil. luckily you've got the oilcan, so:}"); return doOil(["greenhouse"]); }
    return print("chmod: the door does not care about permissions. the door cares about {acc:oil}. {dim:the shed.}");
  }
  if (t.includes("biscuit")) return print("chmod: Biscuit's permissions are set by Biscuit.");
  print("chmod: done. {dim:nothing visibly changed. that's chmod for you.}");
}, SYS);
cmd("tree", "the shape of things", (a) => {
  const root = resolve(a[0] || HOME);
  print("{sky:" + esc(shortPath(root)) + "}");
  const walk = (p, pre, depth) => {
    const n = nodeAt(p);
    if (!n || n.kind !== "dir" || (n.lock && n.lock()) || isDark(p) || depth > 2) return;
    const ks = Object.entries(children(p));
    ks.forEach(([k, ch], i) => {
      const last = i === ks.length - 1;
      print("{dim:" + pre + (last ? "`-- " : "|-- ") + "}" + (ch.kind === "dir" ? "{sky:" + esc(k) + "/}" : ch.item ? "{acc:" + esc(k) + "}" : esc(k)));
      if (ch.kind === "dir") walk(p + "/" + k, pre + (last ? "    " : "|   "), depth + 1);
    });
  };
  walk(root, "", 0);
}, SYS);

/* ---------- the machine ---------- */
cmd("clear cls", "clear the screen", () => clearScreen(), SYS);
cmd("history", "everything you've typed", (a) => {
  if (a[0] === "-c") { S.hist = []; return print("{dim:history cleared. a fresh start. Biscuit approves of no evidence.}"); }
  const h = S.hist.slice(-40);
  const off = S.hist.length - h.length;
  h.forEach((l, i) => print("{dim:" + padL(off + i + 1, 5) + "}  " + '<span class="cmd" data-c="' + esc(l).replace(/"/g, "&quot;") + '">' + esc(l) + "</span>"));
}, SYS);
cmd("alias", "make a shortcut (alias morning='brew; feed biscuit')", (a, ctx) => {
  const raw = ctx.raw.replace(/^\s*alias\s*/, "");
  if (!raw) {
    const ks = Object.keys(S.aliases);
    if (!ks.length) return print("No aliases yet. Try: {cmd:alias morning='brew; feed biscuit'}");
    for (const k of ks) print("alias " + esc(k) + "='" + esc(S.aliases[k]) + "'");
    return;
  }
  const m = raw.match(/^([\w-]+)\s*=\s*(['"]?)(.*)\2\s*$/);
  if (!m) return print("usage: alias name='command; another command'");
  if (m[1] === "alias") return print("Nice try.");
  S.aliases[m[1]] = m[3];
  print("{ok:alias set:} " + esc(m[1]) + " → " + esc(m[3]));
}, SYS);
cmd("unalias", "forget a shortcut", (a) => { delete S.aliases[a[0]]; print("{dim:forgotten.}"); }, SYS);
cmd("man", "the manual for a command", doMan, SYS);
cmd("whoami", "who are you", () => print(esc(NAME())), SYS);
cmd("hostname", "this machine's name", () => print("hearth"), SYS);
cmd("uname", "about the system", (a) => print(a.includes("-a") ? "HEARTH 4.0.80-wren #1 SMP Mon Mar 9 1987 woodstove x86_cosy GNU/Kettle" : "HEARTH"), SYS);
cmd("uptime", "how long it's been on", () => print("up " + plural(S.day, "day") + ", " + clock(S.min) + ", 1 user, 1 cat, load average: " + (S.cat.mood / 100).toFixed(2) + " " + (S.warmth / 100).toFixed(2) + " 0.42"), SYS);
cmd("cal calendar", "the month, with Lantern Night on it", () => {
  print("{hi:     October}");
  print("{dim:Su Mo Tu We Th Fr Sa}");
  let line = "";
  const first = 6; // Oct 1 is a Saturday, so the 12th is a Wednesday. it's Wren's calendar.
  for (let i = 0; i < first; i++) line += "   ";
  for (let d = 1; d <= 31; d++) {
    const gameDay = d - 11;
    let s = padL(d, 2);
    if (d === 25) s = "{warn:" + s + "}";
    else if (gameDay === S.day) s = "{acc:" + s + "}";
    else if (gameDay > 0 && gameDay < S.day) s = "{dim:" + s + "}";
    line += s + " ";
    if ((d + first) % 7 === 0) { print(line); line = ""; }
  }
  if (line) print(line);
  print("{acc:today}  {warn:25 — Lantern Night}");
}, SYS);
cmd("ps", "what's running", () => {
  print("{dim:  PID TTY      STAT  COMMAND}");
  print("    1 ?        " + (S.cat.mood > 60 ? "Ss" : "S<") + "    {acc:biscuit}  --location=" + S.cat.room + " --mood=" + (S.cat.mood > 80 ? "smug" : "aloof"));
  print("   42 ?        S     kettle" + (teaWarm() ? " --warm" : " --waiting"));
  if (fireLit()) print("   77 ?        R     stove --crackle");
  if (weatherNow().rain) print("  101 ?        R     rain --on-the-window");
  if (S.flags.radioOn) print("  103 ?        S     radio --station=" + S.flags.radioOn);
  print("  512 tty1     S     hearth --minder=" + esc(NAME()));
  if (S.fox) print("  808 ?        S     " + esc(S.fox.toLowerCase()) + " (fox) --garden --nocturnal");
  print(S.flags.lanternLit ? "  999 ?        R     wren --home --in-the-kitchen" : "  999 ?        S     wren --travelling --far-away --thinking-of-you");
}, SYS);
cmd("top htop", "what's using the most", () => {
  print("{hi:HEARTH top}  - " + clock(S.min) + "  up " + plural(S.day, "day") + ",  1 user,  1 cat");
  print("{dim:  PID  %CPU  %MEM  COMMAND}");
  print("    1  " + padL((80 + Math.random() * 18).toFixed(1), 4) + "  64.0  biscuit (dreaming about " + pick(["birds", "the fridge", "a large fish", "you, possibly"]) + ")");
  print("   42  " + padL(teaWarm() ? "12.0" : " 0.1", 4) + "   2.1  kettle");
  print("  101  " + padL(weatherNow().rain ? "9.3" : "0.0", 4) + "   0.5  rain");
  print("  512   1.2   3.0  hearth");
}, SYS);
cmd("kill pkill killall", "stop a process", (a) => {
  const t = a.filter(x => !x.startsWith("-")).join(" ").toLowerCase();
  const nine = a.includes("-9") || a.includes("-KILL");
  if (!t) return print("kill what?");
  if (t === "1" || t.includes("biscuit")) return print(nine ? "kill: (1) - Operation not permitted.\n{dim:Biscuit gives you a look of profound disappointment. She has nine lives. You'd need -10.}" : "You can't kill Biscuit. You give her a gentle pat instead. {dim:that's what kill means, in this house.}");
  if (t === "999" || t.includes("wren")) return print("Absolutely not.");
  if (t.includes("kettle") || t === "42") return print("The kettle clicks off. It'll sulk about this.");
  if (t.includes("rain") || t === "101") return print("You can't kill the rain. You've tried, as a species. It's still raining." + (weatherNow().rain ? "" : " (well, not right now.)"));
  if (t.includes("radio")) { S.flags.radioOn = null; return print("Radio off."); }
  if (t.includes("stove") || t === "77") { S.fireUntil = now(); return print("You shut the stove's air vent and the fire dies down to embers."); }
  if (t.includes("hearth") || t === "512") return print("You can't kill HEARTH from inside HEARTH. It's a philosophical problem. Have a cup of tea.");
  print("kill: no such process: " + esc(t));
}, SYS);
cmd("ping", "say hello over the wires", async (a) => {
  const h = (a[0] || "").toLowerCase();
  if (!h) return print("ping who?  {dim:ping biscuit, ping wren, ping observatory...}");
  if (h.includes("biscuit") || h === "cat") { for (let i = 1; i <= 3; i++) { print("64 bytes from biscuit: icmp_seq=" + i + " mrrp=yes time=∞ ms"); await pause(500); } return print("{dim:--- she heard you. she's choosing not to come. ---}"); }
  if (h.includes("wren")) { for (let i = 1; i <= 3; i++) { print("{dim:request timeout for icmp_seq " + i + "}"); await pause(600); } return print("{dim:--- no reply. she's probably on a ferry, talking to a stranger who'll remember her forever. ---}"); }
  const host = { observatory: "juniper", "post-office": "ottoline", postoffice: "ottoline", apiary: "fenn", "okafor-house": "pip", juniper: "juniper", ottoline: "ottoline", fenn: "fenn", pip: "pip", "the-lake": "lake", lake: "lake", localhost: "me", hearth: "me", "127.0.0.1": "me" }[h];
  if (!host) return print("ping: cannot resolve " + esc(h) + ": unknown host {dim:see {cmd:cat /etc/hosts}}");
  const reply = { juniper: "time=4.2 ms (she's awake. she's always awake.)", ottoline: "time=0.3 ms (instantly. she was waiting.)", fenn: "time=1200 ms (eventually. grumpily.)", pip: "time=0.1 ms PING BACK!!!", lake: "...", me: "time=0.0 ms (it's you. hello, you.)" }[host];
  for (let i = 1; i <= 3; i++) { print(host === "lake" ? "{dim:the lake does not reply. dignified.}" : "64 bytes from " + h + ": icmp_seq=" + i + " " + reply); await pause(450); if (host === "lake") break; }
}, SYS);
cmd("sudo", "do something as the boss", async (a, ctx) => {
  const rest = ctx.raw.replace(/^\s*sudo\s*/, "");
  if (!rest) return print("usage: sudo <command>  {dim:Wren's password is not 'password'.}");
  if (!S.flags.sudoOK) {
    const pw = await ask("[sudo] password for " + NAME() + ": ", true);
    if (pw == null) return;
    if (pw.trim().toLowerCase() !== "biscuit1") {
      sfx("bonk");
      return print(pick(["Sorry, try again. {dim:it's not 'password'.}", "Sorry, try again. {dim:Wren's passwords are always about the cat.}", "Sorry, try again. {dim:it's the cat's name and a number. it's always the cat.}"]));
    }
    S.flags.sudoOK = true;
    print("{dim:HEARTH recognises Wren's password. it doesn't ask how you knew. it's always the cat.}");
  }
  if (/make me a sandwich/i.test(rest)) {
    give("sandwich"); keepsake("sudo");
    return print("Okay.\n{ok:(you got a sandwich.)}");
  }
  if (/^(rm|kill)/.test(rest)) return print("With great power comes great responsibility. You decide not to.");
  if (/feed/.test(rest)) { S.cat.fed = 0; print("{dim:as root, you override the feeding schedule. Biscuit will remember this as the day you finally understood.}"); return pipeline(rest.replace(/^sudo\s*/, "")); }
  if (/^sleep/.test(rest)) { S.min = Math.max(S.min, 19 * 60); return pipeline("sleep"); }
  print("{dim:you feel powerful. nothing else changes.}");
  return pipeline(rest);
}, SYS);
cmd("theme colour color", "change the screen colour (amber, green, paper, rose, frost)", (a) => {
  const t = (a[0] || "").toLowerCase();
  const all = ["amber", "green", "paper", "rose", "frost"];
  if (!all.includes(t)) return print("Themes: " + all.map(x => "{cmd:theme " + x + "}").join("  ") + "   {dim:now: " + S.theme + "}");
  S.theme = t; applyTheme();
  print({ amber: "Amber. Warm as a lamp.", green: "Green phosphor. Very 1987. Very serious.", paper: "Paper. For the daytime, and for people who own a fountain pen.", rose: "Rose. Like a sunset that decided to stay.", frost: "Frost. Blue and quiet, like the first snow." }[t]);
}, SYS);
cmd("sound audio volume", "sound on or off", (a) => {
  const on = (a[0] || "").toLowerCase() === "on" ? true : (a[0] || "").toLowerCase() === "off" ? false : !S.sound;
  audioWake(); setSound(on);
  print(on ? "{ok:Sound on.} Rain, kettle, keys, and the occasional owl." : "Sound off. {dim:the owls will carry on without you.}");
}, SYS);
cmd("keys", "show or hide the shortcut keys", (a) => { S.keys = (a[0] || "").toLowerCase() === "off" ? false : (a[0] || "").toLowerCase() === "on" ? true : !S.keys; setKeys(contextKeys()); print(S.keys ? "Shortcut keys on." : "Shortcut keys hidden. {dim:{cmd:keys on} to bring them back.}"); }, SYS);
cmd("textsize fontsize zoom", "bigger or smaller text (textsize 24)", (a) => {
  const n = clamp(parseInt(a[0], 10) || 22, 14, 34);
  S.fs = n; document.documentElement.style.setProperty("--fs", n + "px");
  print("Text size: " + n + ".");
}, SYS);
cmd("save", "save (it does this by itself, but)", () => { save(); print("{ok:Saved.} {dim:HEARTH saves after everything you do. but it's nice to be sure.}"); }, SYS);
cmd("reset", "start the whole season over", async () => {
  print("{warn:This forgets everything: the garden, the letters, what Biscuit thinks of you.}");
  const y = await ask("Type {yes} to start over: ".replace(/[{}]/g, ""));
  if ((y || "").trim().toLowerCase() !== "yes") return print("{dim:phew. nothing changed.}");
  wipe(); save();
  print("{dim:forgetting...}");
  await pause(800);
  location.reload();
}, SYS);
cmd("reboot restart shutdown poweroff", "turn it off and on again", async () => {
  print("{dim:Broadcast message from " + esc(NAME()) + "@hearth: the system is going down for reboot NOW!}");
  await pause(600);
  save();
  $("screen").classList.add("off");
  sfx("boot");
  await pause(900);
  clearScreen();
  $("screen").classList.remove("off");
  await bootSequence(true);
}, SYS);
cmd("exit logout quit bye", "leave", async () => {
  print("logout: you're the only user. {dim:the game saves as you go. close it whenever.}");
  save();
}, SYS);
cmd("fortune", "something someone once said", () => { const [q, who] = pick(FORTUNES); print("{acc:\"" + q + "\"}  {dim:· " + who + "}"); }, SYS);
const FORTUNES = [
  ["Thump it on the left.", "W."],
  ["If it's foggy, go fishing.", "W."],
  ["Water them, then go inside.", "Mabel Thorne, The Patient Gardener"],
  ["Rain counts.", "Mabel Thorne"],
  ["Bees know when you're lying.", "A. Fenn"],
  ["Post goes at dawn.", "Ottoline"],
  ["Look up.", "J.V."],
  ["I'm not scared of it. I'm just saying it's there.", "Pip"],
  ["It's not the freezer.", "W."],
  ["Count the lights. Then count the boats.", "on the back of a photograph"],
  ["Down, not up.", "pencil, HEARTH-80 Technical Reference, ch. 7"],
  ["Leave a light on.", "W."]
];
cmd("hearthfetch neofetch screenfetch fastfetch", "about this computer, prettily", () => {
  const art = [
    "{acc:      .--------.     }",
    "{acc:     / .------. \\    }",
    "{acc:    | | {hi:~ ~ ~ } | |   }",
    "{acc:    | | {hi:~ o ~ } | |   }",
    "{acc:    | '--------' |   }",
    "{acc:    '---.____.---'   }",
    "{acc:     [==========]    }",
    "{acc:                     }"
  ];
  const info = [
    "{hi:" + esc(NAME()) + "}@{hi:hearth}",
    "{dim:----------------}",
    "{acc:OS}: HEARTH 4.0 (Wren's build)",
    "{acc:Host}: the cottage, Lake Ilse",
    "{acc:Uptime}: " + plural(S.day, "day"),
    "{acc:Shell}: hearth (tea-flavoured)",
    "{acc:Theme}: " + S.theme,
    "{acc:Cat}: Biscuit (PID 1)",
    "{acc:Weather}: " + weatherNow().name,
    "{acc:Memory}: 640K {dim:plenty}"
  ];
  for (let i = 0; i < Math.max(art.length, info.length); i++) print((art[i] || "                     ") + "  " + (info[i] || ""));
}, SYS);
cmd("credits about", "who made this", () => {
  print("{hi:HEARTH}  {dim:— a cottage, a cat, a season.}");
  print("");
  print("  font: VT323 (SIL Open Font License).");
  print("  every sound is made from scratch with WebAudio. the rain too.");
  print("  every pixel through the window is drawn by code.");
  print("");
  print("  {dim:want to change things? see {acc:MODDING.md} in the project folder.}");
}, SYS);
cmd("yes", "agree, repeatedly", async (a) => {
  const w = a.join(" ") || "y";
  for (let i = 0; i < 14; i++) { print(esc(w)); await pause(40); }
  print("{dim:^C  (Biscuit stood on ctrl+c for you.)}");
}, SYS);
cmd("sl", "you meant ls", async () => {
  const k = ["      )  )", "     (  (", "    .-----.", "   |       |=,", "   |       | ||", "   '-------'-'"];
  for (const l of k) { print("{acc:" + esc(l) + "}"); await pause(60); }
  print("{dim:you meant ls.}");
}, SYS);
cmd("git", "version control", () => print("Wren didn't believe in version control. 'I remember what I did,' she wrote, in 1987, and then, in 1993, 'mostly.'"), SYS);
cmd("make", "make something", (a) => (a.join(" ").includes("tea") ? doBrew([]) : a.join(" ").includes("love") ? print("make: *** You can't make love in a cottage terminal. Have a cup of tea.") : print("make: *** No rule to make target '" + esc(a[0] || "") + "'.  {dim:did you mean {cmd:cook}? or {cmd:brew}?}")), SYS);
cmd("python python3 node ruby perl", "other languages", (a, ctx) => print(/python/.test(ctx.raw) ? "python: not installed. {dim:HEARTH has 640K. it uses most of it listening.}" : "not installed."), SYS);
cmd("npm pip3 apt brew-install", "install things", () => print("no network. {dim:the only cable goes into the lake.}"), SYS);
cmd("ssh telnet", "connect to elsewhere", (a) => print((a[0] || "").includes("observatory") || (a[0] || "").includes("juniper") ? "Connecting to observatory... {dim:Connection refused. a note: 'if you want to talk, write. or row. — J.V.'}" : "ssh: nowhere to go. everywhere worth going is in this house, or across the lake by post."), SYS);
cmd("coffee", "coffee", () => print("There's no coffee in the house. Wren doesn't drink it. {dim:tea's in the kitchen.}"), SYS);
cmd("cron crontab", "scheduled things", () => {
  print("{dim:# the cottage's routine, according to Biscuit}");
  print("0  6  * * *   biscuit --demand-breakfast");
  print("0  7  * * *   ottoline --post --radio=101.3");
  print("*/5 * * * *   biscuit --move-somewhere-else");
  print("0  17 * * *   biscuit --demand-dinner --insist-no-breakfast-occurred");
  print("0  22 * * *   house --tick --settle");
}, SYS);
cmd("env printenv export set", "environment", (a, ctx) => {
  if (/export|set/.test(ctx.raw) && a.length) return print("{dim:HEARTH nods and writes it on a post-it. it'll forget by morning.}");
  print("USER=" + esc(NAME()) + "\nHOME=/cottage\nSHELL=/bin/hearth\nPWD=" + S.cwd + "\nCAT=biscuit\nKETTLE=" + (teaWarm() ? "warm" : "cold") + "\nWEATHER=" + weatherNow().name + "\nLANG=en_GB.TEA-8");
}, SYS);
cmd("which type", "where a command lives", (a) => print(a[0] ? (findCmd(a[0]) ? "/bin/" + esc(a[0]) : S.aliases[a[0]] ? esc(a[0]) + ": aliased to '" + esc(S.aliases[a[0]]) + "'" : esc(a[0]) + " not found") : "which what?"), SYS);
cmd("true", "do nothing, successfully", () => true, Object.assign({ secret: true }, SYS));
cmd("false", "do nothing, unsuccessfully", () => false, Object.assign({ secret: true }, SYS));
cmd("xyzzy plugh", "", () => print("A hollow voice says \"fool.\"\n{dim:...it's just Biscuit. she's in the vents. she's also a fool.}"), { secret: true });
cmd("hack hacker", "", async () => {
  print("{ok:HACKING THE MAINFRAME...}");
  for (let i = 0; i <= 10; i++) { print("{ok:[" + "#".repeat(i) + " ".repeat(10 - i) + "] " + i * 10 + "%}"); await pause(120); }
  print("{ok:ACCESS GRANTED} to: {acc:the biscuit tin}. You eat one. {dim:Pip would be so proud.}");
  warm(2);
}, { secret: true });
cmd("matrix", "", () => print("{ok:The rain on the window does a decent impression.}"), { secret: true });
cmd("dance", "", () => print("You do a little dance in the " + roomName() + ". " + (catHere() ? "Biscuit leaves the room." : "Nobody sees. Or so you think. (Margaret the spider saw.)")), { secret: true });
cmd("hug", "", () => print(catHere() ? "You hug Biscuit. She endures it for exactly two seconds, then becomes a liquid and escapes." : "You hug yourself. It's not nothing. You're doing well, you know."), { secret: true });
cmd("sing hum whistle", "", () => print(pick(["You sing a bit. The kettle joins in, slightly flat.", "You hum. The house hums back. (it's the freezer.)", "You whistle. Somewhere outside, a blackbird answers, better."])), { secret: true });
cmd("cry", "", () => print("That's alright. You can, here. The house has heard worse and loved everyone anyway.\n{dim:make a cup of tea, after. {cmd:brew}}"), { secret: true });
cmd("lantern", "light the dock lantern", () => doLantern(), { group: "living", when: () => S.disks.lantern });
cmd("catsay cowsay", "Pip's program: a cat says a thing", (a, ctx) => {
  if (!S.disks.pip) return print(/cowsay/.test(ctx.raw) ? "No cows here. Pip is working on something better, she says." : "catsay: not installed. {dim:Pip's working on it.}");
  const msg = (a.join(" ") || pick(["feed me", "i have not been fed", "the armchair is mine", "mrrp"])).slice(0, 40);
  print(" " + "_".repeat(msg.length + 2));
  print("< " + esc(msg) + " >");
  print(" " + "-".repeat(msg.length + 2));
  print("{acc:    \\    /\\_/\\}");
  print("{acc:     \\  ( o.o )}");
  print("{acc:         > ^ <   {dim:by PIP}}");
}, SYS);
cmd("beep bell", "", () => { sfx("beep"); print("{dim:beep.}"); }, { secret: true });

/* ---------- running files ---------- */
async function execFile(name) {
  const p = resolve(name);
  if (p.endsWith("pip_game.sh") && S.files[p] != null) return pipGame();
  const n = nodeAt(p);
  if (!n) { print("no such file: " + esc(name)); return false; }
  if (p.startsWith("/bin/")) return runOne(p.slice(5));
  if (n.kind === "dir") { print(esc(name) + " is a place. {cmd:cd " + esc(name) + "}"); return false; }
  print("permission denied: " + esc(name) + " {dim:it's a note, not a program. {cmd:cat " + esc(name) + "} it.}");
  return false;
}
async function pipGame() {
  print("{sky:*************************************}");
  print("{sky:*   GUESS THE NUMBER  by PIP OKAFOR  *}");
  print("{sky:*       (age 11) (hacker)            *}");
  print("{sky:*************************************}");
  print("i am thinking of a number from 1 to 20. you get 5 guesses. GOOD LUCK (you will need it)");
  const n = randi(1, 20);
  for (let i = 1; i <= 5; i++) {
    const g = await ask("guess " + i + "> ");
    if (g == null) return print("{sky:you quit!! that's ok. i quit things too. (not hacking.)}");
    const v = parseInt(g, 10);
    if (isNaN(v)) { print("{sky:THAT IS NOT A NUMBER. that's ok. try again.}"); i--; continue; }
    if (v === n) {
      print("{sky:YOU GOT IT!!!!!! it was " + n + "!!! you are a GENIUS. or a hacker. or both.}");
      remember("beat Pip's game. it was " + n + ".");
      return;
    }
    print("{sky:" + (v < n ? "HIGHER" : "LOWER") + (Math.abs(v - n) <= 2 ? " (you're SO close)" : "") + "}");
  }
  print("{sky:NOPE! it was " + n + ". don't be sad. i told you it was hard. play again??}  {cmd:./pip_game.sh}");
}

/* ---------- man pages ---------- */
const MAN_EXTRA = {
  ls: ["-a  show hidden things (Wren hides the good stuff)", "-l  the long way, with owners and sizes"],
  cd: ["cd ..  back out a level", "cd ~   home (the hall)", "cd -   wherever you were before", "you can also just say a room's name from anywhere: cd kitchen"],
  cat: ["BUGS: if there's a real cat on the keyboard, cat will not help you."],
  brew: ["kinds: black, mint, chamomile, lavender, honey", "BUGS: the kettle. see thump(1). left side."],
  fish: ["press ENTER (or tap) the moment the float shows !", "different fish, different times. the field guide in the parlour knows.", "BUGS: the carp."],
  grep: ["-i ignore case   -v invert   -n line numbers   -r search the whole house", "example: grep -r love"],
  sudo: ["BUGS: the password is not 'password'."],
  send: ["send <thing> to <person>", "things: anything in your pockets, or a file you wrote", "people: ottoline, fenn, pip, juniper", "replies arrive the next morning."],
  write: ["opens a tiny editor. type lines. finish with a line that's just a dot: .", "(:wq works too. so does :q! to give up.)"],
  sleep: ["goes to bed and starts tomorrow. writes your journal on the way.", "if you stay up past 1:30am you'll fall asleep at the desk. Biscuit will sit on you."],
  pet: ["pet biscuit — yes.  pet biscuit belly — it's a trap."],
  kill: ["BUGS: will not kill Biscuit. has never killed Biscuit. Biscuit kills kill."],
  alias: ["alias morning='brew; feed biscuit; cd garden; water'"],
  sky: ["sky north | east | south | west | up", "clear nights only. on the roof. with the disk."],
  radio: ["101.3 Ottoline (mornings)   93.1 weather   88.8 night piano", "radio scan — turn the dial and see"]
};
function doMan(a) {
  const n = (a[0] || "").toLowerCase();
  if (!n) return print("What manual page do you want?  {dim:e.g. {cmd:man fish}, {cmd:man grep}, {cmd:man man}}");
  if (n === "man") return print("{hi:MAN(1)}\n\n{acc:NAME}\n    man — the manual.\n\n{acc:DESCRIPTION}\n    Explains things. Like Wren, but in a fixed-width font.\n\n{acc:BUGS}\n    Will not explain Biscuit. Nothing can.");
  if (["biscuit", "cat(8)"].includes(n)) return print("{hi:BISCUIT(8)}\n\n{acc:NAME}\n    biscuit — orange cat, PID 1\n\n{acc:SYNOPSIS}\n    biscuit [--wherever-she-likes]\n\n{acc:DESCRIPTION}\n    See {cmd:cat ~/kitchen/biscuit_manual.txt}.\n\n{acc:BUGS}\n    Several. All load-bearing.");
  const c = findCmd(n);
  if (!c) return print("No manual entry for " + esc(n) + ". {dim:try {cmd:help}}");
  const aliases = Object.keys(ALIAS_OF).filter(k => ALIAS_OF[k] === c.name);
  print("{hi:" + c.name.toUpperCase() + "(1)}" + "          {dim:HEARTH Manual}");
  print("");
  print("{acc:NAME}");
  print("    " + c.name + " — " + esc(c.help || "a mystery"));
  if (aliases.length) { print(""); print("{acc:ALSO KNOWN AS}"); print("    " + aliases.join(", ")); }
  if (MAN_EXTRA[c.name]) { print(""); print("{acc:NOTES}"); for (const l of MAN_EXTRA[c.name]) print("    " + esc(l)); }
  print("");
  print("{dim:    (" + "{cmd:" + c.name + "}" + " to try it)}");
}
