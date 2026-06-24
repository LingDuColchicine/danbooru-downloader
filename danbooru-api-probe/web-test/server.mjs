import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const port = Number(process.env.PORT || 5174);
const danbooruHost = "danbooru.donmai.us";
const danbooruIpFallbacks = ["104.26.10.39", "172.67.70.99", "104.26.11.39"];
const normalFetchTimeoutMs = Number(process.env.NORMAL_FETCH_TIMEOUT_MS || 500);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function handlePosts(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const tags = requestUrl.searchParams.get("tags") || "";
  const limit = requestUrl.searchParams.get("limit") || "10";
  const page = requestUrl.searchParams.get("page") || "1";

  const danbooruUrl = new URL("https://danbooru.donmai.us/posts.json");
  danbooruUrl.searchParams.set("tags", tags);
  danbooruUrl.searchParams.set("limit", limit);
  danbooruUrl.searchParams.set("page", page);

  try {
    const upstream = await fetchDanbooru(danbooruUrl);
    response.writeHead(upstream.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(upstream.payload, null, 2));
  } catch (error) {
    sendJson(response, 502, {
      error: "Danbooru request failed",
      message: error.message,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
      } : null,
      url: danbooruUrl.toString(),
    });
  }
}

async function fetchDanbooru(danbooruUrl) {
  const startedAt = Date.now();
  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), normalFetchTimeoutMs);
    const upstream = await fetch(danbooruUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "danbooru-web-test/0.1",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);
    const text = await upstream.text();
    return {
      status: upstream.status,
      payload: {
        transport: "fetch",
        timings: {
          total_ms: Date.now() - startedAt,
          normal_fetch_ms: Date.now() - startedAt,
        },
        request: {
          url: danbooruUrl.toString(),
          status: upstream.status,
          statusText: upstream.statusText,
        },
        body: parseJsonOrText(text),
      },
    };
  } catch (fetchError) {
    if (timeout) {
      clearTimeout(timeout);
    }
    const normalFetchMs = Date.now() - startedAt;
    const fallbackErrors = [];

    for (const ip of danbooruIpFallbacks) {
      const fallbackStartedAt = Date.now();
      try {
        const fallback = await fetchDanbooruViaIp(danbooruUrl, ip);
        fallback.payload.timings = {
          total_ms: Date.now() - startedAt,
          normal_fetch_ms: normalFetchMs,
          fallback_ms: Date.now() - fallbackStartedAt,
        };
        fallback.payload.primaryFetchError = {
          message: fetchError.message,
          cause: fetchError.cause ? {
            name: fetchError.cause.name,
            code: fetchError.cause.code,
            message: fetchError.cause.message,
          } : null,
        };
        return fallback;
      } catch (fallbackError) {
        fallbackErrors.push({
          ip,
          message: fallbackError.message,
          code: fallbackError.code,
        });
      }
    }

    fetchError.message = `${fetchError.message}; IP fallbacks failed: ${JSON.stringify(fallbackErrors)}`;
    throw fetchError;
  }
}

function fetchDanbooruViaIp(danbooruUrl, ip) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest({
      host: ip,
      port: 443,
      method: "GET",
      path: `${danbooruUrl.pathname}${danbooruUrl.search}`,
      servername: danbooruHost,
      timeout: 15000,
      headers: {
        Host: danbooruHost,
        "User-Agent": "danbooru-web-test/0.1",
        Accept: "application/json",
      },
    }, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: res.statusCode,
          payload: {
            transport: `https-ip-fallback:${ip}`,
            request: {
              url: danbooruUrl.toString(),
              status: res.statusCode,
              statusText: res.statusMessage,
            },
            body: parseJsonOrText(text),
          },
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Timed out connecting to ${ip}`));
    });
    req.on("error", reject);
    req.end();
  });
}

function parseJsonOrText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const staticRoot = pathname.startsWith("/icons/") ? projectRoot : here;
  const filePath = join(staticRoot, pathname);

  if (!filePath.startsWith(staticRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = createServer((request, response) => {
  if (request.url.startsWith("/api/posts")) {
    handlePosts(request, response);
    return;
  }

  handleStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Danbooru web test running at http://127.0.0.1:${port}/`);
});
