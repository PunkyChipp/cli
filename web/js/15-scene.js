/* =====================================================================
   15-scene.js — the window. A tiny pixel painting of Lake Ilse that
   follows the clock and the weather: dawn, dusk, stars, rain, fog,
   snow, the observatory on the far hill, and whatever's on the sill
   in the room you're in. Biscuit too, if she's with you.
   Drawn at a very low resolution and scaled up, so every pixel shows.
   ===================================================================== */
"use strict";

const SC = { cv: null, g: null, w: 120, h: 132, t: 0, drops: [], flakes: [], clouds: [], stars: [], birds: null, last: 0 };

function sceneInit() {
  SC.cv = $("scene");
  if (!SC.cv || !SC.cv.getContext) return;
  SC.g = SC.cv.getContext("2d");
  sceneResize();
  window.addEventListener("resize", sceneResize);
  const r = seeded(42);
  for (let i = 0; i < 70; i++) SC.stars.push({ x: r(), y: r() * 0.55, b: r(), tw: r() * 6 });
  for (let i = 0; i < 6; i++) SC.clouds.push({ x: r() * 1.4 - 0.2, y: 0.05 + r() * 0.3, w: 14 + r() * 22, s: 0.4 + r() * 0.8 });
  requestAnimationFrame(sceneLoop);
}
function sceneResize() {
  const box = SC.cv.getBoundingClientRect();
  if (!box.width) return;
  SC.w = 120;
  SC.h = Math.max(50, Math.round(120 * box.height / box.width));
  SC.cv.width = SC.w; SC.cv.height = SC.h;
}

function sceneLoop(ts) {
  requestAnimationFrame(sceneLoop);
  if (ts - SC.last < 83) return;          // ~12fps is plenty for a window
  const dt = (ts - SC.last) / 1000; SC.last = ts;
  if (document.hidden) return;
  SC.t += Math.min(dt, 0.2);
  try { drawScene(); } catch (e) { /* never let the window break the game */ }
}

/* colour helpers */
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hx(a), B = hx(b); return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"; };
function px(x, y, w, h, c) { SC.g.fillStyle = c; SC.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

/** Sky colours across the day: [top, horizon]. */
function skyCols(m) {
  const keys = [
    [0, "#060a1c", "#111a36"], [300, "#0a1030", "#1c2248"], [360, "#2a2a5a", "#d9826a"], [420, "#4a78b8", "#f4c08a"],
    [540, "#5f9bd6", "#bfe0f0"], [960, "#5c94cc", "#cfe3ee"], [1050, "#4a5c9c", "#f0a060"], [1140, "#2c2458", "#c0607a"],
    [1230, "#0d1232", "#2a2450"], [1440, "#060a1c", "#111a36"]
  ];
  m = ((m % 1440) + 1440) % 1440;
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, t1, h1] = keys[i], [b, t2, h2] = keys[i + 1];
    if (m >= a && m <= b) { const t = (m - a) / (b - a); return [mixc(t1, t2, t), mixc(h1, h2, t)]; }
  }
  return ["#060a1c", "#111a36"];
}

