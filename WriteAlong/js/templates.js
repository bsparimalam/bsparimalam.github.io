// Bundled document templates. Each lives in templates/<id>/ as template.css + sample.md.
export const TEMPLATES = [
  { id: 'clean', name: 'Clean', description: 'Modern, minimal sans-serif for notes, docs and everyday writing.' },
  { id: 'latex-article', name: 'LaTeX Article', description: 'Computer Modern, numbered sections and booktabs tables — the classic LaTeX article look.' },
  { id: 'academic-paper', name: 'Academic Paper', description: 'Two-column conference style with a full-width title block.' },
  { id: 'report', name: 'Modern Report', description: 'Business or technical report with a strong title, accent colour and contents.' },
  { id: 'book', name: 'Book', description: 'Garamond book typesetting with chapter openings, drop caps and ornaments.' },
  { id: 'letter', name: 'Formal Letter', description: 'A crisp business letter with sender, recipient and signature blocks.' },
  { id: 'resume', name: 'Résumé', description: 'A one-page CV with clear sections, roles and dates.' },
  { id: 'manuscript', name: 'Manuscript', description: 'Standard manuscript format: typewriter face, double-spaced.' },
];

export const DEFAULT_TEMPLATE = 'clean';

const cache = new Map();

export async function loadTemplate(id) {
  if (cache.has(id)) return cache.get(id);
  const base = new URL(`../templates/${id}/`, import.meta.url);
  const [css, sample] = await Promise.all([
    fetch(new URL('template.css', base)).then((r) => { if (!r.ok) throw new Error(`Template ${id} not found`); return r.text(); }),
    fetch(new URL('sample.md', base)).then((r) => (r.ok ? r.text() : '')),
  ]);
  const t = { ...(TEMPLATES.find((x) => x.id === id) || { id, name: id }), css, sample };
  cache.set(id, t);
  return t;
}

/** Best guess of which bundled template a stylesheet came from (by its header comment). */
export function detectTemplate(css) {
  const m = /Write Along template:\s*([^*\n]+?)\s*\*\//.exec(css || '');
  if (!m) return null;
  return TEMPLATES.find((t) => t.name.toLowerCase() === m[1].trim().toLowerCase()) || null;
}
