import type { ProviderId } from "./types";

export type ProviderPreset = {
  id: ProviderId;
  label: string;
  blurb: string;
  defaultModel: string;
  models: string[];
  defaultBaseUrl: string;
  usesServerKey: boolean;
  needsUserKey: boolean;
  local: boolean;
  hint?: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "ollama",
    label: "Ollama",
    blurb: "Local. No key. OpenAI-compatible on :11434.",
    defaultModel: "llama3.1",
    models: ["llama3.1", "llama3.2", "qwen2.5", "mistral", "gemma3", "phi4"],
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    usesServerKey: false,
    needsUserKey: false,
    local: true,
    hint: "ollama serve · ollama pull llama3.1",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    blurb: "Local app. Start the server, then pick a loaded model.",
    defaultModel: "local-model",
    models: ["local-model"],
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    usesServerKey: false,
    needsUserKey: false,
    local: true,
    hint: "LM Studio → Developer → Start server on port 1234",
  },
  {
    id: "vllm",
    label: "vLLM",
    blurb: "Local or LAN OpenAI-compatible server.",
    defaultModel: "local-model",
    models: ["local-model"],
    defaultBaseUrl: "http://127.0.0.1:8000/v1",
    usesServerKey: false,
    needsUserKey: false,
    local: true,
    hint: "vllm serve <model> --port 8000",
  },
  {
    id: "llamacpp",
    label: "llama.cpp",
    blurb: "llama-server OpenAI-compatible endpoint.",
    defaultModel: "local-model",
    models: ["local-model"],
    defaultBaseUrl: "http://127.0.0.1:8090/v1",
    usesServerKey: false,
    needsUserKey: false,
    local: true,
    hint: "llama-server -m model.gguf --port 8090",
  },
  {
    id: "custom",
    label: "Custom endpoint",
    blurb: "Any OpenAI-compatible /v1/chat/completions host. Key optional.",
    defaultModel: "local-model",
    models: ["local-model"],
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    usesServerKey: false,
    needsUserKey: false,
    local: true,
    hint: "Base URL must end in /v1",
  },
  {
    id: "xai",
    label: "xAI Grok",
    blurb: "Server-side key. OpenAI-compatible Chat Completions.",
    defaultModel: "grok-4.5",
    models: ["grok-4.5", "grok-4-fast", "grok-3", "grok-3-mini"],
    defaultBaseUrl: "https://api.x.ai/v1",
    usesServerKey: true,
    needsUserKey: false,
    local: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    blurb: "Paste a key. Used only for this request.",
    defaultModel: "gpt-4.1",
    models: ["gpt-4.1", "gpt-4o", "gpt-4o-mini", "o4-mini"],
    defaultBaseUrl: "https://api.openai.com/v1",
    usesServerKey: false,
    needsUserKey: true,
    local: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    blurb: "One key, many labs.",
    defaultModel: "anthropic/claude-sonnet-4.5",
    models: [
      "anthropic/claude-sonnet-4.5",
      "google/gemini-2.5-pro",
      "meta-llama/llama-4-maverick",
      "qwen/qwen3-235b-a22b",
    ],
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    usesServerKey: false,
    needsUserKey: true,
    local: false,
  },
  {
    id: "groq",
    label: "Groq",
    blurb: "Fast open models.",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "qwen/qwen3-32b", "openai/gpt-oss-120b"],
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    usesServerKey: false,
    needsUserKey: true,
    local: false,
  },
  {
    id: "together",
    label: "Together",
    blurb: "Open weights, OpenAI-compatible.",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
    defaultBaseUrl: "https://api.together.xyz/v1",
    usesServerKey: false,
    needsUserKey: true,
    local: false,
  },
  {
    id: "fireworks",
    label: "Fireworks",
    blurb: "OpenAI-compatible inference.",
    defaultModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    models: ["accounts/fireworks/models/llama-v3p1-70b-instruct"],
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    usesServerKey: false,
    needsUserKey: true,
    local: false,
  },
];

export function getProvider(id: ProviderId): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]!;
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "0.0.0.0";
  } catch {
    return false;
  }
}
