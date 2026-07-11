import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Readable } from "node:stream";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const port = Number(process.env.PORT || 5174);
const danbooruHost = "danbooru.donmai.us";
const danbooruImageHost = "cdn.donmai.us";
const danbooruIpFallbacks = ["104.26.10.39", "172.67.70.99", "104.26.11.39"];
const normalFetchTimeoutMs = Number(process.env.NORMAL_FETCH_TIMEOUT_MS || 500);
const accountVerifyTimeoutMs = Number(process.env.ACCOUNT_VERIFY_TIMEOUT_MS || 8000);
const imageFetchTimeoutMs = Number(process.env.IMAGE_FETCH_TIMEOUT_MS || 60000);
const imageCacheMaxEntries = 300;
const imageCacheMaxBytes = 24 * 1024 * 1024;
const imageCacheItemMaxBytes = 512 * 1024;
const imageCache = new Map();
let imageCacheBytes = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml; charset=utf-8",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendImage(response, status, headers, body) {
  response.writeHead(status, headers);
  response.end(body);
}

function getCachedImage(cacheKey) {
  const cached = imageCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  imageCache.delete(cacheKey);
  imageCache.set(cacheKey, cached);
  return cached;
}

function cacheImage(cacheKey, headers, body) {
  if (body.length > imageCacheItemMaxBytes) {
    return;
  }

  while (
    imageCache.size >= imageCacheMaxEntries ||
    imageCacheBytes + body.length > imageCacheMaxBytes
  ) {
    const oldestKey = imageCache.keys().next().value;
    const oldest = imageCache.get(oldestKey);
    imageCache.delete(oldestKey);
    imageCacheBytes -= oldest.body.length;
  }

  imageCache.set(cacheKey, { headers, body });
  imageCacheBytes += body.length;
}

function isCacheableImage(imageUrl) {
  return imageUrl.pathname.startsWith("/180x180/") || imageUrl.pathname.startsWith("/360x360/");
}

function getAuthFromRequest(request) {
  const login = String(request.headers["x-danbooru-login"] || "").trim();
  const apiKey = String(request.headers["x-danbooru-api-key"] || "").trim();
  if (!login || !apiKey) {
    return null;
  }

  return { login, apiKey };
}

function getDanbooruHeaders(auth) {
  const headers = {
    "User-Agent": "danbooru-downloader/0.1",
    Accept: "application/json",
  };

  if (auth?.login && auth?.apiKey) {
    const secret = Buffer.from(`${auth.login}:${auth.apiKey}`).toString("base64");
    headers.Authorization = `Basic ${secret}`;
  }

  return headers;
}

function applyAuthParams(danbooruUrl, auth) {
  if (!auth?.login || !auth?.apiKey) {
    return;
  }

  danbooruUrl.searchParams.set("login", auth.login);
  danbooruUrl.searchParams.set("api_key", auth.apiKey);
}

function getSafeUrl(url) {
  const safeUrl = new URL(url);
  if (safeUrl.searchParams.has("api_key")) {
    safeUrl.searchParams.set("api_key", "[redacted]");
  }
  return safeUrl.toString();
}

function getRequestedSource(requestUrl) {
  const source = requestUrl.searchParams.get("source") || "danbooru";
  return source === "danbooru" ? source : "";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        request.destroy(new Error("Request body is too large"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

async function handlePosts(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const source = getRequestedSource(requestUrl);
  if (source !== "danbooru") {
    sendJson(response, 400, { error: "Unsupported download source" });
    return;
  }
  const tags = requestUrl.searchParams.get("tags") || "";
  const limit = requestUrl.searchParams.get("limit") || "10";
  const page = requestUrl.searchParams.get("page") || "1";
  const auth = getAuthFromRequest(request);

  const danbooruUrl = new URL("https://danbooru.donmai.us/posts.json");
  danbooruUrl.searchParams.set("tags", tags);
  danbooruUrl.searchParams.set("limit", limit);
  danbooruUrl.searchParams.set("page", page);
  applyAuthParams(danbooruUrl, auth);

  try {
    const upstream = await fetchDanbooru(danbooruUrl);
    response.writeHead(upstream.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ ...upstream.payload, source }, null, 2));
  } catch (error) {
    sendJson(response, 502, {
      error: "Danbooru request failed",
      message: error.message,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
      } : null,
      url: getSafeUrl(danbooruUrl),
    });
  }
}

