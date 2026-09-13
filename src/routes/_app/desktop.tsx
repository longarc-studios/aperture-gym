import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isDesktopGui, setDesktopGui } from "@/lib/aperture/desktop";

export const Route = createFileRoute("/_app/desktop")({
  component: DesktopPage,
});

function DesktopPage() {
  const [gui, setGui] = useState(false);
  useEffect(() => setGui(isDesktopGui()), []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Local GUI
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Desktop</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Aperture is the gym GUI. Grok Build (Apache-2.0,{" "}
        <a className="underline" href="https://github.com/xai-org/grok-build" target="_blank" rel="noreferrer">
          xai-org/grok-build
        </a>
        ) is the separate Rust TUI coding agent. This app does not vendor that tree. It is a local
        window around the gym, with a skill so Grok Build can drive this repo if you have `grok`
        installed.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Native window</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          On your machine, from this repo:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-card p-4 font-mono text-xs shadow-[var(--shadow-border)]">{`npm install
npm run desktop`}</pre>
        <p className="mt-3 text-sm text-muted-foreground">
          That starts the gym and opens an Electron window. No data leaves the machine. Pick Grok,
          OpenAI, OpenRouter, or Ollama in the provider list — same as the browser gym.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">GUI chrome here</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Compact app chrome (skip the marketing page, land on the gym). Stored only in this
          browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setDesktopGui(true);
              setGui(true);
              window.location.href = "/play?gui=1";
            }}
          >
            Use app chrome
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDesktopGui(false);
              setGui(false);
              window.location.href = "/";
            }}
          >
            Site chrome
          </Button>
          <Button asChild variant="secondary">
            <Link to="/play">Open gym</Link>
          </Button>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {gui ? "app chrome on" : "site chrome on"}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Grok Build TUI</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If you already run the official <code className="font-mono">grok</code> CLI, open this
          folder in it. The skill at{" "}
          <code className="font-mono">.agents/skills/aperture-gym/SKILL.md</code> tells the agent
          this is a gym, not a generic codebase. Merge{" "}
          <code className="font-mono">config.toml.example</code> into{" "}
          <code className="font-mono">~/.grok/config.toml</code> to point at local or hosted models.
        </p>
      </section>
    </div>
  );
}
