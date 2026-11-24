/* =====================================================================
   03-audio.js — every sound is made right here with WebAudio.
   No audio files: rain is filtered noise, the kettle is a sine wave
   having a moment, and the radio jazz is a tiny chord machine.
   ===================================================================== */
"use strict";

const A = { ctx: null, master: null, rain: null, rainG: null, wind: null, windG: null, noise: null, radio: null, radioG: null, staticG: null, nextChord: 0, chordI: 0, nextOwl: 0, nextPop: 0 };

function audioWake() {
  if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { A.ctx = new AC(); } catch (e) { return; }
  const c = A.ctx;
  A.master = c.createGain(); A.master.gain.value = S.sound ? 0.8 : 0; A.master.connect(c.destination);

  // two seconds of brown-ish noise, reused for rain, wind, static, splashes
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2 + w * 0.08; }
  A.noise = buf;

  const loop = (freq, q, type) => {
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type || "lowpass"; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(A.master); s.start();
    return { s, f, g };
  };
  const r = loop(1400, 0.4); A.rainG = r.g; A.rain = r;
  const w = loop(380, 2.5, "bandpass"); A.windG = w.g; A.wind = w;
  const st = loop(3000, 0.8, "highpass"); A.staticG = st.g;
  A.radioG = c.createGain(); A.radioG.gain.value = 0; A.radioG.connect(A.master);
}

function setSound(on) {
  S.sound = on;
  if (A.master) A.master.gain.setTargetAtTime(on ? 0.8 : 0, A.ctx.currentTime, 0.2);
}

function tone(freq, dur, type = "sine", vol = 0.15, when = 0, glideTo = null) {
  if (!A.ctx || !S.sound) return;
  const c = A.ctx, t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
}
function burst(dur, freq, vol = 0.2, when = 0, type = "bandpass") {
  if (!A.ctx || !S.sound) return;
  const c = A.ctx, t = c.currentTime + when;
  const s = c.createBufferSource(); s.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}

function sfx(name) {
  if (!A.ctx || !S.sound) return;
  switch (name) {
    case "key": burst(0.035, rand(1800, 2600), 0.09); tone(rand(140, 180), 0.04, "triangle", 0.04); break;
    case "enter": burst(0.06, 1200, 0.14); tone(110, 0.07, "triangle", 0.06); break;
    case "tick": burst(0.02, rand(2500, 3400), 0.03); break;
    case "bonk": tone(150, 0.12, "square", 0.04, 0, 90); break;
    case "chime": tone(880, 0.9, "sine", 0.09); tone(1318, 1.1, "sine", 0.06, 0.12); tone(1760, 1.4, "sine", 0.035, 0.24); break;
    case "mail": tone(660, 0.4, "triangle", 0.08); tone(990, 0.6, "triangle", 0.06, 0.15); break;
    case "plip": tone(900, 0.18, "sine", 0.1, 0, 500); break;
    case "splash": burst(0.5, 900, 0.25); burst(0.3, 2200, 0.1, 0.05); break;
    case "reel": for (let i = 0; i < 10; i++) burst(0.02, 3000, 0.05, i * 0.04); break;
    case "kettle": tone(1200, 2.4, "sine", 0.05, 0.3, 2100); tone(1800, 2.0, "sine", 0.02, 0.6, 2600); burst(1.5, 5000, 0.05, 0, "highpass"); break;
    case "pour": for (let i = 0; i < 8; i++) burst(0.12, rand(500, 900), 0.06, i * 0.08); break;
    case "purr": for (let i = 0; i < 14; i++) tone(rand(24, 30), 0.09, "sawtooth", 0.05, i * 0.1); break;
    case "page": burst(0.18, 4200, 0.06, 0, "highpass"); break;
    case "door": tone(180, 0.5, "sawtooth", 0.025, 0, 120); burst(0.12, 300, 0.12, 0.45, "lowpass"); break;
    case "dig": burst(0.12, 400, 0.18); burst(0.12, 350, 0.14, 0.18); break;
    case "water": for (let i = 0; i < 12; i++) burst(0.08, rand(2000, 4000), 0.04, i * 0.06); break;
    case "crackle": burst(0.03, rand(1500, 3500), rand(0.04, 0.12)); break;
    case "chop": burst(0.08, 700, 0.3); tone(90, 0.12, "triangle", 0.1); break;
    case "boot": tone(60, 0.6, "sawtooth", 0.05, 0, 40); tone(1000, 0.08, "square", 0.03, 0.7); break;
    case "beep": tone(1000, 0.09, "square", 0.04); break;
    case "fanfare": [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.9, "triangle", 0.07, i * 0.16)); break;
    case "owl": tone(410, 0.35, "sine", 0.05, 0, 380); tone(400, 0.6, "sine", 0.05, 0.5, 360); break;
  }
}

