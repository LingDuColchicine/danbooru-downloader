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
const refreshPageButton = document.querySelector("#refresh-page");
const ratingFilter = document.querySelector("#rating-filter");
const ratingFilterButton = document.querySelector("#rating-filter-button");
const ratingFilterLabel = document.querySelector("#rating-filter-label");
const ratingFilterMenu = document.querySelector("#rating-filter-menu");
const ratingOptionButtons = [...document.querySelectorAll("[data-rating-value]")];
const searchResults = document.querySelector("#search-results");
const searchStatus = document.querySelector("#search-status");
const searchSentinel = document.querySelector("#search-sentinel");
const favoritesStream = document.querySelector("#favorites-stream");
const favoritesEmpty = document.querySelector("#favorites-empty");
const selectionActions = document.querySelector("#selection-actions");
const clearSelectionButton = document.querySelector("#clear-selection");
const downloadSelectionButton = document.querySelector("#download-selection");
const accountUsernameInput = document.querySelector("#account-username");
const accountApiKeyInput = document.querySelector("#account-api-key");
const addAccountButton = document.querySelector("#add-account");
const accountStatus = document.querySelector("#account-status");
const accountList = document.querySelector("#account-list");
const loadingModeButtons = [...document.querySelectorAll("[data-loading-target][data-loading-mode]")];
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
const likedImages = new Set();
const selectedImages = new Set();
const imageStore = new Map();
const postsPerPage = 20;
let activeSearchTags = "";
let activeSearchPage = 0;
let isLoadingPosts = false;
let hasMorePosts = true;
let postRequestId = 0;
let searchObserver;
let autoSearchTimer;
let lastSubmittedSearchTags = "";
let activeRating = "";
const searchSessionKey = "danbooruDownloader.searchSession";
const loadingSettingsKey = "danbooruDownloader.loadingSettings";
const accountSettingsKey = "danbooruDownloader.accounts";
const activeAccountKey = "danbooruDownloader.activeAccountId";
const loadingSettings = {
  thumbnail: "auto",
  detail: "auto",
};
let savedAccounts = [];
let activeAccountId = "";

function showPage(pageName) {
  navButtons.forEach((button) => {
    const isActive = button.dataset.page === pageName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  pagePanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.pagePanel === pageName);
  });

  if (pageName === "favorites") {
    renderFavorites();
  }
}

function getNestedValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function isLoadingMode(value) {
  return value === "auto" || value === "direct" || value === "proxy";
}

function loadImageSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(loadingSettingsKey) || "{}");
    if (isLoadingMode(saved.thumbnail)) {
      loadingSettings.thumbnail = saved.thumbnail;
    }
    if (isLoadingMode(saved.detail)) {
      loadingSettings.detail = saved.detail;
    }
  } catch (error) {
    console.warn("Failed to load image loading settings.", error);
  }
}

function saveImageSettings() {
  localStorage.setItem(loadingSettingsKey, JSON.stringify(loadingSettings));
}

