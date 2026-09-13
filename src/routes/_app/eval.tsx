import { createFileRoute } from "@tanstack/react-router";
import { EvalBoard } from "@/components/eval-board";

export const Route = createFileRoute("/_app/eval")({
  component: EvalPage,
});

function EvalPage() {
  return (
    <div className="mx-auto max-w-7xl min-w-0 px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Capability capture</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Eval</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Sweep every world through the same <span className="font-mono text-foreground">ApertureEnv</span> the gym
        uses. Gold reference policies seed JSONL. Optional live-model column spends quota on purpose.
      </p>
      <div className="mt-8">
        <EvalBoard />
      </div>
    </div>
  );
}
