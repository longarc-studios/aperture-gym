import { parseTextToolCalls } from "./parse-tools";
import { getProvider, isLocalUrl } from "./providers";
import { toolsForOpenAI } from "./tools";
import type { ChatMessage, CompleteOutput, ContentPart, JsonValue, ModelConfig, ToolCall } from "./types";

export type CompleteInput = {
  config: ModelConfig;
  messages: ChatMessage[];
  vision?: boolean;
};

export type RuntimeProbe = {
  ok: boolean;
  models: string[];
  error?: string;
  local: boolean;
  baseUrl: string;
};

type OAContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OAMessage = {
  role: string;
  content?: string | OAContentPart[] | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

const MAX_IMAGES = 2;

export async function complete(input: CompleteInput): Promise<CompleteOutput> {
  if (input.messages.length > 48) {
    return { ok: false, error: "Transcript too long — start a new episode." };
  }

  const provider = getProvider(input.config.providerId);
  const baseUrl = (input.config.baseUrl || provider.defaultBaseUrl).replace(/\/$/, "");
  const model = input.config.model || provider.defaultModel;
  const local = provider.local || isLocalUrl(baseUrl);

  if (!/^https?:\/\//i.test(baseUrl)) {
    return { ok: false, error: "Base URL must be http or https." };
  }

  let apiKey = "";
  if (provider.usesServerKey) {
    apiKey = process.env.XAI_API_KEY ?? "";
    if (!apiKey) {
      return {
        ok: false,
        error:
          "xAI is not available here. Switch to Ollama / LM Studio on this machine, or paste another provider key.",
      };
    }
  } else if (provider.needsUserKey) {
    apiKey = input.config.apiKey?.trim() ?? "";
    if (!apiKey) {
      return {
        ok: false,
        error: `An API key is required for ${provider.label}. It is used for this request only.`,
      };
    }
  } else {
    apiKey = input.config.apiKey?.trim() || "local";
  }

  const trimmed = trimImages(input.messages, input.vision ? MAX_IMAGES : 0);
  const messages: OAMessage[] = trimmed.map(toOpenAIMessage);
  const timeoutMs = local ? 120_000 : 45_000;

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 2048,
  };
  if (!local) payload.parallel_tool_calls = false;

  try {
    let res = await postChat(baseUrl, apiKey, provider.id, { ...payload, tools: toolsForOpenAI(), tool_choice: "auto" }, timeoutMs);
    if (!res.ok && (res.status === 400 || res.status === 422)) {
      res = await postChat(baseUrl, apiKey, provider.id, payload, timeoutMs);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: friendlyHttp(res.status, text, baseUrl, local, provider.label) };
    }

    const body = (await res.json()) as {
      choices?: Array<{
        message?: {
          role?: string;
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = body.choices?.[0]?.message;
    if (!choice) return { ok: false, error: "The model returned an empty completion." };

    let toolCalls: ToolCall[] = (choice.tool_calls ?? [])
      .filter((c) => c.function?.name)
      .map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: parseArgs(c.function.arguments),
      }));
    if (!toolCalls.length) {
      toolCalls = parseTextToolCalls(choice.content ?? "");
    }

    return {
      ok: true,
      message: {
        role: "assistant",
        content: choice.content ?? "",
        toolCalls: toolCalls.length ? toolCalls : undefined,
      },
      usage: {
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: friendlyNetwork(err, baseUrl, local, provider.label, provider.hint) };
  }
}

