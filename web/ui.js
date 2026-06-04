/* ABYSS — UI (DOM). Renders tabs as HTML strings; actions via data-act delegation. */

var UI = { tab: "dive", codex: "ach" };

function esc(s) { return ("" + s).replace(/</g, "&lt;"); }
function rc(r) { return DATA.rarityColor[r] || "#fff"; }

// ---------- tabs ----------
function visibleTabs() {
  const zd = zoneDef();
  const tabs = [{ id: "dive", label: "Dive", icon: "🌊" }];
  const anyCards = Object.keys(G.cards).length > 0 || G.glimmer >= 1;
  if (anyCards) tabs.push({ id: "reliquary", label: "Reliquary", icon: "🐚" });
  const anyAuto = zd.auto.some(x => x.avail(G)) || G.zone > 0;
  if (anyAuto) tabs.push({ id: "auto", label: "Automate", icon: "⚙" });
  if ((G.maxLadder[zd.ladder.id] || 0) > 0 || G.zone > 0) tabs.push({ id: "descent", label: "Descent", icon: "🜄" });
  tabs.push({ id: "codex", label: "Codex", icon: "📖" });
  return tabs;
}

// ---------- top bar ----------
function topbarHTML() {
  const zd = zoneDef();
  let chips = [];
  chips.push(chip(zd.base.glyph, zd.base.name, fmt(res(zd.base.res)), zd.accent, "+" + fmt(basePerSec()) + "/s"));
  const pg = zd.prestige.gain;
  if ((G.res[pg] || 0) > 0 || (G.prestiges[zd.prestige.id] || 0) > 0)
    chips.push(chip("◍", zd.prestige.gainName, fmtInt(res(pg)), "#f5e9ff", ""));
  if (G.glimmer > 0 || Object.keys(G.cards).length) chips.push(chip("✦", "Glimmer", fmtInt(G.glimmer), "#aef", ""));
  if (G.pressure > 0) chips.push(chip("🜄", "Pressure", "×" + fmt(Math.pow(2, G.pressure)), "#7fe4ff", ""));
  return '<div class="chips">' + chips.join("") + "</div>";
}
function chip(glyph, name, val, color, sub) {
  return '<div class="chip" style="border-color:' + rgba(color, 0.5) + '">' +
    '<span class="chip-g" style="color:' + color + '">' + glyph + '</span>' +
    '<span class="chip-v">' + val + (sub ? '<span class="chip-s" style="color:' + rgba(color, 0.85) + '">' + sub + '</span>' : "") + "</span></div>";
}

// ---------- content ----------
function contentHTML() {
  switch (UI.tab) {
    case "dive": return diveHTML();
    case "reliquary": return reliquaryHTML();
    case "auto": return autoHTML();
    case "descent": return descentHTML();
    case "codex": return codexHTML();
  }
  return "";
}

// ---------- DIVE ----------
function diveHTML() {
  const zd = zoneDef();
  let h = "";
  h += '<div class="zhead"><div class="zd">DEPTH ' + (zd.id + 1) + '</div>' +
       '<div class="zn">' + zd.name + '</div><div class="zb">' + zd.blurb + "</div></div>";
  const growth = Math.min(1, Math.log10(Math.max(1, basePerSec()) + 10) / 9);
  h += '<div class="stage" data-act="tap"><canvas id="creature"></canvas>' +
       '<div class="taphint">' + zd.base.tapName + ' · +' + fmt(tapValue()) + ' ' + zd.base.name + "</div></div>";
  if (G.offlineGain > 0)
    h += '<div class="card off"><b>While you were away</b><div class="sub">Drifted in ' + fmt(G.offlineGain) +
         " " + zd.base.name + " over " + fmtTime(G.offlineSeconds) + '.</div><button data-act="closeoff">Dismiss</button></div>';

  // producers
  h += sect("Life", "🐚");
  for (const p of zd.producers) h += producerHTML(zd, p);

  // ladder
  h += sect(zd.ladder.name, zd.ladder.glyph);
  h += ladderHTML(zd);

  // upgrades (split by currency)
  const baseUp = zd.upgrades.filter(u => u.res === zd.base.res);
  const presUp = zd.upgrades.filter(u => u.res === zd.prestige.gain);
  if (baseUp.length) { h += sect(zd.base.name + " Upgrades", "▲"); for (const u of baseUp) h += upHTML(u); }
  if (presUp.length && ((G.res[zd.prestige.gain] || 0) > 0 || (G.prestiges[zd.prestige.id] || 0) > 0)) {
    h += sect(zd.prestige.gainName + " Upgrades", "◍"); for (const u of presUp) h += upHTML(u);
  }

  // prestige
  h += sect(zd.prestige.name, "🌀");
  h += prestigeHTML(zd);
  return h;
}

