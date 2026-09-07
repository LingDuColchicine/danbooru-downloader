import { app, BrowserWindow, dialog, ipcMain, nativeTheme, protocol, session, shell } from "electron";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, parse } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const serverScript = join(projectRoot, "web", "server.mjs");
const preferredServerPort = Number(process.env.DANBOORU_APP_PORT || 5174);
const settingsFileName = "settings.json";
const networkTestPostUrl = "https://danbooru.donmai.us/posts.json?limit=1&tags=rating%3Ag";
const danbooruVerificationUrl = "https://danbooru.donmai.us/posts";
const imageProtocolScheme = "danbooru-image";

protocol.registerSchemesAsPrivileged([{
  scheme: imageProtocolScheme,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}]);

let mainWindow;
let verificationWindow;
let serverProcess;
let serverPort = preferredServerPort;
let appUrl = `http://127.0.0.1:${serverPort}/`;
let activeNetworkSettings = { mode: "system", proxyUrl: "" };
let webServerProxyUrl = "";

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

  const proxyEnvironment = webServerProxyUrl
    ? {
        NODE_USE_ENV_PROXY: "1",
        HTTP_PROXY: webServerProxyUrl,
        HTTPS_PROXY: webServerProxyUrl,
        NO_PROXY: "127.0.0.1,localhost,danbooru.donmai.us",
      }
    : {};
  const childProcess = spawn(process.execPath, [serverScript], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(serverPort),
      ...proxyEnvironment,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess = childProcess;

  childProcess.stdout.on("data", (chunk) => {
    console.log(`[web] ${chunk.toString().trim()}`);
  });

  childProcess.stderr.on("data", (chunk) => {
    console.error(`[web] ${chunk.toString().trim()}`);
  });

  childProcess.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`Web server exited with code ${code ?? "null"} and signal ${signal ?? "null"}.`);
    }
    if (serverProcess === childProcess) {
      serverProcess = null;
    }
  });

  return childProcess;
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
  activeNetworkSettings = await getNetworkSettings();
  await applyNetworkSettings(activeNetworkSettings);
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

function normalizeNetworkSettings(value) {
  const mode = ["system", "direct", "custom"].includes(value?.mode)
    ? value.mode
    : "system";
  if (mode !== "custom") {
    return { mode, proxyUrl: "" };
  }

  let proxyUrl;
  try {
    proxyUrl = new URL(String(value?.proxyUrl || "").trim());
  } catch {
    throw new Error("Enter a valid proxy URL.");
  }

  if (!["http:", "https:"].includes(proxyUrl.protocol) || !proxyUrl.hostname) {
    throw new Error("Only HTTP and HTTPS proxy URLs are supported.");
  }
  if (proxyUrl.username || proxyUrl.password) {
    throw new Error("Authenticated proxy URLs are not supported yet.");
  }

  return {
    mode,
    proxyUrl: proxyUrl.toString(),
  };
}

async function getNetworkSettings() {
  const settings = await readSettings();
  try {
    return normalizeNetworkSettings(settings.network);
  } catch {
    return { mode: "system", proxyUrl: "" };
  }
}

function getProxyUrlFromResolvedProxy(value) {
  for (const entry of String(value || "").split(";")) {
    const [type, address] = entry.trim().split(/\s+/, 2);
    if (!address) {
      continue;
    }
    if (type === "PROXY" || type === "HTTP") {
      return `http://${address}`;
    }
    if (type === "HTTPS") {
      return `https://${address}`;
    }
  }
  return "";
}

async function configureSessionProxy(targetSession, networkSettings) {
  if (networkSettings.mode === "custom") {
    await targetSession.setProxy({
      mode: "fixed_servers",
      proxyRules: networkSettings.proxyUrl,
    });
  } else {
    await targetSession.setProxy({ mode: networkSettings.mode });
  }
  await targetSession.closeAllConnections();
}

async function resolveBackendProxy(targetSession, networkSettings) {
  if (networkSettings.mode === "custom") {
    return networkSettings.proxyUrl;
  }
  if (networkSettings.mode !== "system") {
    return "";
  }

  const resolvedProxy = await targetSession.resolveProxy("https://cdn.donmai.us/");
  return getProxyUrlFromResolvedProxy(resolvedProxy);
}

async function applyNetworkSettings(networkSettings) {
  const normalized = normalizeNetworkSettings(networkSettings);
  await configureSessionProxy(session.defaultSession, normalized);
  webServerProxyUrl = await resolveBackendProxy(session.defaultSession, normalized);
  activeNetworkSettings = normalized;
  return normalized;
}

