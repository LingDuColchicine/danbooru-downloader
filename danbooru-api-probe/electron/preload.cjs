const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("danbooruDesktop", {
  platform: process.platform,
});
