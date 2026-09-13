import type { SnapshotAction } from "./types";
import { performAction } from "./actions";

/**
 * Interprets a tiny Playwright-shaped subset. Never evals.
 */
export function interpretCode(
  root: ParentNode,
  code: string,
  navigate?: (taskId: string) => void,
): string {
  const logs: string[] = [];
  const statements = splitStatements(code);
  let returnValue: unknown = null;

  for (const raw of statements) {
    const stmt = raw.trim();
    if (!stmt) continue;

    const ret = stmt.match(/^return\s+([\s\S]+)$/i);
    if (ret) {
      returnValue = evalReturn(root, ret[1] ?? "");
      continue;
    }

    const gotoMatch = stmt.match(/page\.goto\(\s*(['"`])(.+?)\1\s*\)/);
    if (gotoMatch) {
      logs.push(performAction(root, { op: "goto", url: gotoMatch[2] }, navigate));
      continue;
    }

    const pressMatch = stmt.match(/page\.keyboard\.press\(\s*(['"`])(.+?)\1\s*\)/);
    if (pressMatch) {
      logs.push(performAction(root, { op: "press", key: pressMatch[2] }));
      continue;
    }

    const loc = stmt.match(
      /page\.locator\(\s*(['"`])(.+?)\1\s*\)\s*\.\s*(click|fill|type|hover)\(\s*(?:(['"`])([\s\S]*?)\4\s*)?\)/,
    );
    if (loc) {
      const selector = loc[2] ?? "";
      const method = loc[3] as "click" | "fill" | "type" | "hover";
      const value = loc[5];
      const el = resolveLocator(root, selector);
      if (!el) throw new Error(`locator not found: ${selector}`);
      const id = el.getAttribute("data-aperture-id") ?? stamp(el);
      const op: SnapshotAction["op"] = method;
      logs.push(performAction(root, { op, id, value }));
      continue;
    }

    if (/^await\s+page\.(title|url)\(\s*\)/.test(stmt)) {
      continue;
    }

    throw new Error(
      `Code not in the Stagehand-shaped whitelist: "${stmt.slice(0, 120)}". Use actions[] or page.goto / page.locator / page.title / page.url / page.keyboard.press.`,
    );
  }

  const title = pageTitle(root);
  const url = "";
  if (returnValue !== null) {
    return JSON.stringify({ result: returnValue, log: logs, url, title });
  }
  return JSON.stringify({ log: logs, url, title });
}

function splitStatements(code: string): string[] {
  const cleaned = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const out: string[] = [];
  let buf = "";
  let quote: string | null = null;
  for (const ch of cleaned) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ";") {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.replace(/^await\s+/, "").trim());
}

function evalReturn(root: ParentNode, expr: string): unknown {
  const trimmed = expr.replace(/;$/, "").trim();
  if (/^await\s+page\.title\(\s*\)$/.test(trimmed) || /^page\.title\(\s*\)$/.test(trimmed)) {
    return pageTitle(root);
  }
  if (/^await\s+page\.url\(\s*\)$/.test(trimmed) || /^page\.url\(\s*\)$/.test(trimmed)) {
    return "";
  }
  const obj = trimmed.match(/^\{([\s\S]*)\}$/);
  if (obj) {
    const result: Record<string, string> = {};
    if (/title/.test(obj[1] ?? "")) result.title = pageTitle(root);
    if (/url/.test(obj[1] ?? "")) result.url = "";
    return result;
  }
  return trimmed;
}

function resolveLocator(root: ParentNode, selector: string): Element | null {
  if (/^\d+-\d+$/.test(selector)) {
    return root.querySelector(`[data-aperture-id="${selector}"]`);
  }
  if (selector.startsWith("text=") || selector.startsWith("text/")) {
    const needle = selector.replace(/^text[=/]/, "").replace(/^['"]|['"]$/g, "");
    const all = Array.from(root.querySelectorAll("a,button,h1,h2,h3,label,p,li,td,th"));
    return (
      all.find((el) => (el.textContent ?? "").trim().toLowerCase() === needle.toLowerCase()) ??
      all.find((el) => (el.textContent ?? "").toLowerCase().includes(needle.toLowerCase())) ??
      null
    );
  }
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function pageTitle(root: ParentNode): string {
  return root.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function stamp(el: Element): string {
  const existing = el.getAttribute("data-aperture-id");
  if (existing) return existing;
  const id = `1-dyn-${Math.random().toString(36).slice(2, 6)}`;
  el.setAttribute("data-aperture-id", id);
  return id;
}