export async function probeRuntime(baseUrlRaw: string): Promise<RuntimeProbe> {
  const baseUrl = (baseUrlRaw || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
  const local = isLocalUrl(baseUrl);
  if (!/^https?:\/\//i.test(baseUrl)) {
    return { ok: false, models: [], error: "Base URL must be http or https.", local, baseUrl };
  }
  try {
    const modelsUrl = `${baseUrl}/models`;
    const res = await fetch(modelsUrl, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const body = (await res.json()) as { data?: Array<{ id?: string }>; models?: Array<{ name?: string; model?: string }> };
      const fromOpenAI = (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
      const fromOllama = (body.models ?? [])
        .map((m) => m.name || m.model)
        .filter((id): id is string => Boolean(id));
      const models = unique(fromOpenAI.length ? fromOpenAI : fromOllama);
      return { ok: true, models, local, baseUrl };
    }
    const origin = new URL(baseUrl).origin;
    const tags = await fetch(`${origin}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (tags.ok) {
      const body = (await tags.json()) as { models?: Array<{ name?: string }> };
      const models = unique((body.models ?? []).map((m) => m.name).filter((id): id is string => Boolean(id)));
      return { ok: true, models, local, baseUrl };
    }
    return {
      ok: false,
      models: [],
      error: `${res.status} from ${modelsUrl}`,
      local,
      baseUrl,
    };
  } catch (err) {
    return {
      ok: false,
      models: [],
      error: friendlyNetwork(err, baseUrl, local, "runtime"),
      local,
      baseUrl,
    };
  }
}

export function aiStatus() {
  return {
    xai: Boolean(process.env.XAI_API_KEY),
  };
}

function postChat(
  baseUrl: string,
  apiKey: string,
  providerId: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
) {
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(providerId === "openrouter"
        ? { "HTTP-Referer": "https://aperture.local", "X-Title": "Aperture" }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function friendlyHttp(status: number, text: string, baseUrl: string, local: boolean, label: string) {
  const snippet = text.replace(/\s+/g, " ").slice(0, 220);
  if (status === 404 && local) {
    return `Nothing at ${baseUrl}/chat/completions. Confirm the runtime is OpenAI-compatible and the base URL ends in /v1.`;
  }
  return `${label} error ${status}: ${snippet || "empty body"}`;
}

function friendlyNetwork(err: unknown, baseUrl: string, local: boolean, label: string, hint?: string) {
  const msg = err instanceof Error ? err.message : String(err);
  if (local && /fetch|ECONNREFUSED|Failed to fetch|network|abort|timeout/i.test(msg)) {
    return [
      `Nothing is listening at ${baseUrl}.`,
      hint ? `Start it with: ${hint}.` : "Start the local runtime, then try again.",
      "Play reference works with no model.",
    ].join(" ");
  }
  return `${label}: ${msg}`;
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function parseArgs(raw: string): { [key: string]: JsonValue } {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as { [key: string]: JsonValue };
    }
    return {};
  } catch {
    return { raw };
  }
}

function toOpenAIMessage(msg: ChatMessage): OAMessage {
  if (msg.role === "assistant" && msg.toolCalls?.length) {
    return {
      role: "assistant",
      content: msg.content || null,
      tool_calls: msg.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: {
          name: c.name,
          arguments: JSON.stringify(c.arguments),
        },
      })),
    };
  }
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.toolCallId,
      content: partsToContent(msg.parts, msg.content),
    };
  }
  return { role: msg.role, content: partsToContent(msg.parts, msg.content) };
}

function partsToContent(parts: ContentPart[] | undefined, fallback: string): string | OAContentPart[] {
  if (!parts?.length) return fallback;
  return parts.map((part) =>
    part.type === "image"
      ? { type: "image_url" as const, image_url: { url: part.dataUrl } }
      : { type: "text" as const, text: part.text },
  );
}

function trimImages(messages: ChatMessage[], keep: number): ChatMessage[] {
  if (keep <= 0) {
    return messages.map((m) => ({
      ...m,
      parts: undefined,
      content: m.parts?.some((p) => p.type === "image")
        ? `${m.content}\n[image omitted — vision off]`
        : m.content,
    }));
  }
  let remaining = keep;
  const reversed = [...messages].reverse().map((m) => {
    if (!m.parts?.some((p) => p.type === "image")) return m;
    if (remaining > 0) {
      remaining -= 1;
      return m;
    }
    return {
      ...m,
      parts: m.parts.filter((p) => p.type !== "image"),
      content: `${m.content}\n[earlier screenshot omitted; a later one is current]`,
    };
  });
  return reversed.reverse();
}