async function saveNetworkSettings(networkSettings) {
  const settings = await readSettings();
  settings.network = networkSettings;
  await writeSettings(settings);
}

function getNetworkResponseError(response, contentType) {
  const cfMitigated = response.headers.get("cf-mitigated") || "";
  const isCloudflareChallenge = cfMitigated.toLowerCase() === "challenge" || (
    response.status === 403 && contentType.toLowerCase().includes("text/html")
  );
  if (isCloudflareChallenge) {
    return "CLOUDFLARE_CHALLENGE";
  }
  if (response.status === 407) {
    return "PROXY_AUTH_REQUIRED";
  }
  return response.ok ? "INVALID_CONTENT" : "HTTP_ERROR";
}

function networkSettingsMatch(first, second) {
  return first.mode === second.mode && first.proxyUrl === second.proxyUrl;
}

async function testNetworkSettings(networkSettings, options = {}) {
  const normalized = normalizeNetworkSettings(networkSettings);
  const useDefaultSession = options.useDefaultSession
    || networkSettingsMatch(normalized, activeNetworkSettings);
  const testSession = useDefaultSession
    ? session.defaultSession
    : session.fromPartition("network-test");
  if (!useDefaultSession) {
    await configureSessionProxy(testSession, normalized);
  }

  const apiStartedAt = Date.now();
  let apiResult;
  let previewUrl = "";
  try {
    const apiResponse = await testSession.fetch(networkTestPostUrl, {
      headers: { Accept: "application/json" },
      credentials: "include",
      signal: AbortSignal.timeout(12000),
    });
    const contentType = apiResponse.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await apiResponse.json() : null;
    previewUrl = Array.isArray(body)
      ? body.find((post) => post?.preview_file_url)?.preview_file_url || ""
      : "";
    apiResult = {
      ok: apiResponse.ok && Boolean(previewUrl),
      status: apiResponse.status,
      latencyMs: Date.now() - apiStartedAt,
      code: apiResponse.ok && previewUrl ? "OK" : getNetworkResponseError(apiResponse, contentType),
    };
  } catch (error) {
    apiResult = {
      ok: false,
      status: 0,
      latencyMs: Date.now() - apiStartedAt,
      code: error.name === "TimeoutError" ? "TIMEOUT" : "REQUEST_FAILED",
    };
  }

  if (!previewUrl) {
    return { api: apiResult, cdn: { ok: false, status: 0, latencyMs: 0, code: "NOT_TESTED" } };
  }

  const cdnStartedAt = Date.now();
  try {
    const cdnResponse = await testSession.fetch(previewUrl, {
      headers: { Accept: "image/*" },
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    });
    const contentType = cdnResponse.headers.get("content-type") || "";
    const ok = cdnResponse.ok && contentType.toLowerCase().startsWith("image/");
    await cdnResponse.body?.cancel().catch(() => {});
    return {
      api: apiResult,
      cdn: {
        ok,
        status: cdnResponse.status,
        latencyMs: Date.now() - cdnStartedAt,
        code: ok ? "OK" : getNetworkResponseError(cdnResponse, contentType),
      },
    };
  } catch (error) {
    return {
      api: apiResult,
      cdn: {
        ok: false,
        status: 0,
        latencyMs: Date.now() - cdnStartedAt,
        code: error.name === "TimeoutError" ? "TIMEOUT" : "REQUEST_FAILED",
      },
    };
  }
}

async function getClearanceSummary(targetSession = session.defaultSession) {
  const cookies = await targetSession.cookies.get({ name: "cf_clearance" });
  return cookies.map((cookie) => ({
    domain: cookie.domain,
    expirationDate: cookie.expirationDate || null,
  }));
}

async function openDanbooruVerification() {
  if (verificationWindow && !verificationWindow.isDestroyed()) {
    verificationWindow.focus();
    return { ok: false, pending: true };
  }

  verificationWindow = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    parent: mainWindow,
    title: "Danbooru verification",
    webPreferences: {
      session: session.defaultSession,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  verificationWindow.setMenuBarVisibility(false);
  verificationWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === "https:" && parsedUrl.hostname.endsWith("donmai.us")) {
      return { action: "allow" };
    }
    openExternalUrl(url);
    return { action: "deny" };
  });

  const closed = once(verificationWindow, "closed");
  await verificationWindow.loadURL(danbooruVerificationUrl);
  await closed;
  verificationWindow = null;

  const clearance = await getClearanceSummary();
  const result = await testNetworkSettings(activeNetworkSettings, { useDefaultSession: true });
  return {
    ok: result.api.ok && result.cdn.ok,
    clearanceFound: clearance.length > 0,
    clearance,
    ...result,
  };
}

