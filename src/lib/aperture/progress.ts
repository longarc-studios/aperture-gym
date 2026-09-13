import { getTask, type TaskId } from "./tasks";
import type { Episode, ProgressFlag } from "./types";

function flagsAttr(root: ParentNode): string[] {
  const el = root.querySelector("[data-aperture-flags]");
  const raw = el?.getAttribute("data-aperture-flags") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function readProgress(taskId: string, root: ParentNode, episode: Episode): ProgressFlag[] {
  const task = getTask(taskId);
  const live = new Set(flagsAttr(root));
  const graded = episode.answer ? gradeLive(taskId as TaskId, episode.answer) : false;
  if (graded) live.add("answered");
  return task.progress.map((spec) => ({
    id: spec.id,
    label: spec.label,
    met: live.has(spec.id) || (spec.id === "answered" && graded),
  }));
}

function gradeLive(taskId: TaskId, answer: string): boolean {
  try {
    const task = getTask(taskId);
    const hay = answer.toLowerCase();
    return task.expected.includes.every((n) => hay.includes(n.toLowerCase()));
  } catch {
    return false;
  }
}

export function newlyMet(prev: ProgressFlag[], next: ProgressFlag[]): ProgressFlag[] {
  const before = new Set(prev.filter((f) => f.met).map((f) => f.id));
  return next.filter((f) => f.met && !before.has(f.id));
}
