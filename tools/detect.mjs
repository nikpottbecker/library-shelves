#!/usr/bin/env node
// node tools/detect.mjs <link> ["Name der Bücherei"]: finds the reader for a catalog and prints its libraries.json entry.
import fs from "node:fs";
import { politeCtx } from "./polite.mjs";

const [url, name] = process.argv.slice(2);
if (!url) { console.error('usage: node tools/detect.mjs <catalog-link> ["Library name"]'); process.exit(2); }
const page = await (await fetch(url, { signal: AbortSignal.timeout(30e3) })).text();
const hints = { oclcopen: /OCLC\.OPEN|oclc-|bibliotheca-open\.de|opacportal/i };
const system = Object.keys(hints).find(k => hints[k].test(url + page));
if (!system || !fs.existsSync(`readers/${system}.mjs`)) {
  console.log("No reader recognises this catalog yet. Open an issue, or add one: see CONTRIBUTING.md");
  process.exit(1);
}
const R = await import(new URL(`../readers/${system}.mjs`, import.meta.url));
const lib = R.libFromUrl(url), ctx = politeCtx();
const tasks = await R.plan(lib, ctx);
console.log("Found:", tasks.map(t => `${t.group}: ${t.count}`).join(", ") || "no discs or games");
console.log(JSON.stringify({ name: name || (await R.libraryName?.(lib, ctx)) || lib.host, url, system }));