function getImageProtocolUrl(sourceUrl) {
  return `${imageProtocolScheme}://fetch/?url=${encodeURIComponent(sourceUrl)}`;
}

async function registerImageProtocol() {
  await session.defaultSession.protocol.handle(imageProtocolScheme, async (request) => {
    const requestUrl = new URL(request.url);
    let imageUrl;
    try {
      imageUrl = new URL(requestUrl.searchParams.get("url"));
    } catch {
      return Response.json({ error: "Invalid image URL" }, { status: 400 });
    }

    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "cdn.donmai.us") {
      return Response.json({ error: "Only Danbooru CDN images are supported" }, { status: 403 });
    }

    try {
      const upstream = await session.defaultSession.fetch(imageUrl.toString(), {
        headers: { Accept: "image/*" },
        credentials: "include",
      });
      const contentType = upstream.headers.get("content-type") || "";
      if (!upstream.ok || !contentType.toLowerCase().startsWith("image/")) {
        const code = getNetworkResponseError(upstream, contentType);
        await upstream.body?.cancel().catch(() => {});
        return Response.json({ error: code }, {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        });
      }
      return upstream;
    } catch (error) {
      return Response.json({ error: error.message }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
  });
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

function isSupportedDownloadUrl(url, source) {
  return url.hostname === "cdn.donmai.us";
}

async function downloadOriginalImage(payload, sendProgress = () => {}) {
  const fileUrl = String(payload?.fileUrl || "");
  let parsedUrl;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new Error("Invalid download URL.");
  }

  if (parsedUrl.protocol !== "https:" || !isSupportedDownloadUrl(parsedUrl, payload?.source)) {
    throw new Error("Only supported booru images can be downloaded.");
  }

  const directory = await getDownloadDirectory();
  await mkdir(directory, { recursive: true });

  const fileName = getDownloadFileName({
    fileUrl,
    filename: payload?.filename,
  });
  const filePath = await getAvailablePath(directory, fileName);
  const response = await session.defaultSession.fetch(fileUrl, {
    headers: {
      Accept: "image/*",
    },
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
    const code = getNetworkResponseError(response, contentType);
    await response.body?.cancel().catch(() => {});
    if (code === "CLOUDFLARE_CHALLENGE") {
      throw new Error("Download blocked by a Danbooru CDN Cloudflare challenge.");
    }
    if (code === "PROXY_AUTH_REQUIRED") {
      throw new Error("Proxy authentication is required.");
    }
    throw new Error(`Download failed with HTTP ${response.status} or a non-image response.`);
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

ipcMain.handle("network-settings:get", async () => ({
  ok: true,
  settings: activeNetworkSettings,
  backendProxyActive: Boolean(webServerProxyUrl),
}));

ipcMain.handle("network-settings:test", async (_event, value) => {
  try {
    const result = await testNetworkSettings(value);
    return { ok: result.api.ok && result.cdn.ok, ...result };
  } catch (error) {
    return { ok: false, message: error.message };
  }
});

ipcMain.handle("danbooru-verification:open", async () => {
  try {
    return await openDanbooruVerification();
  } catch (error) {
    verificationWindow?.destroy();
    verificationWindow = null;
    return { ok: false, message: error.message };
  }
});

ipcMain.handle("network-settings:set", async (_event, value) => {
  const previousSettings = activeNetworkSettings;
  try {
    const normalized = await applyNetworkSettings(value);
    await saveNetworkSettings(normalized);
    await restartWebServer();
    return {
      ok: true,
      settings: normalized,
      backendProxyActive: Boolean(webServerProxyUrl),
    };
  } catch (error) {
    try {
      await applyNetworkSettings(previousSettings);
      await saveNetworkSettings(previousSettings);
      await restartWebServer();
    } catch (rollbackError) {
      console.error(`Failed to restore previous network settings: ${rollbackError.message}`);
    }
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

async function stopWebServer() {
  if (!serverProcess) {
    return;
  }

  const processToStop = serverProcess;
  serverProcess = null;
  if (processToStop.exitCode !== null || processToStop.signalCode !== null) {
    return;
  }
  const exited = once(processToStop, "exit");
  processToStop.kill("SIGTERM");
  await exited;
}

async function restartWebServer() {
  await stopWebServer();
  startWebServer();
  await waitForServer();
}

app.whenReady().then(async () => {
  await registerImageProtocol();
  await createWindow();
}).catch((error) => {
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
  await stopWebServer();
});
