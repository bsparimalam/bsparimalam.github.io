// LanguageTool (rule-based grammar checker): public API, premium API, or a self-hosted server.
export const LT_PUBLIC = 'https://api.languagetool.org';
export const LT_PREMIUM = 'https://api.languagetoolplus.com';

const KIND_MAP = { TYPOS: 'spelling', GRAMMAR: 'grammar', PUNCTUATION: 'punctuation', CASING: 'capitalization',
  STYLE: 'style', REDUNDANCY: 'style', TYPOGRAPHY: 'typography', CONFUSED_WORDS: 'word-choice', SEMANTICS: 'grammar',
  COLLOCATIONS: 'word-choice', COMPOUNDING: 'spelling', MISC: 'grammar', PLAIN_ENGLISH: 'style' };

const MAX_CHARS = 18000; // public API caps requests at 20 KB

/**
 * @param {{id: string, text: string, kind: string}[]} blocks
 * @param {{server: string, language: string, username?: string, apiKey?: string, picky?: boolean, motherTongue?: string}} cfg
 */
export async function languageToolCheck(blocks, cfg, signal) {
  const server = (cfg.server || LT_PUBLIC).replace(/\/+$/, '').replace(/\/v2$/, '');
  const prose = blocks.filter((b) => b.kind !== 'code' && b.text.trim());
  const chunks = [];
  let cur = [];
  let len = 0;
  for (const b of prose) {
    if (len + b.text.length > MAX_CHARS && cur.length) { chunks.push(cur); cur = []; len = 0; }
    cur.push(b);
    len += b.text.length + 2;
  }
  if (cur.length) chunks.push(cur);

  const issues = [];
  for (const chunk of chunks) {
    let text = '';
    const offsets = [];
    for (const b of chunk) {
      offsets.push({ b, start: text.length });
      text += b.text + '\n\n';
    }
    const body = new URLSearchParams({ text, language: cfg.language || 'auto' });
    if (cfg.language === 'auto') body.set('preferredVariants', 'en-US,de-DE,pt-BR,ca-ES');
    if (cfg.motherTongue) body.set('motherTongue', cfg.motherTongue);
    if (cfg.picky) body.set('level', 'picky');
    if (cfg.username && cfg.apiKey) { body.set('username', cfg.username); body.set('apiKey', cfg.apiKey); }

    const res = await fetch(`${server}/v2/check`, { method: 'POST', body, signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } });
    if (!res.ok) throw new Error(`LanguageTool ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();

    for (const m of json.matches || []) {
      let k = offsets.length - 1;
      while (k > 0 && offsets[k].start > m.offset) k--;
      const { b, start } = offsets[k];
      const s = m.offset - start;
      if (s < 0 || s + m.length > b.text.length) continue;
      issues.push({
        blockId: b.id, start: s, end: s + m.length,
        message: m.message || m.shortMessage,
        replacements: (m.replacements || []).slice(0, 6).map((r) => r.value),
        kind: m.rule?.issueType === 'misspelling' ? 'spelling' : KIND_MAP[m.rule?.category?.id] || 'grammar',
        rule: 'lt:' + (m.rule?.id || 'rule'), source: 'languagetool',
      });
    }
  }
  return issues;
}
