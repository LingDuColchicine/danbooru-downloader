import { access, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureCandidates = [
  resolve(here, "../Grabber/src/sites/Danbooru (2.0)/resources/search.json"),
  resolve(here, "../src/sites/Danbooru (2.0)/resources/search.json"),
];
const outputPath = resolve(here, "sample-normalized-posts.json");

const params = new URLSearchParams({
  tags: "rating:safe",
  limit: "3",
});

const url = `https://danbooru.donmai.us/posts.json?${params}`;

function pickPostFields(post) {
  return {
    id: post.id,
    created_at: post.created_at,
    uploader_id: post.uploader_id,
    score: post.score,
    source: post.source,
    rating: post.rating,
    image_width: post.image_width,
    image_height: post.image_height,
    tag_string: post.tag_string,
    tag_string_artist: post.tag_string_artist,
    tag_string_character: post.tag_string_character,
    tag_string_copyright: post.tag_string_copyright,
    tag_string_general: post.tag_string_general,
    tag_string_meta: post.tag_string_meta,
    file_ext: post.file_ext,
    file_size: post.file_size,
    file_url: post.file_url,
    large_file_url: post.large_file_url,
    preview_file_url: post.preview_file_url,
    md5: post.md5,
  };
}

async function fetchLivePosts() {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "danbooru-api-probe/0.1",
      Accept: "application/json",
    },
  });

  console.log(`GET ${url}`);
  console.log(`HTTP ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  return response.json();
}

async function loadFixturePosts(error) {
  console.warn(`Live request failed: ${error.message}`);

  for (const fixturePath of fixtureCandidates) {
    try {
      await access(fixturePath);
      console.warn(`Falling back to local fixture: ${fixturePath}`);
      return JSON.parse(await readFile(fixturePath, "utf8"));
    } catch {
      // Try the next known source tree layout.
    }
  }

  throw new Error(`No local Danbooru fixture found. Tried:\n${fixtureCandidates.join("\n")}`);
}

const posts = await fetchLivePosts().catch(loadFixturePosts);
const firstPost = posts[0];

if (!firstPost) {
  console.log("No posts returned.");
  process.exit(0);
}

console.log("\nTop-level post fields:");
console.log(Object.keys(firstPost).sort().join("\n"));

console.log("\nSample normalized posts:");
const normalizedPosts = posts.slice(0, 3).map(pickPostFields);
console.log(JSON.stringify(normalizedPosts, null, 2));

await writeFile(outputPath, `${JSON.stringify(normalizedPosts, null, 2)}\n`, "utf8");
console.log(`\nWrote ${outputPath}`);
