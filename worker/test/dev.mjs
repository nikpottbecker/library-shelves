import { spawn } from "node:child_process";

// Starts `wrangler dev` with a local D1 database and returns a function that stops it.
export async function startDev(port) {
  await new Promise((ok, fail) => spawn("npx", ["wrangler", "d1", "migrations", "apply", "library-shelves-accounts", "--local"], { stdio: "ignore" })
    .on("exit", c => c ? fail(new Error("migrations failed")) : ok()));
  const dev = spawn("npx", ["wrangler", "dev", "--local", "--port", String(port)], { stdio: "ignore", detached: true });
  for (let i = 0; i < 60; i++) {
    if (await fetch(`http://127.0.0.1:${port}`).then(() => true, () => false)) return () => { try { process.kill(-dev.pid); } catch {} };
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not start");
}
