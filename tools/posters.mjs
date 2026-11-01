#!/usr/bin/env node
// Finds posters on TMDB and stores small copies in dist/posters, so visitors never contact TMDB.
import fs from "node:fs";

const KEY = process.env.TMDB_API_KEY;
if (!KEY) { console.log("No TMDB_API_KEY, skipping posters"); process.exit(0); }
const API = "https://api.themoviedb.org/3", IMG = "https://image.tmdb.org/t/p/w342";
const dir = "dist/shelves", GAP = 220;

let next = 0;
async function api(path, params = {}) {
  const at = Math.max(next, Date.now());
  next = at + GAP;
  if (at > Date.now()) await new Promise(r => setTimeout(r, at - Date.now()));
  const q = new URLSearchParams({ api_key: KEY, language: "de-DE", ...params });
  const r = await fetch(`${API}${path}?${q}`, { signal: AbortSignal.timeout(30e3) }).catch(() => null);
  if (r?.status === 401) throw new Error("TMDB rejected the key");
  return r?.ok ? r.json() : null;
}
const norm = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

async function find(x) {
  if (x.imdb) {
    const d = await api(`/find/${x.imdb}`, { external_source: "imdb_id" });
    const hit = d && [...d.movie_results, ...d.tv_results][0];
    if (hit?.poster_path) return hit.poster_path;
  }
  const d = await api("/search/multi", { query: x.title });
  const hit = d?.results?.find(r => r.poster_path && norm(r.title || r.name || "") === norm(x.title));
  return hit?.poster_path || "";
}

const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json");
const shelves = files.map(f => ({ f, data: JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")) }));
const items = shelves.flatMap(s => s.data.items).filter(x => x.f !== "g");
const seen = new Map();
for (const x of items) {
  const k = x.imdb || norm(x.title);
  if (!seen.has(k)) seen.set(k, await find(x));
  x.poster = seen.get(k);
}
for (const s of shelves) fs.writeFileSync(`${dir}/${s.f}`, JSON.stringify(s.data));

fs.mkdirSync("dist/posters", { recursive: true });
const paths = [...new Set(seen.values())].filter(Boolean);
let saved = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (paths.length) {
    const p = paths.pop();
    const r = await fetch(IMG + p, { signal: AbortSignal.timeout(30e3) }).catch(() => null);
    if (r?.ok) { fs.writeFileSync(`dist/posters${p}`, Buffer.from(await r.arrayBuffer())); saved++; }
  }
}));
console.log(`${items.filter(x => x.poster).length} of ${items.length} films have a poster, ${saved} files saved`);
