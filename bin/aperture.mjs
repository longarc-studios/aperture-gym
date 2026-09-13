#!/usr/bin/env node
/**
 * Aperture CLI — same gym as the web UI, headless, for Grok Build / scripts.
 *
 *   npm run aperture -- list
 *   npm run aperture -- play civic-library --reference
 *   npm run aperture -- play civic-library --model llama3.1 --base-url http://127.0.0.1:11434/v1
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_URL = process.env.APERTURE_URL || "http://127.0.0.1:8080";

const TASKS = [
  "civic-library",
  "climate-observatory",
  "citation-desk",
  "recipe-archive",
  "literacy-tutor",
  "permit-desk",
  "county-archive",
  "reading-room",
];

const args = process.argv.slice(2);
const cmd = args[0] ?? "help";
const flags = parseFlags(args.slice(cmd === "play" ? 2 : 1));
const taskArg = cmd === "play" ? args[1] : flags.task;

if (cmd === "help" || flags.help) {
  console.log(`Aperture CLI — exact gym, no GUI

Commands
  list
  play <task> --reference
  play <task> --model <id> [--provider xai|openai|ollama|...] [--base-url ...] [--api-key ...]
  export <task> --reference --format jsonl|sft|trajectories|markdown|openai

Env
  APERTURE_URL   gym origin (default ${DEFAULT_URL})
`);
  process.exit(0);
}

if (cmd === "list") {
  for (const id of TASKS) console.log(id);
  process.exit(0);
}

if (cmd !== "play" && cmd !== "export") {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}

const task = taskArg;
if (!TASKS.includes(task)) {
  console.error(`unknown task: ${task ?? "(missing)"}\nknown: ${TASKS.join(", ")}`);
  process.exit(1);
}

await ensureGym(flags.url ?? DEFAULT_URL);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: flags.headed ? false : true });
const page = await browser.newPage();
const origin = (flags.url ?? DEFAULT_URL).replace(/\/$/, "");
await page.goto(`${origin}/harness/${task}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.apertureReady === "1", null, {
  timeout: 30_000,
});

const wantModel = Boolean(flags.model) && !flags.reference;
const result = wantModel
  ? await page.evaluate(async (config) => window.__APERTURE_CLI__.playModel(config), {
      providerId: flags.provider ?? inferProvider(flags),
      model: String(flags.model),
      baseUrl: flags["base-url"],
      apiKey: flags["api-key"],
    })
  : await page.evaluate(async () => window.__APERTURE_CLI__.playReference());

if (cmd === "export" || flags.format) {
  const format = flags.format || "jsonl";
  const file = await page.evaluate(async (fmt) => window.__APERTURE_CLI__.exportFile(fmt), format);
  const out = flags.out || join(ROOT, "artifacts", file.filename);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, file.body);
  result.export = out;
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
if (result.status === "failed") process.exit(2);

function parseFlags(list) {
  const out = {};
  for (let i = 0; i < list.length; i += 1) {
    const token = list[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = list[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function inferProvider(f) {
  const url = String(f["base-url"] ?? "");
  if (url.includes("11434")) return "ollama";
  if (url.includes("1234")) return "lmstudio";
  if (url.includes("8000")) return "vllm";
  return f.provider ?? "custom";
}

async function ensureGym(url) {
  if (await healthy(url)) return;
  console.error(`starting gym at ${url} …`);
  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "ignore",
    env: process.env,
    detached: true,
  });
  child.unref();
  const start = Date.now();
  while (!(await healthy(url))) {
    if (Date.now() - start > 60_000) {
      console.error("gym did not come up");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function healthy(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}
