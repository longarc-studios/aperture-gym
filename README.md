# Aperture

A model-agnostic RL gym for computer-use agents. One persistent browser world, Stagehand-shaped tools (`run` / `snapshot` / `screenshot` plus `act` / `extract` / `observe` / `done`), process rewards, traces, and exports.

**Every OpenAI-compatible model is in scope:** xAI Grok, OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM, llama.cpp, or any custom `/v1/chat/completions` host.

Worlds are fictional civic / education tasks. Built for research, tutoring, accessibility, and open evaluation — not scraping private data.

Inspired by [Stagehand v4 integrations](https://docs.stagehand.dev/v4/integrations/overview). Not affiliated with Browserbase.

## Clone

```bash
git clone https://github.com/longarc-studios/aperture-gym.git
cd aperture-gym
npm install
```

Open in Grok Build CLI from this folder:

```bash
grok inspect
grok
```

Then paste `PROMPT.txt`.

## Aperture CLI

Same gym as the web UI, headless.

```bash
npm run aperture -- list
npm run aperture -- play civic-library --reference
npm run aperture -- export civic-library --reference --format sft
```

## License

MIT. See [LICENSE](./LICENSE).
