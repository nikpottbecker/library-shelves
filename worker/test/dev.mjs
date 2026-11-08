import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));

function stopTree(pid) {
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
  else try { process.kill(-pid); } catch {}
}

// Starts `wrangler dev` with a local D1 database and returns a function that stops it.
export async function startDev(port) {
  await new Promise((ok, fail) => spawn(process.execPath, [wrangler, "d1", "migrations", "apply", "library-shelves-accounts", "--local"], { stdio: "ignore" })
    .on("exit", c => c ? fail(new Error("migrations failed")) : ok()));
  const dev = spawn(process.execPath, [wrangler, "dev", "--local", "--port", String(port)], { stdio: "ignore", detached: true });
  for (let i = 0; i < 60; i++) {
    if (await fetch(`http://127.0.0.1:${port}`).then(() => true, () => false)) return () => stopTree(dev.pid);
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("wrangler dev did not start");
}
