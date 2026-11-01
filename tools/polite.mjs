// The only network path readers get: one request per second, retries on temporary errors.
const UA = "library-shelves (+https://github.com/nikpottbecker/library-shelves)";

// After CHECK_MINUTES, readers skip per-title checks so a very large library still finishes.
const CHECKS_END = Date.now() + +(process.env.CHECK_MINUTES || 1e6) * 6e4;

export function politeCtx() {
  let next = 0, requests = 0;
  return {
    log: console.error,
    skipChecks: () => Date.now() > CHECKS_END,
    get requests() { return requests; },
    async fetch(url, init = {}) {
      for (let attempt = 0; ; attempt++) {
        const at = Math.max(next, Date.now());
        next = at + 1000;
        if (at > Date.now()) await new Promise(r => setTimeout(r, at - Date.now()));
        requests++;
        const r = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(60e3) }).catch(e => e);
        if (r.ok || (init.redirect === "manual" && r.status >= 300 && r.status < 400)) return r;
        if (attempt === 3 || (r.status && r.status !== 429 && r.status < 500)) throw new Error(`${r.status || r.message} from ${url}`);
        await new Promise(res => setTimeout(res, 3000 * 3 ** attempt));
      }
    },
  };
}
