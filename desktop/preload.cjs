const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("apertureDesktop", {
  isDesktop: true,
  openFiles: () => ipcRenderer.invoke("aperture:open-files"),
});
