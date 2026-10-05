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
const ratingFilterControl = ratingFilter?.closest(".filter-control");
const searchResults = document.querySelector("#search-results");
const searchStatus = document.querySelector("#search-status");
const searchSentinel = document.querySelector("#search-sentinel");
const favoritesStream = document.querySelector("#favorites-stream");
const favoritesEmpty = document.querySelector("#favorites-empty");
const favoritesStatus = document.querySelector("#favorites-status");
const activeDownloadList = document.querySelector("#active-download-list");
const activeDownloadEmpty = document.querySelector("#active-download-empty");
const downloadedFileList = document.querySelector("#downloaded-file-list");
const downloadedFileEmpty = document.querySelector("#downloaded-file-empty");
const importFavoritesButton = document.querySelector("#import-favorites");
const exportFavoritesButton = document.querySelector("#export-favorites");
const favoritesFileInput = document.querySelector("#favorites-file-input");
const selectionActions = document.querySelector("#selection-actions");
const clearSelectionButton = document.querySelector("#clear-selection");
const downloadSelectionButton = document.querySelector("#download-selection");
const toast = document.querySelector("#toast");
const accountUsernameInput = document.querySelector("#account-username");
const accountApiKeyInput = document.querySelector("#account-api-key");
const addAccountButton = document.querySelector("#add-account");
const accountStatus = document.querySelector("#account-status");
const accountList = document.querySelector("#account-list");
const mergeGuestFavoritesButton = document.querySelector("#merge-guest-favorites");
const blacklistTagSearch = document.querySelector("#blacklist-tag-search");
const blacklistInputShell = document.querySelector("#blacklist-input-shell");
const blacklistSelectedTagsEl = document.querySelector("#blacklist-selected-tags");
const blacklistTagInput = document.querySelector("#blacklist-tag-input");
const addBlacklistRuleButton = document.querySelector("#add-blacklist-rule");
const blacklistSuggestionsPanel = document.querySelector("#blacklist-suggestions-panel");
const blacklistSuggestionsList = document.querySelector("#blacklist-suggestions-list");
const blacklistStatus = document.querySelector("#blacklist-status");
const blacklistList = document.querySelector("#blacklist-list");
const downloadDirectoryPath = document.querySelector("#download-directory-path");
const chooseDownloadDirectoryButton = document.querySelector("#choose-download-directory");
const openDownloadDirectoryButton = document.querySelector("#open-download-directory");
const downloadSettingsStatus = document.querySelector("#download-settings-status");
const clearDownloadHistoryButton = document.querySelector("#clear-download-history");
const exportDownloadHistoryButton = document.querySelector("#export-download-history");
const importDownloadHistoryButton = document.querySelector("#import-download-history");
const downloadHistoryFileInput = document.querySelector("#download-history-file-input");
const downloadHistoryStatus = document.querySelector("#download-history-status");
const themeOptionButtons = [...document.querySelectorAll("[data-theme-option]")];
const languageOptionButtons = [...document.querySelectorAll("[data-language-option]")];
const loadingModeButtons = [...document.querySelectorAll("[data-loading-target][data-loading-mode]")];
const networkModeButtons = [...document.querySelectorAll("[data-network-mode]")];
const networkProxyUrlInput = document.querySelector("#network-proxy-url");
const testNetworkButton = document.querySelector("#test-network");
const saveNetworkButton = document.querySelector("#save-network");
const verifyDanbooruButton = document.querySelector("#verify-danbooru");
const networkSettingsStatus = document.querySelector("#network-settings-status");
const detailBackdrop = document.querySelector("#detail-backdrop");
const detailPanel = document.querySelector("#detail-panel");
const detailContent = document.querySelector("#detail-content");
const closeDetailButton = document.querySelector("#close-detail");
const systemThemeMediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") || null;

const categoryNames = {
  0: "general",
  1: "artist",
  3: "copyright",
  4: "character",
  5: "meta",
};

const downloadSources = {
  danbooru: {
    icon: "../icons/danbooru-logo-128x128-ea111b6658173e847734.png",
    ratings: ["", "g", "s", "q", "e"],
    defaultRating: "g",
  },
};

let selectedTags = [];
let suggestions = [];
let activeSuggestionIndex = -1;
let autocompleteController;
let autocompleteRequestId = 0;
let blacklistDraftTags = [];
let blacklistSuggestions = [];
let activeBlacklistSuggestionIndex = -1;
let blacklistAutocompleteController;
let blacklistAutocompleteRequestId = 0;
const selectedImages = new Set();
const imageStore = new Map();
const postsPerPage = 20;
const defaultRating = "g";
let activeSearchTags = "";
let activeSearchPage = 0;
let isLoadingPosts = false;
let hasMorePosts = true;
let postRequestId = 0;
let searchObserver;
let autoSearchTimer;
let lastSubmittedSearchTags = "";
let activeRating = defaultRating;
let activeTheme = "system";
let activeSystemTheme = systemThemeMediaQuery?.matches ? "dark" : "light";
let activeLanguage = "en";
let activeDownloadSource = "danbooru";
let currentDictionary = {};
const searchSessionKey = "danbooruDownloader.searchSession";
const themeSettingsKey = "danbooruDownloader.theme";
const languageSettingsKey = "danbooruDownloader.language";
const loadingSettingsKey = "danbooruDownloader.loadingSettings";
const accountSettingsKey = "danbooruDownloader.accounts";
const activeAccountKey = "danbooruDownloader.activeAccountId";
const favoritesSettingsKey = "danbooruDownloader.favoritesByAccount";
const downloadedRecordsKey = "danbooruDownloader.downloadedRecords";
const legacyDownloadedRecordsKey = "danbooruDownloader.downloadedPostIds";
const blacklistSettingsKey = "danbooruDownloader.blacklistRules";
const guestFavoriteAccountId = "__guest__";
const loadingSettings = {
  thumbnail: "auto",
  detail: "auto",
};
let networkSettings = {
  mode: "system",
  proxyUrl: "",
};
let savedAccounts = [];
let activeAccountId = "";
let favoritesByAccount = {};
let downloadedRecords = [];
let blacklistRules = [];
let activeDownloadDirectory = "";
let downloadTaskSequence = 0;
const activeDownloadTasks = new Map();
let favoriteRenderRequestId = 0;
let activeDetailPost = null;
let toastTimer;

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

  if (pageName === "downloads") {
    renderDownloadPage();
  }
}

function getNestedValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function formatTemplate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function t(path, fallback = "", values = {}) {
  return formatTemplate(getNestedValue(currentDictionary, path) || fallback, values);
}

function isLoadingMode(value) {
  return value === "auto" || value === "direct" || value === "proxy";
}

function isNetworkMode(value) {
  return value === "system" || value === "direct" || value === "custom";
}

function isLanguageMode(value) {
  return value === "en" || value === "zh";
}

function loadLanguageSetting() {
  const saved = localStorage.getItem(languageSettingsKey);
  activeLanguage = isLanguageMode(saved) ? saved : "en";
}

function saveLanguageSetting() {
  localStorage.setItem(languageSettingsKey, activeLanguage);
}

