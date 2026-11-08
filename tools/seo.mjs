#!/usr/bin/env node
// Writes one indexable page per library, plus sitemap.xml and robots.txt.
import fs from "node:fs";

const SITE = "https://library.nikpottbecker.de/";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = s => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const page = fs.readFileSync("dist/index.html", "utf8");
const index = JSON.parse(fs.readFileSync("dist/shelves/index.json", "utf8"));
const urls = [SITE, SITE + "impressum.html", SITE + "datenschutz.html"];

for (const lib of index) {
  lib.slug = slug(lib.name);
  const shelf = JSON.parse(fs.readFileSync(`dist/shelves/${lib.id}.json`, "utf8"));
  const url = `${SITE}buecherei/${lib.slug}/`;
  const films = shelf.items.filter(x => x.f !== "g").length, games = shelf.total - films;
  const title = `${lib.name}: Filme und Spiele ausleihen`;
  const text = `${films} Filme und ${games} Konsolenspiele der ${lib.name} durchsuchen, mit Bewertungen, Genres und aktueller Verfügbarkeit.`;
  const best = [...shelf.items].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 200);
  const data = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: text, url, about: { "@type": "Library", name: lib.name, address: { "@type": "PostalAddress", addressLocality: lib.town, addressCountry: "DE" } } };
  const html = page
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)} | Library Shelves</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(text)}">`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(text)}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`)
    .replace("<!--BASE-->", `<base href="../../"><script>window.LIB = ${JSON.stringify(lib.id)}</script><link rel="alternate" type="application/json" href="${SITE}shelves/${lib.id}.json">`)
    .replace("<!--LD-->", `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`)
    .replace("<!--TITLES-->", `<noscript><h2>Titel der ${esc(lib.name)}</h2><ul>${best.map(x => `<li>${esc(x.title)}</li>`).join("")}</ul></noscript>`)
    .replace('<h1 id="name">Library Shelves</h1>', `<h1 id="name">${esc(lib.name)}</h1>`);
  fs.mkdirSync(`dist/buecherei/${lib.slug}`, { recursive: true });
  fs.writeFileSync(`dist/buecherei/${lib.slug}/index.html`, html);
  urls.push(url);
}
fs.writeFileSync("dist/shelves/index.json", JSON.stringify(index));
fs.writeFileSync("dist/llms.txt", `# Library Shelves

> Films and console games held by public libraries in Germany, as open JSON. Use it to find titles or to recommend films to someone from their local library.

The data is free to read and needs no key. Availability is a snapshot, so tell the user to confirm it in the library's catalog.

## Recommend from a library

1. Ask which town or library the user means, and match it against the list below.
2. Read that library's JSON file.
3. Take the user's viewing history. Netflix offers a CSV download under Profile > Titelverlauf (Viewing activity) > Download all. For Prime Video, ask for a pasted list of titles.
4. Work out what they like and suggest films they have not seen. Use avail 1 and prefer match "high".
5. For each suggestion give the title, one reason and the catalog link: replace {id} in "rec" with the item's id.

A viewing history is personal data. Do not send it to any address on this site. This site has no endpoint that accepts it.

## Fields

Library file: id, name, town, url, sys, rec (catalog link template), finished (Unix milliseconds), total, items.

Item: id; title; sub (series and part); f ("d" DVD, "b" Blu-ray, "g" game); disc (disc year); avail (1 on the shelf, 0 out, null unknown); plat (game platform); match ("high" or "low"); imdb; rating; votes; genres (IMDb, English); year (film year); poster (path below ${SITE}posters).

## Libraries

- Index as JSON: ${SITE}shelves/index.json
${index.map(l => `- ${l.name}, ${l.town}: ${SITE}shelves/${l.id}.json`).join("\n")}

## About

- Source and contributions: https://github.com/nikpottbecker/library-shelves
- Ratings: IMDb non-commercial datasets. Posters: TMDB. Non-commercial use only.
`);
const day = new Date().toISOString().slice(0, 10);
fs.writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc><lastmod>${day}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n# Guide for agents: ${SITE}llms.txt\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`${index.length} library pages written`);