function producerHTML(zd, p) {
  const cost = producerCost(p), can = res(p.res) >= cost;
  const yEach = producerYield(p), mult = yEach / p.baseYield;
  let pills = '<span class="pill" style="color:' + zd.accent + '">×' + fmt(mult) + " total</span>";
  return '<div class="card feat">' +
    '<div class="fh"><span class="fg">' + p.glyph + '</span><b>' + p.name + '</b>' +
    '<span class="cnt">×' + fmtInt(prodCount(p.id)) + "</span></div>" +
    '<div class="sub">' + esc(p.desc) + '</div>' +
    '<div class="sub">Each ' + fmt(yEach) + "/s · Total " + fmt(prodCount(p.id) * yEach) + "/s</div>" +
    '<div class="pills">' + pills + "</div>" +
    '<div class="btns"><button class="' + (can ? "on" : "") + '" data-act="buy" data-arg="' + p.id + '">Buy · ' + fmt(cost) + " " + zd.base.name + "</button>" +
    '<button class="alt ' + (can ? "on" : "") + '" data-act="buymax" data-arg="' + p.id + '">Max</button></div></div>';
}

function ladderHTML(zd) {
  const cost = ladderCost(zd), can = res(zd.ladder.res) >= cost, L = lad(zd.ladder.id);
  let pills = '<span class="pill" style="color:' + zd.accent + '">Tap ×' + fmt(1 + zd.ladder.tapPer * L) + "</span>" +
    '<span class="pill" style="color:#7fe4ff">Production ×' + fmt(1 + zd.ladder.prodPer * L) + "</span>";
  if (zd.ladder.cheapenAt && (G.maxLadder[zd.ladder.id] || 0) >= zd.ladder.cheapenAt) {
    const owned = prodCount(zd.ladder.cheapenBy), disc = Math.max(0.35, 1 - 0.02 * Math.sqrt(owned));
    pills += '<span class="pill" style="color:#9be7a6">Cheapened ×' + fmt(disc) + "</span>";
  }
  // next milestone
  let nm = zd.milestones.find(m => m.level > (G.maxLadder[zd.ladder.id] || 0));
  const nmTxt = nm ? "Next: " + zd.ladder.name + " " + nm.level + " — " + nm.title : "All milestones reached";
  return '<div class="card feat">' +
    '<div class="fh"><span class="fg">' + zd.ladder.glyph + '</span><b>' + zd.ladder.name + '</b><span class="cnt">Lv ' + L + "</span></div>" +
    '<div class="sub">Boosts your tap and all production.</div>' +
    '<div class="pills">' + pills + "</div>" +
    '<div class="sub" style="color:' + rgba(zd.accent, 0.9) + '">' + nmTxt + "</div>" +
    '<div class="btns"><button class="' + (can ? "on" : "") + '" data-act="ladder">Raise ' + zd.ladder.name + " · " + fmt(cost) + " " + zd.base.name + "</button></div></div>";
}

