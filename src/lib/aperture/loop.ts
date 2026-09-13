import { worldReady } from "./env";
import { ApertureEnv } from "./gym";
import { completeTurn } from "./complete";
import { REFERENCE_POLICIES, materializePolicy, resolvePolicyToken } from "./policies";
import type { CompleteOutput, Episode, ModelConfig, Observation, ToolCall } from "./types";
import { newCall } from "./env";

export type LoopHooks = {
  abort: () => boolean;
  onUpdate?: (episode: Episode, obs: Observation) => void;
  sleepMs?: number;
};

export async function waitForWorld(env: ApertureEnv): Promise<Observation> {
  let last: Observation | null = null;
  for (let i = 0; i < 80; i += 1) {
    try {
      const next = env.observe(false);
      last = next;
      if (worldReady(next)) return next;
    } catch {
      /* stage mounting */
    }
    await sleep(50);
  }
  return (
    last ?? {
      url: "",
      title: "",
      formattedTree: "[empty page]",
      xpathMap: {},
    }
  );
}

export async function runReferencePolicy(env: ApertureEnv, hooks: LoopHooks): Promise<Episode> {
  let obs = await waitForWorld(env);
  hooks.onUpdate?.(env.episode, obs);
  const policy = REFERENCE_POLICIES[env.taskId as keyof typeof REFERENCE_POLICIES];
  if (!policy) throw new Error(`No reference policy for ${env.taskId}`);
  const resolve = (token: string) => resolvePolicyToken(env.observe(false).formattedTree, token);
  for (const step of policy) {
    if (hooks.abort()) break;
    obs = env.observe(false);
    const [call] = materializePolicy([step], resolve);
    const materialized = call ?? newCall(step.name, step.arguments);
    env.noteAssistant({ role: "assistant", content: "", toolCalls: [materialized] });
    const gym = await env.step(materialized);
    obs = gym.observation;
    hooks.onUpdate?.(env.episode, obs);
    if (gym.terminated || gym.truncated) break;
    await sleep(hooks.sleepMs ?? 140);
  }
  return env.finish(hooks.abort() ? "aborted" : undefined);
}

export async function runModelPolicy(
  env: ApertureEnv,
  config: ModelConfig,
  hooks: LoopHooks,
): Promise<Episode> {
  let obs = await waitForWorld(env);
  hooks.onUpdate?.(env.episode, obs);
  for (let i = 0; i < env.maxSteps; i += 1) {
    if (hooks.abort()) break;
    const completion = (await completeTurn({
      data: { config, messages: env.episode.messages, vision: env.vision },
    })) as CompleteOutput;
    if (!completion.ok) {
      env.noteLlmError(completion.error, i);
      hooks.onUpdate?.(env.episode, obs);
      return env.finish("failed");
    }
    env.noteLlm(completion, i);
    hooks.onUpdate?.(env.episode, obs);
    const calls: ToolCall[] = completion.message.toolCalls ?? [];
    if (!calls.length) break;
    for (const call of calls) {
      const gym = await env.step(call);
      obs = gym.observation;
      hooks.onUpdate?.(env.episode, obs);
      if (gym.terminated || gym.truncated) {
        return env.finish();
      }
    }
  }
  return env.finish(hooks.abort() ? "aborted" : undefined);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
