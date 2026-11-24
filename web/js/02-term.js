/* =====================================================================
   02-term.js — the terminal itself: printing, the prompt, typing,
   history, tab-completion, little fish-shell style ghost suggestions,
   and the keycap row under the screen.

   Markup you can use in any printed string:
     {hi:bright}  {dim:quiet}  {acc:accent}  {ok:green-ish}  {warn:red-ish}
     {sky:blue}   {u:underline} {big:large}
     {cmd:ls -a}  -> a tappable command (runs when clicked)
   Tags nest:  {dim:try {cmd:look}}
   ===================================================================== */
"use strict";

const T = {
  busy: false,
  skip: false,          // set by ctrl+c / taps to fast-forward animations
  cap: null,            // when piping, output is captured here instead
  asking: null,         // { resolve, prompt, secret }
  keyWait: null,        // resolve fn for awaitKey()
  histPos: -1,
  draft: "",
  maxLines: 700
};

/** markup + html -> the text a pipe should see */
const toPlain = s => plain(String(s).replace(/<[^>]+>/g, ""));

function fmt(s) {
  s = String(s);
  let prev;
  do {
    prev = s;
    s = s.replace(/\{(\w+):([^{}]*)\}/g, (all, tag, body) => {
      if (tag === "cmd") {
        const c = plain(body).replace(/"/g, "&quot;");
        return '<span class="cmd" data-c="' + c + '">' + body + "</span>";
      }
      return '<span class="' + tag + '">' + body + "</span>";
    });
  } while (s !== prev);
  return s;
}

/** Print one or more lines. Strings may contain \n and markup. */
function print(...parts) {
  const text = parts.join(" ");
  if (T.cap) { for (const l of String(text).split("\n")) T.cap.push(toPlain(l)); return; }
  const out = $("out");
  for (const l of String(text).split("\n")) {
    const d = document.createElement("div");
    d.className = "ln";
    d.innerHTML = fmt(l) || "&nbsp;";
    out.appendChild(d);
  }
  trimOut();
  scrollDown();
}
function blank() { print(""); }
function printRaw(html, cls) {
  if (T.cap) { T.cap.push(toPlain(html)); return; }
  const d = document.createElement("div");
  d.className = "ln" + (cls ? " " + cls : "");
  d.innerHTML = html;
  $("out").appendChild(d);
  trimOut(); scrollDown();
  return d;
}
function trimOut() {
  const out = $("out");
  while (out.childElementCount > T.maxLines) out.removeChild(out.firstChild);
}
function scrollDown() {
  const t = $("term");
  if (t) requestAnimationFrame(() => { t.scrollTop = t.scrollHeight; });
}
function clearScreen() { $("out").innerHTML = ""; }

/** A pause that ctrl+c / a tap can skip. */
async function pause(ms) {
  if (T.skip || T.cap) return;
  const step = 40;
  for (let t = 0; t < ms; t += step) { if (T.skip) return; await wait(Math.min(step, ms - t)); }
}

/** Typewriter: prints one line a character at a time. */
async function type(text, cps = 55, cls) {
  if (T.cap || T.skip) { print(cls ? "{" + cls + ":" + text + "}" : text); return; }
  const d = printRaw("", cls);
  const chars = [...plain(text)];
  let shown = "";
  for (let i = 0; i < chars.length; i++) {
    if (T.skip) { d.innerHTML = fmt(text); scrollDown(); return; }
    shown += chars[i];
    d.textContent = shown;
    if (chars[i] !== " " && i % 2 === 0) sfx("tick");
    const slow = ".,!?…".includes(chars[i]) ? 6 : 1;
    await wait(1000 / cps * slow * (S.warmth < 20 ? 1.6 : 1));
  }
  d.innerHTML = fmt(text) || "&nbsp;";
  scrollDown();
}

/** Prints lines one after another with a short beat — feels alive. */
async function slowPrint(lines, gap = 70) {
  for (const l of lines) { print(l); await pause(gap); }
}

/* ---------- the prompt ---------- */
function shortPath(p) {
  if (p === "/cottage") return "~";
  if (p.startsWith("/cottage/")) return "~/" + p.slice(9);
  return p;
}
function promptStr() {
  if (T.asking) return T.asking.prompt;
  return (S.name || "you") + "@hearth:" + shortPath(S.cwd) + "$ ";
}
function showLine(on) {
  const l = $("line");
  l.classList.toggle("hide", !on);
  if (on) { $("prompt").textContent = promptStr(); drawMirror(); scrollDown(); }
}

function ghostFor(v) {
  if (!v || v.length < 2 || T.asking) return "";
  for (let i = S.hist.length - 1; i >= 0; i--) {
    const h = S.hist[i];
    if (h.startsWith(v) && h !== v) return h.slice(v.length);
  }
  return "";
}

function drawMirror() {
  const inp = $("cmd"), m = $("mirror");
  let v = inp.value;
  if (T.asking && T.asking.secret) v = "*".repeat(v.length);
  const pos = inp.selectionStart == null ? v.length : inp.selectionStart;
  const before = v.slice(0, pos), at = v[pos] || " ", after = v.slice(pos + 1);
  const ghost = pos === v.length ? ghostFor(inp.value) : "";
  m.innerHTML = esc(before) + '<span class="cur">' + esc(at) + "</span>" + esc(after) +
    (ghost ? '<span class="ghost">' + esc(ghost) + "</span>" : "");
}

function focusInput() {
  const inp = $("cmd");
  if (document.activeElement !== inp) { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }
}

/** Ask the player for a line of text (name, yes/no, passwords, the editor). */
function ask(prompt, secret = false) {
  return new Promise(resolve => {
    T.asking = { resolve, prompt, secret };
    showLine(true);
    focusInput();
  });
}

/** Resolves on the next Enter/tap. Used for fishing and "press enter" moments. */
function awaitKey() { return new Promise(r => { T.keyWait = r; }); }

/* ---------- running commands ---------- */
async function submit(raw) {
  const inp = $("cmd");
  const typing = document.activeElement === inp;
  inp.value = "";
  T.histPos = -1;

  if (T.asking) {
    const a = T.asking; T.asking = null;
    printRaw(esc(a.prompt) + '<span class="hi">' + esc(a.secret ? "*".repeat(raw.length) : raw) + "</span>", "echo");
    showLine(false);
    a.resolve(raw);
    return;
  }
  if (T.busy) return;

  printRaw('<span class="p">' + esc(promptStr()) + '</span><span class="hi">' + esc(raw) + "</span>", "echo");
  const line = raw.trim();
  if (line) {
    if (S.hist[S.hist.length - 1] !== line) S.hist.push(line);
    if (S.hist.length > 300) S.hist.splice(0, S.hist.length - 300);
  }
  T.busy = true; T.skip = false; T.lastCmd = Date.now();
  showLine(false);
  $("led").classList.add("busy");
  try {
    if (line) await shell(line);
  } catch (e) {
    print("{warn:hearth: something went sideways —} {dim:" + esc(e.message) + "}");
    console.error(e);
  }
  $("led").classList.remove("busy");
  T.busy = false; T.skip = false;
  afterCommand();
  if (!T.asking) showLine(true);
  if (typing || T.asking) focusInput();   // don't pop the iPad keyboard up after a tap
}

/** Run a command as if typed (used by tappable {cmd:...} and keycaps). */
function runTyped(c) {
  if (T.keyWait) { const k = T.keyWait; T.keyWait = null; k("tap"); return; }
  if (T.asking) { $("cmd").value = c; drawMirror(); focusInput(); return; }
  if (T.busy) { T.skip = true; return; }
  sfx("key");
  submit(c);
}

/* ---------- tab completion ---------- */
function complete() {
  const inp = $("cmd");
  const v = inp.value;
  const ghost = ghostFor(v);
  const parts = v.split(/\s+/);
  const last = parts[parts.length - 1];
  let cands;
  if (parts.length <= 1) {
    cands = commandNames().filter(n => n.startsWith(last));
  } else {
    const slash = last.lastIndexOf("/");
    const dirPart = slash >= 0 ? last.slice(0, slash + 1) : "";
    const base = slash >= 0 ? last.slice(slash + 1) : last;
    const dir = resolve(dirPart || ".");
    const node = nodeAt(dir);
    cands = [];
    if (node && node.kind === "dir") {
      for (const [n, ch] of Object.entries(children(dir, base.startsWith(".")))) {
        if (n.startsWith(base)) cands.push(dirPart + n + (ch.kind === "dir" ? "/" : ""));
      }
    }
    cands = cands.concat(completeWords(parts[0], parts.length).filter(w => w.startsWith(last)));
    cands = [...new Set(cands)];
  }
  if (!cands.length) { if (ghost) { inp.value = v + ghost; drawMirror(); } else sfx("bonk"); return; }
  if (cands.length === 1) {
    parts[parts.length - 1] = cands[0];
    inp.value = parts.join(" ") + (cands[0].endsWith("/") ? "" : " ");
  } else {
    // common prefix, then show options
    let pre = cands[0];
    for (const c of cands) while (!c.startsWith(pre)) pre = pre.slice(0, -1);
    if (pre.length > last.length) { parts[parts.length - 1] = pre; inp.value = parts.join(" "); }
    else {
      printRaw('<span class="p">' + esc(promptStr()) + "</span>" + esc(v), "echo");
      print("{dim:" + cands.map(esc).join("   ") + "}");
    }
  }
  drawMirror();
}

/* ---------- keyboard ---------- */
function onKey(e) {
  const inp = $("cmd");
  if (T.keyWait && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault(); const k = T.keyWait; T.keyWait = null; k(e.key); return;
  }
  if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    if (T.busy) { T.skip = true; print("{dim:^C}"); return; }
    printRaw('<span class="p">' + esc(promptStr()) + "</span>" + esc(inp.value) + '<span class="dim">^C</span>', "echo");
    inp.value = ""; if (T.asking) { const a = T.asking; T.asking = null; a.resolve(null); } drawMirror(); return;
  }
  if (e.ctrlKey && (e.key === "l" || e.key === "L")) { e.preventDefault(); clearScreen(); return; }
  if (T.busy && !T.asking) {
    if (e.key === "Enter" || e.key === "Escape") T.skip = true;
    e.preventDefault(); return;
  }
  if (e.key === "Enter") { e.preventDefault(); sfx("enter"); submit(inp.value); return; }
  if (e.key === "Tab") { e.preventDefault(); complete(); return; }
  if (e.key === "ArrowRight" && inp.selectionStart === inp.value.length) {
    const g = ghostFor(inp.value); if (g) { e.preventDefault(); inp.value += g; drawMirror(); return; }
  }
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    if (T.asking) return;
    e.preventDefault();
    const h = S.hist;
    if (!h.length) return;
    if (T.histPos === -1) { T.draft = inp.value; T.histPos = h.length; }
    T.histPos += e.key === "ArrowUp" ? -1 : 1;
    if (T.histPos < 0) T.histPos = 0;
    if (T.histPos >= h.length) { T.histPos = -1; inp.value = T.draft; }
    else inp.value = h[T.histPos];
    setTimeout(() => { inp.selectionStart = inp.selectionEnd = inp.value.length; drawMirror(); });
    return;
  }
  if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) sfx("key");
  if (e.key === "Backspace") sfx("key");
  setTimeout(drawMirror);
}

