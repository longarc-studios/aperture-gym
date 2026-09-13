import type { ApertureEnv } from "./gym";
import type { ExportFormat, ModelConfig, ToolCall } from "./types";

export type ApertureBridge = {
  version: 1;
  reset: () => unknown;
  step: (call: ToolCall) => Promise<unknown>;
  pull: () => unknown;
  export: (format: ExportFormat) => unknown;
  protocol: () => unknown;
};

export type ApertureCliBridge = {
  ready: boolean;
  taskId: string;
  playReference: () => Promise<unknown>;
  playModel: (config: ModelConfig) => Promise<unknown>;
  pull: () => unknown;
  exportFile: (format: ExportFormat) => unknown;
};

declare global {
  interface Window {
    __APERTURE__?: ApertureBridge;
    __APERTURE_CLI__?: ApertureCliBridge;
  }
}

export function installBridge(getEnv: () => ApertureEnv | null) {
  const requireEnv = () => {
    const env = getEnv();
    if (!env) throw new Error("No live ApertureEnv. Reset a world first.");
    return env;
  };

  const bridge: ApertureBridge = {
    version: 1,
    reset: () => {
      const env = requireEnv();
      const obs = env.reset();
      return {
        url: obs.url,
        title: obs.title,
        tree: obs.formattedTree,
        progress: obs.progress,
        protocol: env.lastProtocol,
      };
    },
    step: async (call) => {
      const env = requireEnv();
      const gym = await env.step(call);
      return {
        reward: gym.reward,
        terminated: gym.terminated,
        truncated: gym.truncated,
        observation: {
          url: gym.observation.url,
          title: gym.observation.title,
          tree: gym.observation.formattedTree,
        },
        progress: gym.info.progress,
        content: gym.info.toolResult?.content ?? "",
        protocol: env.lastProtocol,
      };
    },
    pull: () => {
      const pulled = requireEnv().pull();
      return {
        traces: pulled.traces,
        reward: pulled.reward,
        progress: pulled.progress,
        tools: pulled.tools,
        status: pulled.episode.status,
        transcript: pulled.transcript.map((m) => ({
          role: m.role,
          content: m.content.slice(0, 4000),
          toolCalls: m.toolCalls,
          name: m.name,
        })),
      };
    },
    export: (format) => {
      const file = requireEnv().export(format);
      return { filename: file.filename, mime: file.mime, bytes: file.body.length, body: file.body };
    },
    protocol: () => getEnv()?.lastProtocol ?? null,
  };

  window.__APERTURE__ = bridge;
  return bridge;
}

export function uninstallBridge() {
  if (window.__APERTURE__) delete window.__APERTURE__;
}
