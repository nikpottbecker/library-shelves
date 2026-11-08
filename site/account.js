// Optional passkey account: keeps the Merkliste in sync across devices. No e-mail, no password.
(() => {
  const API = (window.ACCOUNT_API || "").replace(/\/$/, "");
  const TOKEN = "account:token";
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const buf = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
    keys() { try { return Object.keys(localStorage); } catch { return []; } },
  };

  async function call(method, path, data) {
    const token = store.get(TOKEN);
    const r = await fetch(API + path, {
      method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) store.set(TOKEN, null);
    if (!r.ok) throw new Error(body.error || "Der Server antwortet gerade nicht. Bitte später noch einmal versuchen.");
    return body;
  }

  const asJSON = c => c.toJSON ? c.toJSON() : {
    id: c.id, rawId: b64(c.rawId), type: c.type, clientExtensionResults: c.getClientExtensionResults?.() || {},
    response: c.response.attestationObject
      ? { clientDataJSON: b64(c.response.clientDataJSON), attestationObject: b64(c.response.attestationObject), transports: c.response.getTransports?.() || [] }
      : { clientDataJSON: b64(c.response.clientDataJSON), authenticatorData: b64(c.response.authenticatorData), signature: b64(c.response.signature), userHandle: c.response.userHandle ? b64(c.response.userHandle) : undefined },
  };

  // Favourites live in localStorage as "fav:<library id>". The account keeps a copy of all of them.
  const local = () => Object.fromEntries(store.keys().filter(k => k.startsWith("fav:")).map(k => [k.slice(4), JSON.parse(store.get(k) || "[]")]));
  async function merge() {
    const { data } = await call("GET", "/me/data");
    const favs = local();
    for (const [lib, ids] of Object.entries(data.favs || {})) favs[lib] = [...new Set([...(favs[lib] || []), ...ids])];
    for (const [lib, ids] of Object.entries(favs)) store.set("fav:" + lib, JSON.stringify(ids));
    await call("PUT", "/me/data", { favs });
    window.onAccountData?.();
  }

  async function signup() {
    const { flow, options } = await call("POST", "/auth/register/options");
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON ? PublicKeyCredential.parseCreationOptionsFromJSON(options) : {
      ...options, challenge: buf(options.challenge), user: { ...options.user, id: buf(options.user.id) },
      excludeCredentials: (options.excludeCredentials || []).map(c => ({ ...c, id: buf(c.id) })),
    };
    const cred = await navigator.credentials.create({ publicKey });
    store.set(TOKEN, (await call("POST", "/auth/register/verify", { flow, response: asJSON(cred) })).token);
    await merge();
  }
  async function login() {
    const { flow, options } = await call("POST", "/auth/login/options");
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON ? PublicKeyCredential.parseRequestOptionsFromJSON(options) : {
      ...options, challenge: buf(options.challenge), allowCredentials: (options.allowCredentials || []).map(c => ({ ...c, id: buf(c.id) })),
    };
    const cred = await navigator.credentials.get({ publicKey });
    store.set(TOKEN, (await call("POST", "/auth/login/verify", { flow, response: asJSON(cred) })).token);
    await merge();
  }
  async function logout() { await call("POST", "/auth/logout", {}).catch(() => {}); store.set(TOKEN, null); }
  async function remove() { await call("DELETE", "/me"); store.set(TOKEN, null); }

  let timer;
  function changed() {
    if (!store.get(TOKEN)) return;
    clearTimeout(timer);
    timer = setTimeout(() => call("PUT", "/me/data", { favs: local() }).catch(() => {}), 800);
  }

  function ui() {
    const box = document.getElementById("account");
    if (!box) return;
    if (!API) { box.hidden = true; return; }
    box.hidden = false;
    if (!window.PublicKeyCredential) {
      const heading = Object.assign(document.createElement("h2"), { textContent: "Konto" });
      const message = Object.assign(document.createElement("p"), { textContent: "Dieser Browser unterstützt keine Passkeys. Deine lokale Merkliste funktioniert trotzdem." });
      box.replaceChildren(heading, message);
      return;
    }
    const signedIn = !!store.get(TOKEN);
    const msg = document.createElement("p"), row = document.createElement("p");
    msg.setAttribute("aria-live", "polite");
    const button = (text, run) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "linkbtn"; b.textContent = text;
      b.onclick = async () => {
        b.disabled = true;
        try { await run(); ui(); } catch (e) { msg.textContent = e.name === "NotAllowedError" ? "Abgebrochen." : e.message; b.disabled = false; }
      };
      return b;
    };
    if (signedIn) {
      msg.textContent = "Angemeldet. Deine Merkliste wird auf allen Geräten mit diesem Passkey gespeichert.";
      const del = button("Konto löschen", async () => {
        if (del.dataset.sure) { await remove(); return; }
        del.dataset.sure = "1"; del.textContent = "Wirklich löschen? Noch einmal tippen"; del.disabled = false;
        throw Object.assign(new Error("Alle gespeicherten Daten werden gelöscht."), { name: "Confirm" });
      });
      row.append(button("Abmelden", logout), " · ", del);
    } else {
      msg.textContent = "Mit Passkey anmelden, um deine Merkliste auf allen Geräten zu haben. Ohne E-Mail und ohne Passwort. Geht der Passkey verloren, ist auch das Konto weg.";
      row.append(button("Konto erstellen", signup), " · ", button("Anmelden", login));
    }
    box.replaceChildren(Object.assign(document.createElement("h2"), { textContent: "Konto" }), msg, row);
  }

  window.Account = { changed, ui, signup, login, logout, remove };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ui) : ui();
})();
