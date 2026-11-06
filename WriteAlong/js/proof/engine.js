// Proofreading orchestrator: runs the enabled checkers, maps their results onto live DOM ranges,
// keeps them valid while the user types, and paints them with the CSS Custom Highlight API.
import { checkBlocks } from './rules.js';
import { harperCheck, setHarperWords } from './harper.js';
import { languageToolCheck, LT_PUBLIC, LT_PREMIUM } from './languagetool.js';
import { chromeProofread } from './chrome-ai.js';
import { llmProofread, resolveProvider, proofMethodFor, ensureModel } from './llm.js';

export const SOURCES = {
  rules: 'Built-in rules',
  harper: 'Harper (offline grammar)',
  languagetool: 'LanguageTool',
  chrome: 'Chrome Proofreader (Gemini Nano)',
  llm: 'AI model',
};

export const KIND_GROUP = {
  spelling: 'spelling',
  grammar: 'grammar', punctuation: 'grammar', capitalization: 'grammar', 'word-choice': 'grammar', agreement: 'grammar',
  style: 'style', readability: 'style', typography: 'style', clarity: 'style',
};

export function groupOf(kind) {
  return KIND_GROUP[kind] || 'grammar';
}

const AUTO_SOURCES = ['rules', 'harper'];

export class Proofreader extends EventTarget {
  constructor(editor, getSettings) {
    super();
    this.editor = editor;
    this.getSettings = getSettings;
    this.issues = [];
    this.seq = 0;
    this.ignored = new Set();
    this.cache = { rules: new Map(), harper: new Map() };
    this.autoTimer = 0;
    this.status = '';
    this.running = null;
    this.activeId = null;
    this.harperError = null;
  }

  setStatus(text) {
    this.status = text;
    this.dispatchEvent(new Event('status'));
  }

  /** Called on every document change. */
  onDocumentChange() {
    this.validate();
    const s = this.getSettings();
    clearTimeout(this.autoTimer);
    if (!s.autoCheck) { this.paint(); return; }
    this.autoTimer = setTimeout(() => this.runAuto(), 700);
    this.paint();
  }

  clear() {
    this.issues = [];
    this.cache.rules.clear();
    this.cache.harper.clear();
    this.paint();
  }

  /** Drops issues whose text was edited away. */
  validate() {
    const before = this.issues.length;
    this.issues = this.issues.filter((i) => i.range.startContainer.isConnected && i.range.toString() === i.original && !i.range.collapsed);
    if (this.issues.length !== before) this.emit();
  }

  emit() {
    this.dispatchEvent(new Event('issues'));
  }

  ignoreKey(issue) {
    return `${issue.rule}|${issue.original}`;
  }

  accept(issue, settings) {
    if (this.ignored.has(this.ignoreKey(issue))) return false;
    if (!issue.original.trim()) return false;
    const words = settings.dictionary || [];
    if (issue.kind === 'spelling' && words.some((w) => w.toLowerCase() === issue.original.trim().toLowerCase())) return false;
    return true;
  }

  /** Converts checker output (block-relative offsets) into live issues. */
  materialize(raw, blocks, settings) {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const out = [];
    for (const r of raw) {
      const block = byId.get(r.blockId);
      if (!block || r.end <= r.start || r.end > block.text.length) continue;
      const original = block.text.slice(r.start, r.end);
      const range = this.editor.rangeFor(block, r.start, r.end);
      if (!range || range.toString() !== original) continue;
      const issue = { ...r, id: ++this.seq, original, range, replacements: (r.replacements || []).filter((x) => x !== original) };
      if (this.accept(issue, settings)) out.push(issue);
    }
    return out;
  }

