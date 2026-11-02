/* Kunduzgi / tungi rejim. Tanlov saqlanadi; birinchi marta tizim sozlamasi olinadi. */
const KEY = 'oila-reestri-theme';

export function getTheme() {
  try { const t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark') return t; } catch { /* xotira yopiq */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#1B1830' : '#EEE9FB');
}

export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* xotira yopiq */ }
  applyTheme(t);
}
