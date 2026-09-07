const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("danbooruDesktop", {
  platform: process.platform,
  chooseDownloadDirectory: () => ipcRenderer.invoke("download-directory:choose"),
  downloadOriginal: (payload) => ipcRenderer.invoke("download-original", payload),
  getDownloadDirectory: () => ipcRenderer.invoke("download-directory:get"),
  openDownloadDirectory: () => ipcRenderer.invoke("download-directory:open"),
  getSessionImageUrl: (url) => `danbooru-image://fetch/?url=${encodeURIComponent(url)}`,
  getNetworkSettings: () => ipcRenderer.invoke("network-settings:get"),
  setNetworkSettings: (settings) => ipcRenderer.invoke("network-settings:set", settings),
  testNetworkSettings: (settings) => ipcRenderer.invoke("network-settings:test", settings),
  openDanbooruVerification: () => ipcRenderer.invoke("danbooru-verification:open"),
  getSystemTheme: () => ipcRenderer.invoke("theme:get-system"),
  onDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("download:progress", listener);
    return () => ipcRenderer.removeListener("download:progress", listener);
  },
  onSystemThemeChanged: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on("theme:system-changed", listener);
    return () => ipcRenderer.removeListener("theme:system-changed", listener);
  },
});
