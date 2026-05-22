export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'loan-repayments-theme';

const listeners = new Set<(theme: Theme) => void>();

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredTheme(): Theme | 'system' {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function resolveTheme(preference: Theme | 'system'): Theme {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  listeners.forEach((fn) => fn(theme));
}

export function setThemePreference(preference: Theme | 'system'): void {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  applyTheme(resolveTheme(preference));
  syncThemeToggle(preference);
}

export function cycleThemePreference(): Theme | 'system' {
  const current = getStoredTheme();
  const next: Theme | 'system' =
    current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  setThemePreference(next);
  return next;
}

export function onThemeChange(fn: (theme: Theme) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function syncThemeToggle(preference: Theme | 'system'): void {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const labels: Record<Theme | 'system', string> = {
    light: 'Mod luminos',
    dark: 'Mod întunecat',
    system: 'Temă sistem',
  };
  btn.setAttribute('aria-label', labels[preference]);
  btn.title = labels[preference];
  btn.textContent =
    preference === 'dark' ? '☀' : preference === 'light' ? '☾' : '◐';
}

/** Call before app render; respects saved preference or system default */
export function initTheme(): void {
  const preference = getStoredTheme();
  applyTheme(resolveTheme(preference));
  syncThemeToggle(preference);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme(resolveTheme('system'));
  });
}

export function bindThemeToggle(): void {
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    cycleThemePreference();
  });
}