async function handleAutocomplete(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const source = getRequestedSource(requestUrl);
  if (source !== "danbooru") {
    sendJson(response, 400, { error: "Unsupported download source" });
    return;
  }
  const query = requestUrl.searchParams.get("search[query]") || "";
  const type = requestUrl.searchParams.get("search[type]") || "tag_query";
  const limit = requestUrl.searchParams.get("limit") || "12";
  const auth = getAuthFromRequest(request);

  const danbooruUrl = new URL("https://danbooru.donmai.us/autocomplete.json");
  danbooruUrl.searchParams.set("search[query]", query);
  danbooruUrl.searchParams.set("search[type]", type);
  danbooruUrl.searchParams.set("limit", limit);
  applyAuthParams(danbooruUrl, auth);

  try {
    const upstream = await fetchDanbooru(danbooruUrl);
    response.writeHead(upstream.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ ...upstream.payload, source }, null, 2));
  } catch (error) {
    sendJson(response, 502, {
      error: "Danbooru autocomplete request failed",
      message: error.message,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
      } : null,
      url: getSafeUrl(danbooruUrl),
    });
  }
}

async function handlePostShow(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const match = requestUrl.pathname.match(/^\/api\/posts\/(\d+)$/);
  if (!match) {
    sendJson(response, 404, { error: "Post not found" });
    return;
  }

  const source = getRequestedSource(requestUrl);
  if (source !== "danbooru") {
    sendJson(response, 400, { error: "Unsupported download source" });
    return;
  }

  const auth = getAuthFromRequest(request);
  const danbooruUrl = new URL(`https://danbooru.donmai.us/posts/${match[1]}.json`);
  applyAuthParams(danbooruUrl, auth);

  try {
    const upstream = await fetchDanbooru(danbooruUrl);
    response.writeHead(upstream.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ ...upstream.payload, source }, null, 2));
  } catch (error) {
    sendJson(response, 502, {
      error: "Danbooru post request failed",
      message: error.message,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
      } : null,
      url: getSafeUrl(danbooruUrl),
    });
  }
}

async function handleAccountVerify(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const login = String(body.login || "").trim();
    const apiKey = String(body.apiKey || "").trim();

    if (!login || !apiKey) {
      sendJson(response, 400, { error: "Username and API key are required" });
      return;
    }

    const verification = await verifyDanbooruAccount({ login, apiKey });
    if (verification?.ok) {
      const profile = verification.profile;
      sendJson(response, 200, {
        ok: true,
        profile: {
          id: profile?.id,
          name: profile?.name || login,
          level_string: profile?.level_string,
        },
      });
      return;
    }

    const failedAttempts = verification?.attempts || [];
    const finalAttempt = failedAttempts.at(-1);
    sendJson(response, finalAttempt?.status || 401, {
      ok: false,
      error: finalAttempt?.status === 401 || finalAttempt?.status === 403
        ? "Authentication failed"
        : "Account verification failed",
      attempts: failedAttempts,
      body: finalAttempt?.body,
    });
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      error: "Account verification request failed",
      message: error.message,
    });
  }
}

async function verifyDanbooruAccount(auth) {
  const attempts = [];
  const profileUrlWithParams = new URL("https://danbooru.donmai.us/profile.json");
  applyAuthParams(profileUrlWithParams, auth);
  const postsUrlWithParams = new URL("https://danbooru.donmai.us/posts.json");
  postsUrlWithParams.searchParams.set("limit", "1");
  applyAuthParams(postsUrlWithParams, auth);

  for (const attempt of [
    {
      name: "profile-query-params",
      url: profileUrlWithParams,
      auth: null,
      kind: "profile",
    },
    {
      name: "profile-basic-auth",
      url: new URL("https://danbooru.donmai.us/profile.json"),
      auth,
      kind: "profile",
    },
    {
      name: "posts-query-params",
      url: postsUrlWithParams,
      auth: null,
      kind: "posts",
    },
    {
      name: "posts-basic-auth",
      url: new URL("https://danbooru.donmai.us/posts.json?limit=1"),
      auth,
      kind: "posts",
    },
  ]) {
    try {
      const upstream = await fetchDanbooru(attempt.url, attempt.auth, {
        timeoutMs: accountVerifyTimeoutMs,
      });

      attempts.push({
        method: attempt.name,
        transport: upstream.payload.transport,
        status: upstream.status,
        request: upstream.payload.request,
        body: summarizeVerificationBody(upstream.payload.body),
      });

      if (upstream.status === 200) {
        return {
          ok: true,
          profile: attempt.kind === "profile" && upstream.payload.body
            ? upstream.payload.body
            : { name: auth.login },
          upstream,
        };
      }
    } catch (error) {
      attempts.push({
        method: attempt.name,
        status: 502,
        error: error.message,
      });
    }
  }

  return { ok: false, attempts };
}

