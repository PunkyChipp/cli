/* =====================================================================
   00-util.js — small helpers everyone uses.
   ===================================================================== */
"use strict";

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pad = (s, n, ch = " ") => { s = String(s); while (s.length < n) s += ch; return s; };
const padL = (s, n, ch = " ") => { s = String(s); while (s.length < n) s = ch + s; return s; };
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));

/** Deterministic pseudo-random from a seed (mulberry32). Same day -> same weather. */
function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Escape anything the player typed before it goes near innerHTML. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
}

/** Strip our {tag:text} markup, for pipes and grep. */
function plain(s) {
  let prev;
  s = String(s);
  do { prev = s; s = s.replace(/\{(\w+):([^{}]*)\}/g, "$2"); } while (s !== prev);
  return s.replace(/&#123;/g, "{").replace(/&#125;/g, "}").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** Levenshtein distance — for "did you mean ...?" */
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function closest(word, list, max = 2) {
  let best = null, bd = 99;
  for (const w of list) { const d = lev(word, w); if (d < bd) { bd = d; best = w; } }
  return bd <= max ? best : null;
}

/** 7:05 -> "7:05am". Minutes since midnight in, string out. */
function clock(min) {
  min = ((Math.floor(min) % 1440) + 1440) % 1440;
  let h = Math.floor(min / 60), m = min % 60;
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return h + ":" + padL(m, 2, "0") + ap;
}

/** Split a command line into words, respecting "quotes" and 'quotes'. */
function words(line) {
  const out = []; let cur = "", q = null, had = false;
  for (const ch of line) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; had = true; continue; }
    if (/\s/.test(ch)) { if (cur || had) out.push(cur); cur = ""; had = false; continue; }
    cur += ch;
  }
  if (cur || had) out.push(cur);
  return out;
}

const wait = ms => new Promise(r => setTimeout(r, ms));