function renderLoadingSettings() {
  loadingModeButtons.forEach((button) => {
    const target = button.dataset.loadingTarget;
    const isActive = loadingSettings[target] === button.dataset.loadingMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function loadAccountSettings() {
  try {
    const accounts = JSON.parse(localStorage.getItem(accountSettingsKey) || "[]");
    savedAccounts = Array.isArray(accounts)
      ? accounts.filter((account) => account?.id && account?.username && account?.apiKey)
      : [];
    activeAccountId = localStorage.getItem(activeAccountKey) || "";
    if (activeAccountId && !savedAccounts.some((account) => account.id === activeAccountId)) {
      activeAccountId = "";
    }
  } catch (error) {
    console.warn("Failed to load account settings.", error);
    savedAccounts = [];
    activeAccountId = "";
  }
}

function saveAccountSettings() {
  localStorage.setItem(accountSettingsKey, JSON.stringify(savedAccounts));
  localStorage.setItem(activeAccountKey, activeAccountId);
}

function getActiveAccount() {
  return savedAccounts.find((account) => account.id === activeAccountId) || null;
}

function getDanbooruAuthHeaders() {
  const account = getActiveAccount();
  if (!account) {
    return {};
  }

  return {
    "X-Danbooru-Login": account.username,
    "X-Danbooru-Api-Key": account.apiKey,
  };
}

function setAccountStatus(message = "", type = "") {
  if (!accountStatus) {
    return;
  }

  accountStatus.textContent = message;
  accountStatus.classList.toggle("error", type === "error");
  accountStatus.classList.toggle("success", type === "success");
}

function createAccountRow({ id, label, removable }) {
  const row = document.createElement("div");
  row.className = "account-row";

  const selectButton = document.createElement("button");
  selectButton.className = "account-select-button";
  selectButton.type = "button";
  selectButton.dataset.accountId = id;
  selectButton.classList.toggle("active", activeAccountId === id);
  selectButton.setAttribute("aria-label", `Use ${label}`);
  selectButton.setAttribute("aria-pressed", String(activeAccountId === id));

  const selectIcon = document.createElement("img");
  selectIcon.className = "account-icon";
  selectIcon.alt = "";
  selectIcon.setAttribute("aria-hidden", "true");
  selectIcon.src = activeAccountId === id ? "/icons/square-check-filled.svg" : "/icons/square.svg";
  selectButton.append(selectIcon);

  const name = document.createElement("div");
  name.className = "account-name";
  name.textContent = label;

  const deleteButton = document.createElement("button");
  deleteButton.className = "account-delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.accountId = id;
  deleteButton.setAttribute("aria-label", `Remove ${label}`);
  deleteButton.hidden = !removable;

  const deleteIcon = document.createElement("span");
  deleteIcon.className = "action-icon icon-minus";
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteButton.append(deleteIcon);

  row.append(selectButton, name, deleteButton);
  return row;
}

function renderAccounts() {
  if (!accountList) {
    return;
  }

  accountList.innerHTML = "";
  accountList.append(createAccountRow({
    id: "",
    label: "No account",
    removable: false,
  }));

  savedAccounts.forEach((account) => {
    accountList.append(createAccountRow({
      id: account.id,
      label: account.username,
      removable: true,
    }));
  });
}

function setActiveAccount(accountId) {
  activeAccountId = accountId;
  saveAccountSettings();
  renderAccounts();
  submitSearch(getSearchQuery(true), true);
}

function renderRatingFilter() {
  ratingFilter?.setAttribute("data-value", activeRating);
  ratingOptionButtons.forEach((button) => {
    const isActive = button.dataset.ratingValue === activeRating;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    if (isActive && ratingFilterLabel) {
      ratingFilterLabel.textContent = button.textContent;
    }
  });
}

function closeRatingMenu() {
  ratingFilter?.classList.remove("open");
  ratingFilterMenu.hidden = true;
  ratingFilterButton?.setAttribute("aria-expanded", "false");
}

function toggleRatingMenu() {
  const willOpen = ratingFilterMenu.hidden;
  ratingFilter?.classList.toggle("open", willOpen);
  ratingFilterMenu.hidden = !willOpen;
  ratingFilterButton?.setAttribute("aria-expanded", String(willOpen));
}

function getSearchSession() {
  try {
    return JSON.parse(sessionStorage.getItem(searchSessionKey) || "null");
  } catch (error) {
    console.warn("Failed to read search session.", error);
    return null;
  }
}

function saveSearchSession() {
  const session = {
    selectedTags,
    rawInput: tagInput?.value || "",
    activeRating,
    loadedPage: Math.max(activeSearchPage, 1),
    scrollY: window.scrollY,
  };

  sessionStorage.setItem(searchSessionKey, JSON.stringify(session));
}

function restoreSearchSession() {
  const session = getSearchSession();
  if (!session || typeof session !== "object") {
    return { query: "", loadedPage: 1, scrollY: 0 };
  }

  if (Array.isArray(session.selectedTags)) {
    selectedTags = session.selectedTags.filter((tag) => tag?.label && tag?.value);
  }

  if (tagInput && typeof session.rawInput === "string") {
    tagInput.value = session.rawInput;
  }

  activeRating = typeof session.activeRating === "string" ? session.activeRating : "";
  renderSelectedTags();
  renderRatingFilter();

  return {
    query: getSearchQuery(true),
    loadedPage: Math.max(1, Number(session.loadedPage) || 1),
    scrollY: Math.max(0, Number(session.scrollY) || 0),
  };
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
      headers: getDanbooruAuthHeaders(),
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

function getSearchQuery(includeInput = false) {
  const values = selectedTags.map((tag) => tag.value);
  const rawInput = tagInput.value.trim();

  if (includeInput && rawInput && !values.includes(rawInput)) {
    values.push(rawInput);
  }

  if (activeRating) {
    values.push(`rating:${activeRating}`);
  }

  return values.join(" ");
}

function submitSearch(query = getSearchQuery(false), force = false) {
  window.clearTimeout(autoSearchTimer);
  if (!force && query === lastSubmittedSearchTags && searchResults?.childElementCount > 0) {
    return;
  }

  lastSubmittedSearchTags = query;
  startPostSearch(query);
}

function scheduleAutoSearch() {
  window.clearTimeout(autoSearchTimer);
  autoSearchTimer = window.setTimeout(() => {
    submitSearch(getSearchQuery(true));
  }, 650);
}

function confirmSearch() {
  if (tagInput.value.trim()) {
    addRawTagFromInput();
  }

  submitSearch(getSearchQuery(false));
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

function downloadOriginal(post) {
  if (!post?.file_url) {
    return false;
  }

  const link = document.createElement("a");
  link.href = post.file_url;
  link.download = `danbooru-${post.id}.${post.file_ext || "jpg"}`;
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
  return true;
}

function getDetailImageUrl(post) {
  const url = post.file_url || post.large_file_url || post.preview_file_url || "";
  return url;
}

function getProxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function setImageWithProxyFallback(image, sourceUrl, mode, onLoad, onFinalError) {
  let usingProxy = false;
  image.classList.remove("image-loaded");
  image.dataset.sourceUrl = sourceUrl;
  image.dataset.proxyUrl = getProxiedImageUrl(sourceUrl);

  image.onload = () => {
    image.classList.add("image-loaded");
    onLoad?.();
  };

  image.onerror = () => {
    image.classList.remove("image-loaded");

    if (mode === "auto" && !usingProxy) {
      usingProxy = true;
      image.src = image.dataset.proxyUrl;
      return;
    }

    onFinalError?.();
  };

  image.src = mode === "proxy" ? image.dataset.proxyUrl : sourceUrl;
}

function reloadImagesForLoadingTarget(target) {
  if (target === "thumbnail") {
    document.querySelectorAll(".result-thumbnail").forEach((image) => {
      const card = image.closest(".image-card");
      const sourceUrl = image.dataset.sourceUrl;
      if (!card || !sourceUrl) {
        return;
      }

      card.classList.remove("thumbnail-load-failed");
      setImageWithProxyFallback(image, sourceUrl, loadingSettings.thumbnail, () => {
        card.classList.remove("thumbnail-load-failed");
      }, () => {
        card.classList.add("thumbnail-load-failed");
      });
    });
    return;
  }

  if (target === "detail") {
    const image = detailContent.querySelector(".detail-image-wrap img");
    const imageWrap = image?.closest(".detail-image-wrap");
    const sourceUrl = image?.dataset.sourceUrl;
    if (!image || !imageWrap || !sourceUrl) {
      return;
    }

    imageWrap.classList.remove("image-load-failed");
    setImageWithProxyFallback(image, sourceUrl, loadingSettings.detail, () => {
      imageWrap.classList.remove("image-load-failed");
    }, () => {
      imageWrap.classList.add("image-load-failed");
    });
  }
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
    setImageWithProxyFallback(image, imageUrl, loadingSettings.detail, () => {
      imageWrap.classList.remove("image-load-failed");
    }, () => {
      imageWrap.classList.add("image-load-failed");
    });
    imageWrap.append(image);
  }

  const downloadButton = document.createElement("button");
  downloadButton.className = "detail-download-button";
  downloadButton.type = "button";
  downloadButton.textContent = "Download original";
  downloadButton.disabled = !post.file_url;
  downloadButton.addEventListener("click", () => {
    downloadOriginal(post);
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
  updateSelectionActions();
}

function closeDetail() {
  detailPanel.classList.remove("open");
  detailPanel.setAttribute("aria-hidden", "true");
  detailBackdrop.hidden = true;
  document.body.classList.remove("detail-open");
  updateSelectionActions();
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

refreshPageButton?.addEventListener("click", () => {
  saveSearchSession();
  window.location.reload();
});

loadingModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.loadingTarget;
    const mode = button.dataset.loadingMode;
    if (!Object.prototype.hasOwnProperty.call(loadingSettings, target) || !isLoadingMode(mode)) {
      return;
    }

    loadingSettings[target] = mode;
    saveImageSettings();
    renderLoadingSettings();
    reloadImagesForLoadingTarget(target);
  });
});

addAccountButton?.addEventListener("click", addAccount);

[accountUsernameInput, accountApiKeyInput].forEach((input) => {
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAccount();
    }
  });
});

