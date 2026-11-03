// Passkey accounts for Library Shelves. Stores no e-mail, no name and no password:
// only a random user id, the passkey's public key, and the user's saved lists.
import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
} from "@simplewebauthn/server";

const CHALLENGE_MS = 5 * 60e3, SESSION_MS = 180 * 864e5, MAX_DATA = 64 * 1024;

const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const random = n => b64(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => b64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function cors(req, env) {
  const origin = req.headers.get("origin") || "";
  const allowed = env.ORIGINS.split(",").map(s => s.trim());
  return allowed.includes(origin) ? {
    "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type", "access-control-max-age": "86400", vary: "origin",
  } : {};
}
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
});

async function body(req) {
  try { return await req.json(); } catch { throw new HttpError(400, "Die Anfrage war kein gültiges JSON."); }
}

async function newChallenge(env, kind, challenge, userId = null) {
  const id = random(16), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM challenges WHERE expires < ?").bind(now),
    env.DB.prepare("INSERT INTO challenges (id, challenge, user_id, kind, expires) VALUES (?, ?, ?, ?, ?)").bind(id, challenge, userId, kind, now + CHALLENGE_MS),
  ]);
  return id;
}
// A challenge is used once: it is deleted as soon as it is read.
async function takeChallenge(env, id, kind) {
  const row = await env.DB.prepare("DELETE FROM challenges WHERE id = ? AND kind = ? RETURNING challenge, user_id, expires").bind(String(id || ""), kind).first();
  if (!row || row.expires < Date.now()) throw new HttpError(400, "Die Anmeldung ist abgelaufen. Bitte noch einmal versuchen.");
  return row;
}
async function newSession(env, userId) {
  const token = random(32), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(now),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)").bind(await sha256(token), userId, now + SESSION_MS),
  ]);
  return token;
}
async function user(req, env) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Nicht angemeldet.");
  const row = await env.DB.prepare("SELECT user_id, expires FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first();
  if (!row || row.expires < Date.now()) throw new HttpError(401, "Die Anmeldung ist abgelaufen. Bitte neu anmelden.");
  return { id: row.user_id, tokenHash: await sha256(token) };
}

const routes = {
  "POST /auth/register/options": async (req, env) => {
    const userId = random(16);
    const options = await generateRegistrationOptions({
      rpName: env.RP_NAME, rpID: env.RP_ID, userID: unb64(userId),
      userName: `Regal ${userId.slice(0, 6)}`, userDisplayName: "Library Shelves",
      attestationType: "none", authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    return json({ flow: await newChallenge(env, "register", options.challenge, userId), options });
  },
  "POST /auth/register/verify": async (req, env) => {
    const { flow, response } = await body(req);
    const ch = await takeChallenge(env, flow, "register");
    const v = await verifyRegistrationResponse({
      response, expectedChallenge: ch.challenge, expectedOrigin: env.ORIGINS.split(",").map(s => s.trim()),
      expectedRPID: env.RP_ID, requireUserVerification: true,
    }).catch(() => ({ verified: false }));
    if (!v.verified) throw new HttpError(400, "Der Passkey konnte nicht bestätigt werden.");
    const c = v.registrationInfo.credential;
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, created) VALUES (?, ?)").bind(ch.user_id, Date.now()),
      env.DB.prepare("INSERT INTO credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)")
        .bind(c.id, ch.user_id, b64(c.publicKey), c.counter, JSON.stringify(c.transports || [])),
    ]);
    return json({ token: await newSession(env, ch.user_id) });
  },
  "POST /auth/login/options": async (req, env) => {
    const options = await generateAuthenticationOptions({ rpID: env.RP_ID, userVerification: "required" });
    return json({ flow: await newChallenge(env, "login", options.challenge), options });
  },
  "POST /auth/login/verify": async (req, env) => {
    const { flow, response } = await body(req);
    const ch = await takeChallenge(env, flow, "login");
    const cred = await env.DB.prepare("SELECT * FROM credentials WHERE id = ?").bind(String(response?.id || "")).first();
    if (!cred) throw new HttpError(400, "Diesen Passkey kennt Library Shelves nicht. Wurde das Konto gelöscht?");
    const v = await verifyAuthenticationResponse({
      response, expectedChallenge: ch.challenge, expectedOrigin: env.ORIGINS.split(",").map(s => s.trim()),
      expectedRPID: env.RP_ID, requireUserVerification: true,
      credential: { id: cred.id, publicKey: unb64(cred.public_key), counter: cred.counter, transports: JSON.parse(cred.transports) },
    }).catch(() => ({ verified: false }));
    if (!v.verified) throw new HttpError(400, "Der Passkey konnte nicht bestätigt werden.");
    await env.DB.prepare("UPDATE credentials SET counter = ? WHERE id = ?").bind(v.authenticationInfo.newCounter, cred.id).run();
    return json({ token: await newSession(env, cred.user_id) });
  },
  "GET /me/data": async (req, env) => {
    const u = await user(req, env);
    const row = await env.DB.prepare("SELECT body, updated FROM data WHERE user_id = ?").bind(u.id).first();
    return json({ data: row ? JSON.parse(row.body) : {}, updated: row?.updated || 0 });
  },
  "PUT /me/data": async (req, env) => {
    const u = await user(req, env);
    const text = await req.text();
    if (text.length > MAX_DATA) throw new HttpError(413, "Die Listen sind zu groß zum Speichern.");
    let data;
    try { data = JSON.parse(text); } catch { throw new HttpError(400, "Die Anfrage war kein gültiges JSON."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Die Daten haben ein falsches Format.");
    const now = Date.now();
    await env.DB.prepare("INSERT INTO data (user_id, body, updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET body = excluded.body, updated = excluded.updated")
      .bind(u.id, JSON.stringify(data), now).run();
    return json({ updated: now });
  },
  "POST /auth/logout": async (req, env) => {
    const u = await user(req, env);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(u.tokenHash).run();
    return json({ ok: true });
  },
  "DELETE /me": async (req, env) => {
    const u = await user(req, env);
    await env.DB.batch(["data", "sessions", "credentials"].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(u.id))
      .concat(env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id)));
    return json({ ok: true });
  },
};

export default {
  async fetch(req, env) {
    const headers = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: headers["access-control-allow-origin"] ? 204 : 403, headers });
    const route = routes[`${req.method} ${new URL(req.url).pathname}`];
    if (!route) return json({ error: "Nicht gefunden." }, 404, headers);
    try {
      const res = await route(req, env);
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
      return res;
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      return json({ error: e instanceof HttpError ? e.message : "Ein Fehler ist aufgetreten." }, e.status || 500, headers);
    }
  },
};