function upHTML(u) {
  const lvl = up(u.id), maxed = lvl >= u.cap, cost = upgradeCost(u), can = !maxed && res(u.res) >= cost;
  return '<div class="card row">' +
    '<div class="rl"><div class="rt"><b>' + u.name + '</b> <span class="lv">Lv ' + lvl + "/" + u.cap + "</span></div>" +
    '<div class="sub">' + esc(u.info) + "</div></div>" +
    '<button class="buy ' + (maxed ? "max" : can ? "on" : "") + '" data-act="up" data-arg="' + u.id + '">' +
    (maxed ? "MAX" : fmt(cost)) + "</button></div>";
}

function prestigeHTML(zd) {
  const gain = prestigeGain(zd), can = gain >= 1;
  return '<div class="card prestige">' +
    '<div class="fh"><span class="fg">🌀</span><b>' + zd.prestige.name + '</b></div>' +
    '<div class="sub">' + esc(zd.prestige.desc) + "</div>" +
    '<div class="sub" style="color:' + (can ? "#9be7a6" : "rgba(255,255,255,.5)") + '">' +
    (can ? "Ready — gain " + fmtInt(gain) + " " + zd.prestige.gainName
         : "Earn more this run (" + fmt(G.run[zd.base.res] || 0) + " " + zd.base.name + ")") + "</div>" +
    '<button class="big ' + (can ? "on" : "") + '" data-act="prestige">' + zd.prestige.name +
    " for " + fmtInt(gain) + " " + zd.prestige.gainName + "</button>" +
    '<div class="sub">' + zd.prestige.name + "s: " + (G.prestiges[zd.prestige.id] || 0) + "</div></div>";
}

// ---------- RELIQUARY ----------
function reliquaryHTML() {
  let h = sect("The Reliquary", "🐚");
  const owned = Object.keys(G.cards).length, total = DATA.cards.length;
  // haul panel
  const hc = haulCost(), can = G.glimmer >= hc && unownedCards().length > 0;
  h += '<div class="card prestige"><div class="fh"><span class="fg">✦</span><b>Haul a Specimen</b></div>' +
    '<div class="sub">' + owned + "/" + total + " collected · pity in " + Math.max(0, 12 - G.pity) + " · Glimmer trickles in as you scale.</div>" +
    '<button class="big ' + (can ? "on" : "") + '" data-act="haul">' +
    (unownedCards().length ? "Haul · " + fmtInt(hc) + " Glimmer" : "Collection complete") + "</button></div>";

  // loadout board
  h += sect("Loadout", "🎴");
  h += '<div class="presets">';
  for (let i = 0; i < 3; i++) h += '<button class="pbtn ' + (G.preset === i ? "on" : "") + '" data-act="preset" data-arg="' + i + '">Loadout ' + (i + 1) + "</button>";
  h += "</div>";
  h += '<div class="board">';
  const slots = G.presets[G.preset];
  for (let i = 0; i < 9; i++) {
    if (i >= G.slots) { h += '<div class="slot lock">🔒</div>'; continue; }
    const id = slots[i];
    if (id && DATA.cardMap[id]) { const c = DATA.cardMap[id];
      h += '<div class="slot full" style="border-color:' + rc(c.rarity) + '" data-act="slot" data-arg="' + i + '">' +
        '<span class="cg">' + c.glyph + '</span><span class="cl">Lv' + G.cards[id] + "</span></div>";
    } else h += '<div class="slot">+</div>';
  }
  h += "</div>";
  // aggregate
  const B = newBonus(); applyCards(B);
  h += '<div class="card agg"><b>This loadout grants</b><div class="aggrow">' +
    aggPill("Production", B.gm("prod") * B.gm("all")) + aggPill("Tap", B.gm("tap")) +
    aggPill("Offline", B.gm("offline")) + aggPill("Auto speed", B.gm("autospeed")) + "</div></div>";

  // collection grid by rarity
  h += sect("Collection", "📚");
  for (const r of DATA.rarityOrder) {
    const pool = DATA.cards.filter(c => c.rarity === r);
    const have = pool.filter(c => G.cards[c.id] !== undefined).length;
    h += '<div class="rar" style="color:' + rc(r) + '">' + r.toUpperCase() + " · " + have + "/" + pool.length + "</div>";
    h += '<div class="cgrid">';
    for (const c of pool) {
      const have2 = G.cards[c.id] !== undefined;
      const eq = activeSlots().includes(c.id);
      h += '<div class="ccard ' + (have2 ? "have" : "lock") + (eq ? " eq" : "") + '" style="border-color:' +
        (have2 ? rc(r) : "rgba(255,255,255,.12)") + '" data-act="card" data-arg="' + c.id + '" title="' + esc(c.name) + '">' +
        '<span class="cg">' + (have2 ? c.glyph : "❔") + "</span>" +
        '<span class="cn">' + (have2 ? esc(c.name) : "???") + "</span>" +
        (have2 ? '<span class="cl">Lv' + G.cards[c.id] + (eq ? " ·eq" : "") + "</span>" : "") +
        '<span class="ce">' + (have2 ? cardEffectText(c) : "") + "</span></div>";
    }
    h += "</div>";
  }
  return h;
}
function aggPill(name, v) { return '<span class="pill">' + name + " ×" + fmt(v) + "</span>"; }
function cardEffectText(c) {
  const lvl = G.cards[c.id] || 1; let out = [];
  if (c.parts) for (const p of c.parts(lvl)) {
    const nm = { all: "all", tap: "tap", prod: "prod", offline: "offline", autospeed: "auto" }[p.k] || p.k;
    if (p.b !== undefined) out.push("×" + fmt(1 + p.b) + " " + nm);
    if (p.add !== undefined) out.push("+" + fmt(p.add) + " " + nm);
  }
  if (c.syn) out.push("boosts " + (c.syn.scope === "adj" ? "neighbours" : c.syn.scope === "all" ? "all cards" : c.syn.scope.split(":")[1]));
  return esc(out.join(" · "));
}