accountList?.addEventListener("click", (event) => {
  const selectButton = event.target.closest(".account-select-button");
  if (selectButton) {
    setActiveAccount(selectButton.dataset.accountId || "");
    return;
  }

  const deleteButton = event.target.closest(".account-delete-button");
  if (deleteButton && !deleteButton.hidden) {
    removeAccount(deleteButton.dataset.accountId);
  }
});

ratingFilterButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleRatingMenu();
});

ratingOptionButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    activeRating = button.dataset.ratingValue || "";
    renderRatingFilter();
    closeRatingMenu();
    submitSearch(getSearchQuery(true));
  });
});

document.addEventListener("click", (event) => {
  if (!ratingFilter?.contains(event.target)) {
    closeRatingMenu();
  }
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
  scheduleAutoSearch();
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

  if (event.key === "Enter") {
    event.preventDefault();
    if (suggestions[activeSuggestionIndex]) {
      addTag(suggestions[activeSuggestionIndex]);
    } else if (tagInput.value.trim()) {
      addRawTagFromInput();
    }

    submitSearch(getSearchQuery(false));
    return;
  }

  if (event.key === "Tab" && suggestions[activeSuggestionIndex]) {
    event.preventDefault();
    addTag(suggestions[activeSuggestionIndex]);
    submitSearch(getSearchQuery(false));
    return;
  }

  if (event.key === " " && tagInput.value.trim()) {
    event.preventDefault();
    addRawTagFromInput();
    submitSearch(getSearchQuery(false));
    return;
  }

  if (event.key === "Backspace" && !tagInput.value && selectedTags.length > 0) {
    removeTag(selectedTags[selectedTags.length - 1].value);
    submitSearch(getSearchQuery(false));
  }
});