  /** Fast, incremental checks (built-in rules + Harper) with per-block caching. */
  async runAuto() {
    const s = this.getSettings();
    const blocks = this.editor.getBlocks();
    const raw = [];
    const enabled = { rules: true, harper: s.harper };

    for (const source of AUTO_SOURCES) {
      if (!enabled[source]) continue;
      const cache = this.cache[source];
      const key = (b) => b.kind + '\u0000' + b.text;
      const missing = blocks.filter((b) => !cache.has(key(b)));
      if (missing.length) {
        try {
          let found;
          if (source === 'rules') found = checkBlocks(missing, { groups: s.rules });
          else {
            if (!s.lang.startsWith('en')) continue;
            found = await harperCheck(missing, s.harperDialect, s.dictionary);
            this.harperError = null;
          }
          for (const b of missing) cache.set(key(b), []);
          for (const f of found) {
            const b = missing.find((m) => m.id === f.blockId);
            cache.get(key(b)).push({ ...f, blockId: undefined });
          }
        } catch (err) {
          if (source === 'harper') { this.harperError = err.message; this.setStatus(`Harper: ${err.message}`); }
          continue;
        }
      }
      for (const b of blocks) for (const f of cache.get(key(b)) || []) raw.push({ ...f, blockId: b.id });
      if (cache.size > 5000) cache.clear();
    }

    // Re-materialise auto issues; keep issues from manual (remote) runs that are still valid.
    const manual = this.issues.filter((i) => !AUTO_SOURCES.includes(i.source));
    const auto = this.materialize(raw, blocks, s);
    this.issues = dedupe([...manual, ...auto]);
    this.paint();
    this.emit();
  }

  /** Full check with the slower engines the user enabled. */
  async runFull() {
    if (this.running) { this.running.abort(); this.running = null; this.setStatus('Stopped.'); return; }
    const s = this.getSettings();
    const ctrl = new AbortController();
    this.running = ctrl;
    const blocks = this.editor.getBlocks();
    const tasks = [];
    if (s.languageTool !== 'off') tasks.push(['languagetool', () => languageToolCheck(blocks, {
      server: s.languageTool === 'public' ? LT_PUBLIC : s.languageTool === 'premium' ? LT_PREMIUM : s.ltServer,
      language: s.lang, username: s.ltUsername, apiKey: s.ltApiKey, picky: s.ltPicky }, ctrl.signal)]);
    if (s.chromeProofreader) tasks.push(['chrome', () => chromeProofread(blocks, s.lang.slice(0, 2), (p) => this.setStatus(`Chrome Proofreader… ${Math.round(p * 100)}%`), ctrl.signal)]);
    if (s.aiProofread) {
      const p = resolveProvider(s.provider, s.providers);
      const method = proofMethodFor(p, s.aiProofMethod);
      tasks.push(['llm', async () => {
        const pm = await ensureModel(p);
        this.setStatus(`Checking with ${pm.label}${pm.model ? ` (${pm.model})` : ''}…`);
        return llmProofread(pm, blocks, { lang: s.lang, method, signal: ctrl.signal, onProgress: (x) => this.setStatus(`${pm.label}${pm.model ? ` (${pm.model})` : ''}… ${Math.round(x * 100)}%`) });
      }]);
    }
    const errors = [];
    try {
      await this.runAuto();
      if (!tasks.length) {
        this.setStatus('Checked with the instant engines. Enable LanguageTool, Chrome Proofreader or an AI model in Settings for a deeper check.');
        return;
      }
      for (const [source, run] of tasks) {
        if (ctrl.signal.aborted) break;
        this.setStatus(`Checking with ${source === 'llm' ? resolveProvider(s.provider, s.providers).label : SOURCES[source]}…`);
        try {
          const raw = await run();
          const fresh = this.editor.getBlocks();
          // Blocks may have changed while waiting; materialise against current text by id.
          const items = this.materialize(raw, blocks.filter((b) => fresh.some((f) => f.id === b.id && f.text === b.text)).map((b) => fresh.find((f) => f.id === b.id)), s);
          this.issues = dedupe([...this.issues.filter((i) => i.source !== source), ...items]);
          this.paint();
          this.emit();
        } catch (err) {
          if (err.name === 'AbortError') break;
          errors.push(`${SOURCES[source]}: ${err.message}`);
        }
      }
      const n = this.issues.length;
      this.setStatus(errors.length ? errors.join('\n') : n ? `Found ${n} suggestion${n === 1 ? '' : 's'}.` : 'No issues found. ✨');
    } finally {
      if (this.running === ctrl) this.running = null;
      this.dispatchEvent(new Event('status'));
    }
  }

