/* =====================================================================
   05-fs.js — the cottage is a filesystem. Rooms are directories, notes
   are files, the cat is a process. Wren wired it up that way in 1987
   and nobody has had the heart to change it.

   A node looks like:
     { kind: "dir",  desc, kids: {...} | () => ({...}), lock?, dark?, when?, room? }
     { kind: "file", text: "..." | () => "...", item?, when?, onRead?, owner?, exec? }
   ===================================================================== */
"use strict";

const D = (desc, kids = {}, o = {}) => Object.assign({ kind: "dir", desc, kids }, o);
const F = (text, o = {}) => Object.assign({ kind: "file", text }, o);
const HOME = "/cottage";
let ROOT = D("", {});            // filled in by 06-content.js

function resolve(p) {
  if (p == null || p === "") return S.cwd;
  if (p === "-") return S.prevCwd || S.cwd;
  if (p === "~") p = HOME;
  else if (p.startsWith("~/")) p = HOME + p.slice(1);
  const abs = p.startsWith("/") ? p : S.cwd + "/" + p;
  const out = [];
  for (const part of abs.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop(); else out.push(part);
  }
  return "/" + out.join("/");
}

const val = (x, ...a) => (typeof x === "function" ? x(...a) : x);
const visible = (path, node) => node && !S.taken[path] && (!node.when || node.when());

/** All the children of a directory (including files the player wrote). */
function children(path, all = false) {
  const node = nodeAt(path);
  if (!node || node.kind !== "dir") return {};
  const base = path === "/" ? "" : path;
  const kids = Object.assign({}, val(node.kids) || {});
  for (const fp of Object.keys(S.files)) {
    const i = fp.lastIndexOf("/");
    if ((fp.slice(0, i) || "/") === path) kids[fp.slice(i + 1)] = F(() => S.files[fp], { owner: "you", user: true, exec: fp.endsWith(".sh") });
  }
  const out = {};
  for (const [n, ch] of Object.entries(kids)) {
    if (!all && n.startsWith(".")) continue;
    if (!visible(base + "/" + n, ch)) continue;
    out[n] = ch;
  }
  return out;
}

function nodeAt(path) {
  if (path === "/") return ROOT;
  const parts = path.split("/").filter(Boolean);
  let node = ROOT, cur = "";
  for (const part of parts) {
    if (!node || node.kind !== "dir") return null;
    const kids = val(node.kids) || {};
    let next = kids[part];
    const fp = cur + "/" + part;
    if (!next && S.files[fp] != null) next = F(() => S.files[fp], { owner: "you", user: true, exec: fp.endsWith(".sh") });
    if (!visible(fp, next)) return null;
    node = next; cur = fp;
  }
  return node;
}

const isDir = p => { const n = nodeAt(p); return n && n.kind === "dir"; };
const lockMsg = p => { const n = nodeAt(p); return n && n.lock ? n.lock() : null; };
const isDark = p => { const n = nodeAt(p); return !!(n && n.dark && n.dark()); };

/** Find something by name in the current room (for take/use/look). Forgiving about extensions. */
function findHere(name, where = S.cwd) {
  if (!name) return null;
  name = name.replace(/\/$/, "");
  const kids = children(where, true);
  if (kids[name]) return { name, path: (where === "/" ? "" : where) + "/" + name, node: kids[name] };
  const lower = name.toLowerCase();
  for (const [n, node] of Object.entries(kids)) {
    const stem = n.toLowerCase().replace(/^\./, "").replace(/\.(txt|dsk|card|book|log|sh|note)$/, "").replace(/_/g, " ");
    if (stem === lower || stem === lower.replace(/_/g, " ") || stem.split(" ").includes(lower)) {
      return { name: n, path: (where === "/" ? "" : where) + "/" + n, node };
    }
  }
  return null;
}

/** Read a file's text, marking it read and running any onRead side effects. */
function readFile(path) {
  const node = nodeAt(path);
  if (!node || node.kind !== "file") return null;
  const text = val(node.text);
  const first = !S.read[path];
  S.read[path] = true;
  if (node.onRead) node.onRead(first);
  return text;
}

function perm(node) {
  if (node.kind === "dir") return node.lock && node.lock() ? "d---------" : "drwxr-xr-x";
  if (node.exec) return "-rwxr-xr-x";
  return node.user ? "-rw-r--r--" : "-rw-r--r--";
}
function sizeOf(node) {
  if (node.kind === "dir") return 4096;
  const t = val(node.text);
  return t ? plain(t).length : 0;
}

/** Make a path the player is allowed to write to. */
function writable(path) {
  const dir = path.slice(0, path.lastIndexOf("/")) || "/";
  if (!dir.startsWith(HOME)) return "only inside the cottage. (" + dir + " belongs to the machine.)";
  if (!isDir(dir)) return "there's no " + dir + ".";
  const existing = nodeAt(path);
  if (existing && !existing.user) return "that's one of Wren's. you'd never write over one of Wren's.";
  if (isDark(dir)) return "you can't write in the dark.";
  return null;
}