function drawScene() {
  const g = SC.g, W = SC.w, H = SC.h, t = SC.t;
  const w = weatherNow();
  const m = S.min % 1440;
  const night = m >= 1230 || m < 330;
  const r = roomName();
  const outside = ["garden", "dock", "roof"].includes(r);
  const win = $("win");
  if (win) win.classList.toggle("outside", outside);
  const lit = S.flags.lanternLit;
  const horizon = Math.round(H * 0.58);
  const grey = w.cloud * 0.55 + w.fog * 0.3;

  // ---- cellar: no window at all, just the shelf in lamplight ----
  if (r === "cellar") return drawCellar();

  // ---- sky ----
  let [top, hor] = skyCols(m);
  for (let y = 0; y < horizon; y++) {
    let c = mixc(rgbHex(top), rgbHex(hor), y / horizon);
    if (grey > 0) c = mixc(rgbHex(c), night ? "#1a1d26" : "#8a919c", grey);
    px(0, y, W, 1, c);
  }
  // stars
  if ((night || m < 360 || m > 1170) && w.cloud < 0.6) {
    for (const s of SC.stars) {
      const tw = Math.sin(t * 2 + s.tw) * 0.5 + 0.5;
      if (s.b * tw < 0.35) continue;
      px(s.x * W, s.y * horizon, 1, 1, s.b > 0.85 ? "#fff6d8" : "#aab4d8");
    }
    if (cometVisible() && w.cloud < 0.5) { // the comet, low in the west (left)
      const cx = W * 0.18, cy = horizon * 0.42;
      px(cx, cy, 2, 2, "#fff0c0");
      for (let i = 1; i < 12; i++) px(cx + 2 + i, cy - i * 0.35, 1, 1, i < 5 ? "#ffd890" : "#8a7a90");
    }
  }
  // sun / moon on an arc
  const dayT = (m - 360) / (1200 - 360);
  if (dayT > 0 && dayT < 1) {
    const sx = W * (0.1 + dayT * 0.8), sy = horizon - Math.sin(dayT * Math.PI) * horizon * 0.75;
    if (w.cloud < 0.85) { disc(sx, sy, 4, dayT < 0.15 || dayT > 0.85 ? "#ffb070" : "#fff2c0", 0.95 - w.cloud * 0.6); }
  } else {
    const nT = ((m - 1200 + 1440) % 1440) / 600;
    if (nT < 1) {
      const mx = W * (0.15 + nT * 0.7), my = horizon - Math.sin(nT * Math.PI) * horizon * 0.7;
      if (w.cloud < 0.85) { disc(mx, my, 3, "#f0ecd8", 0.9 - w.cloud * 0.5); px(mx + 1, my - 2, 2, 2, mixc(rgbHex(top), "#000000", 0.1)); }
    }
  }
  // clouds
  const cloudCount = Math.round(w.cloud * 6) + 1;
  for (let i = 0; i < cloudCount; i++) {
    const c = SC.clouds[i % SC.clouds.length];
    c.x += c.s * 0.0006 * (1 + w.wind * 3);
    if (c.x > 1.3) c.x = -0.35;
    const cx = c.x * W, cy = c.y * horizon;
    const col = night ? (w.cloud > 0.5 ? "#2a2e3c" : "#1e2236") : mixc("#ffffff", "#8a909c", w.cloud * 0.8);
    blob(cx, cy, c.w, 5 + c.w / 6, col);
  }
  // far hills + observatory (across the lake)
  const hillCol = night ? "#0c1222" : mixc("#30505a", "#6a7a84", grey);
  for (let x = 0; x < W; x++) {
    const hh = 7 + Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19 + 1) * 2 + (x > 70 && x < 100 ? Math.sin((x - 70) / 30 * Math.PI) * 6 : 0);
    px(x, horizon - hh, 1, hh, hillCol);
  }
  const ox = 86, oy = horizon - 18;
  px(ox - 1, oy + 2, 8, 5, night ? "#20283a" : "#d8dcd8");
  disc(ox + 3, oy + 2, 4, night ? "#262e42" : "#eef0ee", 1);
  if (night) px(ox + 3, oy - 1, 1, 4, "#ffd36a");
  // Fenn's hives on the left hill
  if (!night) for (let i = 0; i < 4; i++) px(14 + i * 4, horizon - 10, 2, 2, "#e8e2d0");
  // ---- lake ----
  const lakeTop = mixc(rgbHex(hor), "#0a1830", 0.35), lakeBot = night ? "#04080f" : "#16324a";
  for (let y = horizon; y < H; y++) px(0, y, W, 1, mixc(rgbHex(lakeTop), lakeBot, (y - horizon) / (H - horizon)));
  // shimmer
  const shim = night ? "rgba(200,210,255,0.18)" : "rgba(255,255,255,0.22)";
  for (let i = 0; i < 18; i++) {
    const y = horizon + 2 + ((i * 7.3) % (H - horizon - 4));
    const x = ((i * 37 + t * (6 + i % 3 * 3)) % (W + 20)) - 10;
    px(x, y, 3 + (i % 4), 1, shim);
  }
  // lanterns on the water after Lantern Night (and on the night itself)
  if (lit && (night || m > 1080)) {
    const rr = seeded(7);
    for (let i = 0; i < 22; i++) {
      const lx = rr() * W, ly = horizon + 3 + rr() * (H - horizon) * 0.55;
      const bob = Math.sin(t * 1.4 + i) * 0.6;
      px(lx, ly + bob, 1, 1, "#ffd27a");
      px(lx, ly + 2 + bob, 1, 2, "rgba(255,200,110,0.35)");
    }
  }
  // the occasional heron on the near shore, by day
  if (!night && w.rain === 0 && Math.floor(t / 40) % 3 === 0) heron(10, horizon + 6);
  // birds
  if (!night && !w.rain && (!SC.birds || SC.birds.x > W + 10) && chance(0.004)) SC.birds = { x: -8, y: horizon * (0.2 + Math.random() * 0.3) };
  if (SC.birds) { SC.birds.x += 0.35; const b = SC.birds; for (let i = 0; i < 3; i++) { px(b.x + i * 4, b.y + (i === 1 ? -2 : 0), 1, 1, "#2a2a30"); px(b.x + i * 4 - 1, b.y - 1 + (i === 1 ? -2 : 0), 1, 1, "#2a2a30"); px(b.x + i * 4 + 1, b.y - 1 + (i === 1 ? -2 : 0), 1, 1, "#2a2a30"); } }
  // ---- fog ----
  if (w.fog > 0) {
    for (let i = 0; i < 5; i++) {
      const y = horizon - 12 + i * 9;
      const off = Math.sin(t * 0.2 + i) * 10;
      g.globalAlpha = w.fog * 0.35;
      px(off - 10, y, W + 20, 8, night ? "#3a4050" : "#dfe4e8");
      g.globalAlpha = 1;
    }
  }
  // ---- foreground per room ----
  drawForeground(r, horizon, night);
  // ---- rain / snow ----
  if (w.rain > 0) {
    const n = Math.round(w.rain * 60);
    while (SC.drops.length < n) SC.drops.push({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 2 });
    SC.drops.length = n;
    for (const d of SC.drops) {
      d.y += d.v * 1.6; d.x -= d.v * 0.35 * (0.5 + w.wind);
      if (d.y > H) { d.y = -4; d.x = Math.random() * (W + 20); }
      px(d.x, d.y, 1, 3, night ? "rgba(150,170,210,0.45)" : "rgba(220,230,255,0.55)");
    }
    if (!outside) for (let i = 0; i < 8; i++) px((i * 29 + 7) % W, (i * 53 + Math.floor(t * 4) * 3) % H, 1, 2, "rgba(220,235,255,0.35)"); // drops on the glass
  }
  if (w.snow > 0) {
    while (SC.flakes.length < 50) SC.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 0.2 + Math.random() * 0.5, p: Math.random() * 6 });
    for (const f of SC.flakes) {
      f.y += f.s; f.x += Math.sin(t + f.p) * 0.2;
      if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
      px(f.x, f.y, 1, 1, "#f4f8ff");
    }
  }
  // night: a warm reflection of the room lamp on the glass
  if (night && !outside) { g.globalAlpha = 0.07; px(0, 0, W, H, "#ffb060"); g.globalAlpha = 1; }
}

