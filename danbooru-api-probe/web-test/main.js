const navButtons = [...document.querySelectorAll("[data-page]")];
const pagePanels = [...document.querySelectorAll("[data-page-panel]")];
const i18nNodes = [...document.querySelectorAll("[data-i18n]")];

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

    document.title = dictionary.app?.title || document.title;
  } catch (error) {
    console.warn("Failed to load language file.", error);
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

loadLanguage();
showPage("search");
