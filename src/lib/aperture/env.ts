import { interpretCode } from "./code-run";
import { performAction } from "./actions";
import { extractStructured } from "./extract";
import { planFromCandidates, rankCandidates, resolveAct } from "./observe";
import { newlyMet, readProgress } from "./progress";
import { captureSnapshot } from "./snapshot";
import { schematicScreenshot } from "./screenshot";
import { gradeAnswer, getTask } from "./tasks";
import { uid } from "./ids";
import type {
  Episode,
  GymStepResult,
  JsonValue,
  Observation,
  ProtocolFrame,
  SnapshotAction,
  ToolCall,
  ToolResult,
} from "./types";

export type EnvHandle = {
  root: HTMLElement;
  taskId: string;
  navigate?: (taskId: string) => void;
};

function stage(handle: EnvHandle): HTMLElement {
  const el = handle.root;
  if (!el || !el.isConnected) {
    throw new Error("World is still loading. Wait a moment and press Play again.");
  }
  return el;
}

export function observe(handle: EnvHandle, withShot = false): Observation {
  const root = stage(handle);
  const snap = captureSnapshot(root);
  const shot = withShot
    ? schematicScreenshot(root, { maxWidth: 640, maxHeight: 400, quality: 0.55 })
    : undefined;
  return {
    url: `/worlds/${handle.taskId}`,
    title: snap.title || getTask(handle.taskId).title,
    formattedTree: snap.formattedTree,
    xpathMap: snap.xpathMap,
    screenshotDataUrl: shot,
  };
}

export function screenshot(handle: EnvHandle, forModel = false): string {
  return schematicScreenshot(
    stage(handle),
    forModel
      ? { maxWidth: 640, maxHeight: 400, quality: 0.55 }
      : { maxWidth: 900, maxHeight: 560, quality: 0.7 },
  );
}

export async function executeTool(
  handle: EnvHandle,
  call: ToolCall,
  vision = false,
): Promise<ToolResult> {
  const started = performance.now();
  const fail = (message: string): ToolResult => ({
    callId: call.id,
    name: call.name,
    ok: false,
    content: message,
    durationMs: Math.round(performance.now() - started),
  });

  try {
    switch (call.name) {
      case "snapshot": {
        const obs = observe(handle, vision);
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: `URL: ${obs.url}\nTitle: ${obs.title}\n\n${obs.formattedTree}`,
          imageDataUrl: obs.screenshotDataUrl,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "screenshot": {
        const image = screenshot(handle, true);
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: "Schematic screenshot of the active page. IDs are painted on interactive nodes.",
          imageDataUrl: image,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "run": {
        const code = typeof call.arguments.code === "string" ? call.arguments.code : undefined;
        const actions = Array.isArray(call.arguments.actions)
          ? (call.arguments.actions as SnapshotAction[])
          : undefined;
        if (Boolean(code) === Boolean(actions && actions.length)) {
          if (!code && !actions) {
            return fail("run accepts exactly one of `code` or `actions`.");
          }
          if (code && actions) {
            return fail("run accepts exactly one of `code` or `actions`, not both.");
          }
        }
        if (code) {
          const content = interpretCode(stage(handle), code, handle.navigate);
          await settle();
          return {
            callId: call.id,
            name: call.name,
            ok: true,
            content,
            durationMs: Math.round(performance.now() - started),
          };
        }
        const logs: string[] = [];
        for (const action of actions ?? []) {
          logs.push(performAction(stage(handle), action, handle.navigate));
          await settle();
        }
        const obs = observe(handle, false);
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: `${logs.join("\n")}\n\nURL: ${obs.url}\nTitle: ${obs.title}`,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "observe": {
        const obs = observe(handle, false);
        const instruction = String(call.arguments.instruction ?? "");
        const ranked = rankCandidates(obs.formattedTree, instruction);
        const payload = {
          instruction,
          plan: planFromCandidates(instruction, ranked),
          candidates: ranked.slice(0, 12).map((c) => ({
            id: c.id,
            role: c.role,
            name: c.name,
            score: Number(c.score.toFixed(2)),
          })),
        };
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify(payload, null, 2),
          structured: payload,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "act": {
        const action = String(call.arguments.action ?? "");
        const obs = observe(handle, false);
        const resolved = resolveAct(obs.formattedTree, action);
        if (!resolved) {
          return fail(
            `Could not resolve "${action}" against the latest snapshot. Call snapshot, then run with an id.`,
          );
        }
        const content = performAction(stage(handle), resolved, handle.navigate);
        await settle();
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: `${content}\nresolved ${JSON.stringify(resolved)}`,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "extract": {
        const instruction = String(call.arguments.instruction ?? "");
        const schemaHint = String(call.arguments.schemaHint ?? "");
        const payload = extractStructured(stage(handle), instruction, schemaHint);
        return {
          callId: call.id,
          name: call.name,
          ok: true,
          content: JSON.stringify(payload, null, 2),
          structured: payload,
          durationMs: Math.round(performance.now() - started),
        };
      }
      case "done": {
        const answer = String(call.arguments.answer ?? "");
        const task = getTask(handle.taskId);
        const grade = gradeAnswer(task, answer);
        const payload = {
          answer,
          passed: grade.ok,
          missing: grade.missing,
          rationale: call.arguments.rationale ?? null,
        };
        return {
          callId: call.id,
          name: call.name,
          ok: grade.ok,
          content: JSON.stringify(payload),
          structured: payload,
          durationMs: Math.round(performance.now() - started),
        };
      }
      default:
        return fail(`Unknown tool: ${call.name}`);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export function applyStep(
  handle: EnvHandle,
  result: ToolResult,
  episode: Episode,
  maxSteps: number,
): GymStepResult {
  const terminated = result.name === "done";
  const truncated = !terminated && episode.steps.length + 1 >= maxSteps;
  const observation = observe(handle, false);
  const progress = readProgress(handle.taskId, stage(handle), {
    ...episode,
    answer: result.name === "done" ? String((result.structured as { answer?: string } | undefined)?.answer ?? episode.answer) : episode.answer,
  });
  const gained = newlyMet(episode.progress, progress);
  const weight = progress.length ? 1 / progress.length : 0;
  let reward = gained.length * weight;
  if (!result.ok) reward -= 0.05;
  else if (!terminated) reward -= 0.02;
  if (terminated && !result.ok) reward -= 0.1;
  reward = Number(reward.toFixed(4));
  const cumulative = Number((episode.reward + reward).toFixed(4));
  observation.progress = progress;
  const protocol: ProtocolFrame = {
    op: "step",
    at: Date.now(),
    request: { name: result.name, callId: result.callId },
    response: {
      ok: result.ok,
      reward,
      terminated,
      truncated,
      progress: progress.map((f) => `${f.id}:${f.met ? 1 : 0}`),
    },
  };
  return {
    observation,
    reward,
    terminated,
    truncated,
    info: {
      toolResult: result,
      cumulativeReward: cumulative,
      step: episode.steps.length,
      progress,
      protocol,
    },
  };
}

export function newCall(name: ToolCall["name"], args: { [key: string]: JsonValue }): ToolCall {
  return { id: uid("call"), name, arguments: args };
}

function settle() {
  return new Promise((r) => setTimeout(r, 120));
}

export function worldReady(obs: Observation): boolean {
  return obs.formattedTree.length > 60 && !obs.formattedTree.includes("[empty page]");
}
