# Danbooru API Probe

Small read-only probe for checking the shape of Danbooru's `posts.json` API response.

Run:

```powershell
node .\probe-danbooru.mjs
```

Current query:

```text
GET https://danbooru.donmai.us/posts.json?tags=rating%3Asafe&limit=3
```

The script prints:

- HTTP status
- all fields present on the first returned post
- a smaller normalized view of fields likely useful for a downloader

In the Codex sandbox, direct access to `danbooru.donmai.us` is blocked before the HTTP request:

```text
DNS lookup: OK
TCP connect to 104.26.10.39:443: EACCES inside the sandbox
```

When run outside the sandbox, the same diagnostics pass:

```text
DNS lookup: OK
TCP connect: OK
TLS handshake: OK
GET /posts.json: HTTP 200 OK
```

So the API itself is reachable from this machine. The block is the managed sandbox network policy, not the Danbooru API.

If the live API request fails, the script falls back to Grabber's local Danbooru 2.0 fixture:

```text
../Grabber/src/sites/Danbooru (2.0)/resources/search.json
```

The fallback still lets us inspect the expected post structure when offline.

Useful fields for a downloader:

```text
id
created_at
updated_at
rating
score
source
md5
file_ext
file_size
image_width
image_height
preview_file_url
large_file_url
file_url
tag_string
tag_string_artist
tag_string_character
tag_string_copyright
tag_string_general
tag_string_meta
is_deleted
is_pending
has_children
parent_id
media_asset
```

The script writes a small normalized sample here:

```text
sample-normalized-posts.json
```

## Minimal Web Test

Run the local web tester:

```powershell
cd .\danbooru-api-probe
node .\web-test\server.mjs
```

Then open:

```text
http://127.0.0.1:5174/
```

The page has a tag input, limit/page inputs, a search button, and raw JSON output.

The local server proxies `/api/posts` to Danbooru's `posts.json` API. If normal DNS resolution points to an unreachable address, it falls back to known Cloudflare IPs while preserving the correct `Host` and TLS SNI for `danbooru.donmai.us`.

Detailed flow and handoff notes are in:

```text
web-test/FLOW.md
```
