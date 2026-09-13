import { isHTMLElement, isHTMLInput, isHTMLSelect, isHTMLTextArea } from "./dom";
import { pageText } from "./snapshot";
import type { JsonValue } from "./types";

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

function overlap(text: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = text.toLowerCase();
  return tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
}

function labeledFields(root: ParentNode): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const dt of Array.from(root.querySelectorAll("dt"))) {
    const dd = dt.nextElementSibling;
    if (dd && dd.tagName === "DD") {
      const key = (dt.textContent ?? "").replace(/\s+/g, " ").trim();
      const value = (dd.textContent ?? "").replace(/\s+/g, " ").trim();
      if (key && value) fields[key] = value;
    }
  }
  for (const label of Array.from(root.querySelectorAll("label"))) {
    const name = (label.textContent ?? "").replace(/\s+/g, " ").trim();
    const id = label.getAttribute("for");
    const control = id
      ? root.querySelector(`#${cssEscape(id)}`)
      : label.querySelector("input, textarea, select");
    if (!name || !control) continue;
    let value = "";
    if (isHTMLInput(control) || isHTMLTextArea(control) || isHTMLSelect(control)) {
      value = control.value;
    } else {
      value = (control.textContent ?? "").trim();
    }
    if (value) fields[name] = value;
  }
  return fields;
}

function tablesOf(root: ParentNode): Array<{ caption: string; rows: Record<string, string>[] }> {
  return Array.from(root.querySelectorAll("table")).map((table) => {
    const caption = (table.querySelector("caption")?.textContent ?? table.getAttribute("aria-label") ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
      (th.textContent ?? "").replace(/\s+/g, " ").trim(),
    );
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("th,td")).map((td) =>
        (td.textContent ?? "").replace(/\s+/g, " ").trim(),
      );
      const row: Record<string, string> = {};
      cells.forEach((cell, i) => {
        row[headers[i] || `col${i + 1}`] = cell;
      });
      return row;
    });
    return { caption, rows };
  });
}

function listItems(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll("ul li, ol li"))
    .map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 24);
}

function patternFields(text: string): Record<string, string> {
  const found: Record<string, string> = {};
  const call = text.match(/call number:\s*([A-Z0-9][A-Z0-9. ]{2,})/i);
  if (call) found.callNumber = call[1]!.trim();
  const accession = text.match(/accession(?: number)?:\s*([A-Z0-9.]+)/i);
  if (accession) found.accession = accession[1]!.trim();
  const permit = text.match(/permit id:\s*([A-Z0-9-]+)/i);
  if (permit) found.permitId = permit[1]!.trim();
  const doi = text.match(/doi:\s*(\S+)/i);
  if (doi) found.doi = doi[1]!.trim();
  const score = text.match(/score\s+(\d+\s*\/\s*\d+)/i);
  if (score) found.score = score[1]!.replace(/\s+/g, "");
  return found;
}

function inferExtreme(
  tables: Array<{ rows: Record<string, string>[] }>,
  instruction: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!/warmest|highest|max|largest|greatest/i.test(instruction)) return out;
  for (const table of tables) {
    if (!table.rows.length) continue;
    const keys = Object.keys(table.rows[0] ?? {});
    const yearKey = keys.find((k) => /year/i.test(k));
    const numKey = keys.find((k) => /anomal|value|°|temp/i.test(k)) ?? keys.find((k) => k !== yearKey);
    if (!yearKey || !numKey) continue;
    let best: { year: string; n: number } | null = null;
    for (const row of table.rows) {
      const n = Number.parseFloat((row[numKey] ?? "").replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) continue;
      if (!best || n > best.n) best = { year: row[yearKey] ?? "", n };
    }
    if (best?.year) {
      out.warmestYear = best.year;
      out.warmestValue = String(best.n);
    }
  }
  return out;
}

export function extractStructured(
  root: ParentNode,
  instruction: string,
  schemaHint: string,
): { [key: string]: JsonValue } {
  const text = pageText(root);
  const tokens = tokenize(`${instruction} ${schemaHint}`);
  const fields = {
    ...labeledFields(root),
    ...patternFields(text),
  };
  const tables = tablesOf(root);
  Object.assign(fields, inferExtreme(tables, `${instruction} ${schemaHint}`));

  const headingBlocks: Record<string, string> = {};
  for (const heading of Array.from(root.querySelectorAll("h1,h2,h3"))) {
    if (!isHTMLElement(heading)) continue;
    const title = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
    const next = heading.nextElementSibling;
    const body = (next?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
    if (title) headingBlocks[title] = body;
  }

  const scored = text
    .split(/(?<=[.!?\n])\s+/)
    .map((sentence) => ({ sentence: sentence.trim(), score: overlap(sentence, tokens) }))
    .filter((s) => s.sentence && s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.sentence);

  const wanted = tokenize(schemaHint);
  const focused: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!wanted.length || overlap(`${k} ${v}`, wanted) > 0 || overlap(k, tokens) > 0) {
      focused[k] = v;
    }
  }

  return {
    instruction,
    schemaHint,
    fields: Object.keys(focused).length ? focused : fields,
    tables,
    lists: listItems(root),
    headings: headingBlocks,
    matches: scored,
    text: text.slice(0, 1600),
  };
}

function cssEscape(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(id);
  return id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
