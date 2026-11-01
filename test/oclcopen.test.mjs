import assert from "node:assert/strict";
import test from "node:test";
import { classify, libFromUrl } from "../readers/oclcopen.mjs";

test("media groups", () => {
  for (const [group, f] of [["DVD für Kinder", "d"], ["Film", "d"], ["BRD Spielfilm", "b"], ["Blu-ray", "b"], ["Konsolenspiel Switch", "g"], ["Nintendo DS", "g"], ["wii", "g"],
    ["DVD-Rom", ""], ["CD-/DVD-ROM", ""], ["DVD-Video", "d"], ["eVideo", ""], ["eFilm", ""], ["Filmfriend", ""], ["Gesellschaftsspiel", ""], ["Spiele", ""], ["Hörbuch-Sach", ""]]) assert.equal(classify(group), f, group);
});
test("library ids", () => {
  assert.equal(libFromUrl("https://opacportal.bistum-muenster.de/geldern/Mediensuche/Einfache-Suche").id, "oclcopen.opacportal.bistum-muenster.de_geldern");
  assert.equal(libFromUrl("https://celle.bibliotheca-open.de/Mediensuche/Einfache-Suche").id, "oclcopen.celle.bibliotheca-open.de");
});