suggestionsList?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const button = event.target.closest(".suggestion-item");
  if (!button) {
    return;
  }

  addTag(suggestions[Number(button.dataset.index)]);
  submitSearch(getSearchQuery(false));
});

selectedTagsEl?.addEventListener("click", (event) => {
  const chip = event.target.closest(".tag-chip");
  if (chip) {
    removeTag(chip.dataset.value);
    submitSearch(getSearchQuery(true));
  }
});

confirmSearchButton?.addEventListener("click", confirmSearch);

clearSearchButton?.addEventListener("click", () => {
  selectedTags = [];
  tagInput.value = "";
  suggestions = [];
  renderSelectedTags();
  renderSuggestions();
  submitSearch("");
  tagInput.focus();
});

clearSelectionButton?.addEventListener("click", clearSelectedImages);
downloadSelectionButton?.addEventListener("click", downloadSelectedOriginals);

function getPostId(post) {
  return String(post.id);
}

function getPostLabel(post) {
  return `image ${post.id}`;
}

function syncImageCardControls(card, post) {
  const imageId = getPostId(post);
  const favoriteButton = card.querySelector(".favorite-button");
  const favoriteIcon = card.querySelector(".favorite-icon");
  const selectButton = card.querySelector(".select-button");
  const selectIcon = card.querySelector(".select-button .image-action-icon");
  const isLiked = likedImages.has(imageId);
  const isSelected = selectedImages.has(imageId);

  if (favoriteButton && favoriteIcon) {
    favoriteButton.classList.toggle("liked", isLiked);
    favoriteIcon.src = isLiked ? "/icons/heart-filled.svg" : "/icons/heart.svg";
    favoriteButton.setAttribute("aria-pressed", String(isLiked));
    favoriteButton.setAttribute("aria-label", `${isLiked ? "Unmark" : "Mark"} ${getPostLabel(post)} as favorite`);
  }

  if (selectButton && selectIcon) {
    selectButton.classList.toggle("selected", isSelected);
    selectIcon.src = isSelected ? "/icons/square-check-filled.svg" : "/icons/square.svg";
    selectButton.setAttribute("aria-pressed", String(isSelected));
    selectButton.setAttribute("aria-label", `${isSelected ? "Unselect" : "Select"} ${getPostLabel(post)}`);
  }
}

