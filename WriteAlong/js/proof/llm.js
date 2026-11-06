// Language-model providers: Chrome's on-device model, local servers (Ollama, LM Studio, llama.cpp, …)
// and cloud APIs called directly from the browser with the user's own key. Nothing is proxied.
import { chromePrompt } from './chrome-ai.js';
import { tokenize, lcsOps, isWord } from '../diff.js';

export const PROVIDERS = [
  { id: 'chrome', label: 'Chrome built-in AI (Gemini Nano)', group: 'On this device', kind: 'chrome',
    hint: 'Runs entirely on-device in Chrome. The model downloads once (about 2–4 GB) the first time you use it.' },
  { id: 'ollama', label: 'Ollama', group: 'Local server', kind: 'ollama', baseUrl: 'http://localhost:11434',
    hint: 'Leave the model empty to use one you have installed automatically.' },
  { id: 'lmstudio', label: 'LM Studio', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:1234/v1',
    hint: 'In LM Studio → Developer, start the server and enable “CORS”.' },
  { id: 'llamacpp', label: 'llama.cpp server', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:8080/v1',
    hint: 'Run llama-server -m model.gguf --port 8080 (CORS is enabled by default).' },
  { id: 'jan', label: 'Jan', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:1337/v1',
    hint: 'Enable the Local API Server in Jan settings and add this site to the allowed CORS hosts.' },
  { id: 'localai', label: 'LocalAI', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:8080/v1',
    hint: 'LocalAI enables CORS with --cors (or CORS=true).' },
  { id: 'vllm', label: 'vLLM', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:8000/v1',
    hint: 'Start with --allowed-origins \'["{origin}"]\'.' },
  { id: 'koboldcpp', label: 'KoboldCpp', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:5001/v1', hint: '' },
  { id: 'textgen', label: 'text-generation-webui', group: 'Local server', kind: 'openai', baseUrl: 'http://localhost:5000/v1',
    hint: 'Launch with --api --listen (OpenAI-compatible extension).' },
  { id: 'openai', label: 'OpenAI', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5-mini', needsKey: true,
    keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', label: 'Anthropic Claude', group: 'Cloud (your API key)', kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-haiku-5-5', needsKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'gemini', label: 'Google Gemini', group: 'Cloud (your API key)', kind: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash', needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openrouter', label: 'OpenRouter (key or sign-in)', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'openrouter/auto', needsKey: true, oauth: 'openrouter',
    keyUrl: 'https://openrouter.ai/keys', hint: 'Use “Sign in with OpenRouter” to create a key for this browser without copying it by hand.' },
  { id: 'mistral', label: 'Mistral AI', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', needsKey: true,
    keyUrl: 'https://console.mistral.ai/api-keys' },
  { id: 'groq', label: 'Groq', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', needsKey: true,
    keyUrl: 'https://console.groq.com/keys' },
  { id: 'deepseek', label: 'DeepSeek', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needsKey: true,
    keyUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'xai', label: 'xAI Grok', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.x.ai/v1', model: '', needsKey: true, keyUrl: 'https://console.x.ai' },
  { id: 'together', label: 'Together AI', group: 'Cloud (your API key)', kind: 'openai', baseUrl: 'https://api.together.xyz/v1', model: '', needsKey: true,
    keyUrl: 'https://api.together.ai/settings/api-keys' },
  { id: 'custom', label: 'Custom OpenAI-compatible endpoint', group: 'Other', kind: 'openai', baseUrl: '', model: '',
    hint: 'Any server that speaks the OpenAI /chat/completions API: Azure OpenAI proxies, LiteLLM, corporate gateways, etc.' },
];

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}

/** Merges a provider preset with the user's saved overrides. */
export function resolveProvider(id, saved = {}) {
  const preset = providerById(id);
  const o = saved[preset.id] || {};
  return { ...preset, baseUrl: (o.baseUrl || preset.baseUrl || '').replace(/\/+$/, ''), apiKey: o.apiKey || '',
    model: o.model || preset.model || '', modelChosen: !!o.model, temperature: o.temperature ?? 0.2, extraHeaders: o.extraHeaders || '' };
}

export const isLocalProvider = (p) => p.group === 'Local server' ||
  (p.id === 'custom' && /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:|\/|$)/.test(p.baseUrl || ''));

