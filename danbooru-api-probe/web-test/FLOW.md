# Danbooru Web Test Flow

This directory is a minimal browser-based API verification tool. It is intentionally plain and should not be treated as the final app UI.

## Purpose

Use this page to confirm Danbooru search behavior and response fields before building the real downloader UI.

Current test surface:

- Search tags
- `limit`
- `page`
- Raw `posts.json` response
- Compact post summary for downloader-relevant fields

## Runtime

Start the server from `danbooru-api-probe`:

```powershell
node .\web-test\server.mjs
```

Open:

```text
http://127.0.0.1:5174/
```

No npm dependencies are required. The server uses only Node built-ins.

## Request Flow

```text
Browser form
  -> main.js builds URLSearchParams(tags, limit, page)
  -> fetch("/api/posts?...") on localhost
  -> server.mjs builds https://danbooru.donmai.us/posts.json?... 
  -> server.mjs requests Danbooru
  -> server.mjs wraps upstream result as JSON
  -> main.js shows status, compact summary, and raw JSON
```

The browser does not call Danbooru directly. This keeps the test independent of browser CORS behavior and mirrors the likely desktop-app architecture where a local backend owns network and file operations.

## Frontend

File: `main.js`

The frontend is deliberately simple:

- Reads the form with `FormData`
- Sends a GET request to local `/api/posts`
- Expects the server response shape:

```js
{
  transport: "fetch" | "https-ip-fallback:<ip>",
  request: {
    url: "...",
    status: 200,
    statusText: "OK"
  },
  body: [/* Danbooru posts */]
}
```

- Displays a compact summary with:
  - `id`
  - `rating`
  - `score`
  - dimensions
  - `file_ext`
  - `file_size`
  - `preview_file_url`
  - `large_file_url`
  - `file_url`
  - `source`
  - artist / character / copyright / full tags
- Displays the complete raw JSON response below the summary

This is enough to validate search and response structure. Do not add production UI complexity here unless it helps API inspection.

## Backend

File: `server.mjs`

Main routes:

- `GET /`
  Serves `index.html`.

- `GET /api/posts?tags=...&limit=...&page=...`
  Proxies to Danbooru `posts.json`.

Backend steps:

1. Parse local query params.
2. Build `https://danbooru.donmai.us/posts.json`.
3. Try normal `fetch`.
4. If normal `fetch` fails, try fixed IP fallback requests.
5. Return a wrapped JSON payload containing transport metadata and the raw Danbooru body.

## Network Fallback

This project currently includes an IP fallback because the local environment has shown unstable DNS behavior:

- Working case: `danbooru.donmai.us` resolves to Cloudflare IPs such as `104.26.10.39`.
- Failing case: `danbooru.donmai.us` resolves to `185.60.216.11`, where TCP 443 times out.

When normal `fetch` fails, `server.mjs` tries:

```js
["104.26.10.39", "172.67.70.99", "104.26.11.39"]
```

The fallback preserves:

- TLS SNI: `danbooru.donmai.us`
- HTTP `Host`: `danbooru.donmai.us`

This is important because Cloudflare needs the original hostname even when connecting to a fixed IP.

The normal DNS-based fetch is intentionally capped by `NORMAL_FETCH_TIMEOUT_MS`, defaulting to `500`. In this local environment, waiting for the bad DNS path to time out naturally adds about 10 seconds per search. A short timeout keeps the test page responsive while still allowing normal DNS to win when it is healthy.

Treat this fallback as development-only resilience. In a production app, prefer one of these options:

- Use normal DNS and show clear network diagnostics when it fails.
- Add user-configurable proxy/DNS settings.
- Avoid hardcoded CDN IPs unless there is a strong operational reason.

## Complexity Assessment

The overall search flow is simple.

The only nontrivial part is `fetchDanbooru()`:

- It wraps normal fetch.
- It caps normal fetch with `NORMAL_FETCH_TIMEOUT_MS`.
- It records the upstream status and request URL.
- It falls back to direct IP HTTPS requests when DNS points to a bad address.
- It returns the primary fetch error when fallback succeeds, so the page can reveal that fallback was used.

This complexity exists only because the current network environment intermittently resolves Danbooru to an unreachable IP. It is not intrinsic to the Danbooru API.

## Latency Findings

Observed local behavior:

- Before quick fallback: local `/api/posts` took about `11.8s`.
- The delay was caused by Node `fetch` waiting for `danbooru.donmai.us:443` to time out after DNS resolved to unreachable IPs such as `31.13.86.21` / `185.60.216.11`.
- The actual Danbooru request through a reachable Cloudflare IP took under roughly `1s`.
- After adding quick fallback, local `/api/posts` is expected to take roughly `1-2s` in this environment.

Conclusion:

The API payload itself is not the main bottleneck. The current slowness is primarily DNS/network path selection before the request reaches Danbooru. For the eventual app, thumbnail loading should be treated separately:

- API search can be fast enough if network path selection is healthy.
- Thumbnail loading will add more latency because it requires many CDN image requests.
- The app should render metadata first, then lazy-load thumbnails with concurrency limits.
- The UI should show per-image loading states instead of blocking the whole result list.

## Handoff Notes

If another AI/Codex window continues this project:

1. Keep this web test as a diagnostic tool, not the final app.
2. Extract the Danbooru request logic into a dedicated `danbooruClient` once more endpoints are added.
3. The next API endpoints to validate are likely:
   - `GET /posts/{id}.json`
   - `GET /tags.json?search[name_matches]=...`
   - possibly pools/artists later
4. For the first real UI, reuse the request shape but replace raw JSON display with:
   - result grid
   - post detail panel
   - selected download URL
   - basic error/status display
5. Before implementing downloads, confirm when `file_url` can be missing or access-limited.
