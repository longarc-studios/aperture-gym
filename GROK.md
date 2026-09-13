# Grok Build CLI — Aperture

Read this file first. Then read `src/lib/aperture/`, `bin/aperture.mjs`, and `src/routes/harness.$taskId.tsx`.

You are continuing **Aperture**, a model-agnostic computer-use RL gym. The gym in this folder is the source of truth. Do not replace it with a new product. Do not build a desktop GUI.

## What to build

An **Aperture CLI** driven from Grok Build CLI. Same worlds, same tools (`run` / `snapshot` / `screenshot` / `act` / `extract` / `observe` / `done`), same rewards, same traces.

```bash
cd <this-repo>
npm install
npm run aperture -- list
npm run aperture -- play civic-library --reference
npm run aperture -- export civic-library --reference --format sft
```

The CLI opens `/harness/<task>` (exact WorldStage + `ApertureEnv`) with Playwright. `window.__APERTURE_CLI__` runs the same `runReferencePolicy` / `runModelPolicy` as the web gym.

## Do not

- Start over or invent a second env
- Scrape the live web from `run`
- Upload corpus / traces
- Remove cloud providers or local providers
- Treat this as a Grok Build TUI fork — Grok Build edits the repo; Aperture is the gym

## Layout

| Path | Role |
| --- | --- |
| `src/lib/aperture/` | Gym, tools, loop, export |
| `src/components/worlds/scenes.tsx` | Worlds |
| `src/routes/harness.$taskId.tsx` | Headless entry |
| `bin/aperture.mjs` | CLI |

## Done when

`npm run aperture -- play civic-library --reference` prints `status: succeeded` and a reward.