function platform() {
  const ua = navigator.userAgent;
  return /Windows/.test(ua) ? 'windows' : /Mac OS X|Macintosh/.test(ua) ? 'mac' : 'linux';
}

/**
 * Step-by-step instructions to let this site talk to a local server (CORS), for the user's OS.
 * @returns {{text: string, commands: string[]}[]}
 */
export function corsHelp(p) {
  const origin = location.origin;
  if (p.kind === 'ollama') {
    const os = platform();
    if (os === 'linux') return [
      { text: 'If Ollama runs as the system service (the default Linux install), add this site to its allowed origins and restart it:', commands: [
        'sudo systemctl edit ollama',
        `# add these two lines in the editor, then save:\n[Service]\nEnvironment="OLLAMA_ORIGINS=${origin}"`,
        'sudo systemctl restart ollama'] },
      { text: 'If you start it by hand instead:', commands: [`OLLAMA_ORIGINS="${origin}" ollama serve`] },
    ];
    if (os === 'mac') return [
      { text: 'Allow this site, then quit and reopen the Ollama app:', commands: [`launchctl setenv OLLAMA_ORIGINS "${origin}"`] },
      { text: 'If you start it from a terminal instead:', commands: [`OLLAMA_ORIGINS="${origin}" ollama serve`] },
    ];
    return [{ text: 'Add a user environment variable OLLAMA_ORIGINS with this value, then quit Ollama from the tray and start it again:', commands: [origin] },
      { text: 'Or from PowerShell:', commands: [`setx OLLAMA_ORIGINS "${origin}"`] }];
  }
  const hints = {
    lmstudio: 'In LM Studio open Developer → Server settings, turn on “Enable CORS”, and start the server.',
    llamacpp: 'llama-server allows browser requests by default; check that it is running on this port.',
    jan: 'In Jan open Settings → Local API Server, add this site to “Trusted hosts / CORS”, and start the server.',
    localai: 'Start LocalAI with CORS enabled: local-ai --cors --cors-allow-origins ' + origin,
    vllm: `Start vLLM with --allowed-origins '["${origin}"]'.`,
    koboldcpp: 'KoboldCpp allows browser requests by default; check that it is running on this port.',
    textgen: 'Start text-generation-webui with --api and allow this origin (e.g. --api --listen).',
  };
  return [{ text: hints[p.id] || `Configure the server to send Access-Control-Allow-Origin for ${origin}.`, commands: [] }];
}

export class ConnectionError extends Error {
  constructor(message, { kind, provider, help = [] } = {}) {
    super(message);
    this.name = 'ConnectionError';
    this.kind = kind; // unreachable | cors | no-models | unknown-model
    this.provider = provider;
    this.help = help;
  }
}

/** Works out why a local server could not be reached: not running vs. blocking this site (CORS). */
async function diagnoseLocal(p, cause) {
  const probe = p.kind === 'ollama' ? `${p.baseUrl}/api/version` : `${p.baseUrl}/models`;
  let reachable = false;
  try {
    // An opaque no-cors request succeeds whenever *something* answers, even if CORS would block the real one.
    await fetch(probe, { mode: 'no-cors', cache: 'no-store' });
    reachable = true;
  } catch { /* nothing is listening, or the browser blocked local network access */ }
  const origin = location.origin;
  const err = reachable
    ? new ConnectionError(`${p.label} is running at ${p.baseUrl} but is blocking requests from ${origin} (CORS). Allow this site in ${p.label}'s settings — see Settings → AI models for the exact steps.`,
      { kind: 'cors', provider: p, help: corsHelp(p) })
    : new ConnectionError(`Nothing answered at ${p.baseUrl}. Make sure ${p.label} is running and listening on that address and port${/^https:/.test(origin) ? ', and if the browser asks to allow access to apps on your device or local network, choose Allow' : ''}.`,
      { kind: 'unreachable', provider: p, help: p.kind === 'ollama'
        ? [{ text: 'Start Ollama:', commands: platform() === 'linux' ? ['sudo systemctl start ollama', 'ollama serve   # or run it by hand'] : ['ollama serve'] }]
        : [] });
  err.cause = cause;
  return err;
}

const modelCache = new Map();

