#!/usr/bin/env node
// Offline checks for every reader and for libraries.json. CI runs this on each pull request.
import fs from "node:fs";

const problems = [];
const readers = fs.readdirSync("readers").filter(f => f.endsWith(".mjs"));
for (const file of readers) {
  const name = file.replace(".mjs", ""), src = fs.readFileSync(`readers/${file}`, "utf8");
  const R = await import(new URL(`../readers/${file}`, import.meta.url));
  if (R.system !== name) problems.push(`${file}: system must be "${name}"`);
  if (!/^[a-z0-9]+$/.test(name)) problems.push(`${file}: use lowercase letters and digits only`);
  for (const fn of ["libFromUrl", "plan", "page", "recordTemplate"]) if (typeof R[fn] !== "function") problems.push(`${file}: missing export ${fn}`);
  if (/^\s*import\s.*from\s+["'](?!node:)/m.test(src)) problems.push(`${file}: no npm packages, only node: built-ins`);
  if (/[^.\w]fetch\(/.test(src)) problems.push(`${file}: use ctx.fetch, so requests stay paced`);
  if (!fs.existsSync(`readers/${name}.md`)) problems.push(`${file}: add readers/${name}.md with your measurements`);
}
const libraries = JSON.parse(fs.readFileSync("libraries.json", "utf8")), ids = new Set();
for (const l of libraries) {
  if (!l.name || !l.url || !l.system) { problems.push(`libraries.json: name, url and system are required: ${JSON.stringify(l)}`); continue; }
  if (!readers.includes(`${l.system}.mjs`)) { problems.push(`${l.name}: no reader called ${l.system}`); continue; }
  const lib = (await import(new URL(`../readers/${l.system}.mjs`, import.meta.url))).libFromUrl(l.url);
  if (!lib || !/^[a-z0-9._-]+$/.test(lib.id) || !lib.id.startsWith(l.system + ".")) problems.push(`${l.name}: bad id ${lib?.id}`);
  else if (ids.has(lib.id)) problems.push(`${l.name}: already listed`);
  else ids.add(lib.id);
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`${readers.length} reader(s) and ${libraries.length} library entries are fine.`);
