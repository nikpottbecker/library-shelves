# Instructions for agents

Your job: add a library to Library Shelves, or write a reader for a new catalog system, and open a pull request.
Ask your user for the library's name and catalog link if you do not have them.

Requirements: Node 22 or newer, git, and a GitHub account. No npm packages.

## 1. Add a library on a known system

```bash
git clone https://github.com/nikpottbecker/library-shelves.git
cd library-shelves
node tools/detect.mjs "https://catalog.example.org/" "Stadtbücherei Beispielstadt"
```

If `detect` prints a JSON line:

1. Add that line to `libraries.json` and add `"town"`. Keep valid JSON.
2. Run the checks in step 3.
3. Open a pull request with the output of `detect`.

If `detect` says no reader recognises the catalog, go to step 2.

## 2. Write a reader for a new system

Identify the system from the catalog's page source. Then create `readers/<system>.mjs` and `readers/<system>.md`. `CONTRIBUTING.md` defines every export and the row format. `readers/oclcopen.mjs` is the working example.

- Use `ctx.fetch` for every request. It limits you to one request per second.
- Read media group or format names from the catalog. They differ per library.
- Include only physical discs and console games. Leave out eBooks, streaming, board games and audiobooks.
- Add a test in `test/` for anything that can be checked offline.
- In `readers/<system>.md`, record the endpoints, page size, quirks and each library you tested.

Then add the name of your system to `hints` in `tools/detect.mjs` and try it:

```bash
node tools/try.mjs <system> "https://catalog.example.org/"
```

Test at least one real library. Add it to `libraries.json`.

## 3. Check before you open a pull request

```bash
node tools/validate.mjs
node --test test/*.test.mjs
```

Both must pass. Do not open a pull request with failing checks.

## Stop and tell your user when

- The catalog answers 403 or 429, or shows a captcha or bot check.
- Reading it needs a login, an API key or a headless browser.
- Its terms or `robots.txt` forbid automated access.
- A library asks not to be listed.

Do not work around any of these. Do not run several copies of a crawl to read faster.

## Never

- Change `site/impressum.html` or `site/datenschutz.html`. The site owner handles those.
- Add tracking, cookies, or scripts, fonts or images from other hosts.
- Store data about borrowers or commit poster images to the repository.
- Commit `dist/`.
- Add co-author lines or tool credits to commits and pull requests.
