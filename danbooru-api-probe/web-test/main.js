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

loadLanguage();
showPage("search");