/** Installed model ids on a local server, cached briefly. */
export async function installedModels(p, { fresh = false } = {}) {
  const key = p.id + p.baseUrl;
  const hit = modelCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < 30_000) return hit.models;
  const models = await listModels(p);
  modelCache.set(key, { at: Date.now(), models });
  return models;
}

const NOT_CHAT = /embed|bge-|minilm|e5-|rerank|clip|whisper/i;

/**
 * For local servers: confirms the server is reachable and resolves which model to use.
 * An unset model picks the first installed chat model; a chosen model that isn't installed is an error.
 */
export async function ensureModel(p) {
  if (!isLocalProvider(p) || p.kind === 'chrome') return p;
  let models;
  try {
    models = await installedModels(p);
  } catch (err) {
    if (err instanceof ConnectionError || err.name === 'AbortError') throw err;
    if (err.cause || err instanceof TypeError) throw await diagnoseLocal(p, err);
    throw err;
  }
  const chatModels = models.filter((m) => !NOT_CHAT.test(m));
  if (!models.length) {
    throw new ConnectionError(`${p.label} is running at ${p.baseUrl} but has no models installed.${p.kind === 'ollama'
      ? ' Install one with “ollama pull gemma3:1b”. If you installed models before, this may be a different Ollama instance — the Linux system service keeps its models in /usr/share/ollama, while “ollama serve” started by hand uses ~/.ollama.'
      : ' Load a model in the server first.'}`, { kind: 'no-models', provider: p,
      help: p.kind === 'ollama' ? [{ text: 'Install a model:', commands: ['ollama pull gemma3:1b'] }] : [] });
  }
  const want = p.model;
  if (want) {
    const found = models.find((m) => m === want) || models.find((m) => m === `${want}:latest` || m.replace(/:latest$/, '') === want);
    if (found) return { ...p, model: found };
    if (p.modelChosen) {
      throw new ConnectionError(`The model “${want}” isn't installed in ${p.label}. Installed: ${models.join(', ')}. Choose one in Settings → AI models, or leave the model empty to pick automatically.`,
        { kind: 'unknown-model', provider: p });
    }
  }
  return { ...p, model: chatModels[0] || models[0], autoModel: true };
}

/** Checks a provider and reports {ok, model, models, error} without throwing (for status displays). */
export async function checkProvider(p, { fresh = false } = {}) {
  if (!isLocalProvider(p)) return { ok: !!((!p.needsKey || p.apiKey) && p.model && p.baseUrl), model: p.model };
  try {
    if (fresh) modelCache.delete(p.id + p.baseUrl);
    const r = await ensureModel(p);
    return { ok: true, model: r.model, auto: !!r.autoModel, models: await installedModels(r) };
  } catch (error) {
    return { ok: false, error };
  }
}

function headersFor(p) {
  const h = { 'Content-Type': 'application/json' };
  if (p.kind === 'anthropic') {
    Object.assign(h, { 'x-api-key': p.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
  } else if (p.kind === 'gemini') {
    h['x-goog-api-key'] = p.apiKey;
  } else if (p.apiKey) {
    h.Authorization = `Bearer ${p.apiKey}`;
  }
  if (p.id === 'openrouter') {
    h['HTTP-Referer'] = location.origin;
    h['X-Title'] = 'Write Along';
  }
  for (const line of (p.extraHeaders || '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return h;
}

function explainFetchError(err, p) {
  if (err.name === 'AbortError') return err;
  const local = /localhost|127\.0\.0\.1|\[::1\]/.test(p.baseUrl);
  const msg = local
    ? `Could not reach ${p.label} at ${p.baseUrl}. Is it running, and does it allow requests from ${location.origin} (CORS)? ${(p.hint || '').replace('{origin}', location.origin)}`
    : `Could not reach ${p.label}. Check your connection, the endpoint URL, and that the provider allows browser (CORS) requests.`;
  const e = new Error(msg);
  e.cause = err;
  return e;
}

async function checkedFetch(p, url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err.name !== 'AbortError' && isLocalProvider(p)) throw await diagnoseLocal(p, err);
    throw explainFetchError(err, p);
  }
  if (!res.ok) {
    let detail = await res.text();
    try { const j = JSON.parse(detail); detail = j.error?.message || j.error || j.message || detail; } catch {}
    if (res.status === 404 && p.kind === 'ollama' && /model/i.test(String(detail))) {
      modelCache.delete(p.id + p.baseUrl);
      throw new ConnectionError(`Ollama doesn't have the model “${p.model}”. ${String(detail).slice(0, 200)}`, { kind: 'unknown-model', provider: p });
    }
    throw new Error(`${p.label} returned ${res.status}: ${String(detail).slice(0, 300)}`);
  }
  return res;
}

async function* sseLines(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, '');
      buf = buf.slice(i + 1);
      yield line;
    }
  }
  if (buf.trim()) yield buf;
}

