// UI for broad AI edits: "Rewrite document" (AI panel) and "Restyle with AI" (Style panel),
// plus the review bar and change viewer shared by both.
import { h, fill, icon, toast, openDialog, confirmDialog } from './dom.js';
import { resolveProvider, isLocalProvider } from '../proof/llm.js';
import { rewriteDocument, restyle, chunkMarkdown, chunkLimit } from '../ai-edit.js';
import { markdownDiff } from '../diff.js';

const REWRITE_PRESETS = [
  'Make the tone more formal and professional',
  'Rewrite in plain English for a general audience',
  'Shorten by about half, keeping the key points',
  'Fix spelling, grammar and punctuation only',
  'Turn it into concise bullet-point notes under the same headings',
  'Make it more persuasive',
  'Translate into Spanish',
];

const STYLE_PRESETS = [
  'Modern and airy: sans-serif headings, generous spacing',
  'Classic academic look with a serif typeface',
  'Larger text and line spacing for easy reading',
  'Compact: fit more on each page',
  'Navy headings with a thin accent rule under each section',
  'Warm, elegant book feel with an off-white page',
];

const wordCount = (md) => (md.match(/[\p{L}\p{N}]+/gu) || []).length;

/** Shows the floating "AI changes applied" bar. */
export function createReviewBar(el) {
  let current = null;
  const hide = () => { el.hidden = true; current = null; };
  return {
    show({ text, onKeep, onRevert, onReview }) {
      current = { onKeep, onRevert };
      fill(el,
        icon('sparkles'),
        h('span.review-text', text),
        onReview ? h('button.btn.small', { type: 'button', onclick: onReview }, icon('eye'), 'Review changes') : null,
        h('button.btn.small.primary', { type: 'button', onclick: () => { onKeep?.(); hide(); } }, icon('check'), 'Keep'),
        h('button.btn.small', { type: 'button', onclick: async () => { if ((await onRevert?.()) !== false) hide(); } }, icon('undo-2'), 'Revert'));
      el.hidden = false;
    },
    keep() { current?.onKeep?.(); hide(); },
    hide,
    get open() { return !el.hidden; },
  };
}

/** Dialog listing what changed between two texts (markdown or CSS). */
export function showChanges(title, before, after, { onKeep, onRevert, warnings = [] } = {}) {
  const parts = markdownDiff(before, after);
  const changed = parts.filter((p) => p.type !== 'same').length;
  return openDialog(title, (close) => h('div',
    h('div.dlg-body',
      h('p.help', { style: { marginTop: 0 } }, `${changed} block${changed === 1 ? '' : 's'} changed · ${wordCount(before).toLocaleString()} → ${wordCount(after).toLocaleString()} words`),
      warnings.map((w) => h('p.warning', w)),
      h('div.diff', parts.map((p) => (p.type === 'same'
        ? h('div.diff-same', p.count > 1 ? `⋯ ${p.count} unchanged blocks ⋯` : '⋯ 1 unchanged block ⋯')
        : h('div.diff-block.' + p.type, { innerHTML: p.html }))))),
    h('div.dlg-foot',
      h('button.btn', { type: 'button', onclick: () => { close(); onRevert?.(); } }, icon('undo-2'), 'Revert'),
      h('button.btn.primary', { type: 'button', onclick: () => { close(); onKeep?.(); } }, icon('check'), 'Keep changes'))), { wide: true });
}

function presetChips(presets, onPick) {
  return h('div.chips', presets.map((p) => h('button.chip', { type: 'button', title: p, onclick: () => onPick(p) }, p.length > 34 ? p.slice(0, 32) + '…' : p)));
}

function progressBox() {
  const label = h('div.ai-progress-label');
  const bar = h('div.progress', h('i'));
  const live = h('div.ai-live');
  const box = h('div.ai-progress', { hidden: true }, label, bar, live);
  return {
    box,
    start(text) { box.hidden = false; label.textContent = text; bar.firstChild.style.width = '3%'; live.textContent = ''; },
    step(text, frac) { label.textContent = text; bar.firstChild.style.width = `${Math.max(3, Math.round(frac * 100))}%`; },
    live(text) { live.textContent = text.slice(-600); live.scrollTop = live.scrollHeight; },
    done() { box.hidden = true; },
  };
}

/* ------------------------------------------------------------------ rewrite document */

