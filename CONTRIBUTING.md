# Contributing

Aperture is a gym, not a product lock-in. Keep it that way.

- Worlds stay fictional and good-hearted (education, civic process, open knowledge).
- The tool contract stays harness-agnostic: `run`, `snapshot`, `screenshot`, plus `act` / `extract` / `observe` / `done`.
- Any OpenAI-compatible `/v1/chat/completions` host must work without a vendor SDK.
- Local runtimes (Ollama, LM Studio, vLLM, llama.cpp) never require a key.
- Don't commit API keys or episode transcripts with personal data.

```bash
npm install
npm run typecheck
npm run dev
```

Play reference on Civic Library before sending a change that touches the env loop.
