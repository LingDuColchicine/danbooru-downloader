import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, parse } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const serverScript = join(projectRoot, "web-test", "server.mjs");
const preferredServerPort = Number(process.env.DANBOORU_APP_PORT || 5174);
const settingsFileName = "settings.json";

let mainWindow;
let serverProcess;
let serverPort = preferredServerPort;
let appUrl = `http://127.0.0.1:${serverPort}/`;

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

async function resolveServerPort() {
  if (await checkPort(preferredServerPort)) {
    serverPort = preferredServerPort;
  } else {
    const tester = createServer();
    tester.listen(0, "127.0.0.1");
    await once(tester, "listening");
    serverPort = tester.address().port;
    await new Promise((resolve) => tester.close(resolve));
  }

  appUrl = `http://127.0.0.1:${serverPort}/`;
}

function startWebServer() {
  if (serverProcess) {
    return serverProcess;
  }

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(serverPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => {
    console.log(`[web] ${chunk.toString().trim()}`);
  });

  serverProcess.stderr.on("data", (chunk) => {
    console.error(`[web] ${chunk.toString().trim()}`);
  });

  serverProcess.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`Web server exited with code ${code ?? "null"} and signal ${signal ?? "null"}.`);
    }
    serverProcess = null;
  });

  return serverProcess;
}

async function waitForServer() {
  const maxAttempts = 80;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Timed out waiting for ${appUrl}`);
}

function isExternalUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const appOrigin = new URL(appUrl).origin;
    return parsedUrl.origin !== appOrigin && ["http:", "https:", "mailto:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function openExternalUrl(url) {
  if (!isExternalUrl(url)) {
    return false;
  }

  shell.openExternal(url).catch((error) => {
    console.error(`Failed to open external URL: ${error.message}`);
  });
  return true;
}

function getSystemTheme() {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

function notifySystemThemeChanged() {
  mainWindow?.webContents.send("theme:system-changed", getSystemTheme());
}

async function createWindow() {
  if (!serverProcess) {
    await resolveServerPort();
  }
  startWebServer();
  await waitForServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: getSystemTheme() === "dark" ? "#08090c" : "#ffffff",
    title: "Danbooru Downloader",
    webPreferences: {
      preload: join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (openExternalUrl(url)) {
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (openExternalUrl(url)) {
      event.preventDefault();
    }
  });

  await mainWindow.loadURL(appUrl);
}

function getSettingsPath() {
  return join(app.getPath("userData"), settingsFileName);
}

async function readSettings() {
  try {
    return JSON.parse(await readFile(getSettingsPath(), "utf8"));
  } catch {
    return {};
  }
}

async function writeSettings(settings) {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

async function getDownloadDirectory() {
  const settings = await readSettings();
  return settings.downloadDirectory || app.getPath("downloads");
}

async function setDownloadDirectory(directory) {
  const settings = await readSettings();
  settings.downloadDirectory = directory;
  await writeSettings(settings);
  return directory;
}

async function openDownloadDirectory() {
  const directory = await getDownloadDirectory();
  await mkdir(directory, { recursive: true });
  const failureMessage = await shell.openPath(directory);
  if (failureMessage) {
    throw new Error(failureMessage);
  }

  return directory;
}

function sanitizeFileName(fileName) {
  const cleaned = String(fileName || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || `danbooru-${Date.now()}.jpg`;
}

function getDownloadFileName({ fileUrl, filename }) {
  const explicitName = sanitizeFileName(filename);
  if (explicitName.includes(".")) {
    return explicitName;
  }

  try {
    const urlName = sanitizeFileName(basename(new URL(fileUrl).pathname));
    if (urlName.includes(".")) {
      return urlName;
    }
  } catch {
    // Fall through to the sanitized explicit name.
  }

  return `${explicitName}.jpg`;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getAvailablePath(directory, fileName) {
  const parsed = parse(fileName);
  let candidate = join(directory, fileName);
  let index = 1;

  while (await pathExists(candidate)) {
    candidate = join(directory, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }

  return candidate;
}

function getDownloadProgressPayload(payload, patch) {
  return {
    downloadId: String(payload?.downloadId || ""),
    postId: String(payload?.postId || ""),
    ...patch,
  };
}

async function downloadOriginalImage(payload, sendProgress = () => {}) {
  const fileUrl = String(payload?.fileUrl || "");
  let parsedUrl;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new Error("Invalid download URL.");
  }

  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "cdn.donmai.us") {
    throw new Error("Only Danbooru CDN images can be downloaded.");
  }

  const directory = await getDownloadDirectory();
  await mkdir(directory, { recursive: true });

  const fileName = getDownloadFileName({
    fileUrl,
    filename: payload?.filename,
  });
  const filePath = await getAvailablePath(directory, fileName);
  const response = await fetch(fileUrl, {
    headers: {
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}.`);
  }

  const headerSize = Number(response.headers.get("content-length") || 0);
  const fallbackSize = Number(payload?.fileSize || 0);
  const totalBytes = Number.isFinite(headerSize) && headerSize > 0 ? headerSize : fallbackSize;
  let downloadedBytes = 0;
  let lastProgressAt = 0;
  const emitProgress = (patch, force = false) => {
    const now = Date.now();
    if (!force && now - lastProgressAt < 120) {
      return;
    }

    lastProgressAt = now;
    sendProgress(getDownloadProgressPayload(payload, {
      filename: basename(filePath),
      totalBytes,
      downloadedBytes,
      ...patch,
    }));
  };

  emitProgress({ status: "downloading" }, true);

  if (response.body) {
    const reader = response.body.getReader();
    const output = createWriteStream(filePath);
    const outputFinished = new Promise((resolve, reject) => {
      output.once("finish", resolve);
      output.once("error", reject);
    });
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = Buffer.from(value);
        downloadedBytes += chunk.length;
        if (!output.write(chunk)) {
          await once(output, "drain");
        }
        emitProgress({ status: "downloading" });
      }

      output.end();
      await outputFinished;
    } catch (error) {
      output.destroy();
      throw error;
    }
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    downloadedBytes = buffer.length;
    emitProgress({ status: "downloading" }, true);
    await writeFile(filePath, buffer);
  }

  emitProgress({
    status: "complete",
    downloadedBytes: totalBytes > 0 ? Math.max(downloadedBytes, totalBytes) : downloadedBytes,
  }, true);

  return {
    directory,
    filename: basename(filePath),
    path: filePath,
  };
}

