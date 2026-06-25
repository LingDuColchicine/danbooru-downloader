const navButtons = [...document.querySelectorAll("[data-page]")];
const pagePanels = [...document.querySelectorAll("[data-page-panel]")];
const i18nNodes = [...document.querySelectorAll("[data-i18n]")];
const i18nPlaceholderNodes = [...document.querySelectorAll("[data-i18n-placeholder]")];
const tagSearch = document.querySelector("#tag-search");
const tagInputShell = document.querySelector("#tag-input-shell");
const tagInput = document.querySelector("#tag-input");
const selectedTagsEl = document.querySelector("#selected-tags");
const suggestionsPanel = document.querySelector("#suggestions-panel");
const suggestionsList = document.querySelector("#suggestions-list");
const confirmSearchButton = document.querySelector("#confirm-search");
const clearSearchButton = document.querySelector("#clear-search");
const imageCards = [...document.querySelectorAll(".image-card")];
const detailBackdrop = document.querySelector("#detail-backdrop");
const detailPanel = document.querySelector("#detail-panel");
const detailContent = document.querySelector("#detail-content");
const closeDetailButton = document.querySelector("#close-detail");

const categoryNames = {
  0: "general",
  1: "artist",
  3: "copyright",
  4: "character",
  5: "meta",
};

let selectedTags = [];
let suggestions = [];
let activeSuggestionIndex = -1;
let autocompleteController;
let autocompleteRequestId = 0;

const samplePosts = [
  {
    id: 11650364,
    source: "https://bsky.app/profile/did:plc:3illijehmrx4bqq4gazacxe5/post/3mkrr7g6mz22k",
    rating: "s",
    image_width: 1080,
    image_height: 1450,
    tag_string_artist: "thedollofbruce",
    tag_string_character: "shizuku_murasaki",
    tag_string_copyright: "hunter_x_hunter",
    tag_string_general: "1girl adjusting_eyewear black_hair black_sweater blue_pants breasts cropped_sweater cross cross_necklace glasses jewelry large_breasts long_sleeves looking_at_viewer midriff navel necklace open_fly pants parted_lips solo spider_tattoo stomach stomach_tattoo sweater tattoo upper_body zoom_layer",
    tag_string_meta: "commentary highres",
    file_ext: "jpg",
    file_size: 1489496,
    file_url: "https://cdn.donmai.us/original/a6/3f/a63fd1ff8dbeaccdcd455fc0ce1f184d.jpg",
    large_file_url: "https://cdn.donmai.us/sample/a6/3f/sample-a63fd1ff8dbeaccdcd455fc0ce1f184d.jpg",
  },
];

function showPage(pageName) {
  navButtons.forEach((button) => {
    const isActive = button.dataset.page === pageName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  pagePanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.pagePanel === pageName);
  });
}

function getNestedValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

async function loadLanguage() {
  try {
    const response = await fetch("./lang/en.json");
    const dictionary = await response.json();

    i18nNodes.forEach((node) => {
      const label = getNestedValue(dictionary, node.dataset.i18n);
      if (label) {
        node.textContent = label;
        node.closest("button")?.setAttribute("aria-label", label);
      }
    });

    i18nPlaceholderNodes.forEach((node) => {
      const label = getNestedValue(dictionary, node.dataset.i18nPlaceholder);
      if (label) {
        node.setAttribute("placeholder", label);
      }
    });

    document.title = dictionary.app?.title || document.title;
  } catch (error) {
    console.warn("Failed to load language file.", error);
  }
}

function formatPostCount(count) {
  if (!Number.isFinite(count)) {
    return "";
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }

  return String(count);
}

function normalizeSuggestion(item) {
  const categoryId = Number(item.category ?? 0);
  return {
    label: item.label || item.value || item.name,
    value: item.value || item.name || item.label,
    categoryId,
    categoryName: categoryNames[categoryId] || "general",
    postCount: Number(item.post_count ?? item.postCount ?? 0),
  };
}

function renderSelectedTags() {
  selectedTagsEl.innerHTML = "";

  selectedTags.forEach((tag) => {
    const tagEl = document.createElement("button");
    tagEl.className = `tag-chip tag-${tag.categoryName}`;
    tagEl.type = "button";
    tagEl.dataset.value = tag.value;
    tagEl.setAttribute("aria-label", `Remove ${tag.label}`);

    const label = document.createElement("span");
    label.textContent = tag.label;

    const removeIcon = document.createElement("span");
    removeIcon.className = "chip-remove icon-x";
    removeIcon.setAttribute("aria-hidden", "true");

    tagEl.append(label, removeIcon);
    selectedTagsEl.append(tagEl);
  });
}

