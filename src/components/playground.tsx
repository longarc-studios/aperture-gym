import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Download, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WorldStage } from "@/components/world-stage";
import { getAiStatus, probeRuntime } from "@/lib/aperture/complete";
import { newCall, type EnvHandle } from "@/lib/aperture/env";
import { downloadFile, exportEpisode } from "@/lib/aperture/export";
import { ApertureEnv } from "@/lib/aperture/gym";
import { runModelPolicy, runReferencePolicy } from "@/lib/aperture/loop";
import { installBridge, uninstallBridge } from "@/lib/aperture/protocol";
import { getProvider, PROVIDERS } from "@/lib/aperture/providers";
import { useAperture } from "@/lib/aperture/store";
import { getTask, TASKS, type TaskId, worldPath } from "@/lib/aperture/tasks";
import type { Episode, ExportFormat, Observation, ToolCall } from "@/lib/aperture/types";

type Mode = "idle" | "running";

export function Playground({ compact = false }: { compact?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<ApertureEnv | null>(null);
  const abortRef = useRef(false);
  const taskIdRef = useRef<TaskId>("civic-library");
  const [taskId, setTaskId] = useState<TaskId>("civic-library");
  const [frameKey, setFrameKey] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [obs, setObs] = useState<Observation | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [manualId, setManualId] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [answer, setAnswer] = useState("");
  const [tab, setTab] = useState("transcript");
  const [protocolJson, setProtocolJson] = useState("No protocol frame yet. Reset or step the env.");
  const settings = useAperture((s) => s.settings);
  const upsert = useAperture((s) => s.upsertEpisode);
  const setProvider = useAperture((s) => s.setProvider);
  const setModel = useAperture((s) => s.setModel);
  const setApiKey = useAperture((s) => s.setApiKey);
  const setBaseUrl = useAperture((s) => s.setBaseUrl);
  const setMaxSteps = useAperture((s) => s.setMaxSteps);
  const setVision = useAperture((s) => s.setVision);
  const provider = getProvider(settings.config.providerId);
  const task = getTask(taskId);
  taskIdRef.current = taskId;

  const statusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
    staleTime: 60_000,
  });
  const xaiReady = statusQuery.data?.xai ?? false;

  const runtimeQuery = useQuery({
    queryKey: ["runtime", settings.config.baseUrl, settings.config.providerId],
    queryFn: () => probeRuntime({ data: { baseUrl: settings.config.baseUrl || provider.defaultBaseUrl } }),
    enabled: provider.local,
    staleTime: 8_000,
    retry: false,
  });
  const liveModels = runtimeQuery.data?.ok ? runtimeQuery.data.models : [];

  const handle = useCallback((): EnvHandle => {
    return {
      get root() {
        const el = stageRef.current;
        if (!el) throw new Error("World is still loading. Wait a moment and press Play again.");
        return el;
      },
      get taskId() {
        return taskIdRef.current;
      },
      navigate(next: string) {
        if (TASKS.some((t) => t.id === next)) {
          taskIdRef.current = next as TaskId;
          setTaskId(next as TaskId);
        }
      },
    };
  }, []);

  const sync = useCallback((env: ApertureEnv) => {
    envRef.current = env;
    setEpisode(env.episode);
    setProtocolJson(env.lastProtocol ? JSON.stringify(env.lastProtocol, null, 2) : "No protocol frame yet.");
    try {
      setObs(env.observe(false));
    } catch {
      /* mounting */
    }
  }, []);

  const ensureEnv = useCallback(
    (modelLabel: string) => {
      const env = new ApertureEnv({
        handle: handle(),
        model: modelLabel,
        providerId: settings.config.providerId,
        vision: settings.vision !== false,
        maxSteps: Math.max(task.maxSteps, settings.maxSteps ?? 0),
      });
      env.reset();
      sync(env);
      setLog([`episode ${env.episode.id} · ${task.title}`]);
      setMode("running");
      abortRef.current = false;
      return env;
    },
    [handle, settings.config.providerId, settings.maxSteps, settings.vision, sync, task.maxSteps, task.title],
  );

  useEffect(() => {
    installBridge(() => envRef.current);
    return () => uninstallBridge();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (stageRef.current) {
          const env = envRef.current;
          if (env) setObs(env.observe(false));
        }
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [frameKey]);

  const finish = (env: ApertureEnv, status?: Episode["status"]) => {
    const ended = env.finish(status);
    upsert(ended);
    setEpisode(ended);
    setMode("idle");
    return ended;
  };

  const playReference = async () => {
    try {
      const env = ensureEnv("reference-policy");
      await runReferencePolicy(env, {
        abort: () => abortRef.current,
        onUpdate: (ep, next) => {
          setEpisode(ep);
          setObs(next);
          if (env.lastProtocol) setProtocolJson(JSON.stringify(env.lastProtocol, null, 2));
          const last = ep.steps.at(-1);
          if (last?.action) setLog((prev) => [...prev.slice(-80), `${last.action?.name} · r ${last.reward}`]);
        },
      });
      finish(env);
      toast(env.episode.status === "succeeded" ? "Reference episode passed" : "Reference episode finished");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reference run failed");
      if (envRef.current) finish(envRef.current, "failed");
      else setMode("idle");
    }
  };

  const playModel = async () => {
    if (settings.config.providerId === "xai" && !xaiReady) {
      toast.error("xAI is not available. Play a reference episode or add another provider key.");
      return;
    }
    if (provider.needsUserKey && !settings.config.apiKey) {
      toast.error(`Add an API key for ${provider.label}. It never leaves this request.`);
      return;
    }
    try {
      const env = ensureEnv(settings.config.model);
      await runModelPolicy(env, settings.config, {
        abort: () => abortRef.current,
        onUpdate: (ep, next) => {
          setEpisode(ep);
          setObs(next);
          if (env.lastProtocol) setProtocolJson(JSON.stringify(env.lastProtocol, null, 2));
          const last = ep.steps.at(-1);
          if (last?.action) setLog((prev) => [...prev.slice(-80), `${last.action?.name} · r ${last.reward}`]);
        },
      });
      finish(env);
      if (env.episode.status === "failed" && env.episode.spans.some((s) => s.name === "llm.complete" && s.status === "error")) {
        const err = env.episode.spans.find((s) => s.status === "error")?.attributes.error;
        if (err) toast.error(String(err));
      } else {
        toast(env.episode.status === "succeeded" ? "Model episode passed" : "Model episode finished");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Model run failed");
      if (envRef.current) finish(envRef.current, "failed");
      else setMode("idle");
    }
  };

  const manual = async (call: ToolCall) => {
    let env = envRef.current;
    if (!env || env.episode.status !== "running") {
      env = ensureEnv("manual");
    }
    env.noteAssistant({ role: "assistant", content: "", toolCalls: [call] });
    const gym = await env.step(call);
    sync(env);
    setLog((prev) => [...prev.slice(-80), `${call.name} · r ${gym.reward}`]);
    if (gym.terminated || gym.truncated) finish(env);
  };

  const onExport = (format: ExportFormat) => {
    const current = envRef.current?.episode ?? episode;
    if (!current) {
      toast.error("Run an episode first");
      return;
    }
    downloadFile(exportEpisode(current, format));
    toast(`Exported ${format}`);
  };

  const resetWorld = () => {
    abortRef.current = true;
    setMode("idle");
    setEpisode(null);
    envRef.current = null;
    setLog([]);
    setAnswer("");
    setFrameKey((k) => k + 1);
  };

  const lastShot = useMemo(
    () => [...(episode?.steps ?? [])].reverse().find((s) => s.result?.imageDataUrl)?.result?.imageDataUrl,
    [episode],
  );

  return (
    <div className={compact ? "grid min-w-0 gap-4" : "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]"}>
      <section className="grid min-w-0 gap-4">
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:flex-row sm:items-end sm:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <Field label="World">
              <select
                className="h-11 w-full rounded-md bg-secondary px-3 text-sm shadow-[var(--shadow-border)]"
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value as TaskId);
                  setFrameKey((k) => k + 1);
                  setEpisode(null);
                  envRef.current = null;
                }}
              >
                {TASKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model provider">
              <select
                className="h-11 w-full rounded-md bg-secondary px-3 text-sm shadow-[var(--shadow-border)]"
                value={settings.config.providerId}
                onChange={(e) => {
                  const next = getProvider(e.target.value as typeof provider.id);
                  setProvider(next.id, next.defaultModel, next.defaultBaseUrl);
                  setVision(!next.local);
                }}
              >
                <optgroup label="Hosted models">
                  {PROVIDERS.filter((p) => !p.local).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="This machine">
                  {PROVIDERS.filter((p) => p.local).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button onClick={playModel} disabled={mode === "running"} className="w-full sm:w-auto">
              <Play className="size-4" />
              Run model
            </Button>
            <Button
              variant="secondary"
              onClick={playReference}
              disabled={mode === "running"}
              className="w-full sm:w-auto"
            >
              Play reference
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                abortRef.current = true;
                if (envRef.current) finish(envRef.current, "aborted");
                else setMode("idle");
              }}
              disabled={mode !== "running"}
              className="w-full sm:w-auto"
            >
              <Square className="size-4" />
              Stop
            </Button>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-success" />
              <span className="truncate font-mono text-xs text-muted-foreground">{worldPath(taskId)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={episode?.status === "succeeded" ? "success" : "muted"}>
                {episode?.status ?? "idle"}
              </Badge>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                r {episode?.reward.toFixed(2) ?? "0.00"}
              </span>
              <Button size="sm" variant="ghost" onClick={resetWorld}>
                Reset
              </Button>
            </div>
          </div>
          <WorldStage key={frameKey} taskId={taskId} stageRef={stageRef} />
        </div>

        <div className="grid gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Manual tools</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => manual(newCall("snapshot", {}))}>
              Snapshot
            </Button>
            <Button size="sm" variant="secondary" onClick={() => manual(newCall("screenshot", {}))}>
              <Camera className="size-4" />
              Screenshot
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => manual(newCall("observe", { instruction: "find the next useful control" }))}
            >
              Observe
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                manual(newCall("run", { actions: [{ op: "click", id: manualId }] }))
              }
              disabled={!manualId}
            >
              Click id
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                manual(newCall("run", { actions: [{ op: "fill", id: manualId, value: manualValue }] }))
              }
              disabled={!manualId}
            >
              Fill id
            </Button>
            <Button size="sm" onClick={() => manual(newCall("done", { answer }))} disabled={!answer.trim()}>
              Done
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_minmax(0,1.2fr)]">
            <Input placeholder="Snapshot id 1-12" value={manualId} onChange={(e) => setManualId(e.target.value)} />
            <Input placeholder="Fill value" value={manualValue} onChange={(e) => setManualValue(e.target.value)} />
            <Input placeholder="Final answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
        </div>
      </section>

      <aside className="grid min-w-0 gap-4">
        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
          <p className="font-display text-xl tracking-tight">{task.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{task.realm}</p>
          <p className="mt-3 text-sm leading-relaxed text-pretty">{task.instruction}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {(episode?.progress ?? task.progress.map((p) => ({ ...p, met: false }))).map((flag) => (
              <Badge key={flag.id} variant={flag.met ? "success" : "muted"}>
                {flag.label}
              </Badge>
            ))}
          </ul>
          <div className="mt-4 grid gap-3">
            {provider.local ? (
              <div className="flex items-start justify-between gap-3 rounded-md bg-secondary px-3 py-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {runtimeQuery.data?.ok
                    ? `${liveModels.length ? liveModels.slice(0, 4).join(", ") : "runtime live"}${liveModels.length > 4 ? "…" : ""}`
                    : provider.hint ?? "Start the runtime on this machine, then Run model."}
                </p>
                <Badge variant={runtimeQuery.data?.ok ? "success" : "muted"}>
                  {runtimeQuery.isFetching ? "probing" : runtimeQuery.data?.ok ? "live" : "offline"}
                </Badge>
              </div>
            ) : null}
            <Field label="Model id">
              <Input
                value={settings.config.model}
                onChange={(e) => setModel(e.target.value)}
                list="aperture-models"
              />
              <datalist id="aperture-models">
                {(liveModels.length ? liveModels : provider.models).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            {provider.local || provider.id === "openrouter" ? (
              <Field label="Base URL">
                <Input
                  value={settings.config.baseUrl ?? ""}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434/v1"
                />
              </Field>
            ) : null}
            {provider.needsUserKey ? (
              <Field label="API key (this browser, per request)">
                <Input
                  type="password"
                  autoComplete="off"
                  value={settings.config.apiKey ?? ""}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </Field>
            ) : provider.local ? (
              <p className="text-xs text-muted-foreground">
                No API key. Run Aperture on the same machine as the model. Play reference works without one.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {xaiReady
                  ? "xAI server key ready. Switch provider anytime — OpenAI, OpenRouter, Groq, Together, Fireworks, or a local runtime."
                  : "xAI key not injected. Paste a cloud key, pick Ollama on this machine, or Play reference."}
              </p>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(settings.vision)}
                onChange={(e) => setVision(e.target.checked)}
              />
              Vision in the loop (schematic images on snapshot)
            </label>
            <Field label="Step budget">
              <Input
                type="number"
                min={4}
                max={16}
                value={settings.maxSteps}
                onChange={(e) => setMaxSteps(Number(e.target.value) || 8)}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="transcript" className="flex-1">
                Transcript
              </TabsTrigger>
              <TabsTrigger value="traces" className="flex-1">
                Traces
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex-1">
                Snapshot
              </TabsTrigger>
              <TabsTrigger value="protocol" className="flex-1">
                Protocol
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcript">
              <ScrollArea className="h-72">
                <ol className="space-y-3 pr-2 text-sm">
                  {(episode?.messages ?? [])
                    .filter((m) => m.role !== "system")
                    .map((m, i) => (
                      <li key={i} className="rounded-md bg-secondary p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                          {m.role}
                          {m.parts?.some((p) => p.type === "image") ? " · image" : ""}
                        </p>
                        {m.toolCalls?.map((c) => (
                          <p key={c.id} className="mt-1 font-mono text-xs">
                            {c.name} {JSON.stringify(c.arguments).slice(0, 140)}
                          </p>
                        ))}
                        {m.content ? (
                          <p className="mt-1 whitespace-pre-wrap text-pretty text-foreground/90">
                            {m.content.slice(0, 600)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  {!episode ? <Empty>No transcript yet.</Empty> : null}
                </ol>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="traces">
              <ScrollArea className="h-72">
                <ul className="space-y-2 pr-2">
                  {(episode?.spans ?? []).map((span) => (
                    <li key={span.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">{span.kind}</span>
                        <span className="ml-2">{span.name}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {span.endMs ? `${span.endMs - span.startMs}ms` : "…"} · {span.status}
                      </span>
                    </li>
                  ))}
                  {!episode ? <Empty>No spans yet.</Empty> : null}
                </ul>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="tree">
              <ScrollArea className="h-72">
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {obs?.formattedTree ?? "Waiting for world…"}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="protocol">
              <p className="mb-2 text-xs text-muted-foreground">
                Live gym: <span className="font-mono">window.__APERTURE__</span> exposes reset, step, pull, export.
              </p>
              <ScrollArea className="h-64">
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {protocolJson}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          {lastShot ? (
            <img
              src={lastShot}
              alt="Schematic screenshot of the world"
              className="mt-3 w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
            />
          ) : null}
        </div>

        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Export</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Markdown notebooks, JSONL trajectories, OpenTelemetry spans — for research and tutoring.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["markdown", "jsonl", "openai", "sft", "trajectories", "otel", "transcript", "tools"] as ExportFormat[]).map((fmt) => (
              <Button key={fmt} size="sm" variant="outline" onClick={() => onExport(fmt)}>
                <Download className="size-3.5" />
                {fmt}
              </Button>
            ))}
          </div>
        </div>

        <div className="hidden rounded-xl bg-card p-4 shadow-[var(--shadow-border)] lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Run log</p>
          <Textarea readOnly value={log.join("\n")} className="mt-2 h-28 font-mono text-[11px]" />
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