function rgbHex(c) {
  if (c[0] === "#") return c;
  const m = c.match(/\d+/g).map(Number);
  return "#" + m.slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join("");
}
function disc(cx, cy, r, col, a = 1) {
  SC.g.globalAlpha = a;
  for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y)); px(cx - hw, cy + y, hw * 2 + 1, 1, col); }
  SC.g.globalAlpha = 1;
}
function blob(cx, cy, w, h, col) {
  for (let y = 0; y < h; y++) {
    const k = Math.sin((y + 0.5) / h * Math.PI);
    const ww = w * (0.55 + k * 0.45);
    px(cx - ww / 2 + Math.sin(y * 1.7) * 2, cy + y, ww, 1, col);
  }
}
function heron(x, y) {
  const c = "#4a5058";
  px(x, y, 1, 6, c); px(x + 2, y, 1, 6, c);            // legs
  px(x - 1, y - 5, 5, 4, c);                            // body
  px(x + 3, y - 9, 1, 5, c); px(x + 3, y - 10, 3, 1, c); px(x + 6, y - 10, 2, 1, "#c8a040"); // neck, head, beak
}

/** Biscuit, as a loaf, with a tail that flicks. */
function drawCat(x, y, night) {
  const o = "#e08a3c", d = "#b8622a";
  px(x, y - 5, 11, 5, o);                 // loaf body
  px(x + 1, y - 6, 9, 1, o);
  px(x + 7, y - 9, 6, 5, o);              // head
  px(x + 7, y - 11, 2, 2, o); px(x + 11, y - 11, 2, 2, o);   // ears
  px(x + 8, y - 11, 1, 1, "#f0b8a0"); px(x + 12, y - 11, 1, 1, "#f0b8a0");
  for (let i = 0; i < 3; i++) px(x + 2 + i * 3, y - 5, 1, 4, d);   // stripes
  const blink = Math.floor(SC.t * 1.3) % 9 === 0;
  if (night) { px(x + 8, y - 8, 1, 1, blink ? o : "#c8ff6a"); px(x + 11, y - 8, 1, 1, blink ? o : "#c8ff6a"); }
  else { px(x + 8, y - 7, 1, 1, "#4a2a10"); px(x + 11, y - 7, 1, 1, "#4a2a10"); }
  const flick = Math.sin(SC.t * 2.2) > 0.7 ? -1 : 0;
  px(x - 3, y - 2 + flick, 4, 1, o); px(x - 4, y - 3 + flick, 1, 1, o);   // tail
}
function drawFox(x, y) {
  const o = "#d8642a";
  px(x, y - 4, 8, 3, o); px(x + 7, y - 7, 4, 4, o); px(x + 7, y - 8, 1, 1, o); px(x + 10, y - 8, 1, 1, o);
  px(x + 10, y - 5, 2, 1, "#f4e8d8"); px(x - 4, y - 4, 4, 2, o); px(x - 5, y - 4, 1, 1, "#f4e8d8");
  px(x + 1, y - 1, 1, 2, "#3a2418"); px(x + 6, y - 1, 1, 2, "#3a2418");
  px(x + 9, y - 6, 1, 1, "#ffe080");
}

