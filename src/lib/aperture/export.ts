import { TOOLS } from "./tools";
import type { Episode, EvalRun, ExportFile, ExportFormat } from "./types";
import { getTask } from "./tasks";
import { toSftJsonl, toTrajectoryJsonl } from "./corpus";

export type { ExportFile };

export function exportEpisode(episode: Episode, format: ExportFormat): ExportFile {
  const stamp = new Date(episode.startedAt).toISOString().slice(0, 10);
  const base = `aperture-${episode.taskId}-${stamp}-${episode.id.slice(-6)}`;

  switch (format) {
    case "markdown":
      return {
        filename: `${base}.md`,
        mime: "text/markdown;charset=utf-8",
        body: toMarkdown(episode),
      };
    case "transcript":
      return {
        filename: `${base}-transcript.md`,
        mime: "text/markdown;charset=utf-8",
        body: toTranscriptMarkdown(episode),
      };
    case "tools":
      return {
        filename: `${base}-tools.md`,
        mime: "text/markdown;charset=utf-8",
        body: toToolsMarkdown(),
      };
    case "jsonl":
      return {
        filename: `${base}.jsonl`,
        mime: "application/jsonl",
        body: toJsonl(episode),
      };
    case "openai":
      return {
        filename: `${base}-openai.json`,
        mime: "application/json",
        body: JSON.stringify(toOpenAI(episode), null, 2),
      };
    case "otel":
      return {
        filename: `${base}-traces.json`,
        mime: "application/json",
        body: JSON.stringify(toOtel(episode), null, 2),
      };
    case "eval":
      return {
        filename: `${base}-eval.jsonl`,
        mime: "application/jsonl",
        body: toJsonl(episode),
      };
    case "sft":
      return {
        filename: `${base}-sft.jsonl`,
        mime: "application/jsonl",
        body: toSftJsonl([episode]),
      };
    case "trajectories":
      return {
        filename: `${base}-traj.jsonl`,
        mime: "application/jsonl",
        body: toTrajectoryJsonl([episode]),
      };
  }
}

export function exportEvalRun(run: EvalRun, episodes: Episode[]): ExportFile {
  const stamp = new Date(run.startedAt).toISOString().slice(0, 10);
  const lines = [
    JSON.stringify({
      kind: "eval_run",
      id: run.id,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      includeModel: run.includeModel,
      vision: run.vision,
      rows: run.rows,
    }),
    ...episodes.map((ep) => toJsonl(ep).trimEnd()),
  ];
  return {
    filename: `aperture-eval-${stamp}-${run.id.slice(-6)}.jsonl`,
    mime: "application/jsonl",
    body: lines.join("\n") + "\n",
  };
}

export function toMarkdown(episode: Episode): string {
  const task = safeTask(episode.taskId);
  const duration =
    episode.endedAt && episode.startedAt
      ? `${((episode.endedAt - episode.startedAt) / 1000).toFixed(1)}s`
      : "—";
  const lines: string[] = [
    `# Aperture episode — ${task?.title ?? episode.taskId}`,
    "",
    `> Good-hearted export for research, tutoring, accessibility work, and open evaluation. Not for harm.`,
    "",
    "## Metadata",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| Episode | \`${episode.id}\` |`,
    `| Task | ${task?.title ?? episode.taskId} (${episode.taskId}) |`,
    `| Model | ${episode.providerId} / ${episode.model} |`,
    `| Vision | ${episode.vision ? "on" : "off"} |`,
    `| Status | ${episode.status} |`,
    `| Reward | ${episode.reward} |`,
    `| Steps | ${episode.steps.length} |`,
    `| Tokens | ${(episode.usage?.promptTokens ?? 0) + (episode.usage?.completionTokens ?? 0)} |`,
    `| Duration | ${duration} |`,
    `| Started | ${new Date(episode.startedAt).toISOString()} |`,
    "",
    "## Instruction",
    "",
    episode.instruction,
    "",
    "## Progress",
    "",
    "| Flag | Met |",
    "| --- | --- |",
  ];

  for (const flag of episode.progress) {
    lines.push(`| ${flag.label} | ${flag.met ? "yes" : "no"} |`);
  }
  lines.push("");

  if (episode.answer) {
    lines.push("## Submitted answer", "", "```", episode.answer, "```", "");
  }

  lines.push("## Transcript", "");
  for (const msg of episode.messages) {
    if (msg.role === "system") continue;
    lines.push(`### ${msg.role}${msg.name ? ` · ${msg.name}` : ""}`, "");
    if (msg.toolCalls?.length) {
      for (const call of msg.toolCalls) {
        lines.push(
          `- tool \`${call.name}\` (\`${call.id}\`)`,
          "",
          "```json",
          JSON.stringify(call.arguments, null, 2),
          "```",
          "",
        );
      }
    }
    if (msg.parts?.some((p) => p.type === "image")) {
      lines.push("_Schematic screenshot attached to this turn._", "");
    }
    if (msg.content) {
      lines.push(msg.content, "");
    }
  }

  lines.push("## Traces", "", "| Span | Kind | ms | Status |", "| --- | --- | --- | --- |");
  for (const span of episode.spans) {
    const ms =
      span.endMs && span.startMs ? Math.round(span.endMs - span.startMs) : "—";
    lines.push(`| ${span.name} | ${span.kind} | ${ms} | ${span.status} |`);
  }
  lines.push("");

  lines.push("## Tool results", "");
  for (const step of episode.steps) {
    if (!step.action) continue;
    lines.push(
      `### Step ${step.index + 1} · \`${step.action.name}\` · reward ${step.reward}`,
      "",
    );
    const met = step.progress.filter((f) => f.met).map((f) => f.id);
    if (met.length) lines.push(`Flags: ${met.join(", ")}`, "");
    if (step.result) {
      lines.push("```", step.result.content.slice(0, 2000), "```", "");
    }
  }

  lines.push(
    "## Gym API",
    "",
    "```ts",
    "const env = new ApertureEnv({ handle, task: \"" + episode.taskId + "\", vision: true });",
    "let obs = env.reset();",
    "const { observation, reward, terminated, info } = await env.step(action);",
    "const { traces, transcript, tools, progress } = env.pull();",
    "env.export(\"markdown\");",
    "// or window.__APERTURE__.step({ name: \"snapshot\", arguments: {} })",
    "```",
    "",
  );
  return lines.join("\n");
}

