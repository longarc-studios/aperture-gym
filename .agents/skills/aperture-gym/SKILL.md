---
name: aperture-gym
description: Drive the Aperture computer-use RL gym. Play worlds, pull traces, export SFT/trajectory packs.
---

# Aperture gym

This repo is a **local computer-use gym**, not a coding-agent rewrite of Grok Build.

When the user wants to train or evaluate a web agent:

1. Run `npm run dev` or `npm run desktop` (native window).
2. Gym lives at `/play`. Worlds are under `/worlds/*`.
3. Any OpenAI-compatible model works (Grok, OpenAI, OpenRouter, Ollama, vLLM).
4. Ingest user markdown/JSONL on `/data`. Packs download as SFT JSONL and trajectories.
5. `window.__APERTURE__` exposes `reset`, `step`, `pull`, `export` in the browser.

Do not upload the corpus. Do not hit external sites from `run`. Stay on hosted worlds and the Reading Room.

Reference policy: Play reference on Civic Library first to prove the env before a live model.
