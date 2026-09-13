import { TOOLS } from "./tools";
import type { Episode, ExportFile, HarnessDoc } from "./types";

export function exportTrainingPack(
  episodes: Episode[],
  docs: HarnessDoc[],
  kind: "sft" | "trajectories" | "markdown" | "openai-ft",
): ExportFile {
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === "sft" || kind === "openai-ft") {
    return {
      filename: `aperture-sft-${stamp}.jsonl`,
      mime: "application/jsonl",
      body: toSftJsonl(episodes),
    };
  }
  if (kind === "trajectories") {
    return {
      filename: `aperture-trajectories-${stamp}.jsonl`,
      mime: "application/jsonl",
      body: toTrajectoryJsonl(episodes),
    };
  }
  return {
    filename: `aperture-corpus-${stamp}.md`,
    mime: "text/markdown;charset=utf-8",
    body: toCorpusMarkdown(episodes, docs),
  };
}

export function toSftJsonl(episodes: Episode[]): string {
  const lines = episodes
    .filter((ep) => ep.messages.some((m) => m.role === "assistant"))
    .map((ep) =>
      JSON.stringify({
        messages: ep.messages.map((m) => {
          if (m.role === "assistant" && m.toolCalls?.length) {
            return {
              role: "assistant",
              content: m.content || null,
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: "function",
                function: { name: c.name, arguments: JSON.stringify(c.arguments) },
              })),
            };
          }
          if (m.role === "tool") {
            return { role: "tool", tool_call_id: m.toolCallId, content: m.content, name: m.name };
          }
          return { role: m.role, content: m.content };
        }),
        metadata: {
          source: "aperture",
          task: ep.taskId,
          episode: ep.id,
          model: ep.model,
          reward: ep.reward,
          status: ep.status,
        },
        tools: TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })),
      }),
    );
  return lines.join("\n") + (lines.length ? "\n" : "");
}

export function toTrajectoryJsonl(episodes: Episode[]): string {
  const lines = episodes.map((ep) =>
    JSON.stringify({
      id: ep.id,
      task: ep.taskId,
      instruction: ep.instruction,
      model: ep.model,
      provider: ep.providerId,
      reward: ep.reward,
      status: ep.status,
      answer: ep.answer ?? null,
      progress: ep.progress,
      steps: ep.steps.map((step) => ({
        index: step.index,
        observation: {
          url: step.observation.url,
          title: step.observation.title,
          tree: step.observation.formattedTree,
        },
        action: step.action ?? null,
        result: step.result
          ? { name: step.result.name, ok: step.result.ok, content: step.result.content.slice(0, 4000) }
          : null,
        reward: step.reward,
        cumulative: step.cumulativeReward,
        done: step.done,
      })),
    }),
  );
  return lines.join("\n") + (lines.length ? "\n" : "");
}

export function toCorpusMarkdown(episodes: Episode[], docs: HarnessDoc[]): string {
  const parts = [
    "# Aperture training corpus",
    "",
    `Episodes: ${episodes.length}. Documents: ${docs.length}.`,
    "",
    "> Your data. Export stays on this machine. Good-hearted use only.",
    "",
  ];
  if (docs.length) {
    parts.push("## Documents", "");
    for (const doc of docs) {
      parts.push(`### ${doc.name}`, "", "```", doc.body.slice(0, 12000), "```", "");
    }
  }
  for (const ep of episodes) {
    parts.push(
      `## Episode ${ep.id}`,
      "",
      `Task: ${ep.taskId}. Model: ${ep.model}. Reward: ${ep.reward}. Status: ${ep.status}.`,
      "",
      ep.instruction,
      "",
    );
    for (const m of ep.messages.filter((msg) => msg.role !== "system")) {
      parts.push(`### ${m.role}`, "", m.content || (m.toolCalls ?? []).map((c) => `${c.name} ${JSON.stringify(c.arguments)}`).join("\n"), "");
    }
    parts.push("---", "");
  }
  return parts.join("\n");
}
