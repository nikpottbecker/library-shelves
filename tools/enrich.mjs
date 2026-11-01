#!/usr/bin/env node
// Adds IMDb ids, ratings and genres to dist/shelves. Uses IMDb's public non-commercial datasets.
import fs from "node:fs";
import readline from "node:readline";
import { Readable } from "node:stream";
import zlib from "node:zlib";

const BASE = process.env.IMDB_BASE || "https://datasets.imdbws.com/";
const REGIONS = new Set(["DE", "AT", "CH", "XWW", "US", "GB", "\\N"]);
const TYPES = new Set(["movie", "tvMovie", "tvSeries", "tvMiniSeries", "video"]);

const norm = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/&/g, " und ").replace(/[^a-z0-9]+/g, " ").trim();
const short = s => s.split(/\s+[-–:]\s+|:\s/)[0];

async function* rows(name) {
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(`${r.status} from ${name}`);
  const lines = readline.createInterface({ input: Readable.fromWeb(r.body).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let first = true;
  for await (const line of lines) {
    if (first) { first = false; continue; }
    yield line.split("\t");
  }
}

const dir = "dist/shelves";
const shelves = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json").map(f => ({ f, data: JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")) }));
const items = shelves.flatMap(s => s.data.items).filter(x => x.f !== "g");
const names = new Map();
for (const x of items) for (const t of [x.title, short(x.title)]) { const n = norm(t); if (n && !names.has(n)) names.set(n, new Set()); }

for await (const [id, , title, region] of rows("title.akas.tsv.gz")) {
  if (!REGIONS.has(region)) continue;
  names.get(norm(title))?.add(id);
}
const films = new Map();
const wanted = new Set([...names.values()].flatMap(s => [...s]));
for await (const [id, type, primary, original, , start, , , genres] of rows("title.basics.tsv.gz")) {
  if (!TYPES.has(type)) continue;
  for (const t of [primary, original]) names.get(norm(t))?.add(id);
  if (wanted.has(id) || names.has(norm(primary)) || names.has(norm(original)))
    films.set(id, { id, year: +start || 0, genres: genres === "\\N" ? [] : genres.split(","), rating: 0, votes: 0 });
}
for await (const [id, rating, votes] of rows("title.ratings.tsv.gz")) {
  const film = films.get(id);
  if (film) { film.rating = +rating; film.votes = +votes; }
}

function best(x) {
  for (const t of [x.title, short(x.title)]) {
    const fits = [...(names.get(norm(t)) || [])].map(id => films.get(id)).filter(f => f && f.votes && (!x.disc || !f.year || f.year <= x.disc + 1));
    if (fits.length) return fits.sort((a, b) => b.votes - a.votes)[0];
  }
  return null;
}
let matched = 0;
for (const x of items) {
  const film = best(x);
  if (!film) { delete x.imdb; continue; }
  Object.assign(x, { imdb: film.id, rating: film.rating, votes: film.votes, genres: film.genres, year: film.year });
  matched++;
}
for (const s of shelves) fs.writeFileSync(`${dir}/${s.f}`, JSON.stringify(s.data));
console.log(`${matched} of ${items.length} films matched`);
