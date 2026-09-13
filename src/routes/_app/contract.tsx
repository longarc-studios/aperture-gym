import { createFileRoute } from "@tanstack/react-router";
import { TOOLS } from "@/lib/aperture/tools";

export const Route = createFileRoute("/_app/contract")({
  component: ContractPage,
});

function ContractPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Gymnasium contract
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Tool contract</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Aperture keeps a harness-agnostic computer-use surface so any model — Ollama on this
        machine, Grok, OpenAI, OpenRouter, Groq, vLLM — can step the same env. Vision, process
        flags, and{" "}
        <code className="font-mono text-foreground">window.__APERTURE__</code> are on the same loop.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">How sessions work</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tools share a browser for the lifetime of the episode. A navigation performed by{" "}
          <code className="font-mono text-foreground">run</code> is visible to the next{" "}
          <code className="font-mono text-foreground">snapshot</code>. Snapshot IDs are valid only
          for the latest tree; after click or goto, snapshot again.{" "}
          <code className="font-mono text-foreground">run</code> accepts exactly one of{" "}
          <code className="font-mono text-foreground">code</code> or{" "}
          <code className="font-mono text-foreground">actions</code>. When vision is on, snapshot
          and screenshot attach a schematic image to the tool result so multimodal models actually
          see the page.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Gymnasium API</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-card p-4 font-mono text-xs leading-relaxed shadow-[var(--shadow-border)]">{`const env = new ApertureEnv({ handle, model: "any", vision: true });
let obs = env.reset();
while (!done) {
  const action = await model.act(obs, TOOLS);
  const { observation, reward, terminated, info } = await env.step(action);
  obs = observation;
  if (terminated) break;
}
const { traces, transcript, tools, progress } = env.pull();
env.export("markdown");

// Same calls, from the browser console:
window.__APERTURE__.step({ id: "call_1", name: "snapshot", arguments: {} })`}</pre>
      </section>

      <section className="mt-10 space-y-8">
        {TOOLS.map((tool) => (
          <article key={tool.name}>
            <h2 className="font-display text-2xl tracking-tight">
              <code className="font-mono text-[0.85em]">{tool.name}</code>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-card p-4 font-mono text-[11px] leading-relaxed text-muted-foreground shadow-[var(--shadow-border)]">
              {JSON.stringify(tool.parameters, null, 2)}
            </pre>
          </article>
        ))}
      </section>

      <section className="mt-10 pb-12">
        <h2 className="font-display text-2xl tracking-tight">Security boundary</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Stagehand’s <code className="font-mono text-foreground">run</code> executes
          model-authored JavaScript inside a browser service worker, not the agent host. Aperture
          goes further for this gym: code is parsed against a Playwright-shaped whitelist. No{" "}
          <code className="font-mono text-foreground">eval</code>. Worlds are hosted pages under{" "}
          <code className="font-mono text-foreground">/worlds</code> — public catalogs, climate
          tables, citation desks, public-domain recipes, literacy passages, civic permits, county
          archives. The env is for good-hearted work.
        </p>
      </section>
    </div>
  );
}
