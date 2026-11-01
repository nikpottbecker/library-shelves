#!/usr/bin/env node
// Copies the libraries in libraries.json into dist/shelves. Libraries on one host run one after another, hosts run side by side.
// A library that fails or runs out of time keeps its last published shelf.
import fs from "node:fs";
import { politeCtx } from "./polite.mjs";

const MAX_PAGES = +(process.env.MAX_PAGES || 1e9);
const DEADLINE = Date.now() + +(process.env.MAX_MINUTES || 300) * 6e4;
const PUBLISHED = process.env.PUBLISHED_URL || "https://nikpottbecker.github.io/library-shelves/";
const libraries = JSON.parse(fs.readFileSync("libraries.json", "utf8"));
fs.mkdirSync("dist/shelves", { recursive: true });
fs.cpSync("site", "dist", { recursive: true });

const validRow = r => r.id && !String(r.id).includes("~") && r.title && "dbg".includes(r.f);

async function copy(entry, ctx) {
  const R = await import(new URL(`../readers/${entry.system}.mjs`, import.meta.url));
  const lib = R.libFromUrl(entry.url), rows = new Map();
  for (const task of await R.plan(lib, ctx)) {
    for (let n = 1; n <= Math.min(task.pages, MAX_PAGES); n++) {
      if (Date.now() > DEADLINE) throw new Error("out of time");
      for (const row of await R.page(lib, task, n, ctx)) if (validRow(row) && !rows.has(row.id)) rows.set(row.id, row);
    }
  }
  if (!rows.size) throw new Error("no titles");
  return { id: lib.id, name: entry.name, town: entry.town || "", url: entry.url, sys: entry.system, rec: R.recordTemplate(lib), finished: Date.now(), total: rows.size, items: [...rows.values()] };
}

async function lastShelf(id) {
  const r = await fetch(`${PUBLISHED}shelves/${encodeURIComponent(id)}.json`, { signal: AbortSignal.timeout(60e3) }).catch(() => null);
  return r?.ok ? r.json() : null;
}

const hosts = Map.groupBy(libraries, l => new URL(l.url).hostname);
const index = [];
await Promise.all([...hosts.values()].map(async group => {
  const ctx = politeCtx();
  for (const entry of group) {
    const R = await import(new URL(`../readers/${entry.system}.mjs`, import.meta.url));
    const id = R.libFromUrl(entry.url).id;
    let shelf, error = "";
    try {
      shelf = await copy(entry, ctx);
      console.log(`${entry.name}: ${shelf.total} titles`);
    } catch (e) {
      error = e.message;
      console.error(`${entry.name} failed: ${error}`);
      shelf = await lastShelf(id);
    }
    if (shelf) {
      fs.writeFileSync(`dist/shelves/${id}.json`, JSON.stringify(shelf));
      index.push({ id, name: entry.name, town: entry.town || "", sys: entry.system, total: shelf.total, finished: shelf.finished, stale: !!error });
    }
  }
}));
index.sort((a, b) => a.name.localeCompare(b.name, "de"));
fs.writeFileSync("dist/shelves/index.json", JSON.stringify(index));
if (!index.length) process.exit(1);
