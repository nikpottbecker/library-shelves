#!/usr/bin/env node
// Adds IMDb ids, ratings and genres to dist/shelves. Uses IMDb's public non-commercial datasets.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const BASE = process.env.IMDB_BASE || "https://datasets.imdbws.com/";
const REGIONS = new Set(["DE", "AT", "CH", "XWW", "US", "GB", "\\N"]);
const TYPES = new Set(["movie", "tvMovie", "tvSeries", "tvMiniSeries", "video"]);

export const norm = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/&/g, " und ").replace(/[^a-z0-9]+/g, " ").trim();
export const short = s => s.split(/\s+[-–:]\s+|:\s/)[0];

export function titleKeys(items) {
  const names = new Map();
  for (const x of items) for (const t of [x.title, short(x.title)]) {
    const n = norm(t);
    if (n && !names.has(n)) names.set(n, new Map());
  }
  return names;
}

export function addTitle(names, id, title, source) {
  const hits = names.get(norm(title));
  if (!hits) return;
  const sources = hits.get(id) || new Set();
  sources.add(source);
  hits.set(id, sources);
}

export function best(x, names, films) {
  const full = norm(x.title);
  const cut = norm(short(x.title));
  const disc = Number(x.disc) || 0;
  const find = (key, fallback) => [...(names.get(key) || [])].flatMap(([id, sources]) => {
    const film = films.get(id);
    if (!film || !film.votes) return [];
    const gap = disc && film.year ? disc - film.year : null;
    if (gap !== null && gap < -1) return [];
    const direct = !fallback && (sources.has("main") || sources.has("de"));
    const titleScore = direct ? 6 : fallback ? 0 : 2;
    const yearScore = gap === null ? 0 : gap <= 3 ? 3 : gap <= 10 ? 2 : gap <= 20 ? 1 : 0;
    const voteScore = film.votes >= 100000 ? 3 : film.votes >= 10000 ? 2 : film.votes >= 1000 ? 1 : 0;
    return [{ film, direct, gap, score: titleScore + yearScore + voteScore }];
  });
  let fits = find(full, false);
  const fallback = !fits.length && cut !== full;
  if (fallback) fits = find(cut, true);
  if (!fits.length) return null;
  fits.sort((a, b) => b.score - a.score || b.film.votes - a.film.votes || a.film.id.localeCompare(b.film.id));
  const winner = fits[0];
  const closeYear = f => f.gap !== null && f.gap >= -1 && f.gap <= 3;
  // A same-named title only makes a match doubtful if it is a real rival: released near the disc, or not far behind in votes.
  const rivals = fits.filter(f => f !== winner && f.direct && f.film.votes >= 100 && (!closeYear(winner) || closeYear(f)));
  const ambiguous = rivals.some(f => f.film.votes * 5 > winner.film.votes);
  const part = /\b(staffel|season|teil\s*(?:\d+|[ivx]+)|part\s*(?:\d+|[ivx]+)|folge\s*\d+|episode\s*\d+)\b/i.test(x.title + " " + (x.sub || ""));
  const high = winner.direct && !ambiguous && !part && winner.film.votes >= (closeYear(winner) ? 100 : 1000)
    && winner.film.year > 0 && (!disc || winner.gap <= 20);
  return { film: winner.film, match: high ? "high" : "low" };
}

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

async function main() {
  const dir = "dist/shelves";
  const shelves = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json").map(f => ({ f, data: JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")) }));
  const items = shelves.flatMap(s => s.data.items).filter(x => x.f !== "g");
  const names = titleKeys(items);

  for await (const [id, , title, region, language] of rows("title.akas.tsv.gz")) {
    if (!REGIONS.has(region) && language !== "de") continue;
    const german = ["DE", "AT", "CH"].includes(region) || language === "de";
    addTitle(names, id, title, german ? "de" : "other");
  }
  const films = new Map();
  const wanted = new Set([...names.values()].flatMap(hits => [...hits.keys()]));
  for await (const [id, type, primary, original, , start, , , genres] of rows("title.basics.tsv.gz")) {
    if (!TYPES.has(type)) continue;
    if (!wanted.has(id) && !names.has(norm(primary)) && !names.has(norm(original))) continue;
    addTitle(names, id, primary, "main");
    addTitle(names, id, original, "main");
    films.set(id, { id, type, year: +start || 0, genres: genres === "\\N" ? [] : genres.split(","), rating: 0, votes: 0 });
  }
  for await (const [id, rating, votes] of rows("title.ratings.tsv.gz")) {
    const film = films.get(id);
    if (film) { film.rating = +rating; film.votes = +votes; }
  }

  let matched = 0;
  for (const x of items) {
    const result = best(x, names, films);
    for (const key of ["imdb", "rating", "votes", "genres", "year"]) delete x[key];
    x.match = result?.match || "low";
    if (result?.match !== "high") continue;
    const film = result.film;
    Object.assign(x, { imdb: film.id, rating: film.rating, votes: film.votes, genres: film.genres, year: film.year });
    matched++;
  }
  for (const s of shelves) fs.writeFileSync(`${dir}/${s.f}`, JSON.stringify(s.data));
  console.log(`${matched} of ${items.length} films matched with high confidence`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
