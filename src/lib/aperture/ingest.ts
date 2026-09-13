import { uid } from "./ids";
import type { ChatMessage, Episode, HarnessDoc } from "./types";

const MAX_DOC_CHARS = 80_000;
const MAX_DOCS = 32;

export type IngestResult = {
  docs: HarnessDoc[];
  episodes: Episode[];
  skipped: string[];
};

export function ingestFiles(files: Array<{ name: string; text: string }>): IngestResult {
  const docs: HarnessDoc[] = [];
  const episodes: Episode[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const name = file.name || "untitled.md";
    const text = file.text.slice(0, MAX_DOC_CHARS);
    if (!text.trim()) {
      skipped.push(`${name}: empty`);
      continue;
    }
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "jsonl" || looksLikeJsonl(text)) {
      const parsed = ingestJsonl(name, text);
      docs.push(...parsed.docs);
      episodes.push(...parsed.episodes);
      skipped.push(...parsed.skipped);
      continue;
    }
    if (ext === "json" || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      const parsed = ingestJson(name, text);
      if (parsed.episodes.length || parsed.docs.length) {
        docs.push(...parsed.docs);
        episodes.push(...parsed.episodes);
        continue;
      }
    }
    docs.push(makeDoc(name, ext === "md" || ext === "markdown" ? "markdown" : "text", text));
  }

  return {
    docs: docs.slice(0, MAX_DOCS),
    episodes: episodes.slice(0, 40),
    skipped,
  };
}

export function ingestPasted(text: string): IngestResult {
  return ingestFiles([{ name: "pasted.txt", text }]);
}

function ingestJsonl(name: string, text: string): IngestResult {
  const docs: HarnessDoc[] = [];
  const episodes: Episode[] = [];
  const skipped: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const leftover: unknown[] = [];
  lines.forEach((line, i) => {
    try {
      const row = JSON.parse(line) as unknown;
      const ep = episodeFromUnknown(row, `${name}:${i + 1}`);
      if (ep) {
        episodes.push(ep);
        return;
      }
      leftover.push(row);
    } catch {
      skipped.push(`${name}:${i + 1} not JSON`);
    }
  });
  if (leftover.length) {
    docs.push(makeDoc(name, "jsonl", leftover.map((row) => JSON.stringify(row)).join("\n")));
  }
  return { docs, episodes, skipped };
}

function ingestJson(name: string, text: string): IngestResult {
  try {
    const raw = JSON.parse(text) as unknown;
    const ep = episodeFromUnknown(raw, name);
    if (ep) return { docs: [], episodes: [ep], skipped: [] };
    if (Array.isArray(raw)) {
      const episodes = raw.map((row, i) => episodeFromUnknown(row, `${name}:${i}`)).filter((e): e is Episode => Boolean(e));
      if (episodes.length) return { docs: [], episodes, skipped: [] };
    }
    return { docs: [makeDoc(name, "json", text)], episodes: [], skipped: [] };
  } catch {
    return { docs: [makeDoc(name, "text", text)], episodes: [], skipped: [] };
  }
}

function episodeFromUnknown(raw: unknown, fallbackId: string): Episode | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const messages = rec.messages;
  if (!Array.isArray(messages) || !messages.length) return null;
  const parsed: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const msg = m as Record<string, unknown>;
    const role = String(msg.role ?? "");
    if (!["system", "user", "assistant", "tool"].includes(role)) continue;
    parsed.push({
      role: role as ChatMessage["role"],
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content ?? ""),
      toolCallId: typeof msg.tool_call_id === "string" ? msg.tool_call_id : undefined,
      name: typeof msg.name === "string" ? msg.name : undefined,
      toolCalls: Array.isArray(msg.tool_calls)
        ? (msg.tool_calls as Array<Record<string, unknown>>).map((c) => ({
            id: String(c.id ?? uid("call")),
            name: String((c.function as { name?: string } | undefined)?.name ?? c.name ?? "run"),
            arguments: parseArgs((c.function as { arguments?: string } | undefined)?.arguments ?? c.arguments),
          }))
        : undefined,
    });
  }
  if (!parsed.length) return null;
  const taskId = String(rec.task ?? rec.taskId ?? "reading-room");
  return {
    id: String(rec.id ?? uid("imp")),
    taskId,
    model: String(rec.model ?? "imported"),
    providerId: String(rec.provider ?? rec.providerId ?? "custom"),
    startedAt: Number(rec.startedAt ?? Date.now()),
    endedAt: typeof rec.endedAt === "number" ? rec.endedAt : Date.now(),
    status: rec.status === "succeeded" ? "succeeded" : "succeeded",
    instruction: String(rec.instruction ?? `Imported ${fallbackId}`),
    steps: [],
    spans: [],
    messages: parsed,
    reward: Number(rec.reward ?? 0),
    answer: typeof rec.answer === "string" ? rec.answer : undefined,
    notes: "imported",
    vision: Boolean(rec.vision),
    progress: [],
    usage: { promptTokens: 0, completionTokens: 0 },
  };
}

function parseArgs(raw: unknown): { [key: string]: import("./types").JsonValue } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as { [key: string]: import("./types").JsonValue };
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as { [key: string]: import("./types").JsonValue };
      }
    } catch {
      return { raw };
    }
  }
  return {};
}

function looksLikeJsonl(text: string): boolean {
  const lines = text.trim().split("\n").filter(Boolean).slice(0, 3);
  return lines.length > 0 && lines.every((l) => l.startsWith("{") || l.startsWith("["));
}

function makeDoc(name: string, kind: HarnessDoc["kind"], body: string): HarnessDoc {
  return {
    id: uid("doc"),
    name,
    kind,
    body,
    addedAt: Date.now(),
    bytes: body.length,
  };
}
