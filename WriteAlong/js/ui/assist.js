// AI writing assistant panel: rewrite, expand, summarise, continue, or run a custom instruction on the
// selection / current paragraph, with any configured provider (on-device, local server or cloud).
import { h, fill, icon, toast } from './dom.js';
import { PROVIDERS, resolveProvider, chat, isLocalProvider, checkProvider } from '../proof/llm.js';
import { chromeAvailability, chromeRewrite, chromeWrite, chromeSummarize } from '../proof/chrome-ai.js';
import { cleanHtmlViaMarkdown, markdownToPlainText } from '../markdown.js';

const SYSTEM = `You are a writing assistant inside a word processor. Return only the requested text in Markdown —
no preamble, no explanations, no surrounding quotes or code fences. Preserve the author's language, voice and any Markdown formatting.`;

const ACTIONS = [
  { id: 'improve', label: 'Improve writing', icon: 'wand-sparkles', chrome: { api: 'Rewriter' },
    prompt: 'Improve the clarity, flow and word choice of this text. Keep the meaning, tone and approximate length.' },
  { id: 'fix', label: 'Fix grammar', icon: 'spell-check',
    prompt: 'Correct spelling, grammar and punctuation in this text. Change nothing else.' },
  { id: 'shorter', label: 'Make shorter', icon: 'minus', chrome: { api: 'Rewriter', length: 'shorter' },
    prompt: 'Make this text noticeably more concise without losing important information.' },
  { id: 'longer', label: 'Expand', icon: 'plus', chrome: { api: 'Rewriter', length: 'longer' },
    prompt: 'Expand this text with more detail, examples or explanation, in the same voice.' },
  { id: 'formal', label: 'More formal', icon: 'book-open', chrome: { api: 'Rewriter', tone: 'more-formal' },
    prompt: 'Rewrite this text in a more formal, professional tone.' },
  { id: 'casual', label: 'More casual', icon: 'type', chrome: { api: 'Rewriter', tone: 'more-casual' },
    prompt: 'Rewrite this text in a friendlier, more conversational tone.' },
  { id: 'simplify', label: 'Simplify', icon: 'eye',
    prompt: 'Rewrite this text in plain language with short sentences that anyone can follow.' },
  { id: 'continue', label: 'Continue writing', icon: 'pencil', scope: 'before', insert: 'after', chrome: { api: 'Writer' },
    prompt: 'Continue writing from where this text ends. Write one or two paragraphs that follow naturally. Return only the new text.' },
  { id: 'summarize', label: 'Summarise document', icon: 'list', scope: 'document', insert: 'after', chrome: { api: 'Summarizer' },
    prompt: 'Summarise this document as a short list of key points.' },
  { id: 'titles', label: 'Suggest titles', icon: 'heading', scope: 'document', insert: 'none',
    prompt: 'Suggest five strong, concise titles for this document, as a Markdown bullet list.' },
];

