// Turns a viewing history into suggestions. Runs only in the browser and sends nothing anywhere.
(() => {
  const norm = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/&/g, " und ").replace(/[^a-z0-9]+/g, " ").trim();
  const SHOW_PART = /[:\-–]\s*(staffel|season|teil|part|folge|episode|limited series|miniserie|buch|book|volume|vol\.?)\b.*$/i;

  // Accepts Netflix's NetflixViewingHistory.csv, or any pasted list with one title per line.
  function parseHistory(text) {
    const titles = new Set();
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line || /^"?title"?\s*,\s*"?date"?$/i.test(line)) continue;
      const csv = line.match(/^"((?:[^"]|"")*)"\s*,\s*"[^"]*"$/);
      if (csv) line = csv[1].replace(/""/g, '"');
      else line = line.replace(/,\s*\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/, "");
      const title = line.replace(SHOW_PART, "").trim();
      if (title) titles.add(title);
    }
    return [...titles];
  }

  const weighted = x => (x.rating && x.match === "high" ? (x.votes / (x.votes + 5000)) * x.rating + (5000 / (x.votes + 5000)) * 6.5 : 0);

  function recommend(history, items, limit = 60) {
    const watched = new Set(history.map(norm));
    const seen = items.filter(x => watched.has(norm(x.title)) || (x.sub && watched.has(norm(x.sub))));
    const taste = {};
    for (const x of seen) for (const g of x.genres || []) taste[g] = (taste[g] || 0) + 1;
    const top = Math.max(1, ...Object.values(taste));
    const seenIds = new Set(seen.map(x => x.id));
    const titles = new Set();
    const picks = items.filter(x => x.f !== "g" && !seenIds.has(x.id) && x.avail !== 0 && x.match === "high").map(x => {
      const shared = (x.genres || []).filter(g => taste[g]);
      const fit = shared.reduce((n, g) => n + taste[g] / top, 0);
      const because = seen.find(s => (s.genres || []).some(g => shared.includes(g)));
      return { ...x, score: weighted(x) + fit * 1.5, because: because?.title || "" };
    }).sort((a, b) => b.score - a.score).filter(x => !titles.has(norm(x.title)) && titles.add(norm(x.title)));
    return { seen: seen.length, picks: picks.slice(0, limit) };
  }

  globalThis.Recommend = { parseHistory, recommend };
})();
