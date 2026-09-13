import type { SnapshotAction } from "./types";

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

export type RankedCandidate = {
  id: string;
  role: string;
  name: string;
  line: string;
  score: number;
};

export function parseTreeLine(line: string): RankedCandidate | null {
  const match = line.match(/\[(\d+-\d+)\]\s+(\S+)(?:\s+("(?:\\.|[^"])*"|[^\s]+))?(.*)$/);
  if (!match) return null;
  const nameRaw = match[3] ?? "";
  const name = nameRaw.startsWith('"') ? nameRaw.slice(1, -1) : nameRaw;
  return {
    id: match[1]!,
    role: match[2]!,
    name,
    line: line.trim(),
    score: 0,
  };
}

export function rankCandidates(tree: string, instruction: string): RankedCandidate[] {
  const tokens = tokenize(instruction);
  const interactive = /button|link|textbox|searchbox|combobox|checkbox|radio|tab|menuitem/;
  const rows = tree
    .split("\n")
    .map(parseTreeLine)
    .filter((row): row is RankedCandidate => Boolean(row && interactive.test(row.role)));

  for (const row of rows) {
    const hay = `${row.role} ${row.name} ${row.line}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length > 3 ? 2 : 1;
    }
    if (/click|press|open|submit|search/.test(instruction.toLowerCase()) && /button|link/.test(row.role)) {
      score += 0.4;
    }
    if (/fill|type|enter|search for/.test(instruction.toLowerCase()) && /textbox|searchbox/.test(row.role)) {
      score += 1.2;
    }
    if (/select|choose|decade|filter/.test(instruction.toLowerCase()) && /combobox/.test(row.role)) {
      score += 1.2;
    }
    row.score = score;
  }

  return rows.sort((a, b) => b.score - a.score);
}

export function planFromCandidates(instruction: string, ranked: RankedCandidate[]): string {
  if (!ranked.length) {
    return "No interactive nodes. Snapshot again after the page settles.";
  }
  const top = ranked.slice(0, 3);
  const hint = instruction.trim()
    ? `For "${instruction.trim()}", try ${top.map((c) => `${c.role} [${c.id}]`).join(", ")}.`
    : `Top targets: ${top.map((c) => `${c.role} [${c.id}]`).join(", ")}.`;
  return hint + " IDs are valid only until the next navigation. Prefer run.actions with these IDs.";
}

export function resolveAct(tree: string, action: string): SnapshotAction | null {
  const lower = action.toLowerCase();
  const ranked = rankCandidates(tree, action);
  const quoted = action.match(/['"]([^'"]+)['"]/)?.[1];

  if (/fill|type|enter|search for|search\s/.test(lower)) {
    const box =
      ranked.find((r) => /textbox|searchbox/.test(r.role)) ??
      parseTreeLine(tree.split("\n").find((l) => /textbox|searchbox/.test(l)) ?? "");
    if (box) {
      const value =
        quoted ??
        action.replace(/^(fill|type|enter|search for|search)\s+(in(to)?\s+)?/i, "").trim();
      return { op: /type/.test(lower) ? "type" : "fill", id: box.id, value };
    }
  }

  if (/select|choose|set/.test(lower) && /combobox|select|decade|filter/.test(lower)) {
    const box = ranked.find((r) => /combobox/.test(r.role));
    if (box) {
      return { op: "select", id: box.id, value: quoted ?? action.replace(/^(select|choose|set)\s+/i, "").trim() };
    }
  }

  if (/press|enter key|hit enter/.test(lower) && /enter|return/.test(lower)) {
    return { op: "press", key: "Enter" };
  }

  if (/scroll/.test(lower)) {
    const target = ranked[0];
    if (target) return { op: "scroll", id: target.id };
  }

  const clickable = ranked.find((r) => /button|link|tab|radio|checkbox/.test(r.role) && r.score > 0) ?? ranked[0];
  if (clickable && /click|press|open|choose|select|grade|submit|reveal|search|tab/.test(lower)) {
    return { op: "click", id: clickable.id };
  }

  return clickable ? { op: "click", id: clickable.id } : null;
}