/** Lists model ids offered by the provider. */
export async function listModels(p) {
  if (p.kind === 'chrome') return ['gemini-nano'];
  if (p.kind === 'ollama') {
    const res = await checkedFetch(p, `${p.baseUrl}/api/tags`, {});
    return (await res.json()).models.map((m) => m.name);
  }
  if (p.kind === 'gemini') {
    const res = await checkedFetch(p, `${p.baseUrl}/models?pageSize=200`, { headers: headersFor(p) });
    return (await res.json()).models
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
  }
  const res = await checkedFetch(p, `${p.baseUrl}/models`, { headers: headersFor(p) });
  const json = await res.json();
  return (json.data || json.models || []).map((m) => m.id || m.name).sort();
}

/**
 * Sends a chat request and streams the reply.
 * @param {object} p resolved provider
 * @param {{system?: string, prompt: string, json?: boolean, onToken?: (text: string) => void, signal?: AbortSignal, lang?: string}} req
 * @returns {Promise<string>} full reply text
 */
export async function chat(p, { system, prompt, json, onToken, signal, lang, schema }) {
  if (p.kind === 'chrome') return chromePrompt({ system, prompt, schema: json ? schema : null, onToken, signal, lang });
  if (!p.baseUrl) throw new Error(`Set the endpoint URL for ${p.label} in Settings → AI.`);
  if (p.needsKey && !p.apiKey) throw new Error(`Add your ${p.label} API key in Settings → AI.`);
  p = await ensureModel(p);
  if (!p.model) throw new Error(`Choose a model for ${p.label} in Settings → AI.`);

  let text = '';
  const emit = (delta) => {
    if (!delta) return;
    text += delta;
    onToken?.(text);
  };

  if (p.kind === 'anthropic') {
    const res = await checkedFetch(p, `${p.baseUrl}/messages`, {
      method: 'POST', signal, headers: headersFor(p),
      body: JSON.stringify({ model: p.model, max_tokens: 8192, temperature: p.temperature, stream: true,
        ...(system ? { system } : {}), messages: [{ role: 'user', content: prompt }] }),
    });
    for await (const line of sseLines(res)) {
      if (!line.startsWith('data:')) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') emit(ev.delta.text);
      if (ev.type === 'error') throw new Error(ev.error?.message || 'Anthropic stream error');
    }
    return text;
  }

  if (p.kind === 'gemini') {
    const res = await checkedFetch(p, `${p.baseUrl}/models/${encodeURIComponent(p.model)}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal, headers: headersFor(p),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { temperature: p.temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
    for await (const line of sseLines(res)) {
      if (!line.startsWith('data:')) continue;
      const ev = JSON.parse(line.slice(5));
      for (const part of ev.candidates?.[0]?.content?.parts || []) if (!part.thought) emit(part.text);
    }
    return text;
  }

  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];

  if (p.kind === 'ollama') {
    const res = await checkedFetch(p, `${p.baseUrl}/api/chat`, {
      method: 'POST', signal, headers: headersFor(p),
      // Ollama ≥ 0.5 accepts a JSON schema as `format` (structured outputs), which keeps small models on track.
      body: JSON.stringify({ model: p.model, messages, stream: true, ...(json ? { format: schema || 'json' } : {}), options: { temperature: p.temperature } }),
    });
    for await (const line of sseLines(res)) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (ev.error) throw new Error(ev.error);
      emit(ev.message?.content);
    }
    return text;
  }

  // OpenAI-compatible
  const body = { model: p.model, messages, stream: true };
  // Reasoning models reject a custom temperature; only send it when the user changed the default.
  if (p.temperature !== 0.2 || !/^(gpt-5|o\d)/.test(p.model)) body.temperature = p.temperature;
  if (json && ['openai', 'openrouter', 'mistral', 'groq', 'deepseek', 'xai', 'together'].includes(p.id)) body.response_format = { type: 'json_object' };
  const res = await checkedFetch(p, `${p.baseUrl}/chat/completions`, { method: 'POST', signal, headers: headersFor(p), body: JSON.stringify(body) });
  for await (const line of sseLines(res)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    const ev = JSON.parse(data);
    if (ev.error) throw new Error(ev.error.message || String(ev.error));
    emit(ev.choices?.[0]?.delta?.content);
  }
  return text;
}

/* ------------------------------------------------------------------ proofreading with an LLM */

const PROOF_SYSTEM = `You are a meticulous copy editor. You receive a JSON array of text blocks from one document.
Find real errors: spelling, grammar, punctuation, capitalization, wrong word choice, and clearly awkward phrasing.
Do not rewrite for taste, do not change meaning, and do not flag correct text. Respect the author's dialect.

Reply with JSON only, in this exact shape:
{"issues":[{"id":"<block id>","original":"<exact text copied from the block>","suggestion":"<corrected text>","type":"spelling|grammar|punctuation|capitalization|word-choice|style","explanation":"<one short sentence>"}]}

Rules for "original": copy it character-for-character from the block, keep it short (just the words that change, plus a
word of context if needed to make it unique). If there are no problems reply {"issues":[]}.`;

const PROOF_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, original: { type: 'string' }, suggestion: { type: 'string' },
          type: { type: 'string' }, explanation: { type: 'string' } },
        required: ['id', 'original', 'suggestion'],
      },
    },
  },
  required: ['issues'],
};

export function parseJsonLoose(text) {
  const t = text.replace(/```(?:json)?/gi, '');
  for (const [open, close] of [['{', '}'], ['[', ']']]) {
    const start = t.indexOf(open);
    const end = t.lastIndexOf(close);
    if (start < 0 || end <= start) continue;
    try {
      const v = JSON.parse(t.slice(start, end + 1));
      return Array.isArray(v) ? { issues: v } : v;
    } catch {}
  }
  throw new Error('The model did not return valid JSON. Try again or choose a stronger model.');
}

/** Narrows an (original → suggestion) pair to the part that actually changes. */
export function tightenEdit(original, suggestion) {
  let a = 0;
  while (a < original.length && a < suggestion.length && original[a] === suggestion[a]) a++;
  let b = 0;
  while (b < original.length - a && b < suggestion.length - a && original[original.length - 1 - b] === suggestion[suggestion.length - 1 - b]) b++;
  // Expand to word boundaries so highlights cover whole words.
  while (a > 0 && /\w/.test(original[a - 1])) a--;
  while (b > 0 && /\w/.test(original[original.length - b])) b--;
  return { offset: a, original: original.slice(a, original.length - b), suggestion: suggestion.slice(a, suggestion.length - b) };
}

/* ---- method 2: ask for corrected text and diff it word by word (robust with small local models) */

const CORRECT_SYSTEM = `You are a proofreader. Correct the spelling, grammar, punctuation and capitalization mistakes in the user's text.
Keep everything else exactly the same: wording, meaning, tone, sentence order and line breaks. Do not add or remove sentences.
Reply with only the corrected text — no introduction, no quotes, no explanations. If there are no mistakes, reply with the text unchanged.`;

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

function classify(orig, repl) {
  if (orig.toLowerCase() === repl.toLowerCase()) return 'capitalization';
  if (!/[\p{L}\p{N}]/u.test(orig + repl) || orig.replace(/[^\p{L}\p{N}\s]/gu, '') === repl.replace(/[^\p{L}\p{N}\s]/gu, '')) return 'punctuation';
  if (!/\s/.test(orig.trim()) && !/\s/.test(repl.trim()) && editDistance(orig.toLowerCase(), repl.toLowerCase()) <= Math.max(2, orig.length / 4)) return 'spelling';
  return 'grammar';
}

const KIND_MESSAGE = { spelling: 'Possible spelling mistake.', capitalization: 'Capitalization.', punctuation: 'Punctuation.', grammar: 'Possible grammar mistake.' };

/**
 * Turns (original, corrected) into word-level edits. Returns null when the model rewrote too much to trust.
 * @returns {{start: number, end: number, replacement: string, kind: string}[] | null}
 */
export function diffEdits(original, corrected) {
  const a = tokenize(original);
  const b = tokenize(corrected);
  const words = a.filter((x) => isWord(x.t)).length || 1;
  const ops = lcsOps(a, b);
  const hunks = [];
  let cur = null;
  let inGap = false;
  for (const [op, i, j] of ops) {
    if (op === '=') {
      // Hunks separated only by whitespace read better as one edit ("Their was" → "There were").
      if (cur && !inGap && /^\s+$/.test(a[i].t)) { inGap = true; continue; }
      if (cur) hunks.push(cur);
      cur = null;
      inGap = false;
      continue;
    }
    if (!cur) cur = { a0: i, a1: i, b0: j, b1: j };
    if (inGap) { cur.a1 = i; cur.b1 = j; inGap = false; } // absorb the whitespace on both sides
    if (op === '-') cur.a1 = i + 1; else cur.b1 = j + 1;
  }
  if (cur) hunks.push(cur);

  const edits = [];
  let changedWords = 0;
  for (const hk of hunks) {
    const start = hk.a0 < a.length ? a[hk.a0].start : original.length;
    const end = hk.a1 > hk.a0 ? a[hk.a1 - 1].end : start;
    const bStart = hk.b0 < b.length ? b[hk.b0].start : corrected.length;
    const bEnd = hk.b1 > hk.b0 ? b[hk.b1 - 1].end : bStart;
    let orig = original.slice(start, end);
    let repl = corrected.slice(bStart, bEnd);
    if (orig.trim() === repl.trim()) continue; // whitespace-only noise
    const removedWords = a.slice(hk.a0, hk.a1).filter((x) => isWord(x.t)).length;
    if (!repl.trim() && removedWords > 4) continue; // don't offer to delete whole phrases
    changedWords += removedWords || b.slice(hk.b0, hk.b1).filter((x) => isWord(x.t)).length;
    let s0 = start;
    let e0 = end;
    if (s0 === e0) {
      // Pure insertion: attach it to the following (or preceding) word so there is something to underline.
      const next = a.find((x) => x.start >= s0 && isWord(x.t));
      const prev = [...a].reverse().find((x) => x.end <= s0 && isWord(x.t));
      if (next) { e0 = next.end; repl = repl + original.slice(s0, e0); }
      else if (prev) { s0 = prev.start; repl = original.slice(s0, e0) + repl; }
      else continue;
      orig = original.slice(s0, e0);
    }
    edits.push({ start: s0, end: e0, replacement: repl, kind: classify(orig, repl) });
  }
  if (changedWords / words > 0.5 && words > 3) return null;
  return edits;
}

function cleanCorrection(reply, original) {
  let t = reply.replace(/^\s*```[\w-]*\n?|\n?```\s*$/g, '').trim();
  t = t.replace(/^(here(?:'s| is)[^:\n]{0,60}:|corrected(?: text)?:|correction:)\s*/i, '').trim();
  if (/^["“].*["”]$/s.test(t) && !/^["“]/.test(original.trim())) t = t.slice(1, -1);
  return t;
}

/** Proofreading by correction + diff. Works with any model that can follow "fix this text". */
export async function llmProofreadByDiff(p, blocks, { lang, onProgress, signal }) {
  const prose = blocks.filter((b) => b.kind !== 'code' && b.text.trim().length > 2 && /\p{L}/u.test(b.text));
  const issues = [];
  let done = 0;
  for (const b of prose) {
    if (signal?.aborted) break;
    const text = b.text;
    const reply = await chat(p, { system: CORRECT_SYSTEM + (lang ? `\nThe text is in ${lang}.` : ''), prompt: text, signal, lang });
    const corrected = cleanCorrection(reply, text);
    const edits = corrected && corrected !== text ? diffEdits(text, corrected) : [];
    for (const e of edits || []) {
      issues.push({ blockId: b.id, start: e.start, end: e.end, replacements: [e.replacement], message: KIND_MESSAGE[e.kind],
        kind: e.kind, rule: 'llm-diff:' + e.kind, source: 'llm' });
    }
    onProgress?.(++done / prose.length);
  }
  return issues;
}

const CLOUD_KINDS = new Set(['anthropic', 'gemini']);
const CLOUD_IDS = new Set(['openai', 'anthropic', 'gemini', 'openrouter', 'mistral', 'groq', 'deepseek', 'xai', 'together']);

/** Picks the proofreading method: explained JSON issues for large cloud models, correct-and-diff for local ones. */
export function proofMethodFor(p, preference = 'auto') {
  if (preference === 'json' || preference === 'diff') return preference;
  return CLOUD_IDS.has(p.id) || CLOUD_KINDS.has(p.kind) ? 'json' : 'diff';
}

export async function llmProofread(p, blocks, { lang, onProgress, signal, method = 'json' }) {
  if (method === 'diff') return llmProofreadByDiff(p, blocks, { lang, onProgress, signal });
  const prose = blocks.filter((b) => b.kind !== 'code' && b.text.trim().length > 2);
  const batches = [];
  let cur = [];
  let len = 0;
  const limit = p.kind === 'chrome' ? 1200 : 4000;
  for (const b of prose) {
    if (len + b.text.length > limit && cur.length) { batches.push(cur); cur = []; len = 0; }
    cur.push(b);
    len += b.text.length;
  }
  if (cur.length) batches.push(cur);

  const issues = [];
  for (let i = 0; i < batches.length; i++) {
    if (signal?.aborted) break;
    const batch = batches[i];
    const prompt = `Language: ${lang || 'en'}\nBlocks:\n${JSON.stringify(batch.map((b) => ({ id: b.id, text: b.text })))}`;
    const reply = await chat(p, { system: PROOF_SYSTEM, prompt, json: true, schema: PROOF_SCHEMA, signal, lang });
    const parsed = parseJsonLoose(reply);
    const used = new Map();
    for (const it of parsed.issues || []) {
      const block = batch.find((b) => b.id === String(it.id)) || (batch.length === 1 ? batch[0] : null);
      if (!block || !it.original || it.original === it.suggestion) continue;
      // Small models sometimes "flag" a whole paragraph with an empty or rewritten suggestion; never offer that.
      const words = it.original.trim().split(/\s+/).length;
      const sugg = String(it.suggestion ?? '');
      if ((!sugg.trim() && words > 3) || it.original.length > Math.max(60, block.text.length * 0.6) || sugg.length > it.original.length * 3 + 20) continue;
      let from = used.get(block.id + it.original) ?? 0;
      let at = block.text.indexOf(it.original, from);
      if (at < 0) at = block.text.indexOf(it.original);
      if (at < 0) continue;
      used.set(block.id + it.original, at + it.original.length);
      const t = tightenEdit(it.original, it.suggestion ?? '');
      const start = at + t.offset;
      issues.push({ blockId: block.id, start, end: start + t.original.length, replacements: [t.suggestion],
        message: it.explanation || 'Suggested correction.', kind: it.type || 'grammar', rule: 'llm:' + (it.type || 'edit'),
        source: 'llm', insertOnly: t.original.length === 0 });
    }
    onProgress?.((i + 1) / batches.length);
  }
  // Pure insertions have no span to highlight; anchor them on the following word.
  for (const iss of issues) {
    if (!iss.insertOnly) continue;
    const text = blocks.find((b) => b.id === iss.blockId).text;
    const m = /^\S+/.exec(text.slice(iss.start)) || { 0: '' };
    iss.end = iss.start + m[0].length;
    iss.replacements = [iss.replacements[0] + m[0]];
    delete iss.insertOnly;
  }
  return issues;
}

/* ------------------------------------------------------------------ OpenRouter sign-in (PKCE) */

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startOpenRouterLogin() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.setItem('wa-openrouter-verifier', verifier);
  const callback = location.origin + location.pathname;
  location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callback)}&code_challenge=${challenge}&code_challenge_method=S256`;
}

/** If the page was opened by the OpenRouter callback, exchange the code for a key. */
export async function finishOpenRouterLogin() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const verifier = sessionStorage.getItem('wa-openrouter-verifier');
  if (!code || !verifier) return null;
  sessionStorage.removeItem('wa-openrouter-verifier');
  history.replaceState(null, '', location.pathname);
  const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  if (!res.ok) throw new Error(`OpenRouter sign-in failed (${res.status}).`);
  return (await res.json()).key;
}