function renderLanguageSettings() {
  languageOptionButtons.forEach((button) => {
    const isActive = button.dataset.languageOption === activeLanguage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function isDownloadSource(value) {
  return Object.prototype.hasOwnProperty.call(downloadSources, value);
}

function isThemeMode(value) {
  return value === "system" || value === "light" || value === "dark";
}

function isResolvedTheme(value) {
  return value === "light" || value === "dark";
}

function resolveThemeSetting(theme = activeTheme) {
  return theme === "system" ? activeSystemTheme : theme;
}

function applyThemeSetting(theme) {
  activeTheme = isThemeMode(theme) ? theme : "system";
  document.documentElement.dataset.theme = resolveThemeSetting(activeTheme);
  document.documentElement.dataset.themePreference = activeTheme;
}

function loadThemeSetting() {
  const saved = localStorage.getItem(themeSettingsKey) || document.documentElement.dataset.themePreference || "system";
  applyThemeSetting(saved);
}

function saveThemeSetting() {
  localStorage.setItem(themeSettingsKey, activeTheme);
}

function renderThemeSettings() {
  themeOptionButtons.forEach((button) => {
    const isActive = button.dataset.themeOption === activeTheme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setTheme(theme) {
  applyThemeSetting(theme);
  saveThemeSetting();
  renderThemeSettings();
}

function handleSystemThemeChanged(theme) {
  if (!isResolvedTheme(theme)) {
    return;
  }

  activeSystemTheme = theme;
  if (activeTheme === "system") {
    applyThemeSetting(activeTheme);
  }
}

async function setupSystemThemeSync() {
  if (systemThemeMediaQuery) {
    const onBrowserSystemThemeChanged = (event) => {
      handleSystemThemeChanged(event.matches ? "dark" : "light");
    };

    if (systemThemeMediaQuery.addEventListener) {
      systemThemeMediaQuery.addEventListener("change", onBrowserSystemThemeChanged);
    } else {
      systemThemeMediaQuery.addListener(onBrowserSystemThemeChanged);
    }
  }

  const desktopApi = getDesktopApi();
  if (!desktopApi) {
    return;
  }

  if (desktopApi.onSystemThemeChanged) {
    desktopApi.onSystemThemeChanged(handleSystemThemeChanged);
  }

  if (desktopApi.getSystemTheme) {
    try {
      const result = await desktopApi.getSystemTheme();
      handleSystemThemeChanged(result?.theme);
    } catch (error) {
      console.warn("Failed to read system theme.", error);
    }
  }
}

function setupDownloadProgressSync() {
  const desktopApi = getDesktopApi();
  if (desktopApi?.onDownloadProgress) {
    desktopApi.onDownloadProgress(updateDownloadTask);
  }
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

function getFavoriteAccountId() {
  return activeAccountId || guestFavoriteAccountId;
}

function normalizeFavoriteId(value) {
  const id = String(value || "").trim();
  return /^\d+$/.test(id) ? id : "";
}

function normalizeFavoriteIds(values) {
  const ids = Array.isArray(values) ? values : [];
  return [...new Set(ids.map(normalizeFavoriteId).filter(Boolean))];
}

function ensureFavoriteBucket(accountId = getFavoriteAccountId()) {
  if (!Array.isArray(favoritesByAccount[accountId])) {
    favoritesByAccount[accountId] = [];
  }

  favoritesByAccount[accountId] = normalizeFavoriteIds(favoritesByAccount[accountId]);
  return favoritesByAccount[accountId];
}

function getCurrentFavoriteIds() {
  return ensureFavoriteBucket(getFavoriteAccountId());
}

function hasFavorite(imageId) {
  return getCurrentFavoriteIds().includes(normalizeFavoriteId(imageId));
}

function saveFavoriteSettings() {
  const normalized = {};
  Object.entries(favoritesByAccount).forEach(([accountId, ids]) => {
    const cleanIds = normalizeFavoriteIds(ids);
    if (cleanIds.length > 0) {
      normalized[accountId] = cleanIds;
    }
  });
  favoritesByAccount = normalized;
  localStorage.setItem(favoritesSettingsKey, JSON.stringify(favoritesByAccount));
}

function loadFavoriteSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(favoritesSettingsKey) || "{}");
    if (Array.isArray(saved)) {
      favoritesByAccount = { [guestFavoriteAccountId]: normalizeFavoriteIds(saved) };
    } else if (saved && typeof saved === "object") {
      favoritesByAccount = Object.fromEntries(
        Object.entries(saved)
          .map(([accountId, ids]) => [accountId, normalizeFavoriteIds(ids)])
          .filter(([, ids]) => ids.length > 0),
      );
    }
  } catch (error) {
    console.warn("Failed to load favorites.", error);
    favoritesByAccount = {};
  }
}

function setFavoritesStatus(message = "") {
  if (favoritesStatus) {
    favoritesStatus.textContent = message;
  }
}

function setFavoritesEmptyMessage(path = "favorites.empty", fallback = "No favorite images yet.") {
  if (!favoritesEmpty) {
    return;
  }

  favoritesEmpty.dataset.i18n = path;
  favoritesEmpty.textContent = t(path, fallback);
}

function setBlacklistStatus(message = "", type = "") {
  if (!blacklistStatus) {
    return;
  }

  blacklistStatus.textContent = message;
  blacklistStatus.classList.toggle("error", type === "error");
  blacklistStatus.classList.toggle("success", type === "success");
}

function getDesktopApi() {
  return globalThis.danbooruDesktop || null;
}

function setNetworkSettingsStatus(message = "", type = "") {
  if (!networkSettingsStatus) {
    return;
  }

  networkSettingsStatus.textContent = message;
  networkSettingsStatus.classList.toggle("error", type === "error");
  networkSettingsStatus.classList.toggle("success", type === "success");
}

function getDraftNetworkSettings() {
  return {
    mode: isNetworkMode(networkSettings.mode) ? networkSettings.mode : "system",
    proxyUrl: String(networkProxyUrlInput?.value || networkSettings.proxyUrl || "").trim(),
  };
}

function renderNetworkSettings() {
  const desktopAvailable = Boolean(getDesktopApi()?.getNetworkSettings);
  networkModeButtons.forEach((button) => {
    const isActive = button.dataset.networkMode === networkSettings.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.disabled = !desktopAvailable;
  });

  if (networkProxyUrlInput) {
    if (networkProxyUrlInput.value !== networkSettings.proxyUrl) {
      networkProxyUrlInput.value = networkSettings.proxyUrl;
    }
    networkProxyUrlInput.disabled = !desktopAvailable || networkSettings.mode !== "custom";
  }
  if (testNetworkButton) {
    testNetworkButton.disabled = !desktopAvailable;
  }
  if (saveNetworkButton) {
    saveNetworkButton.disabled = !desktopAvailable;
  }
  if (verifyDanbooruButton) {
    verifyDanbooruButton.disabled = !desktopAvailable;
  }
}

async function loadNetworkSettings() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.getNetworkSettings) {
    renderNetworkSettings();
    setNetworkSettingsStatus(t("network.desktopOnly", "Network routing is available in the desktop app."));
    return;
  }

  try {
    const result = await desktopApi.getNetworkSettings();
    if (result?.settings && isNetworkMode(result.settings.mode)) {
      networkSettings = {
        mode: result.settings.mode,
        proxyUrl: String(result.settings.proxyUrl || ""),
      };
    }
    renderNetworkSettings();
  } catch (error) {
    renderNetworkSettings();
    setNetworkSettingsStatus(error.message, "error");
  }
}

function getNetworkFailureMessage(result) {
  const failure = result?.api?.ok ? result?.cdn : result?.api;
  const messages = {
    CLOUDFLARE_CHALLENGE: t("network.cloudflare", "the CDN returned a Cloudflare challenge"),
    PROXY_AUTH_REQUIRED: t("network.proxyAuth", "the proxy requires authentication"),
    TIMEOUT: t("network.timeout", "the connection timed out"),
    INVALID_CONTENT: t("network.invalidContent", "the CDN returned non-image content"),
    HTTP_ERROR: t("network.httpError", "the server returned an HTTP error"),
    REQUEST_FAILED: t("network.requestFailed", "the request could not connect"),
    NOT_TESTED: t("network.cdnNotTested", "the CDN test could not start"),
  };
  if (!result?.api?.ok && failure?.code === "OK") {
    return t("network.apiFailed", "the Danbooru API test failed");
  }
  const message = messages[failure?.code]
    || failure?.code
    || result?.message
    || t("network.requestFailed", "the request could not connect");
  return failure?.status ? `${message} (HTTP ${failure.status})` : message;
}

async function testNetworkConnection() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.testNetworkSettings) {
    setNetworkSettingsStatus(t("network.desktopOnly", "Network routing is available in the desktop app."), "error");
    return;
  }

  const draft = getDraftNetworkSettings();
  if (draft.mode === "custom" && !draft.proxyUrl) {
    setNetworkSettingsStatus(t("network.proxyRequired", "Enter an HTTP or HTTPS proxy URL."), "error");
    return;
  }

  testNetworkButton.disabled = true;
  saveNetworkButton.disabled = true;
  setNetworkSettingsStatus(t("network.testing", "Testing the Danbooru API and CDN..."));
  try {
    const result = await desktopApi.testNetworkSettings(draft);
    if (!result?.ok) {
      throw new Error(getNetworkFailureMessage(result));
    }
    setNetworkSettingsStatus(t("network.testPassed", "Connected. API {apiLatency} ms, CDN {cdnLatency} ms.", {
      apiLatency: result.api.latencyMs,
      cdnLatency: result.cdn.latencyMs,
    }), "success");
  } catch (error) {
    setNetworkSettingsStatus(t("network.testFailed", "Connection test failed: {message}", {
      message: error.message,
    }), "error");
  } finally {
    testNetworkButton.disabled = false;
    saveNetworkButton.disabled = false;
  }
}

async function applyNetworkConnection() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.setNetworkSettings) {
    setNetworkSettingsStatus(t("network.desktopOnly", "Network routing is available in the desktop app."), "error");
    return;
  }

  const draft = getDraftNetworkSettings();
  if (draft.mode === "custom" && !draft.proxyUrl) {
    setNetworkSettingsStatus(t("network.proxyRequired", "Enter an HTTP or HTTPS proxy URL."), "error");
    return;
  }

  saveSearchSession();
  testNetworkButton.disabled = true;
  saveNetworkButton.disabled = true;
  setNetworkSettingsStatus(t("network.applying", "Applying network settings..."));
  try {
    const result = await desktopApi.setNetworkSettings(draft);
    if (!result?.ok) {
      throw new Error(result?.message || t("network.requestFailed", "the request could not connect"));
    }
    networkSettings = result.settings;
    setNetworkSettingsStatus(t("network.applied", "Network settings applied."), "success");
    window.location.reload();
  } catch (error) {
    setNetworkSettingsStatus(error.message, "error");
    renderNetworkSettings();
  }
}

async function verifyDanbooruSession() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.openDanbooruVerification) {
    setNetworkSettingsStatus(t("network.desktopOnly", "Network routing is available in the desktop app."), "error");
    return;
  }

  testNetworkButton.disabled = true;
  saveNetworkButton.disabled = true;
  verifyDanbooruButton.disabled = true;
  setNetworkSettingsStatus(t(
    "network.verificationOpen",
    "Complete the verification in the Danbooru window, then close that window.",
  ));

  try {
    const result = await desktopApi.openDanbooruVerification();
    if (result?.pending) {
      return;
    }
    if (!result?.ok) {
      const message = result?.clearanceFound === false
        ? t("network.verificationCookieMissing", "No Cloudflare clearance cookie was found")
        : getNetworkFailureMessage(result);
      throw new Error(message || result?.message);
    }

    setNetworkSettingsStatus(t(
      "network.verificationPassed",
      "Verification succeeded. The Electron session can load Danbooru CDN images.",
    ), "success");
    reloadImagesForLoadingTarget("thumbnail");
    reloadImagesForLoadingTarget("detail");
  } catch (error) {
    setNetworkSettingsStatus(t(
      "network.verificationFailed",
      "Verification did not unlock CDN images: {message}",
      { message: error.message || t("network.requestFailed", "the request could not connect") },
    ), "error");
  } finally {
    testNetworkButton.disabled = false;
    saveNetworkButton.disabled = false;
    verifyDanbooruButton.disabled = false;
  }
}

function setDownloadSettingsStatus(message = "", type = "") {
  if (!downloadSettingsStatus) {
    return;
  }

  downloadSettingsStatus.textContent = message;
  downloadSettingsStatus.classList.toggle("error", type === "error");
  downloadSettingsStatus.classList.toggle("success", type === "success");
}

function renderDownloadDirectory() {
  if (!downloadDirectoryPath) {
    return;
  }

  downloadDirectoryPath.textContent = activeDownloadDirectory || t("settings.downloadLocationUnavailable", "Browser default");
  downloadDirectoryPath.title = activeDownloadDirectory || "";
  if (chooseDownloadDirectoryButton) {
    chooseDownloadDirectoryButton.disabled = !getDesktopApi()?.chooseDownloadDirectory;
  }
  if (openDownloadDirectoryButton) {
    openDownloadDirectoryButton.disabled = !getDesktopApi()?.openDownloadDirectory;
  }
}