function summarizeVerificationBody(body) {
  if (Array.isArray(body)) {
    return { item_count: body.length };
  }

  if (body && typeof body === "object") {
    return {
      id: body.id,
      name: body.name,
      level_string: body.level_string,
      error: body.error,
      message: body.message,
      success: body.success,
    };
  }

  return body;
}

async function handleImageProxy(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const rawUrl = requestUrl.searchParams.get("url");

  let imageUrl;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    sendJson(response, 400, { error: "Invalid image URL" });
    return;
  }

  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== danbooruImageHost) {
    sendJson(response, 403, { error: "Only Danbooru CDN images can be proxied" });
    return;
  }

  const cacheKey = imageUrl.toString();
  const cached = getCachedImage(cacheKey);
  if (cached) {
    sendImage(response, 200, {
      ...cached.headers,
      "X-Image-Proxy-Cache": "HIT",
    }, cached.body);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), imageFetchTimeoutMs);

  try {
    const proxyResponse = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        Accept: "*/*",
      },
    });
    const headers = {
      "Content-Type": proxyResponse.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "X-Image-Proxy-Cache": "MISS",
    };

    const contentLength = proxyResponse.headers.get("content-length");
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    if (isCacheableImage(imageUrl) && proxyResponse.ok && headers["Content-Type"].startsWith("image/")) {
      const imageBuffer = Buffer.from(await proxyResponse.arrayBuffer());
      headers["Content-Length"] = imageBuffer.length;
      cacheImage(cacheKey, {
        "Content-Type": headers["Content-Type"],
        "Cache-Control": headers["Cache-Control"],
        "Content-Length": imageBuffer.length,
      }, imageBuffer);
      sendImage(response, proxyResponse.status, headers, imageBuffer);
      return;
    }

    response.writeHead(proxyResponse.status, headers);
    if (proxyResponse.body) {
      Readable.fromWeb(proxyResponse.body).pipe(response);
    } else {
      response.end();
    }
  } catch (error) {
    sendJson(response, 502, {
      error: "Image proxy request failed",
      message: error.message,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDanbooru(danbooruUrl, auth = null, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs || normalFetchTimeoutMs;
  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), timeoutMs);
    const upstream = await fetch(danbooruUrl, {
      signal: controller.signal,
      headers: getDanbooruHeaders(auth),
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
          url: getSafeUrl(danbooruUrl),
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
        const fallback = await fetchDanbooruViaIp(danbooruUrl, ip, auth);
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

function fetchDanbooruViaIp(danbooruUrl, ip, auth = null) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest({
      host: ip,
      port: 443,
      method: "GET",
      path: `${danbooruUrl.pathname}${danbooruUrl.search}`,
      servername: danbooruHost,
      timeout: 15000,
      headers: {
        ...getDanbooruHeaders(auth),
        Host: danbooruHost,
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
              url: getSafeUrl(danbooruUrl),
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
  if (request.url.startsWith("/api/account/verify")) {
    handleAccountVerify(request, response);
    return;
  }

  if (request.url.startsWith("/api/posts")) {
    if (/^\/api\/posts\/\d+(?:\?|$)/.test(request.url)) {
      handlePostShow(request, response);
      return;
    }

    handlePosts(request, response);
    return;
  }

  if (request.url.startsWith("/api/autocomplete")) {
    handleAutocomplete(request, response);
    return;
  }

  if (request.url.startsWith("/api/image-proxy")) {
    handleImageProxy(request, response);
    return;
  }

  handleStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Danbooru Downloader running at http://127.0.0.1:${port}/`);
});
