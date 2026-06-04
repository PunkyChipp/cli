/* ABYSS — bootstrap, loops, input, overlays. */

let bg, bgx, cr, crx, lastContent = 0, overlayBusy = false;

function $(id) { return document.getElementById(id); }

function init() {
  bg = $("bg"); bgx = bg.getContext("2d");
  load();
  recompute();
  applyOffline();
  recompute();
  sizeCanvases();
  window.addEventListener("resize", sizeCanvases);
  document.addEventListener("click", onClick);
  $("stagewrap"); // noop
  // input on content via delegation for tap
  $("content").addEventListener("pointerdown", onPointerDown);
  requestAnimationFrame(renderLoop);
  setInterval(gameStep, 100);
  refreshAll();
  if (!G.started) showDifficulty();
}

function sizeCanvases() {
  bg.width = window.innerWidth; bg.height = window.innerHeight;
}

// ---------- loops ----------
function gameStep() {
  if (!G.started) return;
  const now = Date.now();
  let dt = (now - (G.lastTick || now)) / 1000;
  G.lastTick = now;
  if (dt > 1) dt = 1;
  if (dt < 0) dt = 0;
  tick(dt);
  if (now - (G.lastSave || 0) > 5000) save();
  refreshTop();
  if (now - lastContent > 220) { lastContent = now; refreshContent(false); }
  processOverlays();
}

function renderLoop(ts) {
  const t = ts / 1000;
  drawBackground(bgx, bg.width, bg.height, t);
  if (UI.tab === "dive") {
    cr = $("creature");
    if (cr) {
      const r = cr.getBoundingClientRect();
      if (cr.width !== Math.floor(r.width) || cr.height !== Math.floor(r.height)) { cr.width = Math.floor(r.width); cr.height = Math.floor(r.height); }
      crx = cr.getContext("2d"); crx.clearRect(0, 0, cr.width, cr.height);
      const growth = Math.min(1, Math.log10(Math.max(1, basePerSec()) + 10) / 9);
      drawCreature(crx, cr.width, cr.height, t, growth);
    }
  }
  requestAnimationFrame(renderLoop);
}

// ---------- refresh ----------
function refreshAll() { refreshTop(); refreshTabs(); refreshContent(true); }
function refreshTop() { $("topbar").innerHTML = topbarHTML(); }
function refreshTabs() {
  const tabs = visibleTabs();
  $("tabbar").innerHTML = tabs.map(t =>
    '<button class="tabbtn ' + (UI.tab === t.id ? "on" : "") + '" data-act="tab" data-arg="' + t.id + '">' +
    '<span class="ti">' + t.icon + "</span><span>" + t.label + "</span></button>").join("");
}
function refreshContent(resetScroll) {
  const c = $("content");
  const sc = c.scrollTop;
  c.innerHTML = contentHTML();
  c.scrollTop = resetScroll ? 0 : sc;
  refreshTabs();
}

// ---------- input ----------
function onPointerDown(e) {
  const stage = e.target.closest('[data-act="tap"]');
  if (!stage) return;
  const v = doTap();
  floatNum(e.clientX, e.clientY, "+" + fmt(v), zoneDef().accent);
}
function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.getAttribute("data-act"), arg = el.getAttribute("data-arg");
  dispatch(act, arg, e);
}

function dispatch(act, arg, e) {
  switch (act) {
    case "tab": UI.tab = arg; refreshContent(true); return;
    case "tap": return; // handled by pointerdown
    case "buy": buyProducer(arg, 1); break;
    case "buymax": buyMaxProducer(arg); break;
    case "ladder": raiseLadder(); break;
    case "up": buyUpgrade(arg); break;
    case "prestige": doPrestige(); break;
    case "descend": doDescend(); break;
    case "haul": { const r = doHaul(); if (r) showHaul(r); break; }
    case "card": toggleCard(arg); break;
    case "slot": unequipSlot(parseInt(arg)); break;
    case "preset": setPreset(parseInt(arg)); break;
    case "auto": G.autoOn[arg] = !G.autoOn[arg]; break;
    case "tgt": G.auto.ebbTarget = Math.max(1, (G.auto.ebbTarget || 5) + parseInt(arg)); break;
    case "codex": UI.codex = arg; break;
    case "diff": G.difficulty = arg; recompute(); break;
    case "save": save(); flash("Saved"); break;
    case "reset": if (confirm("Erase ALL progress? No undo.")) { hardReset(); G.started = true; } break;
    case "closeoff": G.offlineGain = 0; break;
  }
  refreshContent(false);
  refreshTop();
}

function toggleCard(id) {
  const slots = activeSlots();
  const at = slots.indexOf(id);
  if (at >= 0 && at < G.slots) { unequipSlot(at); return; }
  for (let i = 0; i < G.slots; i++) if (!slots[i]) { equipCard(i, id); return; }
  flash("Loadout full");
}

