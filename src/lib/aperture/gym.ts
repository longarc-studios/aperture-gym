import { applyStep, executeTool, observe, type EnvHandle } from "./env";
import { exportEpisode, type ExportFile } from "./export";
import { uid } from "./ids";
import { getTask, worldPath } from "./tasks";
import { TOOLS, SYSTEM_PROMPT } from "./tools";
import { readProgress } from "./progress";
import type {
  ChatMessage,
  CompleteOutput,
  Episode,
  ExportFormat,
  GymStepResult,
  Observation,
  ProgressFlag,
  ProtocolFrame,
  PullResult,
  ToolCall,
  TraceSpan,
} from "./types";

export type GymInit = {
  handle: EnvHandle;
  model: string;
  providerId: Episode["providerId"];
  vision?: boolean;
  maxSteps?: number;
};

/**
 * The live Gymnasium handle. Playground, eval sweep, and window.__APERTURE__
 * all step this class — there is no second loop.
 */
export class ApertureEnv {
  readonly handle: EnvHandle;
  readonly vision: boolean;
  readonly maxSteps: number;
  episode: Episode;
  lastProtocol: ProtocolFrame | null = null;

  constructor(init: GymInit) {
    this.handle = init.handle;
    this.vision = init.vision ?? true;
    const task = getTask(init.handle.taskId);
    this.maxSteps = init.maxSteps ?? task.maxSteps;
    this.episode = blankEpisode(init, this.vision);
  }

  get taskId() {
    return this.handle.taskId;
  }

  reset(): Observation {
    const task = getTask(this.handle.taskId);
    this.episode = blankEpisode(
      {
        handle: this.handle,
        model: this.episode.model,
        providerId: this.episode.providerId,
        vision: this.vision,
        maxSteps: this.maxSteps,
      },
      this.vision,
    );
    let obs: Observation = {
      url: "",
      title: "",
      formattedTree: "[empty page]",
      xpathMap: {},
      progress: this.episode.progress,
    };
    try {
      obs = this.observe();
    } catch {
      /* iframe still mounting */
    }
    this.lastProtocol = {
      op: "reset",
      at: Date.now(),
      request: { task: this.handle.taskId, vision: this.vision },
      response: {
        url: obs.url,
        title: obs.title,
        treeChars: obs.formattedTree.length,
        hasImage: Boolean(obs.screenshotDataUrl),
        instruction: task.instruction,
      },
    };
    return obs;
  }

  observe(withShot = this.vision): Observation {
    const obs = observe(this.handle, withShot);
    try {
      obs.progress = readProgress(this.handle.taskId, this.handle.root, this.episode);
    } catch {
      /* stage not ready */
    }
    return obs;
  }

  noteAssistant(message: ChatMessage) {
    this.episode = { ...this.episode, messages: [...this.episode.messages, message] };
  }

  noteLlm(completion: Extract<CompleteOutput, { ok: true }>, stepIndex: number) {
    const span: TraceSpan = {
      id: uid("span"),
      parentId: this.episode.spans[0]?.id,
      name: "llm.complete",
      kind: "llm",
      startMs: Date.now() - 1,
      endMs: Date.now(),
      status: "ok",
      attributes: {
        model: this.episode.model,
        step: stepIndex,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
      },
    };
    this.episode = {
      ...this.episode,
      messages: [...this.episode.messages, completion.message],
      spans: [...this.episode.spans, span],
      usage: {
        promptTokens: this.episode.usage.promptTokens + completion.usage.promptTokens,
        completionTokens: this.episode.usage.completionTokens + completion.usage.completionTokens,
      },
    };
    return span;
  }

  noteLlmError(error: string, stepIndex: number) {
    const span: TraceSpan = {
      id: uid("span"),
      parentId: this.episode.spans[0]?.id,
      name: "llm.complete",
      kind: "llm",
      startMs: Date.now(),
      endMs: Date.now(),
      status: "error",
      attributes: { model: this.episode.model, step: stepIndex, error },
    };
    this.episode = { ...this.episode, spans: [...this.episode.spans, span] };
  }

