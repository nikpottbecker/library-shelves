// End-to-end test against `wrangler dev` with a software passkey (ES256), so no browser or device is needed.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { Passkey, ORIGIN, b64 } from "./passkey.mjs";
import { startDev } from "./dev.mjs";

const PORT = 8799, API = `http://127.0.0.1:${PORT}`;
const call = async (method, path, data, token) => {
  const r = await fetch(API + path, { method, headers: { origin: ORIGIN, "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
  return { status: r.status, body: await r.json().catch(() => null), cors: r.headers.get("access-control-allow-origin") };
};
async function register(key) {
  const o = await call("POST", "/auth/register/options");
  return call("POST", "/auth/register/verify", { flow: o.body.flow, response: await key.create(o.body.options) });
}
async function login(key, counter) {
  const o = await call("POST", "/auth/login/options");
  return call("POST", "/auth/login/verify", { flow: o.body.flow, response: await key.get(o.body.options, counter) });
}

let stop;
before(async () => { stop = await startDev(PORT); });
after(() => stop());

test("register, save, log out, log in, delete", async () => {
  const key = new Passkey();
  const reg = await register(key);
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  assert.equal(reg.cors, ORIGIN);
  const t1 = reg.body.token;
  assert.equal((await call("PUT", "/me/data", { favs: { geldern: ["1", "2"] } }, t1)).status, 200);
  assert.deepEqual((await call("GET", "/me/data", undefined, t1)).body.data, { favs: { geldern: ["1", "2"] } });
  assert.equal((await call("POST", "/auth/logout", {}, t1)).status, 200);
  assert.equal((await call("GET", "/me/data", undefined, t1)).status, 401);
  const in1 = await login(key, 1);
  assert.equal(in1.status, 200, JSON.stringify(in1.body));
  assert.deepEqual((await call("GET", "/me/data", undefined, in1.body.token)).body.data.favs.geldern, ["1", "2"]);
  assert.equal((await call("DELETE", "/me", undefined, in1.body.token)).status, 200);
  assert.equal((await call("GET", "/me/data", undefined, in1.body.token)).status, 401);
  assert.equal((await login(key, 2)).status, 400);
});

test("rejects a reused challenge, a foreign origin and a bad signature", async () => {
  const key = new Passkey();
  const o = await call("POST", "/auth/register/options");
  const resp = await key.create(o.body.options);
  assert.equal((await call("POST", "/auth/register/verify", { flow: o.body.flow, response: resp })).status, 200);
  assert.equal((await call("POST", "/auth/register/verify", { flow: o.body.flow, response: resp })).status, 400);
  const o2 = await call("POST", "/auth/register/options");
  assert.equal((await call("POST", "/auth/register/verify", { flow: o2.body.flow, response: await new Passkey().create(o2.body.options, "https://evil.example") })).status, 400);
  const o3 = await call("POST", "/auth/login/options");
  const bad = await key.get(o3.body.options, 5);
  bad.response.signature = b64(new Uint8Array(70));
  assert.equal((await call("POST", "/auth/login/verify", { flow: o3.body.flow, response: bad })).status, 400);
  const cors = await fetch(API + "/me/data", { method: "OPTIONS", headers: { origin: "https://evil.example" } });
  assert.equal(cors.status, 403);
});

test("refuses oversized data and requests without a session", async () => {
  const key = new Passkey();
  const { body: { token } } = await register(key);
  assert.equal((await call("PUT", "/me/data", { x: "a".repeat(70000) }, token)).status, 413);
  assert.equal((await call("PUT", "/me/data", [1, 2], token)).status, 400);
  assert.equal((await call("GET", "/me/data")).status, 401);
});
