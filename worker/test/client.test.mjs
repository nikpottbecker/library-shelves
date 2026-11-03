// Runs the site's account.js against wrangler dev, with a software passkey in place of the browser's.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Passkey, b64 } from "./passkey.mjs";
import { startDev } from "./dev.mjs";

const PORT = 8798;
let stop;
before(async () => { stop = await startDev(PORT); });
after(() => stop());

// localStorage as a plain object: keys are own properties, the methods are hidden.
const ls = {};
for (const [k, f] of Object.entries({ getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } }))
  Object.defineProperty(ls, k, { value: f, enumerable: false });
globalThis.localStorage = ls;
globalThis.window = globalThis;
globalThis.document = { readyState: "complete", getElementById: () => null };
globalThis.PublicKeyCredential = {};
globalThis.ACCOUNT_API = `http://127.0.0.1:${PORT}`;
const key = new Passkey();
let counter = 0;
const plain = o => JSON.parse(JSON.stringify(o, (k, v) => (v instanceof Uint8Array ? b64(v) : v)));
Object.defineProperty(globalThis, "navigator", { value: { credentials: {
  create: async ({ publicKey }) => { const r = await key.create(plain(publicKey)); return { toJSON: () => r }; },
  get: async ({ publicKey }) => { const r = await key.get(plain(publicKey), ++counter); return { toJSON: () => r }; },
} } });
await import("../../site/account.js");
const { Account } = globalThis;
const wipe = () => { for (const k of Object.keys(ls)) delete ls[k]; };

test("an account keeps the Merkliste and brings it to a fresh device", async () => {
  ls["fav:geldern"] = JSON.stringify(["a", "b"]);
  await Account.signup();
  assert.ok(ls["account:token"]);
  ls["fav:heidelberg"] = JSON.stringify(["x"]);
  Account.changed();
  await new Promise(r => setTimeout(r, 1500));
  await Account.logout();
  assert.equal(ls["account:token"], undefined);

  wipe();
  ls["fav:geldern"] = JSON.stringify(["c"]);
  let refreshed = false;
  globalThis.onAccountData = () => { refreshed = true; };
  await Account.login();
  assert.ok(refreshed);
  assert.deepEqual(JSON.parse(ls["fav:geldern"]).sort(), ["a", "b", "c"]);
  assert.deepEqual(JSON.parse(ls["fav:heidelberg"]), ["x"]);

  await Account.remove();
  assert.equal(ls["account:token"], undefined);
  await assert.rejects(Account.login(), /kennt Library Shelves nicht/);
});
