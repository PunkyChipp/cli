/* ABYSS — canvas rendering (ambient background + the central creature). */

function hexToRgb(h) {
  h = h.replace("#", "");
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function rgba(h, a) { const c = hexToRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

// deterministic particle fields
function mkField(n, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ x: rnd(), y: rnd(), sp: 0.15 + rnd() * 0.6, ph: rnd() * 6.283, sz: 1.2 + rnd() * 2.8, warm: rnd() > 0.5 });
  return arr;
}
const SNOW = mkField(80, 4011);
const MOTES = mkField(90, 90125);
const JELLY = mkField(5, 7);

function glowDot(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function drawBackground(ctx, w, h, t) {
  const z = zoneDef();
  // gradient water column
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, z.colors[0]); grad.addColorStop(1, z.colors[1]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // deepen bottom
  const dg = ctx.createLinearGradient(0, h * 0.3, 0, h);
  dg.addColorStop(0, "rgba(0,0,0,0)"); dg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = dg; ctx.fillRect(0, 0, w, h);

  // god-rays
  if (z.light > 0.3) {
    for (let i = 0; i < 5; i++) {
      const x = w * (0.08 + 0.21 * i) + Math.sin(t * 0.15 + i) * 26;
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.85);
      g.addColorStop(0, rgba(z.glow2, 0.10 * z.light)); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x + 60, -40);
      ctx.lineTo(x + 170, h * 0.85); ctx.lineTo(x + 40, h * 0.85); ctx.closePath(); ctx.fill();
    }
  }

  // empire motes: density tracks producers owned in this zone
  let owned = 0; for (const p of z.producers) owned += (G.prod[p.id] || 0);
  const shown = Math.min(MOTES.length, Math.floor(6 + Math.log10(owned + 1) * 26));
  for (let i = 0; i < shown; i++) {
    const f = MOTES[i];
    let px = (f.x + Math.sin(t * f.sp + f.ph) * 0.04) % 1; if (px < 0) px += 1;
    let py = (f.y + Math.cos(t * f.sp * 0.6 + f.ph) * 0.05) % 1; if (py < 0) py += 1;
    const x = px * w, y = py * h, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.2 + f.ph));
    glowDot(ctx, x, y, f.sz * 3.2, f.warm ? z.glow2 : z.accent, 0.5 * tw);
    glowDot(ctx, x, y, f.sz, "#ffffff", 0.5 * tw);
  }

  // marine snow
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (const f of SNOW) {
    let dy = (f.y + t * 0.012 * (0.5 + f.sp)) % 1;
    let dx = (f.x + Math.sin(t * 0.1 + f.ph) * 0.02) % 1; if (dx < 0) dx += 1;
    ctx.fillRect(dx * w, dy * h, f.sz, f.sz);
  }

  // jellyfish
  for (let i = 0; i < JELLY.length; i++) {
    const f = JELLY[i];
    let x = (f.x + Math.sin(t * 0.05 + f.ph) * 0.06) % 1; if (x < 0) x += 1;
    let y = (f.y - t * 0.006 * (0.5 + f.sp)) % 1; if (y < 0) y += 1;
    const cx = x * w, cy = y * h, pulse = 1 + 0.12 * Math.sin(t * 1.1 + i);
    const col = i % 2 === 0 ? z.accent : z.glow2;
    glowDot(ctx, cx, cy, 32 * pulse, col, 0.10);
    glowDot(ctx, cx, cy, 13, col, 0.22);
    ctx.strokeStyle = rgba(col, 0.16); ctx.lineWidth = 1.4;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath(); const tx = cx - 12 + k * 6;
      ctx.moveTo(tx, cy + 6);
      ctx.quadraticCurveTo(tx + 8, cy + 22, tx + Math.sin(t + k) * 6, cy + 42); ctx.stroke();
    }
  }
}

function drawCreature(ctx, w, h, t, growth) {
  const z = zoneDef(), cx = w / 2, cy = h / 2;
  const g = Math.max(0.05, Math.min(1, growth));
  const arms = 7 + Math.floor(g * 13);
  const maxLen = Math.min(w, h) * 0.42;
  const pulse = 1 + 0.05 * Math.sin(t * 1.7);
  let s = 99; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < arms; i++) {
    const ang = (i / arms) * 6.2832 + rnd() * 0.2;
    const len = maxLen * (0.55 + rnd() * 0.45) * pulse;
    const a = ang + Math.sin(t * (0.5 + rnd() * 0.6) + i) * 0.22;
    const tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len;
    const col = i % 3 === 0 ? z.glow2 : z.accent;
    ctx.strokeStyle = rgba(col, 0.5 + 0.4 * g); ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a - 0.5) * len * 0.5, cy + Math.sin(a - 0.5) * len * 0.5, tx, ty);
    ctx.stroke();
    glowDot(ctx, tx, ty, 7, col, 0.85);
  }
  glowDot(ctx, cx, cy, maxLen * 0.5, z.accent, 0.20);
  glowDot(ctx, cx, cy, 30 * pulse, z.accent, 0.6);
  glowDot(ctx, cx, cy, 14 * pulse, "#ffffff", 0.9);
}