function renderSuggestions() {
  suggestionsList.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsPanel.hidden = true;
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.className = `suggestion-item tag-${suggestion.categoryName}`;
    button.type = "button";
    button.dataset.index = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === activeSuggestionIndex ? "true" : "false");

    const label = document.createElement("span");
    label.className = "suggestion-label";
    label.textContent = suggestion.label;

    const category = document.createElement("span");
    category.className = "suggestion-category";
    category.textContent = suggestion.categoryName;

    const count = document.createElement("span");
    count.className = "suggestion-count";
    count.textContent = formatPostCount(suggestion.postCount);

    button.append(label, category, count);
    suggestionsList.append(button);
  });

  suggestionsPanel.hidden = false;
}

function addTag(tag) {
  if (!tag?.value || selectedTags.some((selected) => selected.value === tag.value)) {
    tagInput.value = "";
    suggestions = [];
    renderSuggestions();
    return;
  }

  selectedTags = [...selectedTags, tag];
  tagInput.value = "";
  suggestions = [];
  activeSuggestionIndex = -1;
  renderSelectedTags();
  renderSuggestions();
  tagInput.focus();
}

function removeTag(value) {
  selectedTags = selectedTags.filter((tag) => tag.value !== value);
  renderSelectedTags();
  tagInput.focus();
}

async function loadSuggestions(query) {
  const trimmed = query.trim();
  autocompleteController?.abort();

  if (trimmed.length < 2) {
    suggestions = [];
    activeSuggestionIndex = -1;
    renderSuggestions();
    return;
  }

  const requestId = ++autocompleteRequestId;
  autocompleteController = new AbortController();
  const params = new URLSearchParams({
    "search[query]": trimmed,
    "search[type]": "tag_query",
    limit: "12",
  });

  try {
    const response = await fetch(`/api/autocomplete?${params}`, {
      signal: autocompleteController.signal,
    });
    const payload = await response.json();
    if (requestId !== autocompleteRequestId) {
      return;
    }

    const items = Array.isArray(payload.body) ? payload.body : [];
    suggestions = items.map(normalizeSuggestion).filter((item) => item.label && item.value);
    activeSuggestionIndex = suggestions.length > 0 ? 0 : -1;
    renderSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Autocomplete request failed.", error);
    }
  }
}

function addRawTagFromInput() {
  const value = tagInput.value.trim();
  if (!value) {
    return;
  }

  addTag({
    label: value,
    value,
    categoryId: 0,
    categoryName: "general",
    postCount: 0,
  });
}

function confirmSearch() {
  const query = selectedTags.map((tag) => tag.value).join(" ");
  console.log("Search query:", query);
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) {
    return "";
  }

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
}

function splitTags(value) {
  return String(value || "").split(/\s+/).filter(Boolean);
}

function appendDetailRow(list, label, value, options = {}) {
  if (!value) {
    return;
  }

  const row = document.createElement("div");
  row.className = "detail-row";

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  if (options.href) {
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = value;
    description.append(link);
  } else {
    description.textContent = value;
  }

  row.append(term, description);
  list.append(row);
}

function appendTagSection(parent, title, tags, className) {
  const values = splitTags(tags);
  if (values.length === 0) {
    return;
  }

  const section = document.createElement("section");
  section.className = "detail-tag-section";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const list = document.createElement("div");
  list.className = "detail-tag-list";

  values.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = `detail-tag ${className}`;
    chip.textContent = tag;
    list.append(chip);
  });

  section.append(heading, list);
  parent.append(section);
}

function getDetailImageUrl(post) {
  const url = post.file_url || post.large_file_url || post.preview_file_url || "";
  return url;
}

