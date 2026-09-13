#!/usr/bin/env node
/**
 * Local GUI launcher. Starts the gym if needed, then opens an Electron window.
 * Does not upload anything. Point the gym at any OpenAI-compatible model.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = process.env.APERTURE_URL || "http://127.0.0.1:8080/";

async function healthy() {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function run(cmd, args, extra = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
    ...extra,
  });
  return child;
}

if (!(await healthy())) {
  console.log("Starting Aperture gym…");
  const dev = run("npm", ["run", "dev"], { stdio: "pipe" });
  dev.stdout?.on("data", (buf) => process.stdout.write(buf));
  dev.stderr?.on("data", (buf) => process.stderr.write(buf));
  const start = Date.now();
  while (!(await healthy())) {
    if (Date.now() - start > 60_000) {
      console.error("Gym did not come up on http://127.0.0.1:8080");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

const electronArgs = [join(ROOT, "desktop/main.mjs")];
const child = run("npx", ["--yes", "electron@36", ...electronArgs]);
child.on("exit", (code) => process.exit(code ?? 0));