ipcMain.handle("download-directory:get", async () => {
  const directory = await getDownloadDirectory();
  return { ok: true, directory };
});

ipcMain.handle("theme:get-system", () => ({
  ok: true,
  theme: getSystemTheme(),
}));

ipcMain.handle("download-directory:choose", async () => {
  const currentDirectory = await getDownloadDirectory();
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: currentDirectory,
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true, directory: currentDirectory };
  }

  const directory = await setDownloadDirectory(result.filePaths[0]);
  return { ok: true, directory };
});

ipcMain.handle("download-directory:open", async () => {
  try {
    const directory = await openDownloadDirectory();
    return { ok: true, directory };
  } catch (error) {
    return { ok: false, message: error.message };
  }
});

ipcMain.handle("download-original", async (event, payload) => {
  const sendProgress = (progress) => {
    event.sender.send("download:progress", progress);
  };

  try {
    const result = await downloadOriginalImage(payload, sendProgress);
    return { ok: true, ...result };
  } catch (error) {
    sendProgress(getDownloadProgressPayload(payload, {
      status: "failed",
      message: error.message,
    }));
    return {
      ok: false,
      message: error.message,
    };
  }
});

function stopWebServer() {
  if (!serverProcess) {
    return;
  }

  const processToStop = serverProcess;
  serverProcess = null;
  processToStop.kill("SIGTERM");
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      console.error(error);
      app.quit();
    });
  }
});

nativeTheme.on("updated", notifySystemThemeChanged);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  stopWebServer();
  if (serverProcess) {
    await once(serverProcess, "exit");
  }
});
