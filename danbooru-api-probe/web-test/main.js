const form = document.querySelector("#search-form");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const resultsEl = document.querySelector("#results");

function summarizePost(post) {
  return {
    id: post.id,
    rating: post.rating,
    score: post.score,
    size: `${post.image_width}x${post.image_height}`,
    file_ext: post.file_ext,
    file_size: post.file_size,
    preview_file_url: post.preview_file_url,
    large_file_url: post.large_file_url,
    file_url: post.file_url,
    source: post.source,
    artist: post.tag_string_artist,
    character: post.tag_string_character,
    copyright: post.tag_string_copyright,
    tags: post.tag_string,
  };
}

async function runSearch() {
  const formData = new FormData(form);
  const params = new URLSearchParams({
    tags: formData.get("tags") || "",
    limit: formData.get("limit") || "5",
    page: formData.get("page") || "1",
  });

  const localUrl = `/api/posts?${params}`;
  statusEl.textContent = `Loading ${localUrl}`;
  summaryEl.innerHTML = "";
  resultsEl.textContent = "";

  try {
    const response = await fetch(localUrl);
    const payload = await response.json();
    const posts = Array.isArray(payload.body) ? payload.body : [];

    statusEl.textContent = [
      `Local HTTP: ${response.status}`,
      `Danbooru HTTP: ${payload.request?.status ?? "unknown"}`,
      `Transport: ${payload.transport ?? "unknown"}`,
      `Timings: ${payload.timings ? JSON.stringify(payload.timings) : "unknown"}`,
      `Danbooru URL: ${payload.request?.url ?? payload.url ?? "unknown"}`,
      `Returned posts: ${posts.length}`,
    ].join("\n");

    if (posts.length > 0) {
      const summary = posts.map(summarizePost);
      summaryEl.innerHTML = `<h3>Compact summary</h3><pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre>`;
    }

    resultsEl.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    statusEl.textContent = `Request failed: ${error.message}`;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

runSearch();
