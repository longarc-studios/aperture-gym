import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Eye, FileText, Radio } from "lucide-react";
import { IrisMark } from "@/components/iris-mark";
import { Playground } from "@/components/playground";
import { Button } from "@/components/ui/button";
import { isDesktopGui } from "@/lib/aperture/desktop";

export const Route = createFileRoute("/_app/")({
  component: Home,
});

function Home() {
  if (isDesktopGui()) return <Navigate to="/play" />;
  return (
    <div className="min-w-0 overflow-x-hidden">
      <section className="iris-grid relative border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="flex items-center gap-3 text-muted-foreground">
            <IrisMark className="size-8 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-[0.22em]">
              Any model, one gym
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.15] tracking-tight text-balance md:text-6xl">
            Any model. One persistent browser. Traces you can take home.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Aperture is a Gym-style computer-use env for any OpenAI-compatible model — Grok,
            OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM, llama.cpp.
            Play a reference episode with no model, then Run model. Pull traces, tools, and
            transcripts. Export markdown for research, tutoring, and open evaluation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/play">
                Open the gym
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/eval">Run the eval sweep</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contract">Read the contract</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          {
            icon: Eye,
            title: "Observation",
            body: "Accessibility trees with sticky snapshot IDs, plus schematic images that actually go back to multimodal models.",
          },
          {
            icon: Radio,
            title: "Traces",
            body: "Every LLM call, tool, process flag, and reward is a span. Export OpenTelemetry JSON or a research notebook without leaving the gym.",
          },
          {
            icon: FileText,
            title: "Transcripts",
            body: "Full tool-calling transcripts in OpenAI, JSONL, and markdown. Built for good-hearted work: literacy, citation, climate literacy, civic process.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
            <item.icon className="size-5 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl tracking-tight">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Live gym
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Step through a world</h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/library">
              <BookOpen className="size-4" />
              Episode library
            </Link>
          </Button>
        </div>
        <Playground />
      </section>
    </div>
  );
}
