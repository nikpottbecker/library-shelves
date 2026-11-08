import assert from "node:assert/strict";
import test from "node:test";

await import("../site/view-state.js");
const valid = {
  views: ["d", "b", "g", "rec", "fav"], defaultView: "d",
  sorts: ["top", "new", "az"], defaultSort: "top",
  genres: ["Drama", "Family"],
};

test("reads a shared shelf view and rejects unknown values", () => {
  assert.deepEqual(ViewState.read("?view=b&q=Planet+Erde&sort=az&genre=Family&available=1", valid), {
    view: "b", q: "Planet Erde", sort: "az", genre: "Family", available: true,
  });
  assert.deepEqual(ViewState.read("?view=nope&sort=nope&genre=nope", valid), {
    view: "d", q: "", sort: "top", genre: "", available: false,
  });
});

test("writes only non-default view values and preserves unrelated parameters", () => {
  const href = ViewState.write("https://example.test/?lib=heidelberg&view=g&q=old", {
    view: "d", q: " Planet Erde ", sort: "top", genre: "Family", available: true,
  }, { view: "d", sort: "top" });
  const url = new URL(href);
  assert.equal(url.searchParams.get("lib"), "heidelberg");
  assert.equal(url.searchParams.get("view"), null);
  assert.equal(url.searchParams.get("q"), "Planet Erde");
  assert.equal(url.searchParams.get("sort"), null);
  assert.equal(url.searchParams.get("genre"), "Family");
  assert.equal(url.searchParams.get("available"), "1");
});
