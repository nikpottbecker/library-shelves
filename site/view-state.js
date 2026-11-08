// Encodes a shelf view in the URL so searches and filters can be bookmarked or shared.
(() => {
  const KEYS = ["view", "q", "sort", "genre", "available"];

  function read(search, valid) {
    const p = new URLSearchParams(search);
    return {
      view: valid.views.includes(p.get("view")) ? p.get("view") : valid.defaultView,
      q: p.get("q") || "",
      sort: valid.sorts.includes(p.get("sort")) ? p.get("sort") : valid.defaultSort,
      genre: valid.genres.includes(p.get("genre")) ? p.get("genre") : "",
      available: p.get("available") === "1",
    };
  }

  function write(href, state, defaults) {
    const url = new URL(href);
    KEYS.forEach(k => url.searchParams.delete(k));
    if (state.view !== defaults.view) url.searchParams.set("view", state.view);
    if (state.q.trim()) url.searchParams.set("q", state.q.trim());
    if (state.sort !== defaults.sort) url.searchParams.set("sort", state.sort);
    if (state.genre) url.searchParams.set("genre", state.genre);
    if (state.available) url.searchParams.set("available", "1");
    return url.href;
  }

  globalThis.ViewState = { read, write };
})();