  async apply(issue, replacement) {
    if (!issue.range.startContainer.isConnected) return;
    this.editor.selectRange(issue.range);
    if (replacement === '') {
      // Removing a word: also swallow one adjacent space, unless the flagged text already carries one.
      const r = issue.range.cloneRange();
      const t = r.endContainer;
      if (/^\s|\s$/.test(issue.original)) { /* spacing already included */ }
      else if (t.nodeType === 3 && t.textContent[r.endOffset] === ' ') r.setEnd(t, r.endOffset + 1);
      else if (r.startContainer.nodeType === 3 && r.startContainer.textContent[r.startOffset - 1] === ' ') r.setStart(r.startContainer, r.startOffset - 1);
      this.editor.selectRange(r);
      this.editor.exec('delete');
    } else {
      this.editor.exec('insertText', replacement);
    }
    this.issues = this.issues.filter((i) => i !== issue);
    this.validate();
    this.paint();
    this.emit();
  }

  async applyAll(kind) {
    const targets = this.issues.filter((i) => i.replacements.length && (!kind || groupOf(i.kind) === kind));
    // Apply from the end of the document backwards so earlier ranges stay put.
    targets.sort((a, b) => b.range.compareBoundaryPoints(Range.START_TO_START, a.range));
    for (const t of targets) if (this.issues.includes(t)) await this.apply(t, t.replacements[0]);
  }

  ignore(issue) {
    this.ignored.add(this.ignoreKey(issue));
    this.issues = this.issues.filter((i) => this.ignoreKey(i) !== this.ignoreKey(issue));
    this.paint();
    this.emit();
  }

  async addToDictionary(word, settings, save) {
    word = word.trim();
    if (!word) return;
    if (!settings.dictionary.includes(word)) settings.dictionary.push(word);
    save();
    this.issues = this.issues.filter((i) => !(i.kind === 'spelling' && i.original.trim().toLowerCase() === word.toLowerCase()));
    this.cache.harper.clear();
    setHarperWords(settings.dictionary).catch(() => {});
    this.paint();
    this.emit();
  }

  issuesAt(node, offset) {
    return this.issues.filter((i) => {
      try { return i.range.isPointInRange(node, offset); } catch { return false; }
    });
  }

  setActive(issue) {
    this.activeId = issue?.id ?? null;
    this.editor.setHighlight('wa-active', issue ? [issue.range] : []);
  }

  paint() {
    const groups = { spelling: [], grammar: [], style: [] };
    for (const i of this.issues) groups[groupOf(i.kind)].push(i.range);
    this.editor.setHighlight('wa-spelling', groups.spelling);
    this.editor.setHighlight('wa-grammar', groups.grammar);
    this.editor.setHighlight('wa-style', groups.style);
    const active = this.issues.find((i) => i.id === this.activeId);
    this.editor.setHighlight('wa-active', active ? [active.range] : []);
  }

  /** Issues sorted in document order. */
  sorted() {
    return [...this.issues].sort((a, b) => a.range.compareBoundaryPoints(Range.START_TO_START, b.range));
  }
}

/** Removes exact duplicates reported by several engines (same span + same first suggestion). */
function dedupe(issues) {
  const out = [];
  for (const i of issues) {
    const dup = out.find((o) => o.original === i.original && (o.replacements[0] ?? '') === (i.replacements[0] ?? '') &&
      o.range.compareBoundaryPoints(Range.START_TO_START, i.range) === 0);
    if (dup) {
      if (dup.source !== i.source) dup.alsoFrom = [...new Set([...(dup.alsoFrom || []), i.source])];
      continue;
    }
    out.push(i);
  }
  return out;
}