function toTranscriptMarkdown(episode: Episode): string {
  const parts = [
    `# Transcript · ${episode.taskId}`,
    "",
    `Model: ${episode.model} · Reward: ${episode.reward} · Status: ${episode.status} · Vision: ${episode.vision ? "on" : "off"}`,
    "",
  ];
  for (const msg of episode.messages) {
    const image = msg.parts?.some((p) => p.type === "image") ? " · [image]" : "";
    parts.push(`**${msg.role}**${image}`, "", msg.content || "(tool calls)", "");
  }
  return parts.join("\n");
}

function toToolsMarkdown(): string {
  const parts = [
    "# Aperture tool contract",
    "",
    "Reverse-engineered from Stagehand v4 integrations. One persistent browser. Any model.",
    "",
  ];
  for (const tool of TOOLS) {
    parts.push(
      `## ${tool.name}`,
      "",
      tool.description,
      "",
      "```json",
      JSON.stringify(tool.parameters, null, 2),
      "```",
      "",
    );
  }
  return parts.join("\n");
}

function toJsonl(episode: Episode): string {
  const record = {
    id: episode.id,
    task: episode.taskId,
    model: episode.model,
    provider: episode.providerId,
    reward: episode.reward,
    status: episode.status,
    vision: episode.vision ?? false,
    progress: episode.progress ?? [],
    usage: episode.usage ?? { promptTokens: 0, completionTokens: 0 },
    messages: episode.messages.map((m) => ({
      role: m.role,
      content: m.content,
      tool_calls: m.toolCalls,
      tool_call_id: m.toolCallId,
      name: m.name,
      has_image: Boolean(m.parts?.some((p) => p.type === "image")),
    })),
    tools: TOOLS.map((t) => t.name),
    spans: episode.spans,
    answer: episode.answer ?? null,
  };
  return JSON.stringify(record) + "\n";
}

function toOpenAI(episode: Episode) {
  return {
    model: episode.model,
    reward: episode.reward,
    progress: episode.progress,
    messages: episode.messages.map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant",
          content: m.content || null,
          tool_calls: m.toolCalls.map((c) => ({
            id: c.id,
            type: "function",
            function: {
              name: c.name,
              arguments: JSON.stringify(c.arguments),
            },
          })),
        };
      }
      if (m.role === "tool") {
        const content = m.parts?.length
          ? m.parts.map((p) =>
              p.type === "image"
                ? { type: "image_url", image_url: { url: p.dataUrl } }
                : { type: "text", text: p.text },
            )
          : m.content;
        return {
          role: "tool",
          tool_call_id: m.toolCallId,
          content,
        };
      }
      return { role: m.role, content: m.content };
    }),
  };
}

function toOtel(episode: Episode) {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "aperture" } },
            { key: "aperture.task", value: { stringValue: episode.taskId } },
            { key: "aperture.episode", value: { stringValue: episode.id } },
            { key: "aperture.model", value: { stringValue: episode.model } },
            { key: "aperture.vision", value: { boolValue: episode.vision } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "aperture.gym" },
            spans: episode.spans.map((span) => ({
              traceId: episode.id.replace(/[^a-f0-9]/gi, "").padEnd(32, "0").slice(0, 32),
              spanId: span.id.replace(/[^a-f0-9]/gi, "").padEnd(16, "0").slice(0, 16),
              parentSpanId: span.parentId
                ? span.parentId.replace(/[^a-f0-9]/gi, "").padEnd(16, "0").slice(0, 16)
                : undefined,
              name: span.name,
              kind: span.kind === "llm" ? 3 : 1,
              startTimeUnixNano: span.startMs * 1e6,
              endTimeUnixNano: (span.endMs ?? span.startMs) * 1e6,
              status: { code: span.status === "error" ? 2 : 1 },
              attributes: Object.entries(span.attributes).map(([key, value]) => ({
                key,
                value:
                  typeof value === "number"
                    ? { doubleValue: value }
                    : typeof value === "boolean"
                      ? { boolValue: value }
                      : { stringValue: String(value ?? "") },
              })),
            })),
          },
        ],
      },
    ],
  };
}

function safeTask(id: string) {
  try {
    return getTask(id);
  } catch {
    return null;
  }
}

export function downloadFile(file: ExportFile) {
  const blob = new Blob([file.body], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
