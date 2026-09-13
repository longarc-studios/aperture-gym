import { createFileRoute } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadFile, exportEpisode } from "@/lib/aperture/export";
import { useAperture } from "@/lib/aperture/store";
import { getTask } from "@/lib/aperture/tasks";
import type { ExportFormat } from "@/lib/aperture/types";

export const Route = createFileRoute("/_app/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const episodes = useAperture((s) => s.episodes);
  const clear = useAperture((s) => s.clearEpisodes);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Pulls
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Library</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Episodes stay in this browser. Re-export markdown, JSONL, or spans whenever you need
            them for a notebook, a lesson, or a training run.
          </p>
        </div>
        {episodes.length ? (
          <Button variant="outline" onClick={clear}>
            <Trash2 className="size-4" />
            Clear
          </Button>
        ) : null}
      </div>
      <ul className="mt-10 space-y-3">
        {episodes.map((ep) => {
          let title = ep.taskId;
          try {
            title = getTask(ep.taskId).title;
          } catch {
            /* keep id */
          }
          return (
            <li key={ep.id} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight">{title}</h2>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {ep.status} · r {ep.reward.toFixed(2)} · {ep.steps.length} steps
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {ep.providerId} / {ep.model}
                {ep.vision ? " · vision" : ""}
                {ep.answer ? ` · ${ep.answer}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(ep.progress ?? []).map((flag) => (
                  <Badge key={flag.id} variant={flag.met ? "success" : "muted"}>
                    {flag.label}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["markdown", "jsonl", "openai", "sft", "trajectories", "otel", "transcript"] as ExportFormat[]).map(
                  (fmt) => (
                    <Button
                      key={fmt}
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(exportEpisode(ep, fmt))}
                    >
                      <Download className="size-3.5" />
                      {fmt}
                    </Button>
                  ),
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!episodes.length ? (
        <p className="mt-12 text-sm text-muted-foreground">
          No episodes yet. Run a reference policy on the gym or a sweep on Eval to seed the shelf.
        </p>
      ) : null}
    </div>
  );
}