async function loadDownloadDirectory() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.getDownloadDirectory) {
    activeDownloadDirectory = "";
    renderDownloadDirectory();
    setDownloadSettingsStatus(t("download.directoryUnavailable", "Download location is available in the desktop app."));
    return;
  }

  try {
    const result = await desktopApi.getDownloadDirectory();
    activeDownloadDirectory = result?.directory || "";
    renderDownloadDirectory();
  } catch (error) {
    setDownloadSettingsStatus(error.message, "error");
  }
}

async function chooseDownloadDirectory() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.chooseDownloadDirectory) {
    setDownloadSettingsStatus(t("download.directoryUnavailable", "Download location is available in the desktop app."), "error");
    return;
  }

  try {
    const result = await desktopApi.chooseDownloadDirectory();
    if (!result?.ok) {
      return;
    }

    activeDownloadDirectory = result.directory || "";
    renderDownloadDirectory();
    setDownloadSettingsStatus(t("download.directoryChanged", "Download location updated."), "success");
  } catch (error) {
    setDownloadSettingsStatus(error.message, "error");
  }
}

async function openDownloadDirectory() {
  const desktopApi = getDesktopApi();
  if (!desktopApi?.openDownloadDirectory) {
    showToast(t("download.directoryUnavailable", "Download location is available in the desktop app."));
    return;
  }

  try {
    const result = await desktopApi.openDownloadDirectory();
    if (!result?.ok) {
      throw new Error(result?.message || t("downloads.openFolderFailed", "Failed to open download folder."));
    }

    activeDownloadDirectory = result.directory || activeDownloadDirectory;
    renderDownloadDirectory();
  } catch (error) {
    showToast(t("downloads.openFolderFailedWithMessage", "Failed to open download folder: {message}", { message: error.message }));
  }
}

function normalizeBlacklistTag(tag) {
  const rawValue = typeof tag === "string" ? tag : tag?.value || tag?.label || "";
  const value = String(rawValue).trim().replace(/\s+/g, "_");
  if (!value) {
    return null;
  }

  const categoryId = Number(tag?.categoryId ?? tag?.category ?? 0);
  const categoryName = tag?.categoryName || categoryNames[categoryId] || "general";
  return {
    label: tag?.label || value,
    value,
    categoryId: Number.isFinite(categoryId) ? categoryId : 0,
    categoryName,
  };
}

function normalizeBlacklistRules(value) {
  const rules = Array.isArray(value) ? value : [];
  return rules
    .map((rule) => {
      const tags = (Array.isArray(rule?.tags) ? rule.tags : [])
        .map(normalizeBlacklistTag)
        .filter(Boolean);
      const dedupedTags = [...new Map(tags.map((tag) => [tag.value, tag])).values()];
      if (dedupedTags.length === 0) {
        return null;
      }

      return {
        id: rule?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tags: dedupedTags,
      };
    })
    .filter(Boolean);
}

function loadBlacklistSettings() {
  try {
    blacklistRules = normalizeBlacklistRules(JSON.parse(localStorage.getItem(blacklistSettingsKey) || "[]"));
  } catch (error) {
    console.warn("Failed to load blacklist settings.", error);
    blacklistRules = [];
  }
}

function saveBlacklistSettings() {
  blacklistRules = normalizeBlacklistRules(blacklistRules);
  localStorage.setItem(blacklistSettingsKey, JSON.stringify(blacklistRules));
}

function getBlacklistRuleSignature(tags) {
  return tags.map((tag) => tag.value).sort().join("\n");
}

function updateBlacklistAddButton() {
  if (!addBlacklistRuleButton) {
    return;
  }

  addBlacklistRuleButton.disabled = blacklistDraftTags.length === 0 && !blacklistTagInput?.value.trim();
}

function renderBlacklistDraftTags() {
  if (!blacklistSelectedTagsEl) {
    return;
  }

  blacklistSelectedTagsEl.innerHTML = "";
  blacklistDraftTags.forEach((tag) => {
    const tagEl = document.createElement("button");
    tagEl.className = `tag-chip blacklist-draft-chip tag-${tag.categoryName}`;
    tagEl.type = "button";
    tagEl.dataset.value = tag.value;
    tagEl.setAttribute("aria-label", `Remove ${tag.label}`);

    const label = document.createElement("span");
    label.textContent = tag.label;

    const removeIcon = document.createElement("span");
    removeIcon.className = "chip-remove icon-x";
    removeIcon.setAttribute("aria-hidden", "true");

    tagEl.append(label, removeIcon);
    blacklistSelectedTagsEl.append(tagEl);
  });
  updateBlacklistAddButton();
}

function renderBlacklistSuggestions() {
  if (!blacklistSuggestionsList || !blacklistSuggestionsPanel) {
    return;
  }

  blacklistSuggestionsList.innerHTML = "";
  if (blacklistSuggestions.length === 0) {
    blacklistSuggestionsPanel.hidden = true;
    return;
  }

  blacklistSuggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.className = `suggestion-item tag-${suggestion.categoryName}`;
    button.type = "button";
    button.dataset.index = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === activeBlacklistSuggestionIndex ? "true" : "false");

    const label = document.createElement("span");
    label.className = "suggestion-label";
    label.textContent = suggestion.label;

    const category = document.createElement("span");
    category.className = "suggestion-category";
    category.textContent = getCategoryDisplayName(suggestion.categoryName);

    const count = document.createElement("span");
    count.className = "suggestion-count";
    count.textContent = formatPostCount(suggestion.postCount);

    button.append(label, category, count);
    blacklistSuggestionsList.append(button);
  });

  blacklistSuggestionsPanel.hidden = false;
}

function addBlacklistDraftTag(tag) {
  const normalizedTag = normalizeBlacklistTag(tag);
  if (!normalizedTag) {
    return;
  }

  if (!blacklistDraftTags.some((selected) => selected.value === normalizedTag.value)) {
    blacklistDraftTags = [...blacklistDraftTags, normalizedTag];
  }

  if (blacklistTagInput) {
    blacklistTagInput.value = "";
  }
  blacklistSuggestions = [];
  activeBlacklistSuggestionIndex = -1;
  renderBlacklistDraftTags();
  renderBlacklistSuggestions();
  blacklistTagInput?.focus();
}

function addRawBlacklistTagFromInput() {
  const value = normalizeManualTagValue(blacklistTagInput?.value);
  if (!value) {
    return;
  }

  addBlacklistDraftTag({
    label: value,
    value,
    categoryId: 0,
    categoryName: "general",
    postCount: 0,
  });
}

function removeBlacklistDraftTag(value) {
  blacklistDraftTags = blacklistDraftTags.filter((tag) => tag.value !== value);
  renderBlacklistDraftTags();
  blacklistTagInput?.focus();
}

async function loadBlacklistSuggestions(query) {
  const trimmed = query.trim();
  blacklistAutocompleteController?.abort();

  if (trimmed.length < 2) {
    blacklistSuggestions = [];
    activeBlacklistSuggestionIndex = -1;
    renderBlacklistSuggestions();
    return;
  }

  const requestId = ++blacklistAutocompleteRequestId;
  blacklistAutocompleteController = new AbortController();
  const params = new URLSearchParams({
    "search[query]": trimmed,
    "search[type]": "tag_query",
    limit: "12",
  });
  params.set("source", activeDownloadSource);

  try {
    const response = await fetch(`/api/autocomplete?${params}`, {
      signal: blacklistAutocompleteController.signal,
      headers: getDanbooruAuthHeaders(),
    });
    const payload = await response.json();
    if (requestId !== blacklistAutocompleteRequestId) {
      return;
    }

    const items = Array.isArray(payload.body) ? payload.body : [];
    blacklistSuggestions = items.map(normalizeSuggestion).filter((item) => item.label && item.value);
    activeBlacklistSuggestionIndex = blacklistSuggestions.length > 0 ? 0 : -1;
    renderBlacklistSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Blacklist autocomplete request failed.", error);
    }
  }
}

function getPostTagSet(post) {
  return new Set([
    ...splitTags(post.tag_string),
    ...splitTags(post.tag_string_artist),
    ...splitTags(post.tag_string_character),
    ...splitTags(post.tag_string_copyright),
    ...splitTags(post.tag_string_general),
    ...splitTags(post.tag_string_meta),
  ]);
}

function isPostBlocked(post) {
  if (blacklistRules.length === 0) {
    return false;
  }

  const postTags = getPostTagSet(post);
  return blacklistRules.some((rule) => (
    rule.tags.length > 0 && rule.tags.every((tag) => postTags.has(tag.value))
  ));
}

function filterBlockedPosts(posts) {
  return posts.filter((post) => !isPostBlocked(post));
}

function refreshContentAfterBlacklistChange() {
  submitSearch(getSearchQuery(true), true);
  renderFavorites();
  if (activeDetailPost && isPostBlocked(activeDetailPost)) {
    closeDetail();
  }
}

function addBlacklistRule() {
  if (blacklistTagInput?.value.trim()) {
    addRawBlacklistTagFromInput();
  }

  const tags = blacklistDraftTags.map(normalizeBlacklistTag).filter(Boolean);
  if (tags.length === 0) {
    setBlacklistStatus(t("blacklist.tagRequired", "Add at least one tag first."), "error");
    return;
  }

  const signature = getBlacklistRuleSignature(tags);
  if (blacklistRules.some((rule) => getBlacklistRuleSignature(rule.tags) === signature)) {
    setBlacklistStatus(t("blacklist.duplicate", "This blacklist rule already exists."), "error");
    return;
  }

  blacklistRules = [...blacklistRules, {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tags,
  }];
  blacklistDraftTags = [];
  saveBlacklistSettings();
  renderBlacklistDraftTags();
  renderBlacklistRules();
  setBlacklistStatus(t("blacklist.added", "Blacklist rule added."), "success");
  refreshContentAfterBlacklistChange();
}

