#!/usr/bin/env node
// Writes one indexable page per library, plus sitemap.xml and robots.txt.
import fs from "node:fs";

const SITE = "https://nikpottbecker.github.io/library-shelves/";
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
    .replace("<!--BASE-->", `<base href="../../"><script>window.LIB = ${JSON.stringify(lib.id)}</script>`)
    .replace("<!--LD-->", `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`)
    .replace("<!--TITLES-->", `<noscript><h2>Titel der ${esc(lib.name)}</h2><ul>${best.map(x => `<li>${esc(x.title)}</li>`).join("")}</ul></noscript>`)
    .replace('<h1 id="name">Library Shelves</h1>', `<h1 id="name">${esc(lib.name)}</h1>`);
  fs.mkdirSync(`dist/buecherei/${lib.slug}`, { recursive: true });
  fs.writeFileSync(`dist/buecherei/${lib.slug}/index.html`, html);
  urls.push(url);
}
fs.writeFileSync("dist/shelves/index.json", JSON.stringify(index));
const day = new Date().toISOString().slice(0, 10);
fs.writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc><lastmod>${day}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`${index.length} library pages written`);
