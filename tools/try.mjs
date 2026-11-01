#!/usr/bin/env node
// node tools/try.mjs <system> <catalog-url> [--max-pages=1]: runs a reader politely (1 request/s) and prints what it found.
import { politeCtx } from "./polite.mjs";

const [system, url] = process.argv.slice(2);
if (!system || !url) { console.error("usage: node tools/try.mjs <system> <catalog-url>"); process.exit(2); }
const R = await import(new URL(`../readers/${system}.mjs`, import.meta.url));
const lib = R.libFromUrl(url);
if (!lib) throw new Error("reader does not recognise this link");
const ctx = politeCtx();
console.log("lib", lib);
const started = Date.now(), tasks = await R.plan(lib, ctx);
console.log("plan", tasks.map(t => ({ f: t.f, group: t.group, count: t.count, pages: t.pages })));
if (tasks[0]) console.log("rows", (await R.page(lib, tasks[0], 1, ctx)).slice(0, 3));
console.log("name", await R.libraryName?.(lib, ctx));
console.log({ requests: ctx.requests, seconds: Math.round((Date.now() - started) / 1000), record: R.recordTemplate(lib) });
