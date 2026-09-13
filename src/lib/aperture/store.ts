import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Episode, EvalRun, HarnessDoc, ModelConfig, ProviderId } from "./types";

export type Settings = {
  config: ModelConfig;
  maxSteps: number;
  vision: boolean;
};

type Store = {
  settings: Settings;
  episodes: Episode[];
  evals: EvalRun[];
  documents: HarnessDoc[];
  setProvider: (providerId: ProviderId, model?: string, baseUrl?: string) => void;
  setModel: (model: string) => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setMaxSteps: (maxSteps: number) => void;
  setVision: (vision: boolean) => void;
  upsertEpisode: (episode: Episode) => void;
  clearEpisodes: () => void;
  pushEval: (run: EvalRun) => void;
  clearEvals: () => void;
  addDocuments: (docs: HarnessDoc[]) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
};

const defaultSettings: Settings = {
  config: {
    providerId: "xai",
    model: "grok-4.5",
    baseUrl: "https://api.x.ai/v1",
  },
  maxSteps: 14,
  vision: true,
};

export const useAperture = create<Store>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      episodes: [],
      evals: [],
      documents: [],
      setProvider: (providerId, model, baseUrl) =>
        set((s) => ({
          settings: {
            ...s.settings,
            config: {
              ...s.settings.config,
              providerId,
              model: model ?? s.settings.config.model,
              baseUrl: baseUrl ?? s.settings.config.baseUrl,
              apiKey: providerId === s.settings.config.providerId ? s.settings.config.apiKey : "",
            },
          },
        })),
      setModel: (model) =>
        set((s) => ({ settings: { ...s.settings, config: { ...s.settings.config, model } } })),
      setApiKey: (apiKey) =>
        set((s) => ({ settings: { ...s.settings, config: { ...s.settings.config, apiKey } } })),
      setBaseUrl: (baseUrl) =>
        set((s) => ({ settings: { ...s.settings, config: { ...s.settings.config, baseUrl } } })),
      setMaxSteps: (maxSteps) =>
        set((s) => ({ settings: { ...s.settings, maxSteps: Math.min(16, Math.max(4, maxSteps)) } })),
      setVision: (vision) =>
        set((s) => ({ settings: { ...s.settings, vision } })),
      upsertEpisode: (episode) =>
        set((s) => {
          const compact = compactEpisode(episode);
          const rest = s.episodes.filter((e) => e.id !== episode.id);
          return { episodes: [compact, ...rest].slice(0, 40) };
        }),
      clearEpisodes: () => set({ episodes: [] }),
      pushEval: (run) =>
        set((s) => ({ evals: [run, ...s.evals].slice(0, 8) })),
      clearEvals: () => set({ evals: [] }),
      addDocuments: (docs) =>
        set((s) => ({
          documents: [...docs, ...s.documents].slice(0, 32),
        })),
      removeDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      clearDocuments: () => set({ documents: [] }),
    }),
    {
      name: "aperture-gym-v3",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          episodes: p.episodes ?? current.episodes,
          evals: p.evals ?? [],
          documents: p.documents ?? [],
        };
      },
    },
  ),
);

function compactEpisode(episode: Episode): Episode {
  return {
    ...episode,
    steps: episode.steps.map((step) => ({
      ...step,
      observation: {
        ...step.observation,
        screenshotDataUrl: undefined,
        xpathMap: {},
      },
      result: step.result
        ? {
            ...step.result,
            imageDataUrl: undefined,
            content: step.result.content.slice(0, 4000),
          }
        : step.result,
    })),
    messages: episode.messages.map((m) => ({
      ...m,
      parts: undefined,
      content: m.content.slice(0, 8000),
    })),
  };
}
