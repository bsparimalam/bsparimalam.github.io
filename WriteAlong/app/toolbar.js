/**
 * Accessible Menu Bar + Formatting Toolbar Controller
 */

export function setupMenusAndToolbar(dispatchAction) {
  const menuItems = Array.from(document.querySelectorAll('.wa-menu-item'));
  let openMenu = null;

  function closeAllMenus() {
    for (const item of menuItems) {
      item.classList.remove('open');
      const trig = item.querySelector('.wa-menu-trigger');
      if (trig) trig.setAttribute('aria-expanded', 'false');
    }
    openMenu = null;
  }

  function openMenuItem(item) {
    closeAllMenus();
    item.classList.add('open');
    const trig = item.querySelector('.wa-menu-trigger');
    if (trig) trig.setAttribute('aria-expanded', 'true');
    openMenu = item;
  }

  for (const item of menuItems) {
    const trigger = item.querySelector('.wa-menu-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openMenu === item) {
        closeAllMenus();
      } else {
        openMenuItem(item);
      }
    });

    trigger.addEventListener('mouseenter', () => {
      if (openMenu && openMenu !== item) {
        openMenuItem(item);
      }
    });

    // Keyboard navigation on menu triggers
    trigger.addEventListener('keydown', (e) => {
      const idx = menuItems.indexOf(item);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = menuItems[(idx + 1) % menuItems.length];
        next.querySelector('.wa-menu-trigger').focus();
        if (openMenu) openMenuItem(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = menuItems[(idx - 1 + menuItems.length) % menuItems.length];
        prev.querySelector('.wa-menu-trigger').focus();
        if (openMenu) openMenuItem(prev);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMenuItem(item);
        const firstBtn = item.querySelector('.wa-menu-dropdown button:not(:disabled)');
        firstBtn?.focus();
      } else if (e.key === 'Escape') {
        closeAllMenus();
      }
    });

    const dropdown = item.querySelector('.wa-menu-dropdown');
    dropdown.addEventListener('keydown', (e) => {
      const buttons = Array.from(dropdown.querySelectorAll('button:not(:disabled)'));
      const cur = buttons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        buttons[(cur + 1) % buttons.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        buttons[(cur - 1 + buttons.length) % buttons.length]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAllMenus();
        trigger.focus();
      }
    });
  }

  document.addEventListener('click', () => closeAllMenus());

  // Delegate all [data-action] buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.getAttribute('data-action');
    closeAllMenus();
    dispatchAction(action);
  });

  // Block style dropdown in toolbar
  const styleSelect = document.getElementById('tb-block-style');
  styleSelect?.addEventListener('change', () => {
    dispatchAction(`format:${styleSelect.value}`);
  });

  return { closeAllMenus };
}