// ---------- floating numbers ----------
function floatNum(x, y, txt, color) {
  const s = document.createElement("div");
  s.className = "float"; s.textContent = txt; s.style.left = x + "px"; s.style.top = y + "px";
  s.style.color = "#fff"; s.style.textShadow = "0 0 8px " + color;
  $("floats").appendChild(s);
  setTimeout(() => s.remove(), 900);
}
function flash(msg) {
  const s = document.createElement("div");
  s.className = "toast"; s.textContent = msg;
  $("floats").appendChild(s);
  setTimeout(() => s.remove(), 1400);
}

// ---------- overlays ----------
function showOverlay(html) { overlayBusy = true; const o = $("overlay"); o.innerHTML = html; o.style.display = "flex"; }
function hideOverlay() { overlayBusy = false; $("overlay").style.display = "none"; $("overlay").innerHTML = ""; }

function processOverlays() {
  if (overlayBusy) return;
  if (G.pendingDescend != null) { showDescend(G.pendingDescend); G.pendingDescend = null; return; }
  if (G.pending && G.pending.length) { showBanner(G.pending.shift()); return; }
}

function showDifficulty() {
  let btns = "";
  for (const k in DIFFICULTY) btns += '<button class="ovbtn" data-ov="diff" data-k="' + k + '"><b>' + DIFFICULTY[k].label + "</b><span>" + DIFFICULTY[k].blurb + "</span></button>";
  showOverlay('<div class="ov ovbig"><div class="ovtitle">ABYSS</div><div class="ovsub">Coax light from the deep, and descend. Choose your pace — change it any time.</div>' + btns + "</div>");
  bindOv();
}
function bannerInfo(p) {
  if (p.type === "ach") { const a = DATA.achievements.find(x => x.id === p.id); return { t: "Achievement", n: a.name, d: a.desc, g: "🏆" }; }
  if (p.type === "milestone") { const z = DATA.zones[p.zone], m = z.milestones.find(x => x.level === p.level); return { t: "Milestone", n: m.title, d: m.detail, g: z.ladder.glyph }; }
  const map = {
    reliquary: { n: "The Reliquary", d: "You can now haul and equip specimens. Open the Reliquary tab to build a loadout." },
    prestige_0: { n: "Ebb the Tide", d: "Reset for Pearls — permanent power that survives every reset." },
    descend_0: { n: "The Drop-Off", d: "You can Descend to the Twilight Reach — a new world and a permanent ×2." },
    prestige_1: { n: "Flicker", d: "Reset for Amber to power the Twilight." },
    descend_1: { n: "Into the Black", d: "Descend to the Midnight Zone." },
    prestige_2: { n: "Seep", d: "Reset for Spectra in the Midnight." }
  };
  const m = map[p.id] || { n: "Unlocked", d: "Something new is available." };
  return { t: "New", n: m.n, d: m.d, g: "✦" };
}
function showBanner(p) {
  const info = bannerInfo(p), ac = zoneDef().accent;
  showOverlay('<div class="ov"><div class="ovg" style="color:' + ac + '">' + info.g + "</div>" +
    '<div class="ovtag" style="color:' + ac + '">' + info.t.toUpperCase() + "</div>" +
    '<div class="ovtitle2">' + info.n + "</div><div class='ovsub'>" + info.d + "</div>" +
    '<button class="ovcont" data-ov="close">Continue</button></div>');
  bindOv();
}
function showDescend(zi) {
  const z = DATA.zones[zi], ac = z.accent;
  showOverlay('<div class="ov ovdescend" style="background:linear-gradient(' + z.colors[0] + "," + z.colors[1] + ')">' +
    '<div class="ovtag" style="color:' + ac + '">DESCENDING</div><div class="ovtitle">' + z.name + "</div>" +
    "<div class='ovsub'>" + z.blurb + "</div><button class='ovcont' data-ov='close'>Arrive</button></div>");
  bindOv();
  setTimeout(() => { if (overlayBusy) hideOverlay(); refreshAll(); }, 3600);
}
function showHaul(r) {
  const c = r.card, col = rc(c.rarity);
  showOverlay('<div class="ov"><div class="ovtag" style="color:' + col + '">' + c.rarity.toUpperCase() + (r.leveled ? " · LEVEL UP" : "") + "</div>" +
    '<div class="ovbigglyph" style="text-shadow:0 0 24px ' + col + '">' + c.glyph + "</div>" +
    '<div class="ovtitle2" style="color:' + col + '">' + c.name + "</div>" +
    "<div class='ovsub'>“" + c.flavor + "”</div><div class='ovsub'>" + cardEffectText(c) + "</div>" +
    '<button class="ovcont" data-ov="close">Nice</button></div>');
  bindOv();
}
function bindOv() {
  $("overlay").querySelectorAll("[data-ov]").forEach(b => b.onclick = () => {
    const k = b.getAttribute("data-ov");
    if (k === "diff") { G.difficulty = b.getAttribute("data-k"); G.started = true; recompute(); save(); }
    hideOverlay(); refreshAll();
  });
}

window.addEventListener("load", init);
