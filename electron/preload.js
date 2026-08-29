const { contextBridge, ipcRenderer } = require("electron");

/**
 * Expose secure APIs to the React client renderer process.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  toggleFullscreen: () => ipcRenderer.invoke("app:toggle-fullscreen"),
  getSystemInfo: () => ipcRenderer.invoke("app:get-info"),
});
