// Settings dialog: proofreading engines, AI providers, and general preferences.
import { h, fill, icon, openDialog, toast } from './dom.js';
import { PROVIDERS, providerById, resolveProvider, listModels, chat, startOpenRouterLogin, isLocalProvider, checkProvider } from '../proof/llm.js';
import { CHROME_APIS, chromeAvailability, chromeCreate } from '../proof/chrome-ai.js';
import { initHarper } from '../proof/harper.js';
import { languageToolCheck, LT_PUBLIC, LT_PREMIUM } from '../proof/languagetool.js';
import { RULE_GROUPS } from '../proof/rules.js';

export const LANGUAGES = [
  ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['en-AU', 'English (Australia)'], ['en-CA', 'English (Canada)'],
  ['en-IN', 'English (India)'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['es-ES', 'Español'], ['it-IT', 'Italiano'],
  ['pt-BR', 'Português (Brasil)'], ['pt-PT', 'Português (Portugal)'], ['nl-NL', 'Nederlands'], ['pl-PL', 'Polski'],
  ['sv-SE', 'Svenska'], ['da-DK', 'Dansk'], ['nb-NO', 'Norsk'], ['fi-FI', 'Suomi'], ['ru-RU', 'Русский'], ['uk-UA', 'Українська'],
  ['ca-ES', 'Català'], ['ja-JP', '日本語'], ['zh-CN', '中文'],
];

const HARPER_DIALECT = { 'en-US': 'American', 'en-GB': 'British', 'en-AU': 'Australian', 'en-CA': 'Canadian', 'en-IN': 'Indian' };

function sw(label, desc, checked, onchange) {
  return h('label.switch', h('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked) }),
    h('span.sw-text', h('b', label), desc ? h('small', desc) : null));
}

function field(label, control, hint) {
  return h('label.field', h('span', label), control, hint ? h('small', hint) : null);
}

function pill(state) {
  const map = {
    available: ['ok', 'Ready'], downloadable: ['warn', 'Download needed'], downloading: ['warn', 'Downloading…'],
    unavailable: ['bad', 'Unavailable on this device'], unsupported: ['bad', 'Not supported in this browser'],
  };
  const [cls, text] = map[state] || ['', state];
  return h('span.status-pill.' + (cls || 'x'), text);
}

/** Renders troubleshooting steps with copyable commands. */
export function helpSteps(steps) {
  return steps.map((st) => h('div', { style: { margin: '8px 0' } },
    h('div', { style: { fontSize: '12.5px' } }, st.text),
    ...st.commands.map((c) => h('div.cmd',
      h('pre', c),
      h('button.btn.small', { type: 'button', title: 'Copy', onclick: () => navigator.clipboard.writeText(c.replace(/^#.*\n/, '')).then(() => toast('Copied.')) }, icon('copy'))))));
}

const CONN_LABEL = { cors: 'Blocked by CORS', unreachable: 'Not reachable', 'no-models': 'No models installed', 'unknown-model': 'Model not installed' };

export function openSettings({ tab = 'proof', getSettings, saveSettings, onChange, swInfo }) {
  const s = getSettings();
  const save = () => { saveSettings(); onChange?.(); };
  let current = tab;
  const body = h('div');
  const tabs = h('div.settings-tabs');

  const TABS = [['proof', 'Proofreading'], ['ai', 'AI models'], ['general', 'General'], ['privacy', 'Privacy']];

  function renderTabs() {
    fill(tabs, ...TABS.map(([id, label]) => h('button' + (id === current ? '.active' : ''), { type: 'button', onclick: () => { current = id; render(); } }, label)));
  }

  /* ------------------------------------------------------------ proofreading */
  function proofTab() {
    const harperStatus = h('span.status-pill', s.harper ? 'Enabled' : 'Off');
    const ltBox = h('div');
    const renderLt = () => {
      fill(ltBox, 
        field('Server', h('select', { onchange: (e) => { s.languageTool = e.target.value; save(); renderLt(); } },
          [['off', 'Off'], ['public', 'Public API (free, rate-limited)'], ['premium', 'LanguageTool Premium (your account)'], ['custom', 'Self-hosted / local server']]
            .map(([v, l]) => h('option', { value: v, selected: s.languageTool === v }, l)))),
        s.languageTool === 'custom' ? field('Server URL', h('input', { value: s.ltServer, placeholder: 'http://localhost:8081', onchange: (e) => { s.ltServer = e.target.value.trim(); save(); } }),
          'Run your own: docker run -d -p 8081:8010 erikvl87/languagetool  — fully private, no limits.') : null,
        s.languageTool === 'premium' ? h('div.field-row',
          field('Username (email)', h('input', { value: s.ltUsername, onchange: (e) => { s.ltUsername = e.target.value.trim(); save(); } })),
          field('API key', h('input', { type: 'password', value: s.ltApiKey, onchange: (e) => { s.ltApiKey = e.target.value.trim(); save(); } }))) : null,
        s.languageTool !== 'off' ? sw('Picky mode', 'Also report stylistic and typographic issues.', s.ltPicky, (v) => { s.ltPicky = v; save(); }) : null,
        s.languageTool !== 'off' ? h('div.btn-row', h('button.btn.small', { type: 'button', onclick: async (e) => {
          const b = e.currentTarget;
          b.disabled = true;
          try {
            const res = await languageToolCheck([{ id: 't', text: 'This are a test.', kind: 'p' }], {
              server: s.languageTool === 'public' ? LT_PUBLIC : s.languageTool === 'premium' ? LT_PREMIUM : s.ltServer, language: s.lang, username: s.ltUsername, apiKey: s.ltApiKey });
            toast(`LanguageTool works (${res.length} issue${res.length === 1 ? '' : 's'} in the test sentence).`);
          } catch (err) { toast(err.message, { error: true }); }
          b.disabled = false;
        } }, 'Test connection')) : null,
      );
    };
    renderLt();

    const chromeRow = h('div.api-row', h('span', 'Status'), h('span', '…'));
    chromeAvailability('Proofreader', s.lang.slice(0, 2)).then((a) => chromeRow.lastChild.replaceWith(pill(a)));

    return h('div',
      field('Document language', h('select', { onchange: (e) => {
        s.lang = e.target.value;
        if (HARPER_DIALECT[s.lang]) s.harperDialect = HARPER_DIALECT[s.lang];
        save();
      } }, LANGUAGES.map(([v, l]) => h('option', { value: v, selected: s.lang === v }, l))), 'Used by the browser spell checker, LanguageTool and AI models. Harper and the built-in rules are English-only.'),
      h('h3', 'Spelling'),
      sw('Browser spell check', 'Your browser’s built-in dictionary (red squiggles; right-click for suggestions).', s.browserSpellcheck, (v) => { s.browserSpellcheck = v; save(); }),
      h('h3', 'Instant checks'),
      sw('Check as you type', 'Runs the built-in rules and Harper automatically after you pause typing.', s.autoCheck, (v) => { s.autoCheck = v; save(); }),
      ...Object.entries(RULE_GROUPS).map(([k, label]) => sw(`Built-in rules: ${label}`, null, s.rules[k], (v) => { s.rules[k] = v; save(); })),
      h('div.card',
        sw('Harper grammar checker', 'Open-source grammar engine compiled to WebAssembly. One-time ~8 MB download, then fully offline and private.', s.harper, async (v) => {
          s.harper = v;
          save();
          if (v) {
            harperStatus.textContent = 'Loading…';
            try { await initHarper(s.harperDialect, s.dictionary); harperStatus.className = 'status-pill ok'; harperStatus.textContent = 'Ready (offline)'; }
            catch (err) { harperStatus.className = 'status-pill bad'; harperStatus.textContent = err.message; }
          } else harperStatus.textContent = 'Off';
        }),
        h('div.field-row',
          field('Dialect', h('select', { onchange: (e) => { s.harperDialect = e.target.value; save(); } },
            ['American', 'British', 'Australian', 'Canadian', 'Indian'].map((d) => h('option', { selected: s.harperDialect === d }, d)))),
          h('div.field', h('span', 'Status'), harperStatus))),
      h('h3', 'LanguageTool'),
      h('div.card', ltBox),
      h('h3', 'On-device AI'),
      h('div.card',
        sw('Chrome Proofreader API', 'Gemini Nano corrections, entirely on your device (Chrome on desktop).', s.chromeProofreader, (v) => { s.chromeProofreader = v; save(); }),
        chromeRow),
      h('h3', 'AI model'),
      sw('Proofread with the AI model', 'Uses the provider chosen under “AI models” when you press Check document.', s.aiProofread, (v) => { s.aiProofread = v; save(); }),
      field('Method', h('select', { onchange: (e) => { s.aiProofMethod = e.target.value; save(); } },
        [['auto', 'Automatic — explained issues for cloud models, corrected text for local ones'],
          ['json', 'List of issues with explanations (best with large models)'],
          ['diff', 'Corrected text, compared word by word (reliable with small local models)']]
          .map(([v, l]) => h('option', { value: v, selected: s.aiProofMethod === v }, l)))),
      h('h3', 'Personal dictionary'),
      field('Words that should never be flagged (one per line)', h('textarea', { rows: 4, value: s.dictionary.join('\n'), onchange: (e) => { s.dictionary = e.target.value.split('\n').map((w) => w.trim()).filter(Boolean); save(); } })),
    );
  }

  /* ------------------------------------------------------------ AI */
  function aiTab() {
    const box = h('div');
    const chromeBox = h('div.card');

    async function renderChrome() {
      const lang = s.lang.slice(0, 2);
      const rows = await Promise.all(Object.entries(CHROME_APIS).map(async ([name, desc]) => {
        const a = await chromeAvailability(name, lang);
        const bar = h('div.progress', h('i'));
        const btn = (a === 'downloadable' || a === 'downloading') ? h('button.btn.small', { type: 'button', onclick: async () => {
          btn.disabled = true;
          btn.after(bar);
          try {
            const inst = await chromeCreate(name, {}, (p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; }, lang);
            toast(`${name} is ready.`);
            void inst;
          } catch (err) { toast(`${name}: ${err.message}`, { error: true }); }
          renderChrome();
        } }, icon('download'), 'Download') : null;
        return h('div.api-row', h('div', h('b', name), h('div.muted', { style: { fontSize: '12px' } }, desc)), h('div.btn-row', pill(a), btn));
      }));
      fill(chromeBox, 
        h('b', 'Chrome built-in AI'),
        h('p.help', 'Available in desktop Chrome with enough disk space and memory. If an API shows “Not supported”, update Chrome or enable it at chrome://flags (e.g. “Prompt API for Gemini Nano”).'),
        ...rows);
    }

    function render() {
      const p = resolveProvider(s.provider, s.providers);
      const preset = providerById(s.provider);
      const o = (s.providers[preset.id] ||= {});
      const set = (k, v) => { o[k] = v; save(); };
      const modelList = h('datalist', { id: 'model-list' });
      const local = isLocalProvider(p) && preset.kind !== 'chrome';
      const modelInput = h('input', { value: p.model, list: 'model-list', placeholder: local ? 'Automatic — first installed model' : 'Model name', onchange: (e) => set('model', e.target.value.trim()) });
      const modelSlot = h('div.inline-input', { style: { flex: 1 } }, modelInput);
      const conn = h('div.card', { hidden: !local });
      // Live connection check for local servers: status, installed models, and fixes when it fails.
      const checkConnection = async () => {
        if (!local) return;
        fill(conn, h('div.api-row', h('b', 'Connection'), h('span.status-pill', icon('loader-circle', 'spin'), 'Checking…')));
        const r = await checkProvider(resolveProvider(s.provider, s.providers), { fresh: true });
        if (r.ok) {
          const sel = h('select', { onchange: (e) => { set('model', e.target.value); checkConnection(); } },
            h('option', { value: '', selected: !o.model }, `Automatic (${r.auto ? r.model : r.models.find((m) => !/embed/i.test(m)) || r.models[0]})`),
            r.models.map((m) => h('option', { value: m, selected: o.model && (o.model === m || `${o.model}:latest` === m) }, m)));
          fill(modelSlot, sel);
          fill(conn, h('div.api-row', h('b', 'Connection'), h('span.status-pill.ok', `Connected · ${r.models.length} model${r.models.length === 1 ? '' : 's'}`)),
            h('p.help', `Using ${r.model}${r.auto ? ' (picked automatically)' : ''}.`),
            h('div.btn-row', h('button.btn.small', { type: 'button', onclick: checkConnection }, icon('refresh-cw'), 'Check again')));
        } else {
          const e = r.error;
          fill(conn, h('div.api-row', h('b', 'Connection'), h('span.status-pill.bad', CONN_LABEL[e.kind] || 'Error')),
            h('p.help', { style: { color: 'var(--text)' } }, e.message),
            e.help?.length ? helpSteps(e.help) : null,
            h('div.btn-row', h('button.btn.small', { type: 'button', onclick: checkConnection }, icon('refresh-cw'), 'Check again')));
        }
      };
      const keyInput = h('input', { type: 'password', value: o.apiKey || '', placeholder: preset.needsKey ? 'Required' : 'Optional', autocomplete: 'off', onchange: (e) => set('apiKey', e.target.value.trim()) });
      const groups = {};
      for (const x of PROVIDERS) (groups[x.group] ||= []).push(x);

      fill(box, 
        field('Provider', h('select', { onchange: (e) => { s.provider = e.target.value; save(); render(); } },
          Object.entries(groups).map(([g, list]) => h('optgroup', { label: g }, list.map((x) => h('option', { value: x.id, selected: x.id === s.provider }, x.label)))))),
        preset.hint ? h('p.help', preset.hint.replace('{origin}', location.origin)) : null,
        preset.kind === 'chrome' ? null : h('div',
          field('Endpoint URL', h('input', { value: p.baseUrl, placeholder: 'https://…/v1', onchange: (e) => { set('baseUrl', e.target.value.trim()); checkConnection(); } })),
          field('API key', h('div.inline-input', keyInput,
            h('button.btn.small', { type: 'button', onclick: () => { keyInput.type = keyInput.type === 'password' ? 'text' : 'password'; } }, icon('eye'))),
          preset.keyUrl ? h('span', 'Get a key: ', h('a', { href: preset.keyUrl, target: '_blank', rel: 'noopener' }, new URL(preset.keyUrl).host)) : 'Leave empty if your server does not need one.'),
          preset.oauth === 'openrouter' ? h('div.btn-row', { style: { marginBottom: '12px' } },
            h('button.btn.small', { type: 'button', onclick: () => startOpenRouterLogin() }, icon('log-in'), 'Sign in with OpenRouter')) : null,
          local ? null : field('Model', h('div.inline-input', modelInput, h('button.btn.small', { type: 'button', onclick: async (e) => {
            const b = e.currentTarget;
            b.disabled = true;
            try {
              const models = await listModels(resolveProvider(s.provider, s.providers));
              fill(modelList, ...models.map((m) => h('option', { value: m })));
              toast(`${models.length} models available — pick one from the Model box.`);
              modelInput.focus();
            } catch (err) { toast(err.message, { error: true }); }
            b.disabled = false;
          } }, 'Load models')), modelList),
          local ? field('Model', modelSlot) : null,
          conn,
          h('div.field-row',
            field('Temperature', h('input', { type: 'number', min: 0, max: 2, step: 0.1, value: p.temperature, onchange: (e) => set('temperature', parseFloat(e.target.value) || 0) })),
            h('div')),
          preset.id === 'custom' ? field('Extra headers', h('textarea', { rows: 2, value: o.extraHeaders || '', placeholder: 'api-key: …', onchange: (e) => set('extraHeaders', e.target.value) }), 'One “Name: value” per line, e.g. for Azure OpenAI gateways.') : null),
        h('div.btn-row', h('button.btn.small.primary', { type: 'button', onclick: async (e) => {
          const b = e.currentTarget;
          b.disabled = true;
          const t0 = performance.now();
          try {
            const reply = await chat(resolveProvider(s.provider, s.providers), { prompt: 'Reply with the single word: ready', lang: s.lang.slice(0, 2) });
            toast(`${p.label} replied “${reply.trim().slice(0, 40)}” in ${((performance.now() - t0) / 1000).toFixed(1)}s.`);
            checkConnection();
          } catch (err) { toast(err.message, { error: true, timeout: 15000 }); }
          b.disabled = false;
        } }, icon('check'), 'Test connection')),
      );
      checkConnection();
    }
    render();
    renderChrome();
    return h('div', box, h('h3', 'On-device'), chromeBox,
      h('p.help', 'API keys are stored only in this browser (localStorage) and are sent only to the provider you select, directly from your browser.'));
  }

  /* ------------------------------------------------------------ general */
  function generalTab() {
    const storage = h('span.muted', '…');
    navigator.storage?.estimate?.().then(async (e) => {
      const persisted = await navigator.storage.persisted?.();
      storage.textContent = `${(e.usage / 1048576).toFixed(1)} MB used${persisted ? ' · persistent' : ''}`;
    });
    const info = swInfo?.() || {};
    return h('div',
      field('Interface theme', h('select', { onchange: (e) => { s.theme = e.target.value; save(); } },
        [['auto', 'Match system'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => h('option', { value: v, selected: s.theme === v }, l)))),
      h('h3', 'Document view'),
      sw('Page view', 'Show the document as the printed pages it will become, at its page size and margins.', s.pageView, (v) => { s.pageView = v; save(); }),
      field('Paper brightness', h('select', { onchange: (e) => { s.paper = e.target.value; save(); } },
        [['auto', 'Automatic — dimmed when the interface is dark'], ['light', 'Bright paper (as printed)'], ['dim', 'Dimmed paper'], ['dark', 'Dark paper (inverted colours)']]
          .map(([v, l]) => h('option', { value: v, selected: s.paper === v }, l))), 'Only changes how the page looks on screen. Printing and exports always use the real colours.'),
      h('h3', 'Offline & updates'),
      h('div.card',
        h('div.api-row', h('span', 'Offline support'), h('span.status-pill.' + (info.ready ? 'ok' : 'warn'), info.ready ? 'Ready — works without a connection' : 'Not yet available')),
        h('div.api-row', h('span', 'App version'), h('span.muted', info.version || 'development')),
        h('div.api-row', h('span', 'Local storage'), storage),
        h('div.btn-row', { style: { marginTop: '8px' } },
          h('button.btn.small', { type: 'button', onclick: () => info.checkUpdate?.() }, icon('refresh-cw'), 'Check for updates'),
          h('button.btn.small', { type: 'button', onclick: async () => {
            const ok = await navigator.storage?.persist?.();
            toast(ok ? 'Storage is now persistent.' : 'The browser declined persistent storage (it usually grants it to installed apps).');
          } }, 'Make storage persistent'))),
    );
  }

  function privacyTab() {
    return h('div',
      h('p', 'Write Along is a static web app. Your documents are opened, edited and saved entirely in your browser — nothing is uploaded and there is no account.'),
      h('ul',
        h('li', 'Autosave keeps your current document in this browser’s IndexedDB. Use File → Save to write a .zip to disk.'),
        h('li', 'Built-in rules, Harper, browser spell check and Chrome built-in AI run on your device.'),
        h('li', 'LanguageTool (public or premium) and cloud AI providers receive the text you check, only when you ask, using your own account.'),
        h('li', 'Local servers (Ollama, LM Studio, llama.cpp, …) stay on your machine.')),
      h('p.help', 'After the first visit the app is served from a local cache; the server is only contacted to look for updates.'));
  }

  function render() {
    renderTabs();
    fill(body, current === 'proof' ? proofTab() : current === 'ai' ? aiTab() : current === 'general' ? generalTab() : privacyTab());
  }
  render();
  return openDialog('Settings', () => h('div', h('div.dlg-body', tabs, body),
    h('div.dlg-foot', h('button.btn.primary', { type: 'button', onclick: () => document.getElementById('dialog').close() }, 'Done'))));
}