function renderDetail(post) {
  detailContent.innerHTML = "";

  const imageWrap = document.createElement("div");
  imageWrap.className = "detail-image-wrap";
  if (post.image_width && post.image_height) {
    imageWrap.style.aspectRatio = `${post.image_width} / ${post.image_height}`;
  }

  const imageUrl = getDetailImageUrl(post);
  if (imageUrl) {
    imageWrap.dataset.imageUrl = imageUrl;
    const image = document.createElement("img");
    image.alt = `Danbooru post ${post.id}`;
    image.loading = "eager";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      imageWrap.classList.add("image-load-failed");
    });
    image.src = imageUrl;
    imageWrap.append(image);
  }

  const downloadButton = document.createElement("button");
  downloadButton.className = "detail-download-button";
  downloadButton.type = "button";
  downloadButton.textContent = "Download original";
  downloadButton.disabled = !post.file_url;
  downloadButton.addEventListener("click", () => {
    if (!post.file_url) {
      return;
    }

    const link = document.createElement("a");
    link.href = post.file_url;
    link.download = `danbooru-${post.id}.${post.file_ext || "jpg"}`;
    link.rel = "noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  });

  const info = document.createElement("dl");
  info.className = "detail-info";

  appendDetailRow(info, "ID", post.id);
  appendDetailRow(info, "Source", post.source, { href: true });
  appendDetailRow(info, "Dimensions", post.image_width && post.image_height ? `${post.image_width} x ${post.image_height}` : "");
  appendDetailRow(info, "Format", post.file_ext ? post.file_ext.toUpperCase() : "");
  appendDetailRow(info, "Size", formatFileSize(post.file_size));

  const tagSections = document.createElement("div");
  tagSections.className = "detail-tags";
  appendTagSection(tagSections, "Artist", post.tag_string_artist, "tag-artist");
  appendTagSection(tagSections, "Character", post.tag_string_character, "tag-character");
  appendTagSection(tagSections, "Copyright", post.tag_string_copyright, "tag-copyright");
  appendTagSection(tagSections, "General", post.tag_string_general, "tag-general");
  appendTagSection(tagSections, "Meta", post.tag_string_meta, "tag-meta");

  detailContent.append(imageWrap, downloadButton, info, tagSections);
}

function openDetail(post) {
  renderDetail(post);
  detailBackdrop.hidden = false;
  document.body.classList.add("detail-open");
  detailPanel.classList.add("open");
  detailPanel.setAttribute("aria-hidden", "false");
  detailContent.scrollTop = 0;
}

function closeDetail() {
  detailPanel.classList.remove("open");
  detailPanel.setAttribute("aria-hidden", "true");
  detailBackdrop.hidden = true;
  document.body.classList.remove("detail-open");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

tagInputShell?.addEventListener("click", () => tagInput.focus());

tagInput?.addEventListener("focus", () => {
  tagSearch.classList.add("focused");
  renderSuggestions();
});

tagInput?.addEventListener("blur", () => {
  tagSearch.classList.remove("focused");
  window.setTimeout(() => {
    suggestionsPanel.hidden = true;
  }, 120);
});

tagInput?.addEventListener("input", () => {
  loadSuggestions(tagInput.value);
});

tagInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && suggestions.length > 0) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
    renderSuggestions();
    return;
  }

  if (event.key === "ArrowUp" && suggestions.length > 0) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
    renderSuggestions();
    return;
  }

  if ((event.key === "Enter" || event.key === "Tab") && suggestions[activeSuggestionIndex]) {
    event.preventDefault();
    addTag(suggestions[activeSuggestionIndex]);
    return;
  }

  if ((event.key === "Enter" || event.key === " ") && tagInput.value.trim()) {
    event.preventDefault();
    addRawTagFromInput();
    return;
  }

  if (event.key === "Backspace" && !tagInput.value && selectedTags.length > 0) {
    removeTag(selectedTags[selectedTags.length - 1].value);
  }
});

suggestionsList?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const button = event.target.closest(".suggestion-item");
  if (!button) {
    return;
  }

  addTag(suggestions[Number(button.dataset.index)]);
});

selectedTagsEl?.addEventListener("click", (event) => {
  const chip = event.target.closest(".tag-chip");
  if (chip) {
    removeTag(chip.dataset.value);
  }
});

confirmSearchButton?.addEventListener("click", confirmSearch);

clearSearchButton?.addEventListener("click", () => {
  selectedTags = [];
  tagInput.value = "";
  suggestions = [];
  renderSelectedTags();
  renderSuggestions();
  tagInput.focus();
});

imageCards.forEach((card, index) => {
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open image ${index + 1} details`);
  card.addEventListener("click", () => openDetail(samplePosts[index % samplePosts.length]));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(samplePosts[index % samplePosts.length]);
    }
  });
});

closeDetailButton?.addEventListener("click", closeDetail);
detailBackdrop?.addEventListener("click", closeDetail);
detailPanel?.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
detailPanel?.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detailPanel.classList.contains("open")) {
    closeDetail();
  }
});

loadLanguage();
showPage("search");
