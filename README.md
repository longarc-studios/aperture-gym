# Aperture

A model-agnostic RL gym for computer-use agents. One persistent browser world, Stagehand-shaped tools (`run` / `snapshot` / `screenshot` plus `act` / `extract` / `observe` / `done`), process rewards, traces, and exports.

**Every OpenAI-compatible model is in scope:** xAI Grok, OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM, llama.cpp, or any custom `/v1/chat/completions` host.

Worlds are fictional civic / education tasks (library catalog, climate table, citation, literacy, permits, archives). Built for research, tutoring, accessibility, and open evaluation — not scraping private data.

Inspired by [Stagehand v4 integrations](https://docs.stagehand.dev/v4/integrations/overview). Not affiliated with Browserbase.

## Run it

```bash
npm install
npm run dev
```

Open the gym. **Play reference** works with no model. **Run model** uses whichever provider you pick.

### Hosted models

| Provider | What you need |
| --- | --- |
| xAI Grok | Server `XAI_API_KEY`, or the injected key |
| OpenAI | API key in the gym |
| OpenRouter | API key — any lab's model id |
| Groq / Together / Fireworks | API key |

Keys are sent with the request only. They are not stored on the server.

### Local runtimes

Same gym, no key:

```bash
ollama serve
ollama pull llama3.1
```

Or LM Studio (`:1234`), vLLM (`:8000`), llama.cpp (`:8090`), or **Custom endpoint** with a base URL ending in `/v1`.

Models that cannot emit native tool calls can reply with:

```json
{"tool":"snapshot","arguments":{}}
```

## What you get

| Surface | What it is |
| --- | --- |
| Gym | Live world + reference policy + any model |
| Eval | Sweep all worlds, pass-rate, combined JSONL |
| Library | Saved episodes |
| Contract | Tool schema + Gymnasium `reset` / `step` / `pull` / `export` |

Exports: markdown, JSONL, OpenAI transcript, OpenTelemetry JSON, **SFT JSONL**, and **trajectories**.

Drop your own markdown / JSONL on the **Data** page. Files stay in the browser, show up in the Reading Room world, and fold into the training pack. You own the corpus.

`window.__APERTURE__` exposes the live env for a scripted harness.

## Aperture CLI

Same gym as the web UI, headless. Use this from Grok Build CLI.

```bash
npm run aperture -- list
npm run aperture -- play civic-library --reference
npm run aperture -- play civic-library --model llama3.1 --base-url http://127.0.0.1:11434/v1
npm run aperture -- export civic-library --reference --format sft
```

This gym lives in the App Builder sandbox until you copy it out. Download `artifacts/aperture-gym.zip`, unzip, then `cd` into that folder before running `grok`. See [LOCAL.md](./LOCAL.md).

## Scripts

```bash
npm run dev
npm run desktop
npm run typecheck
npm run build
```

## License

MIT. See [LICENSE](./LICENSE).
