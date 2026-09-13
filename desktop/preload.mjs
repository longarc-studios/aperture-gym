import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("apertureDesktop", {
  isDesktop: true,
  openFiles: () => ipcRenderer.invoke("aperture:open-files"),
});