// ---------- AUTOMATION ----------
function autoHTML() {
  const zd = zoneDef();
  let h = sect("Automation", "⚙");
  h += '<div class="sub" style="margin:0 4px 8px">Earned, not given. Master a chore, then hand it off.</div>';
  for (const a of zd.auto) {
    const av = a.avail(G), on = !!G.autoOn[a.key];
    h += '<div class="card row"><div class="rl"><div class="rt"><b>' + a.name + "</b></div>" +
      '<div class="sub">' + (av ? esc(a.info) : "Locked — keep progressing this depth.") + "</div>";
    if (a.target && av && on) {
      h += '<div class="stepper">Target: ' + G.auto.ebbTarget + ' <button data-act="tgt" data-arg="-1">−</button><button data-act="tgt" data-arg="1">+</button></div>';
    }
    h += "</div><button class='toggle " + (on ? "on" : "") + "' data-act='auto' data-arg='" + a.key + "' " + (av ? "" : "disabled") + ">" +
      (on ? "ON" : "OFF") + "</button></div>";
  }
  return h;
}

// ---------- DESCENT ----------
function descentHTML() {
  const zd = zoneDef();
  let h = "";
  if (zd.descend) {
    const d = zd.descend, ready = canDescend(zd), next = DATA.zones[d.to];
    h += sect("Descend", "🜄");
    h += '<div class="card prestige"><div class="fh"><span class="fg">🜄</span><b>Descend to ' + next.name + "</b></div>" +
      '<div class="sub">Each Descent permanently multiplies everything (Pressure ×2) and opens a new world with its own life and systems.</div>' +
      '<div class="sub" style="color:' + (ready ? "#9be7a6" : "rgba(255,255,255,.5)") + '">' +
      ((G.maxLadder[zd.ladder.id] || 0) >= d.level
        ? "Need " + fmt(d.cost.amt) + " " + d.cost.res + " (have " + fmt(res(d.cost.res)) + ")"
        : "Reach " + zd.ladder.name + " " + d.level) + "</div>" +
      '<button class="big ' + (ready ? "on" : "") + '" data-act="descend">Descend</button></div>';
  }
  h += sect("The Descent", "🌑");
  for (let i = 0; i < DATA.zones.length; i++) {
    const z = DATA.zones[i], reached = i <= G.maxZone, here = i === G.zone;
    h += '<div class="card zrow ' + (reached ? "" : "lock") + '" style="border-color:' + (reached ? z.accent : "rgba(255,255,255,.1)") + '">' +
      '<div class="zdot" style="background:linear-gradient(' + z.colors[0] + "," + z.colors[1] + ')"></div>' +
      '<div class="rl"><div class="rt"><b>' + (reached ? z.name : "Depth " + (i + 1)) + "</b>" + (here ? ' <span class="here">HERE</span>' : "") + "</div>" +
      '<div class="sub">' + (reached ? esc(z.blurb) : "Descend deeper to reveal this.") + "</div></div></div>";
  }
  h += '<div class="card zrow lock"><div class="zdot" style="background:#111"></div><div class="rl"><div class="rt"><b>Deeper still…</b></div><div class="sub">More depths are coming.</div></div></div>';
  return h;
}

