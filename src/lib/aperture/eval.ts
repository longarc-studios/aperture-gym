import { ApertureEnv } from "./gym";
import { runModelPolicy, runReferencePolicy } from "./loop";
import { getTask, TASKS, type TaskId } from "./tasks";
import { uid } from "./ids";
import type { EnvHandle } from "./env";
import type { Episode, EvalRow, EvalRun, ModelConfig } from "./types";

export type SweepHooks = {
  abort: () => boolean;
  loadWorld: (taskId: TaskId) => Promise<HTMLElement>;
  onRow?: (row: EvalRow, episode: Episode) => void;
  onEpisode?: (episode: Episode) => void;
};

export async function runSweep(opts: {
  tasks?: TaskId[];
  includeModel: boolean;
  vision: boolean;
  config: ModelConfig;
  hooks: SweepHooks;
}): Promise<{ run: EvalRun; episodes: Episode[] }> {
  const tasks = opts.tasks ?? TASKS.filter((t) => t.sweep !== false).map((t) => t.id);
  const run: EvalRun = {
    id: uid("eval"),
    startedAt: Date.now(),
    includeModel: opts.includeModel,
    vision: opts.vision,
    rows: [],
  };
  const episodes: Episode[] = [];

  const play = async (taskId: TaskId, kind: "reference" | "model") => {
    const root = await opts.hooks.loadWorld(taskId);
    const handle: EnvHandle = { root, taskId };
    const env = new ApertureEnv({
      handle,
      model: kind === "reference" ? "reference-policy" : opts.config.model,
      providerId: kind === "reference" ? "custom" : opts.config.providerId,
      vision: opts.vision,
      maxSteps: getTask(taskId).maxSteps,
    });
    env.reset();
    const started = Date.now();
    const episode =
      kind === "reference"
        ? await runReferencePolicy(env, { abort: opts.hooks.abort, sleepMs: 80 })
        : await runModelPolicy(env, opts.config, { abort: opts.hooks.abort, sleepMs: 80 });
    const row = toRow(episode, Date.now() - started);
    run.rows.push(row);
    episodes.push(episode);
    opts.hooks.onEpisode?.(episode);
    opts.hooks.onRow?.(row, episode);
  };

  for (const taskId of tasks) {
    if (opts.hooks.abort()) break;
    await play(taskId, "reference");
    if (opts.includeModel && !opts.hooks.abort()) {
      await play(taskId, "model");
    }
  }

  run.endedAt = Date.now();
  return { run, episodes };
}

function toRow(episode: Episode, latencyMs: number): EvalRow {
  let title = episode.taskId;
  try {
    title = getTask(episode.taskId).title;
  } catch {
    /* keep id */
  }
  return {
    id: uid("row"),
    taskId: episode.taskId,
    title,
    model: episode.model,
    providerId: episode.providerId,
    status: episode.status,
    passed: episode.status === "succeeded",
    reward: episode.reward,
    steps: episode.steps.length,
    tokens: (episode.usage?.promptTokens ?? 0) + (episode.usage?.completionTokens ?? 0),
    latencyMs,
    flags: episode.progress,
    answer: episode.answer,
    episodeId: episode.id,
  };
}