/* ---------- keycaps under the screen ---------- */
let keysSig = "";
function setKeys(list) {
  const k = $("keys");
  if (!S.keys) { k.classList.add("hide"); return; }
  k.classList.remove("hide");
  const sig = list.join("|");
  if (sig === keysSig) return;
  keysSig = sig;
  k.innerHTML = "";
  for (const c of list) {
    const b = document.createElement("button");
    b.className = "key" + (c.startsWith("⇥") || c.startsWith("↑") ? " fn" : "");
    b.textContent = c;
    b.addEventListener("click", ev => {
      ev.preventDefault();
      if (c === "⇥ tab") { complete(); focusInput(); return; }
      if (c === "↑ again") { if (S.hist.length) runTyped(S.hist[S.hist.length - 1]); return; }
      runTyped(c);
    });
    k.appendChild(b);
  }
}

function termInit() {
  const inp = $("cmd");
  inp.addEventListener("keydown", onKey);
  inp.addEventListener("input", drawMirror);
  inp.addEventListener("select", drawMirror);
  inp.addEventListener("click", drawMirror);
  // tapping the screen focuses the hidden input (and fast-forwards animations)
  $("screen").addEventListener("click", e => {
    const c = e.target.closest && e.target.closest(".cmd");
    if (c) { e.preventDefault(); runTyped(c.dataset.c); return; }
    if (T.keyWait) { const k = T.keyWait; T.keyWait = null; k("tap"); return; }
    if (T.busy && !T.asking) T.skip = true;
    const sel = window.getSelection && String(window.getSelection());
    if (!sel) focusInput();
  });
  // typing anywhere goes to the terminal
  document.addEventListener("keydown", e => {
    if (document.activeElement !== inp && !e.metaKey && (e.key.length === 1 || e.key === "Enter")) {
      focusInput();
      if (T.keyWait && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); const k = T.keyWait; T.keyWait = null; k(e.key); }
    }
  });
  // keep the layout above the iPad keyboard
  const vv = window.visualViewport;
  const fit = () => {
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty("--vh", h + "px");
    scrollDown();
  };
  if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", () => window.scrollTo(0, 0)); }
  window.addEventListener("resize", fit);
  fit();
}
