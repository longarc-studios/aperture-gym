export type ToolName =
  | "run"
  | "snapshot"
  | "screenshot"
  | "act"
  | "extract"
  | "observe"
  | "done";

export type SnapshotActionOp =
  | "click"
  | "hover"
  | "fill"
  | "type"
  | "press"
  | "select"
  | "scroll"
  | "goto";

export type SnapshotAction = {
  op: SnapshotActionOp;
  id?: string;
  value?: string;
  url?: string;
  key?: string;
};

export type RunInput = {
  code?: string;
  actions?: SnapshotAction[];
};

export type JsonScalar = string | number | boolean | null;

export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export type ToolCall = {
  id: string;
  name: ToolName | string;
  arguments: { [key: string]: JsonValue };
};

export type ToolResult = {
  callId: string;
  name: string;
  ok: boolean;
  content: string;
  imageDataUrl?: string;
  durationMs: number;
  structured?: JsonValue;
};

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; dataUrl: string };

export type ChatMessage = {
  role: ChatRole;
  content: string;
  parts?: ContentPart[];
  toolCallId?: string;
  toolCalls?: ToolCall[];
  name?: string;
};

export type SpanKind = "episode" | "llm" | "tool" | "browser" | "reward" | "export";

export type TraceSpan = {
  id: string;
  parentId?: string;
  name: string;
  kind: SpanKind;
  startMs: number;
  endMs?: number;
  status: "ok" | "error" | "running";
  attributes: Record<string, string | number | boolean | null>;
};

export type ProgressFlag = {
  id: string;
  label: string;
  met: boolean;
};

export type Observation = {
  url: string;
  title: string;
  formattedTree: string;
  xpathMap: Record<string, string>;
  screenshotDataUrl?: string;
  progress?: ProgressFlag[];
};

export type StepRecord = {
  index: number;
  observation: Observation;
  action?: ToolCall;
  result?: ToolResult;
  reward: number;
  cumulativeReward: number;
  done: boolean;
  progress: ProgressFlag[];
};

export type EpisodeStatus = "idle" | "running" | "succeeded" | "failed" | "aborted";

export type Episode = {
  id: string;
  taskId: string;
  model: string;
  providerId: string;
  startedAt: number;
  endedAt?: number;
  status: EpisodeStatus;
  instruction: string;
  steps: StepRecord[];
  spans: TraceSpan[];
  messages: ChatMessage[];
  reward: number;
  answer?: string;
  notes?: string;
  vision: boolean;
  progress: ProgressFlag[];
  usage: { promptTokens: number; completionTokens: number };
};

export type ProviderId =
  | "ollama"
  | "lmstudio"
  | "vllm"
  | "llamacpp"
  | "xai"
  | "openai"
  | "openrouter"
  | "groq"
  | "together"
  | "fireworks"
  | "custom";

export type ModelConfig = {
  providerId: ProviderId;
  model: string;
  baseUrl?: string;
  apiKey?: string;
};

export type GymStepResult = {
  observation: Observation;
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: {
    toolResult?: ToolResult;
    cumulativeReward: number;
    step: number;
    progress: ProgressFlag[];
    protocol: ProtocolFrame;
  };
};

export type ExportFormat =
  | "markdown"
  | "jsonl"
  | "openai"
  | "otel"
  | "transcript"
  | "tools"
  | "eval"
  | "sft"
  | "trajectories";

export type HarnessDoc = {
  id: string;
  name: string;
  kind: "markdown" | "text" | "json" | "jsonl" | "transcript";
  body: string;
  addedAt: number;
  bytes: number;
};

export type ExportFile = {
  filename: string;
  mime: string;
  body: string;
};

export type CompleteOutput =
  | {
      ok: true;
      message: ChatMessage;
      usage: { promptTokens: number; completionTokens: number };
    }
  | { ok: false; error: string };

export type ProtocolOp = "reset" | "step" | "pull" | "export";

export type ProtocolFrame = {
  op: ProtocolOp;
  at: number;
  request: JsonValue;
  response: JsonValue;
};

export type PullResult = {
  traces: TraceSpan[];
  transcript: ChatMessage[];
  tools: Array<{ name: string; description: string }>;
  reward: number;
  progress: ProgressFlag[];
  episode: Episode;
  protocol: ProtocolFrame | null;
};

export type EvalRow = {
  id: string;
  taskId: string;
  title: string;
  model: string;
  providerId: string;
  status: EpisodeStatus;
  passed: boolean;
  reward: number;
  steps: number;
  tokens: number;
  latencyMs: number;
  flags: ProgressFlag[];
  answer?: string;
  episodeId: string;
};

export type EvalRun = {
  id: string;
  startedAt: number;
  endedAt?: number;
  includeModel: boolean;
  vision: boolean;
  rows: EvalRow[];
};
