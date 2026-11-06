// Local persistence: settings in localStorage, the working document in IndexedDB.
// Nothing here ever leaves the browser.

const SETTINGS_KEY = 'write-along:settings';

export const DEFAULT_SETTINGS = {
  lang: 'en-US',
  browserSpellcheck: true,
  autoCheck: true,
  rules: { core: true, style: true, readability: false, typography: false },
  harper: false,
  harperDialect: 'American',
  languageTool: 'off', // off | public | premium | custom
  ltServer: 'http://localhost:8081',
  ltUsername: '',
  ltApiKey: '',
  ltPicky: false,
  chromeProofreader: false,
  aiProofread: false,
  aiProofMethod: 'auto', // auto | json (explained issues) | diff (corrected text, compared word by word)
  provider: 'chrome',
  providers: {},
  dictionary: [],
  sidebar: 'proof',
  sidebarOpen: true,
  theme: 'auto',
  pageView: true,
  paper: 'auto', // auto (dimmed in dark mode) | light | dim | dark
  focusMode: false,
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...structuredClone(DEFAULT_SETTINGS), ...saved, rules: { ...DEFAULT_SETTINGS.rules, ...(saved.rules || {}) } };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let dbPromise = null;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('write-along', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('kv', mode);
    const result = fn(t.objectStore('kv'));
    t.oncomplete = () => resolve(result?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idbGet = (key) => tx('readonly', (s) => s.get(key));
export const idbSet = (key, value) => tx('readwrite', (s) => s.put(value, key));
export const idbDel = (key) => tx('readwrite', (s) => s.delete(key));