export function initAiRewrite({ root, getSettings, openSettings, getMarkdown, replaceMarkdown, review }) {
  const input = h('textarea.custom-prompt', { placeholder: 'How should the whole document change? e.g. “Make it suitable for a board meeting: formal, shorter, with a summary at the top”' });
  const prog = progressBox();
  const runBtn = h('button.btn.small.primary', { type: 'button' }, icon('wand-sparkles'), 'Rewrite document');
  const note = h('p.help');
  let ctrl = null;

  const updateNote = () => {
    const s = getSettings();
    const p = resolveProvider(s.provider, s.providers);
    const parts = chunkMarkdown(getMarkdown(), chunkLimit(p)).length;
    const local = isLocalProvider(p) || p.kind === 'chrome';
    note.textContent = `Uses ${p.label}${parts > 1 ? `, in ${parts} parts (section by section)` : ''}.${local ? ' The title block is left unchanged with on-device and local models.' : ''} You can review every change before keeping it.`;
  };

  async function run() {
    if (ctrl) { ctrl.abort(); return; }
    const instruction = input.value.trim();
    if (!instruction) { input.focus(); toast('Describe how the document should change.'); return; }
    const s = getSettings();
    const p = resolveProvider(s.provider, s.providers);
    const before = getMarkdown();
    if (!before.trim()) { toast('The document is empty.'); return; }
    review.keep();
    ctrl = new AbortController();
    fill(runBtn, icon('loader-circle', 'spin'), 'Stop');
    prog.start('Starting…');
    try {
      const { md, warnings } = await rewriteDocument(p, before, instruction, {
        lang: s.lang, signal: ctrl.signal,
        onProgress: (i, n) => prog.step(i < n ? `Rewriting part ${i + 1} of ${n}…` : 'Finishing…', i / n),
        onToken: (i, t) => prog.live(t),
      });
      if (getMarkdown() !== before) {
        const ok = await confirmDialog('Document changed', 'You edited the document while the AI was working. Replace it with the AI version anyway? Your recent edits would be lost (you can still revert to them).', { okLabel: 'Replace' });
        if (!ok) return;
      }
      const current = getMarkdown();
      replaceMarkdown(md);
      const after = getMarkdown(); // as the editor serialises it, so "edited since?" checks are exact
      const revert = async () => {
        if (getMarkdown() !== after) {
          const ok = await confirmDialog('Revert AI rewrite?', 'You have edited the document since the rewrite. Reverting restores the version from before the rewrite and discards those edits.', { okLabel: 'Revert', danger: true });
          if (!ok) return false;
        }
        replaceMarkdown(current);
        toast('Reverted to the version before the rewrite.');
        return true;
      };
      const reviewIt = () => showChanges('Review AI rewrite', current, getMarkdown(), { warnings, onKeep: () => review.keep(), onRevert: () => revert().then((ok) => ok && review.hide()) });
      review.show({ text: `AI rewrite applied — ${wordCount(current).toLocaleString()} → ${wordCount(md).toLocaleString()} words.${warnings.length ? ' ⚠ ' + warnings[0] : ''}`, onReview: reviewIt, onRevert: revert });
      if (warnings.length) toast(warnings.join(' '), { timeout: 9000 });
    } catch (err) {
      if (err.name !== 'AbortError') toast(err.message, { error: true, action: () => openSettings('ai'), actionLabel: 'Settings' });
    } finally {
      ctrl = null;
      prog.done();
      fill(runBtn, icon('wand-sparkles'), 'Rewrite document');
    }
  }
  runBtn.addEventListener('click', run);

  fill(root,
    h('h3', 'Rewrite whole document'),
    presetChips(REWRITE_PRESETS, (p) => { input.value = p; input.focus(); }),
    input,
    h('div.btn-row', { style: { marginTop: '6px' } }, runBtn),
    note,
    prog.box);
  updateNote();
  return { refresh: updateNote };
}

/* ------------------------------------------------------------------ restyle */

export function initAiStyle({ root, getSettings, openSettings, getCss, setCss, review, getPageBackground }) {
  const input = h('textarea.custom-prompt', { placeholder: 'Describe the look you want, e.g. “a crisp corporate look with a teal accent and sans-serif headings”' });
  const mode = h('select', h('option', { value: 'adjust' }, 'Adjust current style'), h('option', { value: 'redesign' }, 'Redesign from scratch'));
  const runBtn = h('button.btn.small.primary', { type: 'button' }, icon('palette'), 'Restyle');
  const prog = progressBox();
  let ctrl = null;

  async function run() {
    if (ctrl) { ctrl.abort(); return; }
    const instruction = input.value.trim();
    if (!instruction) { input.focus(); toast('Describe the style you want.'); return; }
    const s = getSettings();
    const p = resolveProvider(s.provider, s.providers);
    review.keep();
    const before = getCss();
    ctrl = new AbortController();
    fill(runBtn, icon('loader-circle', 'spin'), 'Stop');
    prog.start(`Designing with ${p.label}…`);
    try {
      const { css } = await restyle(p, before, instruction, mode.value, { signal: ctrl.signal, lang: s.lang, onToken: (t) => prog.live(t), pageBackground: getPageBackground?.() });
      setCss(css);
      const revert = () => { setCss(before); toast('Style reverted.'); return true; };
      review.show({
        text: mode.value === 'redesign' ? 'AI redesign applied to template.css.' : 'AI style changes applied to template.css.',
        onReview: () => showChanges('Review stylesheet changes', before, getCss(), { onKeep: () => review.keep(), onRevert: () => { revert(); review.hide(); } }),
        onRevert: revert,
      });
    } catch (err) {
      if (err.name !== 'AbortError') toast(err.message, { error: true, action: () => openSettings('ai'), actionLabel: 'Settings' });
    } finally {
      ctrl = null;
      prog.done();
      fill(runBtn, icon('palette'), 'Restyle');
    }
  }
  runBtn.addEventListener('click', run);

  fill(root,
    h('h3', 'Restyle with AI'),
    presetChips(STYLE_PRESETS, (p) => { input.value = p; input.focus(); }),
    input,
    h('div.btn-row', { style: { marginTop: '6px' } }, mode, runBtn),
    h('p.help', 'The model edits template.css; the page updates immediately so you can judge it, then keep or revert. With on-device and local models, “Adjust” picks fonts, sizes, colours and spacing; cloud models can rewrite any rule or redesign from scratch.'),
    prog.box);
}
