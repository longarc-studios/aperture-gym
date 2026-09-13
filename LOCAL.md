# Put Aperture on disk, then open it in Grok Build CLI

This gym is not already on your computer. Unzip this archive, then point `grok` at that folder.

## 1. Unzip

macOS / Linux:

```bash
mkdir -p ~/src
unzip aperture-gym.zip -d ~/src/aperture-gym
cd ~/src/aperture-gym
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\src | Out-Null
Expand-Archive -Path .\aperture-gym.zip -DestinationPath $HOME\src\aperture-gym -Force
cd $HOME\src\aperture-gym
```

## 2. Confirm Grok sees the folder

```bash
grok inspect
grok
```

If inspect says it cannot find the project, you are in the wrong directory. `pwd` / `cd` must be inside `aperture-gym` (the folder that contains `GROK.md` and `package.json`).

## 3. First prompt (paste this)

```text
Read GROK.md, then inspect this folder (src/lib/aperture, src/components/worlds, src/routes/harness.$taskId.tsx, bin/aperture.mjs).

This gym must stay exact — same worlds, tools, rewards, traces as the web UI.

Do not build a desktop GUI. Continue the Aperture CLI so Grok Build can drive it:

  npm install
  npm run aperture -- list
  npm run aperture -- play civic-library --reference
  npm run aperture -- export civic-library --reference --format sft

Done when civic-library --reference prints status succeeded.
```

Headless:

```bash
grok -p "$(cat PROMPT.txt)"
```
