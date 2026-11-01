// OCLC OPEN ("OPAC Portal", DotNetNuke) reader. Used by many German public libraries, e.g. opacportal.bistum-muenster.de.
export const system = "oclcopen";

const PAGE = 50; // largest size in the catalog's own page size menu
const VIDEO = /dvd|blu-?ray|\bbrd\b|film/i;
const GAME = /konsol|videospiel|video game|nintendo|playstation|\bps[2-5]\b|xbox|\bwii\b|switch/i;
const SKIP = /^e(video|audio|book|music|paper|film)|filmfriend|hörbuch|hoerbuch|-rom\b|dvdroms?\b/i;
const PLATFORM = /(switch|wii u|wii|n?3ds|nds|nintendods|ps[2-5]|playstation\s?[2-5]|xbox[\w ]*)/i;

// A media group name -> "b", "d", "g", or "" when it holds no discs or console games. Names differ per library.
export function classify(group) {
  if (SKIP.test(group)) return "";
  if (GAME.test(group)) return "g";
  if (/blu-?ray|\bbrd\b/i.test(group)) return "b";
  return VIDEO.test(group) ? "d" : "";
}

export function libFromUrl(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
  const host = u.hostname.toLowerCase();
  const first = u.pathname.split("/").filter(Boolean)[0] || "";
  const scope = first && !/^(mediensuche|erweiterte-suche|erweitertesuche\.aspx|startseite|login|mein-konto|default\.aspx|permalink\.aspx)$/i.test(first) ? first.toLowerCase() : "";
  return {
    id: "oclcopen." + host.replace(/[^a-z0-9.-]/g, "-") + (scope ? "_" + scope.replace(/[^a-z0-9-]/g, "-") : ""),
    host, base: u.origin + (scope ? "/" + first : ""),
  };
}

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = s => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/g, (m, n) => entities[n] ?? m);
const text = s => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// The advanced search has no GET form: read its fields, post them once, and keep the searchhash the catalog redirects to.
async function searchHash(lib, ctx, form0, field, group) {
  const r = await ctx.fetch(form0);
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(";")[0]).join("; ");
  const html = await r.text();
  const form = new URLSearchParams();
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const type = (m[0].match(/type="([^"]*)"/i) || [])[1]?.toLowerCase(), name = (m[0].match(/name="([^"]*)"/i) || [])[1];
    if (name && type === "hidden") form.set(name, decode((m[0].match(/value="([^"]*)"/i) || [])[1] || ""));
  }
  for (const m of html.matchAll(/<select\b[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const sel = m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) || m[2].match(/<option[^>]*value="([^"]*)"/i);
    if (sel) form.set(m[1], decode(sel[1]));
  }
  form.set(field, group);
  form.set(field.replace("DdlMediaGroupValue", "BtnSearch"), "Suchen");
  const p = await ctx.fetch(form0, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: form.toString(),
  });
  const target = decode(p.headers.get("location") || ((await p.text()).match(/href="([^"]*searchhash=[^"]*)"/i) || [])[1] || "");
  const hash = (target.match(/searchhash=(OCLC_[0-9a-f]+)/i) || [])[1];
  if (!hash) throw new Error(`oclcopen: no searchhash for ${group} (HTTP ${p.status})`);
  return { hash, results: new URL(target, form0).pathname };
}

// Prefer the catalog's own advanced-search link. Some portals use .aspx or a locale prefix.
export function advancedSearchUrls(lib, home = "") {
  const root = new URL(lib.base.replace(/\/$/, "") + "/");
  const linked = [...home.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)]
    .map(m => { try { return new URL(decode(m[2]), root).href; } catch { return ""; } })
    .filter(url => url.startsWith(root.href) && /Erweiterte-?Suche(?:\.aspx)?/i.test(url));
  const known = [
    "/Mediensuche/Erweiterte-Suche",
    "/Mediensuche/ErweiterteSuche.aspx",
    "/Erweiterte-Suche",
    "/Suche/Erweiterte-Suche",
    "/de-de/Mediensuche/Erweiterte-Suche",
  ].map(path => lib.base.replace(/\/$/, "") + path);
  return [...new Set([...linked, ...known])];
}

