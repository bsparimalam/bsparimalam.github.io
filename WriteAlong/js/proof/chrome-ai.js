// Chrome built-in AI (Gemini Nano on-device): Proofreader, Prompt (LanguageModel), Writer, Rewriter
// and Summarizer APIs. Everything runs locally once the model has been downloaded by the browser.

export const CHROME_APIS = {
  Proofreader: 'Proofreader API — grammar, spelling & punctuation corrections',
  LanguageModel: 'Prompt API — general on-device model (Gemini Nano)',
  Rewriter: 'Rewriter API — rephrase selected text',
  Writer: 'Writer API — draft new text',
  Summarizer: 'Summarizer API — summarise the document',
};

function api(name) {
  if (typeof self[name] !== 'undefined') return self[name];
  // Older Chrome builds exposed the APIs under window.ai.*
  const legacy = { LanguageModel: 'languageModel', Rewriter: 'rewriter', Writer: 'writer', Summarizer: 'summarizer' }[name];
  const ai = self.ai;
  if (legacy && ai?.[legacy]) {
    const L = ai[legacy];
    return {
      create: (o) => L.create(o),
      availability: async () => {
        if (L.availability) return L.availability();
        const c = await L.capabilities();
        return { readily: 'available', 'after-download': 'downloadable', no: 'unavailable' }[c.available] || 'unavailable';
      },
    };
  }
  return null;
}

function langOpts(name, lang) {
  const l = [lang || 'en'];
  if (name === 'Proofreader') return { expectedInputLanguages: l };
  if (name === 'LanguageModel') return { expectedInputs: [{ type: 'text', languages: l }], expectedOutputs: [{ type: 'text', languages: l }] };
  return { expectedInputLanguages: l, expectedContextLanguages: l, outputLanguage: l[0] };
}

/** @returns {Promise<'unavailable'|'downloadable'|'downloading'|'available'|'unsupported'>} */
export async function chromeAvailability(name, lang = 'en') {
  const A = api(name);
  if (!A) return 'unsupported';
  try {
    return await A.availability(langOpts(name, lang));
  } catch {
    try { return await A.availability(); } catch { return 'unavailable'; }
  }
}

const sessions = new Map();

/** Creates (and caches) an API instance. Must be called from a user gesture the first time (model download). */
export async function chromeCreate(name, options = {}, onProgress, lang = 'en') {
  const key = name + JSON.stringify(options) + lang;
  if (sessions.has(key)) return sessions.get(key);
  const A = api(name);
  if (!A) throw new Error(`${name} API is not available in this browser.`);
  const promise = A.create({
    ...langOpts(name, lang),
    ...options,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress?.(e.total && e.total !== 1 ? e.loaded / e.total : e.loaded));
    },
  }).catch((err) => {
    sessions.delete(key);
    throw err;
  });
  sessions.set(key, promise);
  return promise;
}

export function chromeReset() {
  for (const p of sessions.values()) p.then((s) => s.destroy?.()).catch(() => {});
  sessions.clear();
}

const PROOF_KIND = { spelling: 'spelling', punctuation: 'punctuation', capitalization: 'capitalization',
  preposition: 'grammar', 'missing-words': 'grammar', grammar: 'grammar' };

/** Runs the Proofreader API over each block. */
export async function chromeProofread(blocks, lang, onProgress, signal) {
  const pr = await chromeCreate('Proofreader', { includeCorrectionTypes: true, includeCorrectionExplanations: true }, null, lang);
  const issues = [];
  const prose = blocks.filter((b) => b.kind !== 'code' && b.text.trim().length > 1);
  let done = 0;
  for (const b of prose) {
    if (signal?.aborted) break;
    const result = await pr.proofread(b.text);
    for (const c of result.corrections || []) {
      const type = c.types?.[0] || c.type || 'grammar';
      issues.push({ blockId: b.id, start: c.startIndex, end: c.endIndex, replacements: [c.correction],
        message: c.explanation || `Suggested ${type.replace('-', ' ')} correction.`, kind: PROOF_KIND[type] || 'grammar',
        rule: 'chrome:' + type, source: 'chrome' });
    }
    onProgress?.(++done / prose.length);
  }
  return issues;
}

/** Streams text from the Prompt API session. Returns the final text. */
export async function chromePrompt({ system, prompt, schema, onToken, signal, lang }) {
  const base = await chromeCreate('LanguageModel', system ? { initialPrompts: [{ role: 'system', content: system }] } : {}, null, lang);
  const session = base.clone ? await base.clone({ signal }) : base;
  try {
    if (schema || !onToken) return await session.prompt(prompt, { signal, ...(schema ? { responseConstraint: schema } : {}) });
    let text = '';
    for await (const chunk of session.promptStreaming(prompt, { signal })) {
      // Early Chrome versions streamed the cumulative text; later ones stream deltas.
      text = chunk.startsWith(text) && text ? chunk : text + chunk;
      onToken(text);
    }
    return text;
  } finally {
    if (session !== base) session.destroy?.();
  }
}

async function streamInto(stream, onToken) {
  let text = '';
  for await (const chunk of stream) {
    text = chunk.startsWith(text) && text ? chunk : text + chunk;
    onToken?.(text);
  }
  return text;
}

export async function chromeRewrite(text, { tone = 'as-is', length = 'as-is', context, onToken, signal, lang }) {
  const r = await chromeCreate('Rewriter', { tone, length, format: 'as-is' }, null, lang);
  return streamInto(r.rewriteStreaming(text, { context, signal }), onToken);
}

export async function chromeWrite(prompt, { tone = 'neutral', length = 'medium', context, onToken, signal, lang }) {
  const w = await chromeCreate('Writer', { tone, length, format: 'markdown' }, null, lang);
  return streamInto(w.writeStreaming(prompt, { context, signal }), onToken);
}

export async function chromeSummarize(text, { type = 'key-points', length = 'medium', onToken, signal, lang }) {
  const s = await chromeCreate('Summarizer', { type, length, format: 'markdown' }, null, lang);
  return streamInto(s.summarizeStreaming(text, { signal }), onToken);
}
