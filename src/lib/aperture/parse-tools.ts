import { TOOL_NAMES } from "./tools";
import { uid } from "./ids";
import type { JsonValue, ToolCall, ToolName } from "./types";

const NAMES = new Set<string>(TOOL_NAMES);

export function parseTextToolCalls(content: string): ToolCall[] {
  if (!content?.trim()) return [];
  const found: ToolCall[] = [];

  for (const block of content.matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi)) {
    push(found, fromUnknown(block[1]));
  }

  for (const block of content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    push(found, fromUnknown(block[1]));
  }

  if (!found.length) push(found, fromUnknown(content));

  if (!found.length) {
    const named = content.match(
      /(?:call|tool|function|name)\s*[:=]\s*["']?([a-z_]+)["']?/i,
    );
    const name = named?.[1];
    if (name && NAMES.has(name)) {
      const brace = content.match(/\{[\s\S]*\}/);
      found.push({
        id: uid("call"),
        name,
        arguments: asArgs(tryJson(brace?.[0] ?? "")),
      });
    }
  }

  return found.slice(0, 2);
}

function push(into: ToolCall[], call: ToolCall | null) {
  if (call && !into.some((c) => c.name === call.name && JSON.stringify(c.arguments) === JSON.stringify(call.arguments))) {
    into.push(call);
  }
}

function fromUnknown(raw: string | undefined): ToolCall | null {
  const obj = tryJson(raw ?? "");
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const rec = obj as Record<string, unknown>;
  const fn = rec.function;
  const nested =
    fn && typeof fn === "object" && !Array.isArray(fn)
      ? (fn as Record<string, unknown>)
      : null;
  const name = String(rec.tool ?? rec.name ?? nested?.name ?? rec.function ?? "");
  if (!NAMES.has(name)) return null;
  const args = rec.arguments ?? rec.parameters ?? rec.args ?? nested?.arguments ?? {};
  return {
    id: uid("call"),
    name: name as ToolName,
    arguments: asArgs(args),
  };
}

function asArgs(value: unknown): { [key: string]: JsonValue } {
  if (typeof value === "string") {
    const parsed = tryJson(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as { [key: string]: JsonValue };
    }
    return value ? { raw: value } : {};
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as { [key: string]: JsonValue };
  }
  return {};
}

function tryJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
