/**
 * Theme management: prefers-color-scheme + manual override in localStorage.
 */

const STORAGE_KEY = 'wa-theme-override'; // 'auto' | 'light' | 'dark'

export function createThemeController(onChange) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  let override = localStorage.getItem(STORAGE_KEY) || 'auto';

  function resolveTheme() {
    if (override === 'dark') return 'dark';
    if (override === 'light') return 'light';
    return mql.matches ? 'dark' : 'light';
  }

  function apply() {
    const resolved = resolveTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    if (typeof onChange === 'function') {
      onChange(resolved, override);
    }
  }

  function setOverride(next) {
    override = next;
    localStorage.setItem(STORAGE_KEY, override);
    apply();
  }

  function cycle() {
    const order = ['auto', 'light', 'dark'];
    const idx = (order.indexOf(override) + 1) % order.length;
    setOverride(order[idx]);
    return override;
  }

  mql.addEventListener('change', () => {
    if (override === 'auto') apply();
  });

  apply();
  return {
    getOverride: () => override,
    getResolved: resolveTheme,
    setOverride,
    cycle,
  };
}
