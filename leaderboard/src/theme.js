/* The nav's icon-only theme toggle: System, then Light, then Dark; its aria-label and title name the state. The choice is saved under fhe-theme (System clears it) and
   applied as data-theme on <html>, which style.css turns into the color-scheme. index.html applies the saved choice
   before first paint. Every colour comes from CSS, so nothing needs re-rendering when the theme changes. */
export const THEMES = ["system", "light", "dark"];
const KEY = "fhe-theme";
const NAMES = { system: "System", light: "Light", dark: "Dark" };
const ICONS = {
  system: '<rect x="2" y="3" width="12" height="8.5" rx="1.2"/><path d="M5.5 14h5M8 11.5V14"/>',
  light: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
  dark: '<path d="M13.2 10.2A5.6 5.6 0 0 1 5.8 2.8a5.6 5.6 0 1 0 7.4 7.4z"/>',
};

export const nextTheme = (t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];

function storage() {
  try { return localStorage; } catch { return null; }
}

export function mountThemeToggle(button, root = document.documentElement, store = storage()) {
  if (!button) return;
  const current = () => (THEMES.includes(root.dataset.theme) ? root.dataset.theme : "system");
  const show = (t) => {
    const label = `Theme: ${NAMES[t]}. Switch to ${NAMES[nextTheme(t)]}`;
    button.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[t]}</svg>`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.dataset.theme = t;
  };
  show(current());
  button.addEventListener("click", () => {
    const t = nextTheme(current());
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    try { if (t === "system") store.removeItem(KEY); else store.setItem(KEY, t); } catch {}
    show(t);
  });
}
