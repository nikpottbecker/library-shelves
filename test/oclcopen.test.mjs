import assert from "node:assert/strict";
import test from "node:test";
import { classify, libFromUrl, advancedSearchUrls } from "../readers/oclcopen.mjs";

test("media groups", () => {
  for (const [group, f] of [["DVD für Kinder", "d"], ["Film", "d"], ["BRD Spielfilm", "b"], ["Blu-ray", "b"], ["Konsolenspiel Switch", "g"], ["Nintendo DS", "g"], ["wii", "g"],
    ["DVD-Rom", ""], ["CD-/DVD-ROM", ""], ["DVD-Video", "d"], ["eVideo", ""], ["eFilm", ""], ["Filmfriend", ""], ["Gesellschaftsspiel", ""], ["Spiele", ""], ["Hörbuch-Sach", ""]]) assert.equal(classify(group), f, group);
});
test("library ids", () => {
  assert.equal(libFromUrl("https://opacportal.bistum-muenster.de/geldern/Mediensuche/Einfache-Suche").id, "oclcopen.opacportal.bistum-muenster.de_geldern");
  assert.equal(libFromUrl("https://celle.bibliotheca-open.de/Mediensuche/Einfache-Suche").id, "oclcopen.celle.bibliotheca-open.de");
});

test("advanced search variants and scoped catalog IDs", () => {
  const cases = [
    ["https://katalog.stadtbuecherei.frankfurt.de/", "/Mediensuche/ErweiterteSuche.aspx"],
    ["https://bibliotheken.komm.one/mannheim", "/mannheim/de-de/Mediensuche/Erweiterte-Suche"],
    ["https://open.stadt-muenster.de/", "/Erweiterte-Suche"],
  ];
  for (const [base, href] of cases) {
    const lib = libFromUrl(base), target = new URL(href, base).href;
    assert.equal(advancedSearchUrls(lib, '<a href="' + href + '">Erweiterte Suche</a>')[0], target);
  }
  const lib = libFromUrl("https://bibliotheken.komm.one/mannheim");
  assert.ok(!advancedSearchUrls(lib, '<a href="https://other.example/Erweiterte-Suche">Link</a>').some(url => url.includes("other.example")));
  assert.ok(!advancedSearchUrls(lib, '<a href="/mannheim-backup/Erweiterte-Suche">Link</a>').some(url => url.includes("mannheim-backup")));
  assert.equal(libFromUrl("https://open.stadt-muenster.de/Erweiterte-Suche").id, "oclcopen.open.stadt-muenster.de");
  assert.equal(libFromUrl("https://katalog.stadtbuecherei.frankfurt.de/Mediensuche/ErweiterteSuche.aspx").id, "oclcopen.katalog.stadtbuecherei.frankfurt.de");
});
