import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GYM = process.env.APERTURE_URL || "http://127.0.0.1:8080/play?gui=1";

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0a0b0c",
    title: "Aperture",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(ROOT, "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} ApertureDesktop/0.1`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  void win.loadURL(GYM);
}

ipcMain.handle("aperture:open-files", async () => {
  const pick = await dialog.showOpenDialog({
    title: "Ingest into Aperture",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Corpus", extensions: ["md", "txt", "json", "jsonl", "csv"] },
      { name: "All", extensions: ["*"] },
    ],
  });
  if (pick.canceled) return [];
  const out = [];
  for (const path of pick.filePaths) {
    out.push({ name: path.split(/[\\/]/).pop() ?? "file", text: await readFile(path, "utf8") });
  }
  return out;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