function sill(y, H, W) {
  px(0, y, W, H - y, "#5a3e28");
  px(0, y, W, 1, "#7a5a3c");
  px(0, y + 1, W, 1, "#6b4b31");
}

function drawForeground(r, horizon, night) {
  const W = SC.w, H = SC.h, t = SC.t;
  const sy = H - 9;
  const catOn = catHere();
  if (r === "garden") {
    // grass, a raised bed edge, the fox at dusk
    for (let x = 0; x < W; x++) { const gh = 6 + Math.sin(x * 0.9) * 2 + Math.sin(x * 0.31 + t) * 1; px(x, H - gh, 1, gh, night ? "#14261a" : "#3e6a34"); }
    px(4, H - 10, 40, 4, "#6a4a2c");
    S.plots.slice(0, 3).forEach((p, i) => { if (p.crop) { px(10 + i * 12, H - 14, 1, 4, "#5aa040"); px(9 + i * 12, H - 15, 3, 1, stageOf(p) === 3 ? "#e0a040" : "#6ac050"); } });
    if ((isNight() || isEvening()) && Math.floor(t / 20) % 2 === 0) drawFox(W - 30, H - 3);
    if (catOn) drawCat(56, H - 4, night);
    return;
  }
  if (r === "dock") {
    // dock boards running out, the lantern post
    for (let i = 0; i < 6; i++) px(30 + i * 2, H - 6 - i * 2, W - 60 - i * 4, 2, i % 2 ? "#6b5038" : "#7a5c40");
    const lx = W / 2 + 18, ly = H - 34;
    px(lx, ly, 2, 22, "#2a2420");
    px(lx - 2, ly - 6, 6, 6, "#2a2420");
    if (S.flags.lanternLit) { disc(lx + 1, ly - 3, 6, "#ffcf6a", 0.25 + Math.sin(t * 3) * 0.05); px(lx - 1, ly - 5, 4, 4, "#ffe6a0"); }
    else px(lx - 1, ly - 5, 4, 4, "#3a4450");
    if (catOn) drawCat(36, H - 9, night);
    return;
  }
  if (r === "roof") {
    px(0, H - 8, W, 8, "#3a3030");
    for (let x = 0; x < W; x += 6) px(x, H - 14, 1, 6, "#2a2424");
    px(0, H - 14, W, 1, "#2a2424");
    // telescope
    px(W - 30, H - 24, 2, 16, "#2a2424"); px(W - 34, H - 8, 10, 1, "#2a2424");
    px(W - 40, H - 30, 16, 4, "#c8a050"); px(W - 42, H - 31, 3, 6, "#a88040");
    if (catOn) drawCat(12, H - 8, night);
    return;
  }
  // indoors: a windowsill with things on it
  sill(sy, H, W);
  if (r === "kitchen") {
    // kettle
    px(14, sy - 9, 12, 9, "#eadfc8"); px(16, sy - 11, 8, 2, "#eadfc8"); px(19, sy - 13, 2, 2, "#2e6a4a"); px(26, sy - 7, 4, 2, "#eadfc8"); px(14, sy - 2, 12, 1, "#2e6a4a");
    if (teaWarm()) steam(20, sy - 15);
    // jars
    for (let i = 0; i < 3; i++) { px(70 + i * 9, sy - 8, 6, 8, ["#b8484a", "#7a3a6a", "#d8a040"][i]); px(70 + i * 9, sy - 9, 6, 1, "#e8e0d0"); }
  } else if (r === "parlour") {
    // a candle and the orange glow of the stove from below
    px(20, sy - 8, 3, 8, "#f0e4c0"); px(21, sy - 10, 1, 2, "#ffcf6a");
    if (fireLit()) { SC.g.globalAlpha = 0.18 + Math.sin(t * 6) * 0.04; px(0, sy - 30, W, 30, "#ff8a30"); SC.g.globalAlpha = 1; }
    px(90, sy - 12, 4, 12, "#6a4a8a"); px(95, sy - 10, 4, 10, "#3a6a8a"); px(100, sy - 13, 3, 13, "#8a3a3a");  // books
  } else if (r === "study") {
    px(16, sy - 8, 8, 8, "#d8d0c0"); px(24, sy - 6, 2, 4, "#d8d0c0");   // mug
    if (teaWarm()) steam(19, sy - 11);
    px(84, sy - 4, 20, 4, "#eae4d4"); px(86, sy - 6, 16, 2, "#f4eee0");  // paper stack
  } else if (r === "greenhouse") {
    for (let i = 0; i < 3; i++) {
      const p = S.gh[i];
      const x = 16 + i * 34;
      px(x, sy - 8, 12, 8, "#b8643a"); px(x - 1, sy - 9, 14, 2, "#c8744a");
      if (p.crop) {
        const st = stageOf(p);
        px(x + 5, sy - 9 - st * 3, 2, st * 3 + 1, "#5aa040");
        if (st === 3) disc(x + 6, sy - 13 - 6, 3, p.crop === "moonflower" ? (night ? "#cfe8ff" : "#8aa0b0") : "#e0a040", 1);
      }
    }
  } else if (r === "attic") {
    if (S.flags.atticLit) { disc(100, sy - 6, 5, "#ffcf6a", 0.35); px(98, sy - 8, 4, 8, "#c8a050"); }
  } else if (r === "hall") {
    px(80, sy - 14, 6, 14, "#2a2a2a"); px(78, sy - 15, 10, 1, "#2a2a2a"); px(81, sy - 18, 4, 3, "#e0b040");  // the duck umbrella (sort of)
  }
  if (catOn) drawCat(44, sy, night);
}
function steam(x, y) {
  for (let i = 0; i < 6; i++) {
    const yy = y - ((SC.t * 6 + i * 3) % 14);
    const xx = x + Math.sin(SC.t * 2 + i) * 2;
    SC.g.globalAlpha = 0.5 * (1 - ((SC.t * 6 + i * 3) % 14) / 14);
    px(xx, yy, 1, 2, "#ffffff");
  }
  SC.g.globalAlpha = 1;
}
function drawCellar() {
  const W = SC.w, H = SC.h;
  px(0, 0, W, H, "#120c08");
  disc(W / 2, 8, 22, "#3a2614", 0.6);
  px(W / 2, 0, 1, 8, "#555"); px(W / 2 - 1, 8, 3, 3, "#ffe0a0");
  for (let s = 0; s < 3; s++) {
    const y = 30 + s * 28;
    if (y > H - 10) break;
    px(6, y, W - 12, 2, "#5a3e28");
    for (let i = 0; i < 9; i++) px(10 + i * 11, y - 8, 7, 8, ["#8a2a3a", "#5a2a5a", "#a8503a", "#6a2a2a"][(i + s) % 4]);
  }
  // the humming beige box
  const by = H - 22;
  px(W - 44, by, 34, 18, "#c8bc9c"); px(W - 42, by + 3, 6, 2, Math.floor(SC.t * 2) % 2 ? "#7dff5c" : "#3a8a2a");
  if (catHere()) drawCat(W - 38, by, false);
}