function removeBlacklistRule(ruleId) {
  const rule = blacklistRules.find((item) => item.id === ruleId);
  if (!rule) {
    return;
  }

  const label = rule.tags.map((tag) => tag.label).join(" + ");
  if (!window.confirm(t("blacklist.removeConfirm", "Remove blacklist rule \"{label}\"?", { label }))) {
    return;
  }

  blacklistRules = blacklistRules.filter((item) => item.id !== ruleId);
  saveBlacklistSettings();
  renderBlacklistRules();
  setBlacklistStatus(t("blacklist.removed", "Blacklist rule removed."), "success");
  refreshContentAfterBlacklistChange();
}

function renderBlacklistRules() {
  if (!blacklistList) {
    return;
  }

  blacklistList.innerHTML = "";
  if (blacklistRules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "blacklist-empty";
    empty.textContent = t("blacklist.empty", "No blacklist rules yet.");
    blacklistList.append(empty);
    return;
  }

  blacklistRules.forEach((rule) => {
    const row = document.createElement("div");
    row.className = "blacklist-rule-row";
    row.dataset.ruleId = rule.id;

    const tags = document.createElement("div");
    tags.className = "blacklist-rule-tags";
    rule.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = `blacklist-rule-chip tag-${tag.categoryName}`;
      chip.textContent = tag.label;
      tags.append(chip);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "blacklist-delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.ruleId = rule.id;
    deleteButton.setAttribute("aria-label", `Remove ${rule.tags.map((tag) => tag.label).join(" + ")}`);

    const deleteIcon = document.createElement("span");
    deleteIcon.className = "action-icon icon-minus";
    deleteIcon.setAttribute("aria-hidden", "true");
    deleteButton.append(deleteIcon);

    row.append(tags, deleteButton);
    blacklistList.append(row);
  });
}

function syncAllImageCards() {
  document.querySelectorAll(".image-card").forEach((card) => {
    const post = imageStore.get(card.dataset.imageKey);
    if (post) {
      syncImageCardControls(card, post);
    }
  });
}

function updateMergeGuestFavoritesAction() {
  if (!mergeGuestFavoritesButton) {
    return;
  }

  const guestCount = ensureFavoriteBucket(guestFavoriteAccountId).length;
  mergeGuestFavoritesButton.hidden = !activeAccountId || guestCount === 0;
  mergeGuestFavoritesButton.disabled = !activeAccountId || guestCount === 0;
}

function mergeGuestFavoritesToActiveAccount({ confirm = false } = {}) {
  if (!activeAccountId) {
    return 0;
  }

  const guestIds = ensureFavoriteBucket(guestFavoriteAccountId);
  if (guestIds.length === 0) {
    return 0;
  }

  if (confirm && !window.confirm(t("account.guestMergeConfirm", "Add {count} no-account favorites to the selected account?", { count: guestIds.length }))) {
    return 0;
  }

  const accountIds = ensureFavoriteBucket(activeAccountId);
  const mergedIds = normalizeFavoriteIds([...accountIds, ...guestIds]);
  const addedCount = mergedIds.length - accountIds.length;
  favoritesByAccount[activeAccountId] = mergedIds;
  saveFavoriteSettings();
  syncAllImageCards();
  renderFavorites();
  updateMergeGuestFavoritesAction();
  if (addedCount > 0) {
    setAccountStatus(t("account.guestMerged", "{count} no-account favorites added to this account.", { count: addedCount }), "success");
  }
  return addedCount;
}

function toggleFavorite(imageId) {
  const normalizedId = normalizeFavoriteId(imageId);
  if (!normalizedId) {
    return false;
  }

  const accountId = getFavoriteAccountId();
  const favoriteIds = ensureFavoriteBucket(accountId);
  const existingIndex = favoriteIds.indexOf(normalizedId);
  const willFavorite = existingIndex === -1;
  if (willFavorite) {
    favoriteIds.push(normalizedId);
  } else {
    favoriteIds.splice(existingIndex, 1);
  }

  saveFavoriteSettings();
  updateMergeGuestFavoritesAction();
  return willFavorite;
}

function loadDownloadedRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(downloadedRecordsKey) || localStorage.getItem(legacyDownloadedRecordsKey) || "[]");
    const records = Array.isArray(saved) ? saved : [];
    downloadedRecords = records
      .map(normalizeDownloadedRecord)
      .filter(Boolean);
    downloadedRecords = downloadedRecords.filter((record, index, items) => (
      items.findIndex((item) => getDownloadedRecordKey(item.id, item.source) === getDownloadedRecordKey(record.id, record.source)) === index
    ));
  } catch (error) {
    console.warn("Failed to load download history.", error);
    downloadedRecords = [];
  }
}

function saveDownloadedRecords() {
  localStorage.setItem(downloadedRecordsKey, JSON.stringify(downloadedRecords));
}

function getDownloadedRecordKey(imageId, source = activeDownloadSource) {
  const id = normalizeFavoriteId(imageId);
  return id && isDownloadSource(source) ? `${source}:${id}` : "";
}

function normalizeDownloadedRecord(value) {
  if (typeof value === "string" || typeof value === "number") {
    const id = normalizeFavoriteId(value);
    return id ? { id, source: "danbooru" } : null;
  }

  const id = normalizeFavoriteId(value?.id);
  const source = value?.source || "danbooru";
  if (!isDownloadSource(source)) {
    return null;
  }
  return id ? { id, source } : null;
}

function hasDownloadedRecord(postOrId, source = activeDownloadSource) {
  const id = typeof postOrId === "object" ? getPostId(postOrId) : postOrId;
  const resolvedSource = typeof postOrId === "object" ? getPostSource(postOrId) : source;
  const key = getDownloadedRecordKey(id, resolvedSource);
  return downloadedRecords.some((record) => getDownloadedRecordKey(record.id, record.source) === key);
}

function addDownloadedRecord(postOrId, source = activeDownloadSource) {
  const id = typeof postOrId === "object" ? getPostId(postOrId) : normalizeFavoriteId(postOrId);
  const resolvedSource = typeof postOrId === "object" ? getPostSource(postOrId) : source;
  const key = getDownloadedRecordKey(id, resolvedSource);
  if (!key || hasDownloadedRecord(id, resolvedSource)) {
    return;
  }

  downloadedRecords.push({ id, source: resolvedSource });
  saveDownloadedRecords();
  syncImageInstances(id, resolvedSource);
  renderDownloadPage();
  if (activeDetailPost && getPostStoreKey(activeDetailPost) === getPostStoreKey(id, resolvedSource)) {
    renderDetail(activeDetailPost);
  }
}

function removeDownloadedRecord(postOrId, source = activeDownloadSource) {
  const id = typeof postOrId === "object" ? getPostId(postOrId) : normalizeFavoriteId(postOrId);
  const resolvedSource = typeof postOrId === "object" ? getPostSource(postOrId) : source;
  const key = getDownloadedRecordKey(id, resolvedSource);
  if (!key) {
    return;
  }

  downloadedRecords = downloadedRecords.filter((record) => getDownloadedRecordKey(record.id, record.source) !== key);
  saveDownloadedRecords();
  syncImageInstances(id, resolvedSource);
  renderDownloadPage();
  if (activeDetailPost && getPostStoreKey(activeDetailPost) === getPostStoreKey(id, resolvedSource)) {
    renderDetail(activeDetailPost);
  }
}

function clearDownloadedRecords() {
  if (downloadedRecords.length === 0) {
    if (downloadHistoryStatus) downloadHistoryStatus.textContent = t("account.noDownloadRecords", "No downloaded records to clear.");
    return;
  }

  if (!window.confirm(t("account.clearDownloadConfirm", "Clear {count} downloaded records? This will not delete local files.", { count: downloadedRecords.length }))) {
    return;
  }

  const affectedRecords = [...downloadedRecords];
  downloadedRecords = [];
  saveDownloadedRecords();
  affectedRecords.forEach((record) => syncImageInstances(record.id, record.source));
  if (activeDetailPost) {
    renderDetail(activeDetailPost);
  }
  renderDownloadPage();
  if (downloadHistoryStatus) downloadHistoryStatus.textContent = t("account.downloadRecordsCleared", "Downloaded records cleared.");
}

