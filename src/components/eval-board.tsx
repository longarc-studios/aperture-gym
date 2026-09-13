import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Play, Square } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorldStage } from "@/components/world-stage";
import { getAiStatus } from "@/lib/aperture/complete";
import { runSweep } from "@/lib/aperture/eval";
import { downloadFile, exportEvalRun } from "@/lib/aperture/export";
import { getProvider } from "@/lib/aperture/providers";
import { useAperture } from "@/lib/aperture/store";
import { TASKS, type TaskId, worldPath } from "@/lib/aperture/tasks";
import type { Episode, EvalRow, EvalRun } from "@/lib/aperture/types";

export function EvalBoard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const lastEpisodes = useRef<Episode[]>([]);
  const lastRun = useRef<EvalRun | null>(null);
  const [taskId, setTaskId] = useState<TaskId>("civic-library");
  const [frameKey, setFrameKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [includeModel, setIncludeModel] = useState(false);
  const [rows, setRows] = useState<EvalRow[]>([]);
  const settings = useAperture((s) => s.settings);
  const upsert = useAperture((s) => s.upsertEpisode);
  const pushEval = useAperture((s) => s.pushEval);
  const evals = useAperture((s) => s.evals);
  const provider = getProvider(settings.config.providerId);

  const statusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
    staleTime: 60_000,
  });
  const xaiReady = statusQuery.data?.xai ?? false;

  useEffect(() => {
    void useAperture.persist.rehydrate();
  }, []);

  const loadWorld = (id: TaskId) =>
    new Promise<HTMLElement>((resolve, reject) => {
      setTaskId(id);
      setFrameKey((k) => k + 1);
      const started = Date.now();
      const tick = () => {
        const el = stageRef.current;
        if (el?.querySelector("[data-aperture-flags]")) {
          resolve(el);
          return;
        }
        if (Date.now() - started > 4000) {
          if (el) resolve(el);
          else reject(new Error("World is still loading."));
          return;
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });

  const start = async () => {
    if (includeModel) {
      if (settings.config.providerId === "xai" && !xaiReady) {
        toast.error("xAI is not available. Run reference-only, or add a provider key.");
        return;
      }
      if (provider.needsUserKey && !settings.config.apiKey) {
        toast.error(`Add an API key for ${provider.label} before including the live model.`);
        return;
      }
      if (provider.local) {
        toast("Sweep will call the local runtime on this machine.");
      }
    }
    abortRef.current = false;
    setRunning(true);
    setRows([]);
    try {
      const { run, episodes } = await runSweep({
        includeModel,
        vision: settings.vision,
        config: settings.config,
        hooks: {
          abort: () => abortRef.current,
          loadWorld,
          onRow: (row, episode) => {
            setRows((prev) => [...prev, row]);
            upsert(episode);
          },
        },
      });
      lastEpisodes.current = episodes;
      lastRun.current = run;
      pushEval(run);
      toast(`${run.rows.filter((r) => r.passed).length}/${run.rows.length} passed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sweep failed");
    } finally {
      setRunning(false);
    }
  };

  const chart = TASKS.map((task) => {
    const slice = rows.filter((r) => r.taskId === task.id);
    return {
      name: task.title.replace(" Observatory", "").replace(" Archive", ""),
      pass: slice.filter((r) => r.passed).length,
      n: slice.length,
    };
  }).filter((d) => d.n);

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Runs every world through the real gym. Reference policies are free. Including the live model spends API
            quota — one episode per world.
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeModel}
              onChange={(e) => setIncludeModel(e.target.checked)}
              disabled={running}
            />
            Include live model ({settings.config.model})
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={running}>
            <Play className="size-4" />
            Run sweep
          </Button>
          <Button
            variant="outline"
            disabled={!running}
            onClick={() => {
              abortRef.current = true;
            }}
          >
            <Square className="size-4" />
            Stop
          </Button>
          <Button
            variant="secondary"
            disabled={!lastRun.current}
            onClick={() => {
              if (!lastRun.current) return;
              downloadFile(exportEvalRun(lastRun.current, lastEpisodes.current));
            }}
          >
            <Download className="size-4" />
            Combined JSONL
          </Button>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{worldPath(taskId)}</span>
          <Badge variant={running ? "warning" : "muted"}>{running ? "sweeping" : "idle"}</Badge>
        </div>
        <WorldStage
          key={frameKey}
          taskId={taskId}
          stageRef={stageRef}
          className="h-[280px] md:h-[360px]"
        />
      </div>

      {chart.length ? (
        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Pass count</p>
          <div className="mt-3 h-48 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)",
                  }}
                />
                <Bar dataKey="pass" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">World</th>
              <th>Model</th>
              <th>Pass</th>
              <th>Reward</th>
              <th>Steps</th>
              <th>Tokens</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">{row.title}</td>
                <td className="font-mono text-xs">{row.model}</td>
                <td>
                  <Badge variant={row.passed ? "success" : "warning"}>{row.passed ? "pass" : row.status}</Badge>
                </td>
                <td className="font-mono tabular-nums">{row.reward.toFixed(2)}</td>
                <td className="font-mono tabular-nums">{row.steps}</td>
                <td className="font-mono tabular-nums">{row.tokens || "—"}</td>
                <td className="text-xs text-muted-foreground">
                  {row.flags.filter((f) => f.met).map((f) => f.id).join(", ") || "—"}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={7}>
                  No rows yet. Run a sweep to pack gold trajectories.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {evals.length ? (
        <p className="text-xs text-muted-foreground">
          {evals.length} saved sweep{evals.length === 1 ? "" : "s"} in this browser.
        </p>
      ) : null}
    </div>
  );
}