function syncImageInstances(imageId) {
  document.querySelectorAll(".image-card").forEach((card) => {
    if (card.dataset.imageId === imageId) {
      const post = imageStore.get(imageId);
      if (post) {
        syncImageCardControls(card, post);
      }
    }
  });
}

function updateSelectionActions() {
  if (selectionActions) {
    selectionActions.hidden = selectedImages.size === 0 || detailPanel.classList.contains("open");
  }

  if (downloadSelectionButton) {
    downloadSelectionButton.disabled = selectedImages.size === 0;
  }
}

function clearSelectedImages() {
  const selectedIds = [...selectedImages];
  selectedImages.clear();
  selectedIds.forEach(syncImageInstances);
  updateSelectionActions();
}

function downloadSelectedOriginals() {
  [...selectedImages].forEach((imageId, index) => {
    const post = imageStore.get(imageId);
    window.setTimeout(() => {
      downloadOriginal(post);
    }, index * 120);
  });
}

async function addAccount() {
  const username = accountUsernameInput?.value.trim() || "";
  const apiKey = accountApiKeyInput?.value.trim() || "";

  if (!username || !apiKey) {
    setAccountStatus("Username and API key are required.", "error");
    return;
  }

  if (savedAccounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
    setAccountStatus("This account has already been added.", "error");
    return;
  }

  addAccountButton.disabled = true;
  setAccountStatus("Verifying account...");

  try {
    const response = await fetch("/api/account/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login: username, apiKey }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      const upstreamBody = payload.body || {};
      const lastAttempt = Array.isArray(payload.attempts) ? payload.attempts.at(-1) : null;
      const upstreamError = upstreamBody.error || lastAttempt?.body?.error;
      if (upstreamError === "User::PrivilegeError") {
        throw new Error("API key access denied. Enable post read permissions for this key in Danbooru account settings.");
      }

      const upstreamMessage = upstreamBody.message || upstreamBody.error || lastAttempt?.body?.message || lastAttempt?.body?.error;
      throw new Error(upstreamMessage || payload.error || payload.message || "Verification failed.");
    }

    const account = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      username: payload.profile?.name || username,
      apiKey,
      userId: payload.profile?.id || null,
      level: payload.profile?.level_string || "",
    };

    savedAccounts = [...savedAccounts, account];
    activeAccountId = account.id;
    saveAccountSettings();
    renderAccounts();
    accountUsernameInput.value = "";
    accountApiKeyInput.value = "";
    setAccountStatus("Account added.", "success");
    submitSearch(getSearchQuery(true), true);
  } catch (error) {
    setAccountStatus(error.message, "error");
  } finally {
    addAccountButton.disabled = false;
  }
}

function removeAccount(accountId) {
  const account = savedAccounts.find((item) => item.id === accountId);
  if (!account) {
    return;
  }

  if (!window.confirm(`Remove account "${account.username}"?`)) {
    return;
  }

  savedAccounts = savedAccounts.filter((item) => item.id !== accountId);
  if (activeAccountId === accountId) {
    activeAccountId = "";
  }
  saveAccountSettings();
  renderAccounts();
  setAccountStatus("Account removed.", "success");
  submitSearch(getSearchQuery(true), true);
}