async function findForm(lib, ctx) {
  const home = await (await ctx.fetch(lib.base + "/")).text();
  for (const url of advancedSearchUrls(lib, home)) {
    const r = await ctx.fetch(url).catch(e => {
      if (/\b(?:403|429)\b/.test(String(e.message))) throw e;
      return null;
    });
    const html = r ? await r.text() : "";
    if (/DdlMediaGroupValue/.test(html)) return { url, html };
  }
  throw Object.assign(new Error("oclcopen: no advanced search with a media group menu"), { permanent: true });
}

async function list(lib, ctx, task, n) {
  const r = await ctx.fetch(`${new URL(lib.base).origin}${task.results}?searchhash=${task.hash}&top=y&pagesize=${PAGE}&page=${n}`);
  return r.text();
}

// Media group names differ per library, so they come from the catalog's own menu.
export async function plan(lib, ctx) {
  const { url, html } = await findForm(lib, ctx);
  const sel = html.match(/<select\b[^>]*name="([^"]*DdlMediaGroupValue)"[^>]*>([\s\S]*?)<\/select>/i);
  const groups = [...sel[2].matchAll(/<option[^>]*value="([^"]*)"/gi)].map(m => decode(m[1])).filter(g => g !== "Alle");
  const out = [];
  for (const group of groups) {
    const f = classify(group);
    if (!f) continue;
    const found = await searchHash(lib, ctx, url, sel[1], group);
    const first = await list(lib, ctx, found, 1);
    const count = +(text(first).match(/([\d.]+) Treffer/) || [])[1]?.replace(".", "") || parse(first).length;
    if (count) out.push({ f, key: "x" + out.length, group, ...found, count, pages: Math.ceil(count / PAGE) });
  }
  return out;
}

function parse(html) {
  const rows = [];
  for (const block of html.split('class="oclc-searchmodule-mediumview-content"').slice(1)) {
    const m = block.match(/mdv(\w+?)_UcSharedCatalogueView_LbtnShortDescriptionValue[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (!m) continue;
    const body = text(block.split("oclc-searchmodule-mediumview ")[0]);
    rows.push({
      id: m[1], title: text(m[2]),
      disc: +(body.match(/Jahr:\s*(\d{4})/) || [])[1] || 0,
      series: (body.match(/Reihe:\s*(.+?)\s+Mediengruppe/) || [])[1] || "",
    });
  }
  return rows;
}

async function available(lib, ctx, mednr, portalId) {
  const r = await ctx.fetch(lib.base + "/DesktopModules/OCLC.OPEN.PL.DNN.SearchModule/SearchService.asmx/GetAvailability", {
    method: "POST", headers: { "content-type": "application/json;charset=utf-8" },
    body: JSON.stringify({ portalId, mednr, culture: "de-DE", branchFilter: "", requestCopyData: false }),
  });
  const d = (await r.json()).d || {}; // older versions answer IsAvail, newer ones Avail.Available
  return (d.IsAvail ?? d.Avail?.Available) === "true" ? 1 : 0;
}

export async function page(lib, task, n, ctx) {
  const html = await list(lib, ctx, task, n);
  const portalId = +(html.match(/LoadSharedCatalogueViewAvailabilityAsync\("[^"]*",\s*"[^"]*",\s*(\d+)/) || [])[1] || 0;
  const rows = [];
  for (const x of parse(html)) {
    const [series, part] = x.series.split(/;\s*/);
    const f = task.f === "d" && /blu-?ray/i.test(x.title) ? "b" : task.f;
    rows.push({
      id: x.id, title: x.title, sub: series && part ? `${series} ${part}` : "", f, disc: x.disc, cover: "",
      avail: ctx.skipChecks?.() ? null : await available(lib, ctx, x.id, portalId), holds: 0, subj: "",
      plat: f === "g" ? (task.group.match(PLATFORM) || x.title.match(PLATFORM) || [""])[0] : "",
    });
  }
  return rows;
}

export function recordTemplate(lib) { return lib.base + "/Permalink.aspx?id={id}"; }

export async function libraryName(lib, ctx) {
  const html = await (await ctx.fetch(lib.base + "/")).text();
  return text((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").split(">")[0].trim();
}