function exportDownloadHistory() {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    records: downloadedRecords,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `danbooru-download-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (downloadHistoryStatus) downloadHistoryStatus.textContent = t("downloads.historyExported", "Download history exported.");
}

async function importDownloadHistory(file) {
  if (!file) return;
  try {
    if (file.size > 4_000_000) throw new Error(t("downloads.historyTooLarge", "File is too large."));
    const payload = JSON.parse(await file.text());
    const items = Array.isArray(payload) ? payload : payload?.records;
    if (!Array.isArray(items)) throw new Error(t("downloads.historyInvalid", "Invalid download history file."));
    const imported = items.map(normalizeDownloadedRecord).filter(Boolean);
    const existing = new Set(downloadedRecords.map((record) => getDownloadedRecordKey(record.id, record.source)));
    const added = imported.filter((record) => {
      const key = getDownloadedRecordKey(record.id, record.source);
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    downloadedRecords.push(...added);
    saveDownloadedRecords();
    added.forEach((record) => syncImageInstances(record.id, record.source));
    renderDownloadPage();
    if (downloadHistoryStatus) downloadHistoryStatus.textContent = t("downloads.historyImported", "{count} new records imported.", { count: added.length });
  } catch (error) {
    if (downloadHistoryStatus) downloadHistoryStatus.textContent = error.message;
  } finally {
    if (downloadHistoryFileInput) downloadHistoryFileInput.value = "";
  }
}

function getDownloadTaskStatusLabel(status, item = {}) {
  if (status === "downloading") {
    return t("downloads.statusDownloading", "Downloading");
  }

  if (status === "complete") {
    return t("downloads.statusComplete", "Complete");
  }

  if (status === "failed") {
    return t("downloads.statusFailed", "Failed");
  }

  return t("downloads.statusQueued", "Waiting");
}

function createDownloadTask(post) {
  const postId = getPostId(post);
  const downloadId = `${postId}-${Date.now()}-${++downloadTaskSequence}`;
  const task = {
    id: downloadId,
    post,
    postId,
    filename: getDownloadFilename(post),
    status: "queued",
    downloadedBytes: 0,
    totalBytes: Number(post.file_size || 0),
    message: "",
  };

  activeDownloadTasks.set(downloadId, task);
  renderDownloadPage();
  return task;
}

function updateDownloadTask(progress) {
  const downloadId = String(progress?.downloadId || "");
  if (!downloadId || !activeDownloadTasks.has(downloadId)) {
    return;
  }

  const task = activeDownloadTasks.get(downloadId);
  activeDownloadTasks.set(downloadId, {
    ...task,
    filename: progress.filename || task.filename,
    status: progress.status || task.status,
    downloadedBytes: Number(progress.downloadedBytes ?? task.downloadedBytes) || 0,
    totalBytes: Number(progress.totalBytes ?? task.totalBytes) || 0,
    message: progress.message || task.message,
  });
  renderDownloadPage();
}

function completeDownloadTask(downloadId) {
  if (!activeDownloadTasks.has(downloadId)) {
    return;
  }

  const task = activeDownloadTasks.get(downloadId);
  activeDownloadTasks.set(downloadId, {
    ...task,
    status: "complete",
    downloadedBytes: task.totalBytes > 0 ? task.totalBytes : task.downloadedBytes,
  });
  renderDownloadPage();
  window.setTimeout(() => {
    activeDownloadTasks.delete(downloadId);
    renderDownloadPage();
  }, 5000);
}

function failDownloadTask(downloadId, message) {
  if (!activeDownloadTasks.has(downloadId)) {
    return;
  }

  const task = activeDownloadTasks.get(downloadId);
  activeDownloadTasks.set(downloadId, {
    ...task,
    status: "failed",
    message: message || task.message,
  });
  renderDownloadPage();
}

function getDownloadProgressPercent(item) {
  if (!item.totalBytes || item.totalBytes <= 0) {
    return item.status === "complete" ? 100 : 0;
  }

  const percent = (item.downloadedBytes / item.totalBytes) * 100;
  if (item.downloadedBytes > 0 && percent < 1) {
    return 1;
  }

  return Math.min(100, Math.max(0, Math.round(percent)));
}

function getDownloadSizeText(item) {
  if (item.totalBytes > 0) {
    return `${formatFileSize(item.downloadedBytes)} / ${formatFileSize(item.totalBytes)}`;
  }

  if (item.status === "complete") {
    return t("downloads.unknownSize", "Unknown");
  }

  if (item.downloadedBytes > 0) {
    return `${formatFileSize(item.downloadedBytes)} / ${t("downloads.unknownSize", "Unknown")}`;
  }

  return `0 B / ${t("downloads.unknownSize", "Unknown")}`;
}

function createDownloadInfoRow({
  imageId,
  source = activeDownloadSource,
  status = "",
  downloadedBytes = 0,
  totalBytes = 0,
  message = "",
  className = "",
}) {
  const item = { status, downloadedBytes, totalBytes };
  const isIndeterminate = status === "downloading" && totalBytes <= 0;
  const button = document.createElement("button");
  button.className = `download-row ${className} ${isIndeterminate ? "indeterminate" : ""}`.trim();
  button.type = "button";
  button.dataset.imageId = imageId;
  button.dataset.imageSource = source;

  const id = document.createElement("span");
  id.className = "download-row-id";
  const sourceIcon = document.createElement("img");
  sourceIcon.className = "download-row-source-icon";
  sourceIcon.src = downloadSources[source]?.icon || downloadSources.danbooru.icon;
  sourceIcon.alt = "";
  sourceIcon.setAttribute("aria-hidden", "true");
  const idLabel = document.createElement("span");
  idLabel.textContent = `#${imageId}`;
  id.append(sourceIcon, idLabel);

  const progressCell = document.createElement("span");
  progressCell.className = "download-row-progress";

  const progressTrack = document.createElement("span");
  progressTrack.className = "download-progress-track";
  const progressFill = document.createElement("span");
  progressFill.className = "download-progress-fill";
  progressFill.style.width = isIndeterminate ? "38%" : `${getDownloadProgressPercent(item)}%`;
  progressTrack.append(progressFill);

  const statusLabel = document.createElement("span");
  statusLabel.className = "download-row-status";
  statusLabel.textContent = message || getDownloadTaskStatusLabel(status, item);
  progressCell.append(progressTrack, statusLabel);

  const size = document.createElement("span");
  size.className = "download-row-size";
  size.textContent = getDownloadSizeText(item);

  button.append(id, progressCell, size);
  button.addEventListener("click", () => openPostById(imageId, source));
  return button;
}

function renderActiveDownloadTasks() {
  if (!activeDownloadList || !activeDownloadEmpty) {
    return;
  }

  const tasks = [...activeDownloadTasks.values()];
  activeDownloadList.innerHTML = "";
  activeDownloadEmpty.hidden = tasks.length > 0;
  tasks.forEach((task) => {
    activeDownloadList.append(createDownloadInfoRow({
      imageId: task.postId,
      source: getPostSource(task.post),
      status: task.status,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
      message: task.message,
      className: task.status,
    }));
  });
}

function renderDownloadedFiles() {
  if (!downloadedFileList || !downloadedFileEmpty) {
    return;
  }

  const records = [...downloadedRecords].reverse();
  downloadedFileList.innerHTML = "";
  downloadedFileEmpty.hidden = records.length > 0;
  records.forEach((record) => {
    const post = imageStore.get(getPostStoreKey(record.id, record.source));
    downloadedFileList.append(createDownloadInfoRow({
      imageId: record.id,
      source: record.source,
      status: "complete",
      downloadedBytes: Number(post?.file_size || 0),
      totalBytes: Number(post?.file_size || 0),
      className: "completed",
    }));
  });
}

function renderDownloadPage() {
  renderActiveDownloadTasks();
  renderDownloadedFiles();
}

function getDanbooruAuthHeaders(source = activeDownloadSource) {
  if (source !== "danbooru") {
    return {};
  }

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
    label: t("settings.noAccount", "No account"),
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
  syncAllImageCards();
  updateMergeGuestFavoritesAction();
  renderFavorites();
  submitSearch(getSearchQuery(true), true);
}

function renderRatingFilter() {
  const sourceConfig = downloadSources.danbooru;
  const availableRatings = sourceConfig.ratings;
  if (!availableRatings.includes(activeRating)) {
    activeRating = sourceConfig.defaultRating;
  }

  if (ratingFilterControl) {
    ratingFilterControl.hidden = availableRatings.length === 0;
  }
  ratingFilter?.setAttribute("data-value", activeRating);
  ratingOptionButtons.forEach((button) => {
    const value = button.dataset.ratingValue || "";
    const isAvailable = availableRatings.includes(value);
    button.hidden = !isAvailable;
    if (value === "s") {
      button.textContent = t("search.ratingSensitive", "Sensitive");
    }
    button.setAttribute("aria-label", button.textContent);

    const isActive = isAvailable && value === activeRating;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    if (isActive && ratingFilterLabel) {
      ratingFilterLabel.textContent = button.textContent;
      ratingFilterButton?.setAttribute("aria-label", button.textContent);
    }
  });
}

function getRatingSearchTerm() {
  if (!activeRating) {
    return "";
  }

  return `rating:${activeRating}`;
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
    renderRatingFilter();
    return { query: getSearchQuery(true), loadedPage: 1, scrollY: 0 };
  }

  if (Array.isArray(session.selectedTags)) {
    selectedTags = session.selectedTags.filter((tag) => tag?.label && tag?.value);
  }

  if (tagInput && typeof session.rawInput === "string") {
    tagInput.value = session.rawInput;
  }

  activeRating = typeof session.activeRating === "string" ? session.activeRating : defaultRating;
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
    const response = await fetch(`./lang/${activeLanguage}.json`);
    currentDictionary = await response.json();

    i18nNodes.forEach((node) => {
      const label = getNestedValue(currentDictionary, node.dataset.i18n);
      if (label) {
        node.textContent = label;
        node.closest("button")?.setAttribute("aria-label", label);
      }
    });

    i18nPlaceholderNodes.forEach((node) => {
      const label = getNestedValue(currentDictionary, node.dataset.i18nPlaceholder);
      if (label) {
        node.setAttribute("placeholder", label);
      }
    });

    document.title = currentDictionary.app?.title || document.title;
    document.documentElement.lang = activeLanguage === "zh" ? "zh-CN" : "en";
    renderLanguageSettings();
    renderRatingFilter();
    renderAccounts();
    renderBlacklistDraftTags();
    renderBlacklistSuggestions();
    renderBlacklistRules();
    renderSuggestions();
    renderDownloadDirectory();
    renderDownloadPage();
    syncAllImageCards();
    updatePageDividers();
    updateSelectionActions();
    if (detailPanel.classList.contains("open") && activeDetailPost) {
      renderDetail(activeDetailPost);
    }
  } catch (error) {
    console.warn("Failed to load language file.", error);
  }
}