// ---------- CODEX ----------
function codexHTML() {
  let h = '<div class="presets">' +
    '<button class="pbtn ' + (UI.codex === "ach" ? "on" : "") + '" data-act="codex" data-arg="ach">Achievements</button>' +
    '<button class="pbtn ' + (UI.codex === "stats" ? "on" : "") + '" data-act="codex" data-arg="stats">Stats</button>' +
    '<button class="pbtn ' + (UI.codex === "set" ? "on" : "") + '" data-act="codex" data-arg="set">Settings</button></div>';
  if (UI.codex === "ach") {
    const done = DATA.achievements.filter(a => G.ach[a.id]).length;
    h += '<div class="rar">' + done + "/" + DATA.achievements.length + " unlocked</div>";
    for (const a of DATA.achievements) {
      const u = !!G.ach[a.id];
      h += '<div class="card row ' + (u ? "" : "lockc") + '"><div class="rl"><div class="rt"><b>' + (u ? a.name : "???") + "</b></div>" +
        '<div class="sub">' + esc(a.desc) + (a.glimmer ? " · +" + a.glimmer + " Glimmer" : "") + (a.slot ? " · +1 slot" : "") + "</div></div>" +
        '<span class="tick">' + (u ? "✓" : "·") + "</span></div>";
    }
  } else if (UI.codex === "stats") {
    h += statRow("Depth", zoneDef().name);
    h += statRow("Pressure", "×" + fmt(Math.pow(2, G.pressure)));
    h += statRow("Total taps", fmt(G.stats.taps));
    h += statRow("Specimens", Object.keys(G.cards).length + "/" + DATA.cards.length);
    h += statRow("Glimmer", fmtInt(G.glimmer));
    h += statRow("Playtime", fmtTime(G.stats.playtime));
    for (const k in G.prestiges) h += statRow(k + "s", G.prestiges[k]);
  } else {
    h += '<div class="card"><b>Pace</b><div class="diffs">';
    for (const k in DIFFICULTY) h += '<button class="pbtn ' + (G.difficulty === k ? "on" : "") + '" data-act="diff" data-arg="' + k + '">' + DIFFICULTY[k].label + "</button>";
    h += '</div><div class="sub">' + DIFFICULTY[G.difficulty].blurb + "</div></div>";
    h += '<div class="card"><b>Save</b><div class="sub">Autosaves locally, and keeps drifting while away (8h cap).</div>' +
      '<button data-act="save">Save now</button> <button class="danger" data-act="reset">Erase all progress</button></div>';
    h += '<div class="sub" style="text-align:center;opacity:.4">ABYSS · a deep-sea incremental</div>';
  }
  return h;
}
function statRow(k, v) { return '<div class="srow"><span>' + k + "</span><b>" + v + "</b></div>"; }

// ---------- helpers ----------
function sect(t, g) { return '<div class="sect"><span>' + g + "</span>" + t + "</div>"; }
