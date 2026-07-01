import { app, BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const serverScript = join(projectRoot, "web-test", "server.mjs");
const preferredServerPort = Number(process.env.DANBOORU_APP_PORT || 5174);

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
    backgroundColor: "#ffffff",
    title: "Danbooru Downloader",
    webPreferences: {
      preload: join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadURL(appUrl);
}

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
