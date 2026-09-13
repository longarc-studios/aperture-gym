import { createFileRoute, Link } from "@tanstack/react-router";
import { DataDesk } from "@/components/data-desk";

export const Route = createFileRoute("/_app/data")({
  component: DataPage,
});

function DataPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Your harness
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Data</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Drop in markdown, transcripts, or JSONL. Aperture keeps it in this browser, plays it in the
        Reading Room, and packs SFT / trajectory files you can train anything on. Nothing is uploaded.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        After ingest, open{" "}
        <Link to="/play" className="underline">
          the gym
        </Link>{" "}
        and pick the Reading Room world.
      </p>
      <div className="mt-8">
        <DataDesk />
      </div>
    </div>
  );
}
