// Proofreading side panel and the inline suggestion popover.
import { h, fill, icon, showPopover, hidePopover, toast } from './dom.js';
import { groupOf, SOURCES } from '../proof/engine.js';
import { resolveProvider } from '../proof/llm.js';
import { initHarper } from '../proof/harper.js';

const KIND_LABEL = { spelling: 'Spelling', grammar: 'Grammar', punctuation: 'Punctuation', capitalization: 'Capitalization',
  'word-choice': 'Word choice', style: 'Style', readability: 'Readability', typography: 'Typography', clarity: 'Clarity', agreement: 'Agreement' };

export function kindLabel(kind) {
  return KIND_LABEL[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
}

function sourceLabel(issue, settings) {
  const names = [issue.source, ...(issue.alsoFrom || [])].map((s) => (s === 'llm' ? resolveProvider(settings.provider, settings.providers).label : SOURCES[s] || s));
  return names.join(' + ');
}

export function suggestionButtons(issue, onApply) {
  const wrap = h('div.issue-fix');
  if (issue.original) wrap.append(h('span.orig', issue.original.length > 40 ? issue.original.slice(0, 40) + '…' : issue.original));
  if (issue.replacements.length) wrap.append(h('span.muted', '→'));
  for (const r of issue.replacements.slice(0, 5)) {
    wrap.append(h('button.sugg' + (r === '' ? '.remove' : ''), { type: 'button', onclick: (e) => { e.stopPropagation(); onApply(r); } }, r === '' ? 'remove' : r.replace(/ /g, ' ')));
  }
  return wrap;
}

export function initProofPanel({ root, proof, editor, getSettings, saveSettings, openSettings, setBadge }) {
  let filter = 'all';
  let scheduled = false;

  const toggleEngine = async (key) => {
    const s = getSettings();
    if (key === 'harper') {
      s.harper = !s.harper;
      if (s.harper) {
        proof.setStatus('Loading Harper grammar engine (one-time download, about 8 MB)…');
        try {
          await initHarper(s.harperDialect, s.dictionary);
          proof.setStatus('Harper is ready and works offline.');
        } catch (err) {
          s.harper = false;
          toast(`Harper could not start: ${err.message}`, { error: true });
        }
      }
    } else if (key === 'languagetool') {
      if (s.languageTool === 'off') s.languageTool = 'public';
      else s.languageTool = 'off';
      if (s.languageTool === 'public') toast('LanguageTool’s public server receives the text you check. Use a self-hosted server in Settings for full privacy.', { timeout: 7000 });
    } else if (key === 'chrome') s.chromeProofreader = !s.chromeProofreader;
    else if (key === 'llm') s.aiProofread = !s.aiProofread;
    saveSettings();
    proof.cache.harper.clear();
    if (key === 'harper') proof.runAuto();
    render();
  };

  function engineChips() {
    const s = getSettings();
    const p = resolveProvider(s.provider, s.providers);
    const chips = [
      ['rules', 'Built-in rules', true, 'Instant offline checks: common misspellings, grammar slips, punctuation, style. Configure in Settings.'],
      ['harper', 'Harper', s.harper, 'Offline grammar checker (WebAssembly). Downloads once, then works without a connection.'],
      ['languagetool', 'LanguageTool', s.languageTool !== 'off', 'Rule-based grammar checker: public API, premium, or your own server.'],
      ['chrome', 'Chrome Proofreader', s.chromeProofreader, 'Chrome’s on-device Gemini Nano proofreader.'],
      ['llm', `AI: ${p.label.replace(/ \(.*\)$/, '')}`, s.aiProofread, 'Proofread with the AI model selected in Settings → AI.'],
    ];
    return h('div.engines', chips.map(([key, label, on, title]) => h('span.chip' + (on ? '.on' : ''), {
      title, onclick: () => (key === 'rules' ? openSettings('proof') : toggleEngine(key)),
    }, h('span.dot'), label)));
  }

  function issueCard(issue) {
    const s = getSettings();
    const group = groupOf(issue.kind);
    const card = h('div.issue.' + group + (proof.activeId === issue.id ? '.active' : ''), {
      onclick: () => {
        proof.setActive(issue);
        const el = issue.range.startContainer.parentElement;
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        render();
      },
    },
    h('div.issue-top', h('b', kindLabel(issue.kind)), h('span.src', sourceLabel(issue, s))),
    h('div.issue-msg', issue.message),
    suggestionButtons(issue, (r) => proof.apply(issue, r)),
    h('div.issue-actions',
      h('button.link-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); proof.ignore(issue); } }, 'Ignore'),
      issue.kind === 'spelling' && /^[\p{L}'’-]+$/u.test(issue.original)
        ? h('button.link-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); proof.addToDictionary(issue.original, s, saveSettings); } }, 'Add to dictionary')
        : null));
    return card;
  }

  function render() {
    scheduled = false;
    const s = getSettings();
    const issues = proof.sorted();
    const counts = { all: issues.length, spelling: 0, grammar: 0, style: 0 };
    for (const i of issues) counts[groupOf(i.kind)]++;
    setBadge(counts.spelling + counts.grammar);
    const shown = filter === 'all' ? issues : issues.filter((i) => groupOf(i.kind) === filter);
    const fixable = shown.filter((i) => i.replacements.length).length;

    const checkBtn = h('button.btn.primary', { type: 'button', onclick: () => proof.runFull().then(render) },
      proof.running ? icon('loader-circle', 'spin') : icon('spell-check'), proof.running ? 'Stop checking' : 'Check document');
    const auto = h('label.chk', { title: 'Run the instant engines while you type' },
      h('input', { type: 'checkbox', checked: s.autoCheck, onchange: (e) => { s.autoCheck = e.target.checked; saveSettings(); if (s.autoCheck) proof.runAuto(); } }), 'As you type');

    fill(root, 
      h('div.proof-head', checkBtn, auto),
      engineChips(),
      proof.status ? h('p.help', { style: { whiteSpace: 'pre-wrap' } }, proof.status) : null,
      h('div.filters', [['all', 'All'], ['spelling', 'Spelling'], ['grammar', 'Grammar'], ['style', 'Style']].map(([k, label]) =>
        h('button.filter' + (filter === k ? '.active' : ''), { type: 'button', dataset: { filter: k }, onclick: () => { filter = k; render(); } }, h('b', counts[k]), label))),
      fixable > 1 ? h('div.btn-row', { style: { marginBottom: '10px' } },
        h('button.btn.small', { type: 'button', onclick: () => proof.applyAll(filter === 'all' ? null : filter) }, icon('check-check'), `Accept all ${fixable} suggestions`)) : null,
      shown.length ? h('div', shown.slice(0, 300).map(issueCard))
        : h('div.empty', icon('check'), h('div', issues.length ? 'Nothing in this category.' : 'No suggestions right now.')),
      h('div.legend',
        h('div', h('i', { style: { borderColor: 'var(--spelling)', borderBottomStyle: 'solid' } }), 'Spelling'),
        h('div', h('i', { style: { borderColor: 'var(--grammar)', borderBottomStyle: 'solid' } }), 'Grammar & punctuation'),
        h('div', h('i', { style: { borderColor: 'var(--style)', borderBottomStyle: 'solid' } }), 'Style & clarity'),
        s.browserSpellcheck ? h('p.help', 'Your browser’s own spell checker also underlines words; right-click them for its suggestions and dictionary.') : null,
        editor.highlightsSupported() ? null : h('p.help', 'This browser cannot draw inline highlights (CSS Custom Highlight API); use the list above.')),
    );
  }

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  };
  proof.addEventListener('issues', schedule);
  proof.addEventListener('status', schedule);
  render();
  return { render: schedule };
}

/** Inline popover for the issue under the caret. */
export function showIssuePopover(editor, proof, issues, getSettings, saveSettings) {
  if (!issues.length) { hidePopover(); return; }
  const issue = issues[0];
  proof.setActive(issue);
  const s = getSettings();
  const content = h('div',
    h('div.pop-title', h('span.status-pill', kindLabel(issue.kind)), h('small.muted', { style: { marginLeft: 'auto' } }, sourceLabel(issue, s))),
    h('div.pop-msg', issue.message),
    suggestionButtons(issue, (r) => { hidePopover(); proof.apply(issue, r); }),
    h('div.issue-actions',
      h('button.link-btn', { type: 'button', onclick: () => { hidePopover(); proof.ignore(issue); } }, 'Ignore'),
      issue.kind === 'spelling' ? h('button.link-btn', { type: 'button', onclick: () => { hidePopover(); proof.addToDictionary(issue.original, s, saveSettings); } }, 'Add to dictionary') : null,
      issues.length > 1 ? h('span.muted', { style: { fontSize: '12px', marginLeft: 'auto' } }, `+${issues.length - 1} more here`) : null));
  showPopover(editor.rectFor(issue.range), content);
}