  async step(action: ToolCall): Promise<GymStepResult> {
    const before = this.observe(false);
    const span: TraceSpan = {
      id: uid("span"),
      parentId: this.episode.spans[0]?.id,
      name: action.name,
      kind: action.name === "done" ? "reward" : "tool",
      startMs: Date.now(),
      status: "running",
      attributes: { tool: action.name },
    };
    const result = await executeTool(this.handle, action, this.vision);
    span.endMs = Date.now();
    span.status = result.ok ? "ok" : "error";
    span.attributes.ms = result.durationMs;

    const nextEpisode = {
      ...this.episode,
      answer: action.name === "done" ? String(action.arguments.answer ?? this.episode.answer) : this.episode.answer,
    };
    const gym = applyStep(this.handle, result, nextEpisode, this.maxSteps);
    span.attributes.reward = gym.reward;
    span.attributes.flags = gym.info.progress.filter((f) => f.met).map((f) => f.id).join(",") || null;

    const toolMsg: ChatMessage = toolMessage(result, this.vision);
    const step = {
      index: this.episode.steps.length,
      observation: before,
      action,
      result,
      reward: gym.reward,
      cumulativeReward: gym.info.cumulativeReward,
      done: gym.terminated || gym.truncated,
      progress: gym.info.progress,
    };

    this.episode = {
      ...nextEpisode,
      reward: gym.info.cumulativeReward,
      steps: [...this.episode.steps, step],
      spans: [...this.episode.spans, span],
      messages: [...this.episode.messages, toolMsg],
      progress: gym.info.progress,
      status: gym.terminated
        ? result.ok
          ? "succeeded"
          : "failed"
        : gym.truncated
          ? "failed"
          : "running",
    };
    this.lastProtocol = gym.info.protocol;
    return gym;
  }

  pull(): PullResult {
    const frame: ProtocolFrame = {
      op: "pull",
      at: Date.now(),
      request: { episode: this.episode.id },
      response: {
        reward: this.episode.reward,
        status: this.episode.status,
        steps: this.episode.steps.length,
        traces: this.episode.spans.length,
        progress: this.episode.progress,
      },
    };
    this.lastProtocol = frame;
    return {
      traces: this.episode.spans,
      transcript: this.episode.messages,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      reward: this.episode.reward,
      progress: this.episode.progress,
      episode: this.episode,
      protocol: frame,
    };
  }

  export(format: ExportFormat): ExportFile {
    const file = exportEpisode(this.episode, format);
    this.lastProtocol = {
      op: "export",
      at: Date.now(),
      request: { format },
      response: { filename: file.filename, bytes: file.body.length },
    };
    return file;
  }

  finish(status?: Episode["status"]): Episode {
    const ended: Episode = {
      ...this.episode,
      status: status ?? (this.episode.status === "running" ? "failed" : this.episode.status),
      endedAt: Date.now(),
    };
    ended.spans = ended.spans.map((s) =>
      s.kind === "episode"
        ? { ...s, endMs: ended.endedAt, status: ended.status === "succeeded" ? "ok" : "error" }
        : s,
    );
    this.episode = ended;
    return ended;
  }
}

function blankEpisode(init: GymInit, vision: boolean): Episode {
  const task = getTask(init.handle.taskId);
  const startedAt = Date.now();
  const flags: ProgressFlag[] = task.progress.map((p) => ({ ...p, met: false }));
  return {
    id: uid("ep"),
    taskId: init.handle.taskId,
    model: init.model,
    providerId: init.providerId,
    startedAt,
    status: "running",
    instruction: task.instruction,
    steps: [],
    spans: [
      {
        id: uid("span"),
        name: "episode",
        kind: "episode",
        startMs: startedAt,
        status: "running",
        attributes: { task: init.handle.taskId, model: init.model, vision },
      },
    ],
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${task.instruction}\n\nThe world is already open at ${worldPath(init.handle.taskId)}. Snapshot first.${vision ? " Snapshot also returns a schematic image of the page." : ""}`,
      },
    ],
    reward: 0,
    vision,
    progress: flags,
    usage: { promptTokens: 0, completionTokens: 0 },
  };
}

function toolMessage(result: { callId: string; name: string; content: string; imageDataUrl?: string }, vision: boolean): ChatMessage {
  const parts = vision && result.imageDataUrl
    ? [
        { type: "text" as const, text: result.content },
        { type: "image" as const, dataUrl: result.imageDataUrl },
      ]
    : undefined;
  return {
    role: "tool",
    name: result.name,
    toolCallId: result.callId,
    content: result.content,
    parts,
  };
}
