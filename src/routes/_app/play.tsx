import { createFileRoute } from "@tanstack/react-router";
import { Playground } from "@/components/playground";

export const Route = createFileRoute("/_app/play")({
  component: PlayPage,
});

function PlayPage() {
  return (
    <div className="mx-auto max-w-7xl min-w-0 px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Gymnasium</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Play</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Reset a world, run any OpenAI-compatible model, or play the reference policy. The env
        exposes <span className="font-mono text-foreground">reset</span> and{" "}
        <span className="font-mono text-foreground">step</span> under the hood — traces and
        transcripts accumulate on every tool call.
      </p>
      <div className="mt-8">
        <Playground />
      </div>
    </div>
  );
}
