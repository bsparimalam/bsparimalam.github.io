// Small DOM helpers shared by the UI modules.

/** Hyperscript: h('button.btn.primary', {onclick}, 'Save') */
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props != null && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = {};
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'innerHTML') el.innerHTML = v; // callers pass pre-escaped markup only
    else if (k in el && typeof v !== 'string') el[k] = v;
    else if (k === 'value' || k === 'checked' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** replaceChildren that skips null/false entries. */
export function fill(el, ...children) {
  el.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

export function icon(name, cls = '') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  if (cls) svg.setAttribute('class', cls);
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `icons/sprite.svg#${name}`);
  svg.append(use);
  return svg;
}

export function toast(message, { error = false, action, actionLabel, timeout = error ? 9000 : 4000 } = {}) {
  const el = h('div.toast' + (error ? '.error' : ''), h('span', message));
  if (action) {
    el.append(h('button', { onclick: () => { action(); el.remove(); } }, actionLabel || 'OK'));
  }
  document.getElementById('toasts').append(el);
  if (timeout) setTimeout(() => el.remove(), timeout);
  return el;
}

const dialog = () => document.getElementById('dialog');

/**
 * Shows the shared <dialog>. `build(close)` returns the content node.
 * Resolves with whatever is passed to close().
 */
export function openDialog(title, build, { wide = false } = {}) {
  const dlg = dialog();
  if (dlg.open) dlg.close();
  return new Promise((resolve) => {
    let result;
    const close = (value) => { result = value; dlg.close(); };
    const content = build(close);
    dlg.className = 'dialog' + (wide ? ' wide' : '');
    dlg.replaceChildren(h('div.dlg',
      h('div.dlg-head', h('h2', title), h('button.icon-btn', { type: 'button', title: 'Close', onclick: () => close() }, icon('x'))),
      content));
    dlg.addEventListener('close', () => resolve(result), { once: true });
    dlg.showModal();
    dlg.querySelector('[autofocus], input, select, textarea, .btn.primary')?.focus();
  });
}

export function closeDialog() {
  if (dialog().open) dialog().close();
}

export function promptDialog(title, { label, value = '', placeholder = '', okLabel = 'OK', type = 'text' } = {}) {
  return openDialog(title, (close) => {
    const input = h('input', { value, placeholder, type, autofocus: true });
    const form = h('form', { onsubmit: (e) => { e.preventDefault(); close(input.value); } },
      h('div.dlg-body', h('label.field', h('span', label || ''), input)),
      h('div.dlg-foot', h('button.btn', { type: 'button', onclick: () => close(null) }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, okLabel)));
    setTimeout(() => input.select(), 0);
    return form;
  });
}

export function confirmDialog(title, message, { okLabel = 'OK', danger = false, cancelLabel = 'Cancel', extra } = {}) {
  return openDialog(title, (close) => h('div',
    h('div.dlg-body', h('p', message)),
    h('div.dlg-foot',
      extra ? h('button.btn', { type: 'button', onclick: () => close('extra') }, extra) : null,
      h('button.btn', { type: 'button', onclick: () => close(false) }, cancelLabel),
      h('button.btn' + (danger ? '.danger' : '.primary'), { type: 'button', onclick: () => close(true) }, okLabel))));
}

/* ------------------------------------------------------------------ menus */

let menuCleanup = null;

export function closeMenu() {
  menuCleanup?.();
  menuCleanup = null;
}

/**
 * items: [{label, icon, shortcut, action, checked, disabled}] | '-' | {heading}
 */
export function showMenu(anchor, items, { onClose } = {}) {
  closeMenu();
  const layer = document.getElementById('menu-layer');
  const menu = h('div.menu', { role: 'menu' });
  for (const it of items) {
    if (!it) continue;
    if (it === '-') { menu.append(h('hr')); continue; }
    if (it.heading) { menu.append(h('div.menu-label', it.heading)); continue; }
    menu.append(h('button' + (it.checked ? '.checked' : ''), {
      role: 'menuitem', disabled: it.disabled,
      onclick: () => { closeMenu(); it.action?.(); },
    }, it.icon ? icon(it.icon) : h('span', { style: { width: '16px' } }), h('span', it.label), it.shortcut ? h('span.shortcut', it.shortcut) : null));
  }
  layer.hidden = false;
  layer.replaceChildren(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  menu.style.left = Math.max(6, Math.min(r.left, innerWidth - mw - 6)) + 'px';
  menu.style.top = (r.bottom + mh + 4 > innerHeight ? Math.max(6, r.top - mh - 4) : r.bottom + 4) + 'px';
  anchor.classList.add('open');
  const onDown = (e) => { if (!menu.contains(e.target)) closeMenu(); };
  const onKey = (e) => {
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const btns = [...menu.querySelectorAll('button:not(:disabled)')];
      const i = btns.indexOf(document.activeElement);
      btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]?.focus();
    }
  };
  layer.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey);
  menuCleanup = () => {
    layer.hidden = true;
    layer.replaceChildren();
    anchor.classList.remove('open');
    layer.removeEventListener('pointerdown', onDown);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  menu.querySelector('button')?.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ popover */

const pop = () => document.getElementById('popover');

export function showPopover(rect, content) {
  const el = pop();
  el.replaceChildren(content);
  el.hidden = false;
  const w = el.offsetWidth;
  const hgt = el.offsetHeight;
  let top = rect.bottom + 8;
  if (top + hgt > innerHeight - 8) top = Math.max(8, rect.top - hgt - 8);
  el.style.left = Math.max(8, Math.min(rect.left, innerWidth - w - 8)) + 'px';
  el.style.top = top + 'px';
}

export function hidePopover() {
  pop().hidden = true;
}

export function popoverOpen() {
  return !pop().hidden;
}
