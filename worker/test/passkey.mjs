// A software passkey (ES256) for tests.
export const ORIGIN = "https://nikpottbecker.github.io", RP = "nikpottbecker.github.io";
export const b64 = b => Buffer.from(b).toString("base64url");
export const sha = async d => new Uint8Array(await crypto.subtle.digest("SHA-256", typeof d === "string" ? new TextEncoder().encode(d) : d));

function cbor(v) {
  const head = (major, n) => n < 24 ? [major << 5 | n] : n < 256 ? [major << 5 | 24, n] : [major << 5 | 25, n >> 8, n & 255];
  if (typeof v === "number") return Uint8Array.from(v >= 0 ? head(0, v) : head(1, -1 - v));
  if (typeof v === "string") { const t = new TextEncoder().encode(v); return Uint8Array.from([...head(3, t.length), ...t]); }
  if (v instanceof Uint8Array) return Uint8Array.from([...head(2, v.length), ...v]);
  const entries = v instanceof Map ? [...v] : Object.entries(v);
  return Uint8Array.from([...head(5, entries.length), ...entries.flatMap(([k, x]) => [...cbor(k), ...cbor(x)])]);
}
const der = raw => {
  const int = b => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.slice(i); return b[0] & 128 ? [0, ...b] : [...b]; };
  const r = int(raw.slice(0, 32)), s = int(raw.slice(32));
  return Uint8Array.from([0x30, r.length + s.length + 4, 2, r.length, ...r, 2, s.length, ...s]);
};

export class Passkey {
  async create(options, origin = ORIGIN) {
    this.keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", this.keys.publicKey));
    this.id = crypto.getRandomValues(new Uint8Array(16));
    this.userHandle = options.user.id;
    const cose = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, raw.slice(1, 33)], [-3, raw.slice(33)]]));
    const authData = Uint8Array.from([...await sha(RP), 0x45, 0, 0, 0, 0, ...new Uint8Array(16), 0, 16, ...this.id, ...cose]);
    const clientData = JSON.stringify({ type: "webauthn.create", challenge: options.challenge, origin, crossOrigin: false });
    return { id: b64(this.id), rawId: b64(this.id), type: "public-key", clientExtensionResults: {},
      response: { clientDataJSON: b64(new TextEncoder().encode(clientData)), attestationObject: b64(cbor({ fmt: "none", attStmt: {}, authData })), transports: ["internal"] } };
  }
  async get(options, counter = 1) {
    const authData = Uint8Array.from([...await sha(RP), 0x05, 0, 0, 0, counter]);
    const clientData = new TextEncoder().encode(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin: ORIGIN, crossOrigin: false }));
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, this.keys.privateKey, Uint8Array.from([...authData, ...await sha(clientData)])));
    return { id: b64(this.id), rawId: b64(this.id), type: "public-key", clientExtensionResults: {},
      response: { authenticatorData: b64(authData), clientDataJSON: b64(clientData), signature: b64(der(sig)), userHandle: this.userHandle } };
  }
}