function createImageCard(post) {
  const imageId = getPostId(post);
  imageStore.set(imageId, post);

  const card = document.createElement("article");
  card.className = "image-card";
  card.dataset.imageId = imageId;

  if (post.image_width && post.image_height) {
    card.style.aspectRatio = `${post.image_width} / ${post.image_height}`;
  }

  if (post.preview_file_url) {
    const thumbnail = document.createElement("img");
    thumbnail.className = "result-thumbnail";
    thumbnail.alt = `Danbooru post ${post.id}`;
    thumbnail.loading = "lazy";
    thumbnail.decoding = "async";
    thumbnail.referrerPolicy = "no-referrer";
    setImageWithProxyFallback(thumbnail, post.preview_file_url, loadingSettings.thumbnail, () => {
      card.classList.remove("thumbnail-load-failed");
    }, () => {
      card.classList.add("thumbnail-load-failed");
    });
    card.append(thumbnail);
  } else {
    card.classList.add("thumbnail-load-failed");
  }

  const overlayActions = document.createElement("div");
  overlayActions.className = "image-card-actions";

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "image-action-button favorite-button";
  favoriteButton.type = "button";
  favoriteButton.setAttribute("aria-label", `Mark ${getPostLabel(post)} as favorite`);
  favoriteButton.setAttribute("aria-pressed", "false");

  const favoriteIcon = document.createElement("img");
  favoriteIcon.className = "favorite-icon";
  favoriteIcon.src = "/icons/heart.svg";
  favoriteIcon.alt = "";
  favoriteIcon.setAttribute("aria-hidden", "true");
  favoriteButton.append(favoriteIcon);

  const shareButton = document.createElement("button");
  shareButton.className = "image-action-button share-button";
  shareButton.type = "button";
  shareButton.setAttribute("aria-label", `Share ${getPostLabel(post)}`);

  const shareIcon = document.createElement("img");
  shareIcon.className = "image-action-icon";
  shareIcon.src = "/icons/square-arrow-out-up-right.svg";
  shareIcon.alt = "";
  shareIcon.setAttribute("aria-hidden", "true");
  shareButton.append(shareIcon);

  const selectButton = document.createElement("button");
  selectButton.className = "image-action-button select-button";
  selectButton.type = "button";
  selectButton.setAttribute("aria-label", `Select ${getPostLabel(post)}`);
  selectButton.setAttribute("aria-pressed", "false");

  const selectIcon = document.createElement("img");
  selectIcon.className = "image-action-icon";
  selectIcon.src = "/icons/square.svg";
  selectIcon.alt = "";
  selectIcon.setAttribute("aria-hidden", "true");
  selectButton.append(selectIcon);

  overlayActions.append(favoriteButton, shareButton, selectButton);
  card.append(overlayActions);

  favoriteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isLiked = likedImages.has(imageId);
    if (isLiked) {
      likedImages.delete(imageId);
    } else {
      likedImages.add(imageId);
    }

    favoriteButton.classList.toggle("liked", !isLiked);
    favoriteIcon.src = isLiked ? "/icons/heart.svg" : "/icons/heart-filled.svg";
    favoriteButton.setAttribute("aria-pressed", String(!isLiked));
    favoriteButton.setAttribute("aria-label", `${isLiked ? "Mark" : "Unmark"} ${getPostLabel(post)} as favorite`);
    if (isLiked) {
      favoriteButton.blur();
    }
    syncImageInstances(imageId);
    renderFavorites();
  });
  favoriteButton.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  shareButton.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  shareButton.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  selectButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isSelected = selectedImages.has(imageId);
    if (isSelected) {
      selectedImages.delete(imageId);
    } else {
      selectedImages.add(imageId);
    }

    selectButton.classList.toggle("selected", !isSelected);
    selectIcon.src = isSelected ? "/icons/square.svg" : "/icons/square-check-filled.svg";
    selectButton.setAttribute("aria-pressed", String(!isSelected));
    selectButton.setAttribute("aria-label", `${isSelected ? "Select" : "Unselect"} ${getPostLabel(post)}`);
    if (isSelected) {
      selectButton.blur();
    }
    syncImageInstances(imageId);
    updateSelectionActions();
  });
  selectButton.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });

  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Open ${getPostLabel(post)} details`);
  card.addEventListener("click", () => openDetail(post));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(post);
    }
  });

  syncImageCardControls(card, post);
  return card;
}

function setSearchStatus(message) {
  if (searchStatus) {
    searchStatus.textContent = message;
  }
}

function normalizePostList(payload) {
  const body = Array.isArray(payload?.body) ? payload.body : [];
  return body.filter((post) => post?.id && post.preview_file_url);
}

async function loadPostPage() {
  if (!searchResults || isLoadingPosts || !hasMorePosts) {
    return false;
  }

  isLoadingPosts = true;
  const requestId = postRequestId;
  const nextPage = activeSearchPage + 1;
  setSearchStatus(nextPage === 1 ? "Loading images..." : "Loading more images...");

  const params = new URLSearchParams({
    tags: activeSearchTags,
    limit: String(postsPerPage),
    page: String(nextPage),
  });

  try {
    const response = await fetch(`/api/posts?${params}`, {
      headers: getDanbooruAuthHeaders(),
    });
    const payload = await response.json();

    if (requestId !== postRequestId) {
      return false;
    }

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    const rawPosts = Array.isArray(payload.body) ? payload.body : [];
    const posts = normalizePostList(payload);

    if (posts.length > 0) {
      posts.forEach((post) => imageStore.set(getPostId(post), post));
      appendPostPage(searchResults, posts, nextPage);
    }

    activeSearchPage = nextPage;
    hasMorePosts = rawPosts.length >= postsPerPage;

    if (activeSearchPage === 1 && posts.length === 0) {
      setSearchStatus("No images found.");
    } else {
      setSearchStatus(hasMorePosts ? "" : "No more images.");
    }
  } catch (error) {
    if (requestId === postRequestId) {
      setSearchStatus(`Request failed: ${error.message}`);
    }
  } finally {
    if (requestId === postRequestId) {
      isLoadingPosts = false;
    }
  }

  return requestId === postRequestId;
}

function startPostSearch(tags = "") {
  activeSearchTags = tags.trim();
  lastSubmittedSearchTags = activeSearchTags;
  activeSearchPage = 0;
  hasMorePosts = true;
  isLoadingPosts = false;
  postRequestId += 1;

  if (searchResults) {
    searchResults.innerHTML = "";
  }

  setSearchStatus("");
  return loadPostPage();
}

async function restoreLoadedPages(targetPage, scrollY) {
  while (activeSearchPage < targetPage && hasMorePosts) {
    const previousPage = activeSearchPage;
    const loaded = await loadPostPage();
    if (!loaded || activeSearchPage === previousPage) {
      break;
    }
  }

  window.setTimeout(() => {
    window.scrollTo(0, scrollY);
  }, 100);
}

function setupInfiniteScroll() {
  if (!searchSentinel) {
    return;
  }

  searchObserver?.disconnect();
  searchObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadPostPage();
    }
  }, {
    root: null,
    rootMargin: "700px 0px",
    threshold: 0,
  });

  searchObserver.observe(searchSentinel);
}

function createPageDivider(pageNumber) {
  const divider = document.createElement("div");
  divider.className = "page-divider";
  divider.setAttribute("aria-label", `End of page ${pageNumber}`);

  const label = document.createElement("span");
  label.textContent = `Page ${pageNumber}`;
  divider.append(label);
  return divider;
}

function appendPostPage(container, posts, pageNumber) {
  const page = document.createElement("div");
  page.className = "image-page";
  page.setAttribute("aria-label", `Page ${pageNumber} images`);

  posts.forEach((post) => {
    page.append(createImageCard(post));
  });

  container.append(page, createPageDivider(pageNumber));
}

function renderFavorites() {
  if (!favoritesStream || !favoritesEmpty) {
    return;
  }

  favoritesStream.innerHTML = "";
  const favoritePosts = [...likedImages].map((id) => imageStore.get(id)).filter(Boolean);
  favoritesEmpty.hidden = favoritePosts.length > 0;

  if (favoritePosts.length === 0) {
    return;
  }

  appendPostPage(favoritesStream, favoritePosts, 1);
}

closeDetailButton?.addEventListener("click", closeDetail);
detailBackdrop?.addEventListener("click", closeDetail);
detailPanel?.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
detailPanel?.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeRatingMenu();
  }

  if (event.key === "Escape" && detailPanel.classList.contains("open")) {
    closeDetail();
  }
});

window.addEventListener("beforeunload", saveSearchSession);

loadImageSettings();
loadAccountSettings();
renderLoadingSettings();
renderAccounts();
loadLanguage();
showPage("search");
updateSelectionActions();
setupInfiniteScroll();
const restoredSearch = restoreSearchSession();
startPostSearch(restoredSearch.query).then(() => {
  restoreLoadedPages(restoredSearch.loadedPage, restoredSearch.scrollY);
});
