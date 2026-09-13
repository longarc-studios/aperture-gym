import { useEffect, useRef } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { WorldStage } from "@/components/world-stage";
import { ApertureEnv } from "@/lib/aperture/gym";
import { runModelPolicy, runReferencePolicy, waitForWorld } from "@/lib/aperture/loop";
import { installBridge } from "@/lib/aperture/protocol";
import { TASKS, type TaskId } from "@/lib/aperture/tasks";
import type { ModelConfig } from "@/lib/aperture/types";

export const Route = createFileRoute("/harness/$taskId")({
  component: HarnessPage,
});

function HarnessPage() {
  const { taskId } = Route.useParams();
  const known = TASKS.some((t) => t.id === taskId);
  if (!known) throw notFound();
  const stageRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<ApertureEnv | null>(null);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    let cancelled = false;
    const env = new ApertureEnv({
      handle: { root, taskId: taskId as TaskId },
      model: "cli",
      providerId: "custom",
      vision: false,
    });
    envRef.current = env;
    installBridge(() => envRef.current);

    const summarize = () => {
      const pulled = env.pull();
      return {
        id: pulled.episode.id,
        task: pulled.episode.taskId,
        status: pulled.episode.status,
        reward: pulled.reward,
        answer: pulled.episode.answer ?? null,
        progress: pulled.progress,
        steps: pulled.episode.steps.length,
        traces: pulled.traces,
        tools: pulled.tools,
        transcript: pulled.transcript.map((m) => ({
          role: m.role,
          content: m.content.slice(0, 4000),
          toolCalls: m.toolCalls,
          name: m.name,
        })),
      };
    };

    window.__APERTURE_CLI__ = {
      ready: false,
      taskId,
      playReference: async () => {
        env.reset();
        await runReferencePolicy(env, { abort: () => cancelled, sleepMs: 80 });
        return summarize();
      },
      playModel: async (config: ModelConfig) => {
        env.episode.model = config.model;
        env.episode.providerId = config.providerId;
        env.reset();
        await runModelPolicy(env, config, { abort: () => cancelled, sleepMs: 80 });
        return summarize();
      },
      pull: () => summarize(),
      exportFile: (format) => {
        const file = env.export(format);
        return { filename: file.filename, mime: file.mime, body: file.body };
      },
    };

    void waitForWorld(env).then(() => {
      if (cancelled || !window.__APERTURE_CLI__) return;
      window.__APERTURE_CLI__.ready = true;
      document.documentElement.dataset.apertureReady = "1";
    });

    return () => {
      cancelled = true;
      envRef.current = null;
      delete window.__APERTURE_CLI__;
      delete document.documentElement.dataset.apertureReady;
    };
  }, [taskId]);

  return (
    <div className="min-h-dvh bg-background">
      <WorldStage taskId={taskId as TaskId} stageRef={stageRef} className="h-dvh" />
    </div>
  );
}