async function setLanguage(language) {
  if (!isLanguageMode(language)) {
    return;
  }

  activeLanguage = language;
  saveLanguageSetting();
  await loadLanguage();
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

function normalizeManualTagValue(value) {
  return String(value || "").trim().replace(/\s+/g, "_");
}

function getCategoryDisplayName(categoryName) {
  return t(`tagCategories.${categoryName}`, categoryName);
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
    category.textContent = getCategoryDisplayName(suggestion.categoryName);

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

function addDetailTagToSearch(tag, className) {
  const categoryName = className.replace(/^tag-/, "") || "general";
  addTag({
    label: tag,
    value: tag,
    categoryId: Number(Object.entries(categoryNames).find(([, name]) => name === categoryName)?.[0] || 0),
    categoryName,
    postCount: 0,
  });
  closeDetail();
  showPage("search");
  submitSearch(getSearchQuery(false), true);
  showToast(t("toast.addedTag", "Added tag to search"));
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
  params.set("source", activeDownloadSource);

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
  const value = normalizeManualTagValue(tagInput.value);
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
  const rawInput = normalizeManualTagValue(tagInput.value);

  if (includeInput && rawInput && !values.includes(rawInput)) {
    values.push(rawInput);
  }

  const ratingTerm = getRatingSearchTerm();
  if (ratingTerm) {
    values.push(ratingTerm);
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
    const chip = document.createElement("button");
    chip.className = `detail-tag ${className}`;
    chip.type = "button";
    chip.textContent = tag;
    chip.setAttribute("aria-label", `Add ${tag} to search`);
    chip.addEventListener("click", () => {
      addDetailTagToSearch(tag, className);
    });
    list.append(chip);
  });

  section.append(heading, list);
  parent.append(section);
}

function getDownloadFilename(post) {
  return `${getPostSource(post)}-${post.id}.${post.file_ext || "jpg"}`;
}

async function downloadOriginal(post, existingTask = null) {
  if (!post?.file_url) {
    showToast(t("toast.downloadFailed", "Download failed: {message}", {
      message: t("download.noFileUrl", "Original file URL is unavailable."),
    }));
    return false;
  }

  const task = existingTask || createDownloadTask(post);
  const desktopApi = getDesktopApi();
  if (desktopApi?.downloadOriginal) {
    try {
      const result = await desktopApi.downloadOriginal({
        downloadId: task.id,
        fileUrl: post.file_url,
        fileSize: post.file_size,
        filename: getDownloadFilename(post),
        postId: getPostId(post),
        source: getPostSource(post),
      });

      if (!result?.ok) {
        throw new Error(result?.message || "Unknown error");
      }

      addDownloadedRecord(post);
      activeDownloadDirectory = result.directory || activeDownloadDirectory;
      renderDownloadDirectory();
      completeDownloadTask(task.id);
      showToast(t("toast.downloaded", "Downloaded original"));
      return true;
    } catch (error) {
      failDownloadTask(task.id, error.message);
      showToast(t("toast.downloadFailed", "Download failed: {message}", { message: error.message }));
      return false;
    }
  }

  updateDownloadTask({
    downloadId: task.id,
    status: "downloading",
    downloadedBytes: post.file_size || 0,
    totalBytes: post.file_size || 0,
  });
  const link = document.createElement("a");
  link.href = post.file_url;
  link.download = getDownloadFilename(post);
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
  addDownloadedRecord(post);
  completeDownloadTask(task.id);
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

  return `/api/image-proxy?v=2&url=${encodeURIComponent(url)}`;
}

function getSessionImageUrl(url) {
  if (!url) {
    return "";
  }

  return getDesktopApi()?.getSessionImageUrl?.(url) || "";
}

async function diagnoseImageProxyError(proxyUrl) {
  if (!proxyUrl) {
    return null;
  }

  try {
    const separator = proxyUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${proxyUrl}${separator}diagnose=1`, { cache: "no-store" });
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.toLowerCase().startsWith("image/")) {
      return null;
    }

    return contentType.toLowerCase().includes("application/json")
      ? await response.json()
      : { code: "DANBOORU_CDN_INVALID_RESPONSE" };
  } catch {
    return { code: "DANBOORU_CDN_REQUEST_FAILED" };
  }
}

function getImageLoadErrorMessage(error, kind = "preview") {
  if (error?.code === "DANBOORU_CDN_CLOUDFLARE_CHALLENGE") {
    return t(
      "image.cdnBlocked",
      "Danbooru CDN was blocked by Cloudflare. Change your proxy or network route.",
    );
  }

  if (error?.code === "DANBOORU_CDN_PROXY_AUTH_REQUIRED") {
    return t("image.proxyAuth", "The configured proxy requires authentication.");
  }

  if (error?.code === "DANBOORU_CDN_REQUEST_TIMEOUT") {
    return t("image.proxyTimeout", "The Danbooru CDN request timed out.");
  }

  if (error) {
    return t("image.proxyFailed", "Danbooru CDN image could not be loaded.");
  }

  return kind === "detail"
    ? t("image.detailUnavailable", "Image failed to load.")
    : t("image.previewUnavailable", "Preview unavailable");
}

function setImageWithProxyFallback(image, sourceUrl, mode, onLoad, onFinalError) {
  const proxyUrl = getProxiedImageUrl(sourceUrl);
  const sessionUrl = getSessionImageUrl(sourceUrl);
  const attempts = mode === "proxy"
    ? [proxyUrl]
    : mode === "direct"
      ? [sourceUrl]
      : sessionUrl
        ? [sessionUrl, proxyUrl]
        : [sourceUrl, proxyUrl];
  let attemptIndex = 0;
  image.classList.remove("image-loaded");
  image.dataset.sourceUrl = sourceUrl;
  image.dataset.proxyUrl = proxyUrl;
  image.dataset.sessionUrl = sessionUrl;

  image.onload = () => {
    image.classList.add("image-loaded");
    onLoad?.();
  };

  image.onerror = async () => {
    image.classList.remove("image-loaded");

    if (attemptIndex < attempts.length - 1) {
      attemptIndex += 1;
      image.src = attempts[attemptIndex];
      return;
    }

    const proxyError = attempts[attemptIndex] === proxyUrl
      ? await diagnoseImageProxyError(image.dataset.proxyUrl)
      : null;
    onFinalError?.(proxyError);
  };

  image.src = attempts[attemptIndex];
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
      delete card.dataset.previewError;
      setImageWithProxyFallback(image, sourceUrl, loadingSettings.thumbnail, () => {
        card.classList.remove("thumbnail-load-failed");
        delete card.dataset.previewError;
      }, (error) => {
        card.dataset.previewError = getImageLoadErrorMessage(error, "preview");
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
    delete imageWrap.dataset.imageError;
    setImageWithProxyFallback(image, sourceUrl, loadingSettings.detail, () => {
      imageWrap.classList.remove("image-load-failed");
      delete imageWrap.dataset.imageError;
    }, (error) => {
      imageWrap.dataset.imageError = getImageLoadErrorMessage(error, "detail");
      imageWrap.classList.add("image-load-failed");
    });
  }
}

function createDetailDownloadActions(post) {
  const isDownloaded = hasDownloadedRecord(post);

  const downloadButton = document.createElement("button");
  downloadButton.className = "detail-download-button";
  downloadButton.type = "button";
  downloadButton.textContent = t("detail.downloadOriginal", "Download original");
  downloadButton.disabled = !post.file_url;
  downloadButton.addEventListener("click", async () => {
    downloadButton.disabled = true;
    await downloadOriginal(post);
    downloadButton.disabled = !post.file_url;
  });

  if (!isDownloaded) {
    return downloadButton;
  }

  const actions = document.createElement("div");
  actions.className = "detail-download-actions";

  const removeRecordButton = document.createElement("button");
  removeRecordButton.className = "detail-download-record-button";
  removeRecordButton.type = "button";
  removeRecordButton.setAttribute("aria-label", `Remove downloaded record for ${getPostLabel(post)}`);

  const removeIcon = document.createElement("span");
  removeIcon.className = "action-icon icon-x";
  removeIcon.setAttribute("aria-hidden", "true");

  const removeLabel = document.createElement("span");
  removeLabel.textContent = t("detail.deleteRecord", "Delete record");
  removeRecordButton.append(removeIcon, removeLabel);
  removeRecordButton.addEventListener("click", () => {
    removeDownloadedRecord(post);
  });

  actions.append(downloadButton, removeRecordButton);
  return actions;
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
      delete imageWrap.dataset.imageError;
    }, (error) => {
      imageWrap.dataset.imageError = getImageLoadErrorMessage(error, "detail");
      imageWrap.classList.add("image-load-failed");
    });
    imageWrap.append(image);
  }

  const downloadActions = createDetailDownloadActions(post);

  const info = document.createElement("dl");
  info.className = "detail-info";

  appendDetailRow(info, "ID", post.id);
  appendDetailRow(info, t("detail.source", "Source"), post.source, { href: true });
  appendDetailRow(info, t("detail.dimensions", "Dimensions"), post.image_width && post.image_height ? `${post.image_width} x ${post.image_height}` : "");
  appendDetailRow(info, t("detail.format", "Format"), post.file_ext ? post.file_ext.toUpperCase() : "");
  appendDetailRow(info, t("detail.size", "Size"), formatFileSize(post.file_size));

  const tagSections = document.createElement("div");
  tagSections.className = "detail-tags";
  appendTagSection(tagSections, t("detail.artist", "Artist"), post.tag_string_artist, "tag-artist");
  appendTagSection(tagSections, t("detail.character", "Character"), post.tag_string_character, "tag-character");
  appendTagSection(tagSections, t("detail.copyright", "Copyright"), post.tag_string_copyright, "tag-copyright");
  appendTagSection(tagSections, t("detail.general", "General"), post.tag_string_general, "tag-general");
  appendTagSection(tagSections, t("detail.meta", "Meta"), post.tag_string_meta, "tag-meta");

  detailContent.append(imageWrap, downloadActions, info, tagSections);
}

function openDetail(post) {
  activeDetailPost = post;
  renderDetail(post);
  detailBackdrop.hidden = false;
  document.body.classList.add("detail-open");
  detailPanel.classList.add("open");
  detailPanel.setAttribute("aria-hidden", "false");
  detailContent.scrollTop = 0;
  updateSelectionActions();
}

async function openPostById(imageId, source = activeDownloadSource) {
  try {
    const cached = imageStore.get(getPostStoreKey(imageId, source));
    const post = cached || await loadFavoritePost(imageId, source);
    if (post) {
      openDetail(post);
    }
  } catch (error) {
    showToast(t("downloads.openFailed", "Failed to open image: {message}", { message: error.message }));
  }
}

function closeDetail() {
  activeDetailPost = null;
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

themeOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.themeOption);
  });
});

languageOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.languageOption);
  });
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

networkModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.networkMode;
    if (!isNetworkMode(mode)) {
      return;
    }
    networkSettings.proxyUrl = String(networkProxyUrlInput?.value || networkSettings.proxyUrl || "");
    networkSettings.mode = mode;
    setNetworkSettingsStatus("");
    renderNetworkSettings();
  });
});

networkProxyUrlInput?.addEventListener("input", () => {
  networkSettings.proxyUrl = networkProxyUrlInput.value;
  setNetworkSettingsStatus("");
});

testNetworkButton?.addEventListener("click", testNetworkConnection);
saveNetworkButton?.addEventListener("click", applyNetworkConnection);
verifyDanbooruButton?.addEventListener("click", verifyDanbooruSession);

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

mergeGuestFavoritesButton?.addEventListener("click", () => {
  mergeGuestFavoritesToActiveAccount({ confirm: true });
});

clearDownloadHistoryButton?.addEventListener("click", clearDownloadedRecords);
exportDownloadHistoryButton?.addEventListener("click", exportDownloadHistory);
importDownloadHistoryButton?.addEventListener("click", () => downloadHistoryFileInput?.click());
downloadHistoryFileInput?.addEventListener("change", () => importDownloadHistory(downloadHistoryFileInput.files?.[0]));
chooseDownloadDirectoryButton?.addEventListener("click", chooseDownloadDirectory);
openDownloadDirectoryButton?.addEventListener("click", openDownloadDirectory);

exportFavoritesButton?.addEventListener("click", exportCurrentFavorites);

importFavoritesButton?.addEventListener("click", () => {
  favoritesFileInput?.click();
});

favoritesFileInput?.addEventListener("change", () => {
  importFavoritesFile(favoritesFileInput.files?.[0]);
});

blacklistInputShell?.addEventListener("click", () => blacklistTagInput?.focus());

blacklistTagInput?.addEventListener("focus", () => {
  blacklistTagSearch?.classList.add("focused");
  renderBlacklistSuggestions();
});

blacklistTagInput?.addEventListener("blur", () => {
  blacklistTagSearch?.classList.remove("focused");
  window.setTimeout(() => {
    if (blacklistSuggestionsPanel) {
      blacklistSuggestionsPanel.hidden = true;
    }
  }, 120);
});

blacklistTagInput?.addEventListener("input", () => {
  loadBlacklistSuggestions(blacklistTagInput.value);
  updateBlacklistAddButton();
});

blacklistTagInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && blacklistSuggestions.length > 0) {
    event.preventDefault();
    activeBlacklistSuggestionIndex = (activeBlacklistSuggestionIndex + 1) % blacklistSuggestions.length;
    renderBlacklistSuggestions();
    return;
  }

  if (event.key === "ArrowUp" && blacklistSuggestions.length > 0) {
    event.preventDefault();
    activeBlacklistSuggestionIndex = (activeBlacklistSuggestionIndex - 1 + blacklistSuggestions.length) % blacklistSuggestions.length;
    renderBlacklistSuggestions();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (blacklistSuggestions[activeBlacklistSuggestionIndex]) {
      addBlacklistDraftTag(blacklistSuggestions[activeBlacklistSuggestionIndex]);
    } else if (blacklistTagInput.value.trim()) {
      addRawBlacklistTagFromInput();
    } else {
      addBlacklistRule();
    }
    return;
  }

  if (event.key === "Tab" && blacklistSuggestions[activeBlacklistSuggestionIndex]) {
    event.preventDefault();
    addBlacklistDraftTag(blacklistSuggestions[activeBlacklistSuggestionIndex]);
    return;
  }

  if (event.key === "Backspace" && !blacklistTagInput.value && blacklistDraftTags.length > 0) {
    removeBlacklistDraftTag(blacklistDraftTags[blacklistDraftTags.length - 1].value);
  }
});

blacklistSuggestionsList?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const button = event.target.closest(".suggestion-item");
  if (!button) {
    return;
  }

  addBlacklistDraftTag(blacklistSuggestions[Number(button.dataset.index)]);
});

blacklistSelectedTagsEl?.addEventListener("click", (event) => {
  const chip = event.target.closest(".tag-chip");
  if (chip) {
    removeBlacklistDraftTag(chip.dataset.value);
  }
});

addBlacklistRuleButton?.addEventListener("click", addBlacklistRule);

blacklistList?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".blacklist-delete-button");
  if (deleteButton) {
    removeBlacklistRule(deleteButton.dataset.ruleId);
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

function getPostSource(post) {
  return isDownloadSource(post?.booru_source) ? post.booru_source : activeDownloadSource;
}

function getPostStoreKey(postOrId, source = activeDownloadSource) {
  const id = typeof postOrId === "object" ? getPostId(postOrId) : normalizeFavoriteId(postOrId);
  const resolvedSource = typeof postOrId === "object" ? getPostSource(postOrId) : source;
  return id && isDownloadSource(resolvedSource) ? `${resolvedSource}:${id}` : "";
}

function getPostLabel(post) {
  return `image ${post.id}`;
}

function syncImageCardControls(card, post) {
  const imageId = getPostId(post);
  const imageKey = getPostStoreKey(post);
  const favoriteButton = card.querySelector(".favorite-button");
  const favoriteIcon = card.querySelector(".favorite-icon");
  const selectButton = card.querySelector(".select-button");
  const selectIcon = card.querySelector(".select-button .image-action-icon");
  const downloadedIndicator = card.querySelector(".downloaded-indicator");
  const isLiked = hasFavorite(imageId);
  const isSelected = selectedImages.has(imageKey);
  const isDownloaded = hasDownloadedRecord(post);

  if (favoriteButton && favoriteIcon) {
    favoriteButton.classList.toggle("liked", isLiked);
    favoriteIcon.src = isLiked ? "/icons/heart-filled.svg" : "/icons/heart.svg";
    favoriteButton.setAttribute("aria-pressed", String(isLiked));
    favoriteButton.setAttribute("aria-label", `${isLiked ? "Unmark" : "Mark"} ${getPostLabel(post)} as favorite`);
  }

  if (selectButton && selectIcon) {
    selectButton.classList.toggle("selected", isSelected);
    selectIcon.src = isSelected ? "/icons/square-check.svg" : "/icons/square.svg";
    selectButton.setAttribute("aria-pressed", String(isSelected));
    selectButton.setAttribute("aria-label", `${isSelected ? "Unselect" : "Select"} ${getPostLabel(post)}`);
  }

  if (downloadedIndicator) {
    downloadedIndicator.classList.toggle("downloaded", isDownloaded);
    downloadedIndicator.hidden = !isDownloaded;
    const downloadedLabel = downloadedIndicator.querySelector(".downloaded-label");
    if (downloadedLabel) {
      downloadedLabel.textContent = t("detail.downloaded", "downloaded");
    }
  }
}

function syncImageInstances(postOrId, source = activeDownloadSource) {
  const imageKey = getPostStoreKey(postOrId, source);
  document.querySelectorAll(".image-card").forEach((card) => {
    if (card.dataset.imageKey === imageKey) {
      const post = imageStore.get(imageKey);
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
  const selectedKeys = [...selectedImages];
  selectedImages.clear();
  selectedKeys.forEach((imageKey) => {
    const post = imageStore.get(imageKey);
    if (post) {
      syncImageInstances(post);
    }
  });
  updateSelectionActions();
}

async function downloadSelectedOriginals() {
  const selectedKeys = [...selectedImages];
  if (selectedKeys.length === 0) {
    return;
  }

  const queuedDownloads = selectedKeys
    .map((imageKey) => imageStore.get(imageKey))
    .filter((post) => post?.file_url)
    .map((post) => ({
      post,
      task: createDownloadTask(post),
    }));

  if (downloadSelectionButton) {
    downloadSelectionButton.disabled = true;
  }

  clearSelectedImages();

  for (const [index, item] of queuedDownloads.entries()) {
    if (index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    await downloadOriginal(item.post, item.task);
  }
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function showShareCopiedState(button, post) {
  button.classList.add("copied");
  button.setAttribute("aria-label", `Original link copied for ${getPostLabel(post)}`);
  window.setTimeout(() => {
    button.classList.remove("copied");
    button.setAttribute("aria-label", `Copy original link for ${getPostLabel(post)}`);
  }, 1200);
}

function showToast(message) {
  if (!toast) {
    return;
  }

  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toast.textContent = "";
    }, 180);
  }, 1400);
}

function getFavoriteExportAccountLabel() {
  const account = getActiveAccount();
  return account?.username || "No account";
}

function getSafeFileSegment(value) {
  return String(value || "favorites").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "favorites";
}

function exportCurrentFavorites() {
  const postIds = getCurrentFavoriteIds();
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    account: getFavoriteExportAccountLabel(),
    post_ids: postIds,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const accountSegment = getFavoriteAccountId() === guestFavoriteAccountId ? "no-account" : getSafeFileSegment(getFavoriteExportAccountLabel());
  link.download = `danbooru-favorites-${accountSegment}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
  setFavoritesStatus(t("favorites.exported", "{count} favorite IDs exported.", { count: postIds.length }));
}

function getFavoriteIdsFromImport(payload) {
  if (Array.isArray(payload)) {
    return normalizeFavoriteIds(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.post_ids)) {
    return normalizeFavoriteIds(payload.post_ids);
  }

  if (Array.isArray(payload.postIds)) {
    return normalizeFavoriteIds(payload.postIds);
  }

  if (payload.favorites_by_account && typeof payload.favorites_by_account === "object") {
    return normalizeFavoriteIds(Object.values(payload.favorites_by_account).flat());
  }

  return [];
}

async function importFavoritesFile(file) {
  if (!file) {
    return;
  }

  try {
    const payload = JSON.parse(await file.text());
    const importedIds = getFavoriteIdsFromImport(payload);
    if (importedIds.length === 0) {
      throw new Error(t("favorites.importNoIds", "No favorite IDs found in this file."));
    }

    const accountId = getFavoriteAccountId();
    const previousIds = ensureFavoriteBucket(accountId);
    const mergedIds = normalizeFavoriteIds([...previousIds, ...importedIds]);
    favoritesByAccount[accountId] = mergedIds;
    saveFavoriteSettings();
    syncAllImageCards();
    renderFavorites();
    updateMergeGuestFavoritesAction();
    setFavoritesStatus(t("favorites.imported", "{count} new favorite IDs imported.", { count: mergedIds.length - previousIds.length }));
  } catch (error) {
    setFavoritesStatus(t("favorites.importFailed", "Import failed: {message}", { message: error.message }));
  } finally {
    if (favoritesFileInput) {
      favoritesFileInput.value = "";
    }
  }
}

async function addAccount() {
  const username = accountUsernameInput?.value.trim() || "";
  const apiKey = accountApiKeyInput?.value.trim() || "";

  if (!username || !apiKey) {
    setAccountStatus(t("account.usernameApiKeyRequired", "Username and API key are required."), "error");
    return;
  }

  if (savedAccounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
    setAccountStatus(t("account.alreadyAdded", "This account has already been added."), "error");
    return;
  }

  addAccountButton.disabled = true;
  setAccountStatus(t("account.verifying", "Verifying account..."));

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
        throw new Error(t("account.accessDenied", "API key access denied. Enable post read permissions for this key in Danbooru account settings."));
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
    updateMergeGuestFavoritesAction();
    let mergedGuestCount = 0;
    if (ensureFavoriteBucket(guestFavoriteAccountId).length > 0) {
      mergedGuestCount = mergeGuestFavoritesToActiveAccount({ confirm: true });
    }
    if (mergedGuestCount === 0) {
      setAccountStatus(t("account.added", "Account added."), "success");
    }
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

  if (!window.confirm(t("account.removeConfirm", "Remove account \"{username}\"?", { username: account.username }))) {
    return;
  }

  savedAccounts = savedAccounts.filter((item) => item.id !== accountId);
  delete favoritesByAccount[accountId];
  if (activeAccountId === accountId) {
    activeAccountId = "";
  }
  saveAccountSettings();
  saveFavoriteSettings();
  renderAccounts();
  syncAllImageCards();
  updateMergeGuestFavoritesAction();
  setAccountStatus(t("account.removed", "Account removed."), "success");
  submitSearch(getSearchQuery(true), true);
}

function createImageCard(post) {
  const imageId = getPostId(post);
  const imageKey = getPostStoreKey(post);
  imageStore.set(imageKey, post);

  const card = document.createElement("article");
  card.className = "image-card";
  card.dataset.imageId = imageId;
  card.dataset.imageKey = imageKey;
  card.dataset.imageSource = getPostSource(post);

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
      delete card.dataset.previewError;
    }, (error) => {
      card.dataset.previewError = getImageLoadErrorMessage(error, "preview");
      card.classList.add("thumbnail-load-failed");
    });
    card.append(thumbnail);
  } else {
    card.dataset.previewError = getImageLoadErrorMessage(null, "preview");
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
  shareButton.disabled = !post.file_url;
  shareButton.setAttribute("aria-label", `Copy original link for ${getPostLabel(post)}`);

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

  const downloadedIndicator = document.createElement("div");
  downloadedIndicator.className = "image-action-button downloaded-indicator";
  downloadedIndicator.hidden = true;
  downloadedIndicator.setAttribute("aria-label", `${getPostLabel(post)} downloaded`);

  const downloadedIcon = document.createElement("span");
  downloadedIcon.className = "action-icon icon-download";
  downloadedIcon.setAttribute("aria-hidden", "true");

  const downloadedLabel = document.createElement("span");
  downloadedLabel.className = "downloaded-label";
  downloadedLabel.textContent = t("detail.downloaded", "downloaded");
  downloadedIndicator.append(downloadedIcon, downloadedLabel);

  overlayActions.append(favoriteButton, shareButton, selectButton, downloadedIndicator);
  card.append(overlayActions);

  favoriteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isLiked = !toggleFavorite(imageId);

    favoriteButton.classList.toggle("liked", !isLiked);
    favoriteIcon.src = isLiked ? "/icons/heart.svg" : "/icons/heart-filled.svg";
    favoriteButton.setAttribute("aria-pressed", String(!isLiked));
    favoriteButton.setAttribute("aria-label", `${isLiked ? "Mark" : "Unmark"} ${getPostLabel(post)} as favorite`);
    if (isLiked) {
      favoriteButton.blur();
    }
    syncImageInstances(post);
    renderFavorites();
  });
  favoriteButton.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  shareButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const copied = await copyTextToClipboard(post.file_url);
      if (!copied) {
        throw new Error("Clipboard copy was blocked.");
      }
      showShareCopiedState(shareButton, post);
      showToast(t("toast.copied", "Copied"));
    } catch (error) {
      console.warn("Failed to copy original link.", error);
      shareButton.setAttribute("aria-label", `Could not copy original link for ${getPostLabel(post)}`);
    }
  });
  shareButton.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });
  selectButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isSelected = selectedImages.has(imageKey);
    if (isSelected) {
      selectedImages.delete(imageKey);
    } else {
      selectedImages.add(imageKey);
    }

    selectButton.classList.toggle("selected", !isSelected);
    selectIcon.src = isSelected ? "/icons/square.svg" : "/icons/square-check.svg";
    selectButton.setAttribute("aria-pressed", String(!isSelected));
    selectButton.setAttribute("aria-label", `${isSelected ? "Select" : "Unselect"} ${getPostLabel(post)}`);
    if (isSelected) {
      selectButton.blur();
    }
    syncImageInstances(post);
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
  return body
    .map((post) => ({ ...post, booru_source: post?.booru_source || payload?.source || activeDownloadSource }))
    .filter((post) => post?.id && post.preview_file_url);
}

