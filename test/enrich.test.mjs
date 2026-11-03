import assert from "node:assert/strict";
import test from "node:test";
import { addTitle, best, norm, short, titleKeys } from "../tools/enrich.mjs";

function fixture(item, candidates) {
  const names = titleKeys([item]);
  const films = new Map();
  for (const c of candidates) {
    films.set(c.id, { id: c.id, type: c.type || "movie", year: c.year, votes: c.votes, rating: c.rating || 7, genres: [] });
    addTitle(names, c.id, c.title, c.source || "main");
  }
  return best(item, names, films);
}

test("normalises titles and keeps shortened titles separate", () => {
  assert.equal(norm("Mädchen & Männer"), "madchen und manner");
  assert.equal(short("Film: Teil 1"), "Film");
  assert.equal(short("Spider-Man - No Way Home"), "Spider-Man");
});

test("a distinctive exact primary title can be high confidence", () => {
  const result = fixture({ title: "Ein sehr eigener Filmtitel", disc: 2021 }, [
    { id: "tt1", title: "Ein sehr eigener Filmtitel", year: 2019, votes: 4500 }
  ]);
  assert.equal(result?.match, "high");
  assert.equal(result?.film.id, "tt1");
});

test("a German alternative title counts as a direct match", () => {
  const result = fixture({ title: "Das andere Leben", disc: 2020 }, [
    { id: "tt2", title: "Das andere Leben", source: "de", year: 2018, votes: 9000 }
  ]);
  assert.equal(result?.match, "high");
});

test("an unrelated international alternative is not strong evidence", () => {
  const result = fixture({ title: "Das andere Leben", disc: 2020 }, [
    { id: "tt3", title: "Das andere Leben", source: "other", year: 2018, votes: 40000 }
  ]);
  assert.equal(result?.match, "low");
});

test("a release close to the disc year beats an old film of the same name", () => {
  const result = fixture({ title: "Michael", disc: 2026 }, [
    { id: "ttOld", title: "Michael", year: 1996, votes: 90000 },
    { id: "ttNew", title: "Michael", year: 2025, votes: 1200 }
  ]);
  assert.equal(result?.film.id, "ttNew");
  assert.equal(result?.match, "high");
});

test("a rival with almost no votes does not make a match doubtful", () => {
  const result = fixture({ title: "Michael", disc: 2026 }, [
    { id: "ttFamous", title: "Michael", year: 2024, votes: 200000 },
    { id: "ttSmall", title: "Michael", year: 2025, votes: 8 }
  ]);
  assert.equal(result?.match, "high");
});

test("movie and TV series with the same title stay uncertain", () => {
  const result = fixture({ title: "Outlander", disc: 2018 }, [
    { id: "ttMovie", title: "Outlander", year: 2008, votes: 70000 },
    { id: "ttSeries", title: "Outlander", type: "tvSeries", year: 2014, votes: 200000 }
  ]);
  assert.equal(result?.match, "low");
});

test("a full-title match beats a more popular shortened fallback", () => {
  const result = fixture({ title: "Die Reise - Ein Abenteuer", disc: 2021 }, [
    { id: "ttFull", title: "Die Reise - Ein Abenteuer", year: 2020, votes: 2000 },
    { id: "ttShort", title: "Die Reise", year: 2019, votes: 200000 }
  ]);
  assert.equal(result?.film.id, "ttFull");
  assert.equal(result?.match, "high");
});

test("a shortened-title-only fallback is always low confidence", () => {
  const result = fixture({ title: "Die Reise: Teil 1", disc: 2021 }, [
    { id: "ttShort", title: "Die Reise", year: 2020, votes: 200000 }
  ]);
  assert.equal(result?.match, "low");
});

test("series seasons and numbered parts are low confidence", () => {
  for (const item of [
    { title: "Outlander", sub: "Staffel 1", disc: 2018 },
    { title: "Eine Geschichte: Teil 1", disc: 2020 }
  ]) {
    const result = fixture(item, [{ id: "ttSeries", title: item.title, year: 2017, votes: 20000 }]);
    assert.equal(result?.match, "low", item.title);
  }
});

test("few votes and large DVD-year gaps reduce confidence", () => {
  assert.equal(fixture({ title: "Kinderabenteuer", disc: 2022 }, [
    { id: "ttKids", title: "Kinderabenteuer", year: 2020, votes: 55 }
  ])?.match, "low");
  assert.equal(fixture({ title: "Ein alter Film", disc: 2024 }, [
    { id: "ttClassic", title: "Ein alter Film", year: 1990, votes: 60000 }
  ])?.match, "low");
});

test("films newer than the DVD are discarded, missing matches return null", () => {
  assert.equal(fixture({ title: "Zukunft", disc: 2010 }, [
    { id: "ttFuture", title: "Zukunft", year: 2022, votes: 20000 }
  ]), null);
  assert.equal(fixture({ title: "Nicht gefunden", disc: 2022 }, [
    { id: "ttOther", title: "Ein anderer Film", year: 2021, votes: 20000 }
  ]), null);
});

test("unrated candidates cannot become confident matches", () => {
  assert.equal(fixture({ title: "Ein Film", disc: 2020 }, [
    { id: "ttZero", title: "Ein Film", year: 2019, votes: 0 }
  ]), null);
});

test("catalog notes and season suffixes are not part of the title", async () => {
  const { core, isSeason } = await import("../tools/enrich.mjs");
  assert.equal(core("Heist [Blu-Ray]"), "Heist");
  assert.equal(core("Yellowstone - Staffel 5"), "Yellowstone");
  assert.equal(core("Die Dornenvögel - die komplette Serie"), "Die Dornenvögel");
  assert.equal(core("NCIS - Die fünfte Season"), "NCIS");
  assert.equal(core("Astrid Lindgrens Karlsson vom Dach - DVD 4"), "Astrid Lindgrens Karlsson vom Dach");
  assert.ok(isSeason("Yellowstone - Staffel 5"));
  assert.ok(!isSeason("Heist"));
});
test("a season disc can match its series with high confidence", () => {
  const result = fixture({ title: "Yellowstone - Staffel 5", disc: 2025 }, [
    { id: "ttY", title: "Yellowstone", type: "tvSeries", year: 2018, votes: 300000 }
  ]);
  assert.equal(result?.film.id, "ttY");
  assert.equal(result?.match, "high");
});
