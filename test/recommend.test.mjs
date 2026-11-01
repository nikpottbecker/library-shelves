import assert from "node:assert/strict";
import test from "node:test";
import "../site/recommend.js";

const { parseHistory, recommend } = globalThis.Recommend;

test("reads Netflix csv and strips seasons", () => {
  const csv = 'Title,Date\n"Dark: Staffel 1: Geheimnisse","01.10.26"\n"Dark: Staffel 2: Anfänge","02.10.26"\n"Inception","03.10.26"\n';
  assert.deepEqual(parseHistory(csv), ["Dark", "Inception"]);
});
test("reads a pasted list", () => {
  assert.deepEqual(parseHistory("Fallout - Staffel 2\n\nReacher"), ["Fallout", "Reacher"]);
});
test("recommends available films of a similar genre, not what was seen", () => {
  const items = [
    { id: "1", title: "Alien", f: "d", avail: 1, match: "high", rating: 8.5, votes: 900000, genres: ["Horror", "Sci-Fi"] },
    { id: "2", title: "Aliens", f: "d", avail: 1, match: "high", rating: 8.4, votes: 800000, genres: ["Horror", "Sci-Fi"] },
    { id: "3", title: "Titanic", f: "d", avail: 1, match: "high", rating: 7.9, votes: 900000, genres: ["Romance"] },
    { id: "4", title: "The Thing", f: "d", avail: 0, match: "high", rating: 8.2, votes: 500000, genres: ["Horror"] },
    { id: "5", title: "Unklar", f: "d", avail: 1, match: "low" },
    { id: "6", title: "Mario", f: "g", avail: 1 },
  ];
  const r = recommend(["Alien"], items);
  assert.equal(r.seen, 1);
  assert.deepEqual(r.picks.map(x => x.id), ["2", "3"]);
  assert.equal(r.picks[0].because, "Alien");
});