async function loadPostPage() {
  if (!searchResults || isLoadingPosts || !hasMorePosts) {
    return false;
  }

  isLoadingPosts = true;
  const requestId = postRequestId;
  const nextPage = activeSearchPage + 1;
  setSearchStatus(nextPage === 1
    ? t("searchStatus.loadingImages", "Loading images...")
    : t("searchStatus.loadingMore", "Loading more images..."));

  const params = new URLSearchParams({
    tags: activeSearchTags,
    limit: String(postsPerPage),
    page: String(nextPage),
    source: activeDownloadSource,
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
    const visiblePosts = filterBlockedPosts(posts);

    if (visiblePosts.length > 0) {
      posts.forEach((post) => imageStore.set(getPostStoreKey(post), post));
      appendPostPage(searchResults, visiblePosts, nextPage);
    }

    activeSearchPage = nextPage;
    hasMorePosts = rawPosts.length >= postsPerPage;

    if (activeSearchPage === 1 && visiblePosts.length === 0) {
      setSearchStatus(t("searchStatus.noImages", "No images found."));
    } else {
      setSearchStatus(hasMorePosts ? "" : t("searchStatus.noMore", "No more images."));
    }
  } catch (error) {
    if (requestId === postRequestId) {
      setSearchStatus(t("searchStatus.requestFailed", "Request failed: {message}", { message: error.message }));
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
  divider.dataset.pageNumber = String(pageNumber);
  divider.setAttribute("aria-label", `End of page ${pageNumber}`);

  const label = document.createElement("span");
  label.textContent = t("page.divider", "Page {page}", { page: pageNumber });
  divider.append(label);
  return divider;
}

function updatePageDividers() {
  document.querySelectorAll(".page-divider").forEach((divider) => {
    const pageNumber = divider.dataset.pageNumber;
    const label = divider.querySelector("span");
    if (label && pageNumber) {
      label.textContent = t("page.divider", "Page {page}", { page: pageNumber });
    }
  });
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

async function loadFavoritePost(imageId, source = activeDownloadSource) {
  const imageKey = getPostStoreKey(imageId, source);
  const cached = imageStore.get(imageKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ source });
  const response = await fetch(`/api/posts/${encodeURIComponent(imageId)}?${params}`, {
    headers: getDanbooruAuthHeaders(source),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
  }

  if (payload.body?.id) {
    const post = { ...payload.body, booru_source: payload.body.booru_source || payload.source || source };
    imageStore.set(getPostStoreKey(post), post);
    return post;
  }

  return null;
}

async function renderFavorites() {
  if (!favoritesStream || !favoritesEmpty) {
    return;
  }

  const requestId = favoriteRenderRequestId + 1;
  favoriteRenderRequestId = requestId;
  favoritesStream.innerHTML = "";
  const favoriteIds = getCurrentFavoriteIds();
  setFavoritesEmptyMessage();
  favoritesEmpty.hidden = favoriteIds.length > 0;
  setFavoritesStatus("");

  if (favoriteIds.length === 0) {
    return;
  }

  setFavoritesStatus(t("favorites.loading", "Loading favorites..."));
  const favoritePosts = [];
  let failedCount = 0;

  for (const imageId of favoriteIds) {
    try {
      const post = await loadFavoritePost(imageId);
      if (post) {
        favoritePosts.push(post);
      }
    } catch (error) {
      console.warn(`Failed to load favorite ${imageId}.`, error);
      failedCount += 1;
    }

    if (requestId !== favoriteRenderRequestId) {
      return;
    }
  }

  favoritesStream.innerHTML = "";
  const visibleFavoritePosts = filterBlockedPosts(favoritePosts);
  setFavoritesEmptyMessage(
    favoritePosts.length > 0 && visibleFavoritePosts.length === 0
      ? "favorites.hiddenByBlacklist"
      : "favorites.empty",
    favoritePosts.length > 0 && visibleFavoritePosts.length === 0
      ? "Favorite images are hidden by blacklist rules."
      : "No favorite images yet.",
  );
  favoritesEmpty.hidden = visibleFavoritePosts.length > 0;
  if (visibleFavoritePosts.length > 0) {
    appendPostPage(favoritesStream, visibleFavoritePosts, 1);
  }

  setFavoritesStatus(failedCount > 0 ? t("favorites.failedCount", "{count} favorites could not be loaded.", { count: failedCount }) : "");
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

async function initializeApp() {
  loadThemeSetting();
  await setupSystemThemeSync();
  setupDownloadProgressSync();
  loadLanguageSetting();
  loadImageSettings();
  loadAccountSettings();
  loadFavoriteSettings();
  loadDownloadedRecords();
  loadBlacklistSettings();
  renderThemeSettings();
  renderLoadingSettings();
  renderLanguageSettings();
  renderBlacklistDraftTags();
  renderBlacklistRules();
  updateMergeGuestFavoritesAction();
  await loadLanguage();
  await loadNetworkSettings();
  await loadDownloadDirectory();
  showPage("search");
  updateSelectionActions();
  setupInfiniteScroll();
  const restoredSearch = restoreSearchSession();
  startPostSearch(restoredSearch.query).then(() => {
    restoreLoadedPages(restoredSearch.loadedPage, restoredSearch.scrollY);
  });
}

initializeApp();
