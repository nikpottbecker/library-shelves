# Contributing

Using a coding agent? Point it at [AGENTS.md](AGENTS.md).

## Add a library

Run `detect` with your catalog link, add the printed line to `libraries.json` and open a pull request.

```bash
node tools/detect.mjs https://example.org/your-catalog/
node tools/validate.mjs
```

## Add a catalog system

Create `readers/<system>.mjs` and `readers/<system>.md`. Use Node 22, no npm packages and no API keys.

| Export | Purpose |
|---|---|
| `system` | Lowercase name, same as the file name |
| `libFromUrl(url)` | Returns `{ id, host, base }`, or `null`. The id is `<system>.<host>`, plus `_<scope>` if needed |
| `plan(lib, ctx)` | Returns tasks: `{ f, key, count, pages, … }`, with `f` set to `d` (DVD), `b` (Blu-ray) or `g` (game) |
| `page(lib, task, n, ctx)` | Returns the rows of page `n`. Must be safe to retry |
| `recordTemplate(lib)` | Link to a title, with `{id}` |
| `libraryName(lib, ctx)` | Optional |

Each row looks like this:

```js
{ id: "abc123", title: "Alien", sub: "", f: "d", disc: 2017, cover: "", avail: 1, holds: 0, subj: "", plat: "" }
```

The fields match the reader format of Nomad Library's public data repository, so a reader can also be offered there.

Try it with `node tools/try.mjs <system> <catalog-url>`.

## Rules

- Use only `ctx.fetch`. It keeps requests to one per second.
- Read only public pages. No logins, no captchas, no headless browsers.
- Respect a block. If a catalog answers 403, record that and stop.
- Store no data about borrowers.
- Note your measurements in `readers/<system>.md`.