export function initAssist({ root, editor, getSettings, saveSettings, openSettings }) {
  let ctrl = null;
  let target = null; // { range, block, scope }
  let output = '';
  let lastAction = null;

  const out = h('div.ai-output');
  const custom = h('textarea.custom-prompt', { placeholder: 'Custom instruction, e.g. “Translate to French” or “Turn this into a table”' });
  const targetNote = h('div.target-note');
  const resultBtns = h('div.btn-row');
  const providerSel = h('select', { onchange: () => { getSettings().provider = providerSel.value; saveSettings(); refreshProvider(); } });
  const providerStatus = h('span.status-pill');

  const groups = {};
  for (const p of PROVIDERS) (groups[p.group] ||= []).push(p);
  for (const [g, list] of Object.entries(groups)) providerSel.append(h('optgroup', { label: g }, list.map((p) => h('option', { value: p.id }, p.label))));

  async function refreshProvider() {
    const s = getSettings();
    providerSel.value = s.provider;
    const p = resolveProvider(s.provider, s.providers);
    if (p.kind === 'chrome') {
      const a = await chromeAvailability('LanguageModel', s.lang.slice(0, 2));
      providerStatus.className = 'status-pill ' + (a === 'available' ? 'ok' : a === 'unsupported' || a === 'unavailable' ? 'bad' : 'warn');
      providerStatus.textContent = { available: 'Ready', downloadable: 'Needs download', downloading: 'Downloading', unavailable: 'Unavailable', unsupported: 'Not supported' }[a] || a;
    } else if (isLocalProvider(p)) {
      providerStatus.className = 'status-pill';
      providerStatus.textContent = 'Checking…';
      const r = await checkProvider(p);
      providerStatus.className = 'status-pill ' + (r.ok ? 'ok' : 'bad');
      providerStatus.textContent = r.ok ? r.model : { cors: 'Blocked (CORS)', unreachable: 'Not running', 'no-models': 'No models', 'unknown-model': 'Model missing' }[r.error.kind] || 'Error';
      providerStatus.title = r.ok ? `Connected to ${p.baseUrl}` : r.error.message;
    } else {
      const ready = (!p.needsKey || p.apiKey) && p.model && p.baseUrl;
      providerStatus.className = 'status-pill ' + (ready ? 'ok' : 'warn');
      providerStatus.textContent = ready ? p.model : 'Set up';
    }
  }

  function describeTarget() {
    const sel = editor.selectedText().trim();
    targetNote.textContent = sel ? `Working on your selection (${sel.split(/\s+/).length} words).` : 'Working on the current paragraph. Select text to target it precisely.';
  }
  editor.addEventListener('selection', () => { if (!root.hidden) describeTarget(); });

  function captureTarget(action) {
    const scope = action.scope;
    if (scope === 'document') return { scope, md: editor.getMarkdown(), range: null, block: null };
    const sel = editor.selection();
    const range = sel ? sel.getRangeAt(0).cloneRange() : null;
    let block = editor.currentBlock();
    while (block && block.parentElement && block.parentElement !== editor.body && !/^(li|td|th)$/.test(block.localName)) block = block.parentElement;
    if (scope === 'before') {
      const r = editor.doc.createRange();
      r.setStart(editor.body, 0);
      if (range) r.setEnd(range.endContainer, range.endOffset); else r.selectNodeContents(editor.body);
      const md = cleanHtmlViaMarkdown(htmlOf(r), editor.doc).slice(-6000);
      return { scope, md, range: range && collapsedAt(range, false), block };
    }
    if (range && !range.collapsed) return { scope: 'selection', md: cleanHtmlViaMarkdown(htmlOf(range), editor.doc), range, block };
    if (!block) return null;
    const r = editor.doc.createRange();
    r.selectNodeContents(block);
    return { scope: 'block', md: cleanHtmlViaMarkdown(block.innerHTML, editor.doc), range: r, block };
  }

  function htmlOf(range) {
    const div = editor.doc.createElement('div');
    div.append(range.cloneContents());
    return div.innerHTML;
  }

  function collapsedAt(range, toStart) {
    const r = range.cloneRange();
    r.collapse(toStart);
    return r;
  }

  async function run(action, instruction) {
    if (ctrl) { ctrl.abort(); ctrl = null; renderButtons(); return; }
    const s = getSettings();
    const p = resolveProvider(s.provider, s.providers);
    target = captureTarget(action);
    if (!target || !target.md.trim()) { toast('Put the cursor in a paragraph or select some text first.'); return; }
    lastAction = action;
    ctrl = new AbortController();
    output = '';
    out.textContent = '';
    renderButtons(true);
    const onToken = (t) => { output = t; out.textContent = t; out.scrollTop = out.scrollHeight; };
    const lang = s.lang.slice(0, 2);
    try {
      let result;
      const ch = action.chrome;
      const useChromeApi = p.kind === 'chrome' && ch && (await chromeAvailability(ch.api, lang)) !== 'unsupported' && (await chromeAvailability(ch.api, lang)) !== 'unavailable';
      if (useChromeApi && ch.api === 'Rewriter') {
        result = await chromeRewrite(markdownToPlainText(target.md).trim(), { tone: ch.tone, length: ch.length, onToken, signal: ctrl.signal, lang });
      } else if (useChromeApi && ch.api === 'Writer') {
        result = await chromeWrite('Continue this text with one or two paragraphs.', { context: target.md, onToken, signal: ctrl.signal, lang });
      } else if (useChromeApi && ch.api === 'Summarizer') {
        result = await chromeSummarize(markdownToPlainText(target.md), { onToken, signal: ctrl.signal, lang });
      } else {
        const prompt = `${instruction || action.prompt}\n\n<text>\n${target.md.trim()}\n</text>`;
        result = await chat(p, { system: SYSTEM, prompt, onToken, signal: ctrl.signal, lang });
      }
      output = cleanup(result);
      out.textContent = output;
    } catch (err) {
      if (err.name !== 'AbortError') {
        out.textContent = '';
        toast(err.message, { error: true, action: () => openSettings('ai'), actionLabel: 'Settings' });
      }
    } finally {
      ctrl = null;
      renderButtons();
    }
  }

  function cleanup(text) {
    return text.trim().replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/, '$1').replace(/^<text>\n?|\n?<\/text>$/g, '').trim();
  }

  function replace() {
    if (!output || !target?.range) return;
    editor.replaceWith(output, target.range, true);
    toast('Replaced. Press Ctrl+Z to undo.');
  }

  function insertAfter() {
    if (!output) return;
    const block = target?.block && target.block.isConnected ? target.block : editor.body.lastElementChild;
    const r = editor.doc.createRange();
    if (block) r.setStartAfter(block); else r.selectNodeContents(editor.body);
    r.collapse(true);
    editor.selectRange(r);
    editor.insertMarkdown('\n\n' + output + '\n\n');
  }

  function renderButtons(running = false) {
    fill(resultBtns, 
      running ? h('button.btn.small', { type: 'button', onclick: () => ctrl?.abort() }, icon('loader-circle', 'spin'), 'Stop') : null,
      !running && output && target?.range && lastAction?.insert !== 'after' && lastAction?.insert !== 'none'
        ? h('button.btn.small.primary', { type: 'button', onclick: replace }, icon('check'), target.scope === 'selection' ? 'Replace selection' : 'Replace paragraph') : null,
      !running && output && lastAction?.insert !== 'none' ? h('button.btn.small', { type: 'button', onclick: insertAfter }, icon('plus'), 'Insert below') : null,
      !running && output ? h('button.btn.small', { type: 'button', onclick: () => navigator.clipboard.writeText(output).then(() => toast('Copied.')) }, icon('copy'), 'Copy') : null,
      !running && output ? h('button.btn.small.ghost', { type: 'button', onclick: () => { output = ''; out.textContent = ''; renderButtons(); } }, 'Discard') : null,
    );
  }

  fill(root, 
    h('h3', 'Model'),
    h('div.provider-line', providerSel, providerStatus, h('button.icon-btn', { type: 'button', title: 'AI settings', onclick: () => openSettings('ai') }, icon('settings'))),
    h('h3', 'Rewrite & generate'),
    targetNote,
    h('div.actions-grid', ACTIONS.map((a) => h('button.btn', { type: 'button', onclick: () => run(a) }, icon(a.icon), a.label))),
    h('h3', 'Custom instruction'),
    custom,
    h('div.btn-row', { style: { marginTop: '6px' } }, h('button.btn.small', { type: 'button', onclick: () => custom.value.trim() && run({ id: 'custom', prompt: custom.value.trim() }, custom.value.trim()) }, icon('sparkles'), 'Run')),
    out,
    resultBtns,
    h('p.help', 'Text is sent only to the provider you choose. On-device and local-server options never leave your computer.'),
  );
  refreshProvider();
  describeTarget();
  return { refresh: () => { refreshProvider(); describeTarget(); } };
}