/* ---------- radio jazz: a slow ii–V–I machine with a soft Rhodes-ish voice ---------- */
const CHORDS = [
  [62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67],
  [62, 65, 69, 72], [55, 59, 62, 65], [64, 67, 71, 74], [57, 61, 64, 67]
];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rhodes(m, t, dur, vol) {
  const c = A.ctx;
  for (const [mul, v] of [[1, 1], [2, 0.18], [3, 0.05]]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = mtof(m) * mul;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.radioG); o.start(t); o.stop(t + dur + 0.1);
  }
}
function radioTick() {
  if (!A.ctx || S.flags.radioOn !== "88.8") return;
  const c = A.ctx;
  if (c.currentTime < A.nextChord - 0.2) return;
  const t = Math.max(c.currentTime + 0.05, A.nextChord);
  const ch = CHORDS[A.chordI++ % CHORDS.length];
  ch.forEach((m, i) => rhodes(m, t + i * 0.03, 3.4, 0.05));
  rhodes(ch[0] - 24, t, 2.6, 0.08);
  // a lazy little melody note now and then
  if (chance(0.7)) rhodes(ch[randi(1, 3)] + 12, t + rand(0.6, 1.6), 1.6, 0.04);
  if (chance(0.4)) rhodes(ch[randi(0, 3)] + 12, t + rand(1.8, 2.6), 1.4, 0.035);
  A.nextChord = t + 3.2;
}

/* ---------- ambience, called about once a second ---------- */
function ambience() {
  if (!A.ctx) return;
  const c = A.ctx, t = c.currentTime;
  const w = weatherNow();
  const outside = ["garden", "dock", "roof"].includes(roomName());
  const rainy = w.rain * (outside ? 1 : 0.45);
  A.rainG.gain.setTargetAtTime(rainy * 0.35, t, 1.5);
  A.rain.f.frequency.setTargetAtTime(outside ? 2200 : 900, t, 1);
  A.windG.gain.setTargetAtTime(w.wind * (outside ? 0.25 : 0.08), t, 2);
  A.wind.f.frequency.setTargetAtTime(300 + Math.sin(t * 0.3) * 120, t, 1);
  const on = S.flags.radioOn;
  A.radioG.gain.setTargetAtTime(on === "88.8" ? 0.9 : 0, t, 0.4);
  A.staticG.gain.setTargetAtTime(on && on !== "88.8" && on !== "101.3" && on !== "93.1" && on !== "104.5" ? 0.04 : 0, t, 0.3);
  radioTick();
  // the stove crackles if it's lit and you're near it
  if (fireLit() && roomName() === "parlour" && t > A.nextPop) { for (let i = 0; i < randi(1, 4); i++) sfx("crackle"); A.nextPop = t + rand(0.2, 1.4); }
  // owls, but only at night and only sometimes
  if (isNight() && t > A.nextOwl) { if (chance(0.25)) sfx("owl"); A.nextOwl = t + rand(25, 70); }
}
