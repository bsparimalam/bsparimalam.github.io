// ── DOM References ────────────────────────────────────
const letterEl    = document.getElementById('letter');
const promptEl    = document.getElementById('prompt');
const displayArea = document.getElementById('display-area');
const wordPanel   = document.getElementById('word-panel');
const wordImage   = document.getElementById('word-image');
const wordLabel   = document.getElementById('word-label');

// ── Data ──────────────────────────────────────────────

/** Alphabet → word + image associations (a-z). */
const alphabetWords = {
  a: { word: 'Apple',      image: 'images/apple.png' },
  b: { word: 'Bee',        image: 'images/bee.png' },
  c: { word: 'Cat',        image: 'images/cat.png' },
  d: { word: 'Dog',        image: 'images/dog.png' },
  e: { word: 'Elephant',   image: 'images/elephant.png' },
  f: { word: 'Fish',       image: 'images/fish.png' },
  g: { word: 'Grapes',     image: 'images/grapes.png' },
  h: { word: 'Horse',      image: 'images/horse.png' },
  i: { word: 'Ice Cream',  image: 'images/icecream.png' },
  j: { word: 'Jellyfish',  image: 'images/jellyfish.png' },
  k: { word: 'Kite',       image: 'images/kite.png' },
  l: { word: 'Lion',       image: 'images/lion.png' },
  m: { word: 'Moon',       image: 'images/moon.png' },
  n: { word: 'Nest',       image: 'images/nest.png' },
  o: { word: 'Orange',     image: 'images/orange.png' },
  p: { word: 'Penguin',    image: 'images/penguin.png' },
  q: { word: 'Queen',      image: 'images/queen.png' },
  r: { word: 'Rainbow',    image: 'images/rainbow.png' },
  s: { word: 'Sun',        image: 'images/sun.png' },
  t: { word: 'Turtle',     image: 'images/turtle.png' },
  u: { word: 'Umbrella',   image: 'images/umbrella.png' },
  v: { word: 'Violin',     image: 'images/violin.png' },
  w: { word: 'Whale',      image: 'images/whale.png' },
  x: { word: 'Xylophone',  image: 'images/xylophone.png' },
  y: { word: 'Yak',        image: 'images/yak.png' },
  z: { word: 'Zebra',      image: 'images/zebra.png' },
};

/** Number → hand-counting image (0-9). */
const numberImages = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [String(i), `images/hands_${i}.png`])
);

/** Spoken names for special / non-printable keys. */
const keyNames = {
  ' ':          'space',
  'Enter':      'enter',
  'Backspace':  'backspace',
  'Tab':        'tab',
  'Escape':     'escape',
  'ArrowUp':    'up',
  'ArrowDown':  'down',
  'ArrowLeft':  'left',
  'ArrowRight': 'right',
  'CapsLock':   'caps lock',
  'Shift':      'shift',
  'Control':    'control',
  'Alt':        'alt',
  'Meta':       'command',
  'Delete':     'delete',
};

/** Display symbols for special keys. */
const displayNames = {
  ' ':          '␣',
  'Enter':      '⏎',
  'Backspace':  '⌫',
  'Tab':        '⇥',
  'Escape':     'Esc',
  'ArrowUp':    '↑',
  'ArrowDown':  '↓',
  'ArrowLeft':  '←',
  'ArrowRight': '→',
};

/** Keys that are pure modifiers (never displayed on their own). */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

// ── Speech ────────────────────────────────────────────

let isSpeaking = false;

/** Pause duration (ms) between sequential spoken words. */
const WORD_PAUSE_MS = 300;

/** Cached reference to the best available voice. */
let bestVoice = null;

/**
 * Pick the highest-quality English voice available.
 * Priority: Google US English > Google UK English > any Google voice >
 *           any voice with "Natural" / "Enhanced" in the name >
 *           any en-US voice > first English voice > default.
 */
function pickBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Priority tiers — first match wins
  const tiers = [
    v => v.name === 'Google US English',
    v => v.name === 'Google UK English Female',
    v => v.name === 'Google UK English Male',
    v => /^Google/.test(v.name) && /en/i.test(v.lang),
    v => /natural|enhanced|premium/i.test(v.name) && /en/i.test(v.lang),
    v => v.lang === 'en-US',
    v => /^en/i.test(v.lang),
  ];

  for (const test of tiers) {
    const found = voices.find(test);
    if (found) return found;
  }
  return null;
}

/** Re-evaluate best voice whenever the voice list changes. */
window.speechSynthesis.addEventListener('voiceschanged', () => {
  bestVoice = pickBestVoice();
});
// Also try immediately (some browsers populate synchronously)
bestVoice = pickBestVoice();

/**
 * Speak one or more words sequentially via the Web Speech API.
 * Accepts a single string or an array of strings (with pauses between each).
 * Uses a polling fallback because Chrome fires `onend` late.
 */
function speak(words) {
  window.speechSynthesis.cancel();
  isSpeaking = true;

  const parts = Array.isArray(words) ? words : [words];
  let index = 0;

  function onFinished() {
    index++;
    if (index < parts.length) {
      setTimeout(speakNext, WORD_PAUSE_MS);
    } else {
      isSpeaking = false;
    }
  }

  function speakNext() {
    if (index >= parts.length) { isSpeaking = false; return; }

    const utterance = new SpeechSynthesisUtterance(parts[index]);

    // Use the best voice we found, or fall back to the browser default
    if (bestVoice) utterance.voice = bestVoice;

    utterance.rate   = 0.9;   // slightly slower for clarity
    utterance.pitch  = 1.0;   // natural pitch (no cartoon-ish warble)
    utterance.volume = 1;

    let handled = false;
    utterance.onend   = () => { if (!handled) { handled = true; onFinished(); } };
    utterance.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utterance);

    // Poll to detect speech end faster (Chrome fires onend late)
    const poll = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(poll);
        if (!handled) { handled = true; onFinished(); }
      }
    }, 50);
  }

  speakNext();
}

// ── Helpers ───────────────────────────────────────────

/** Show the word/image panel with the given source, alt text, and optional label. */
function showWordPanel(src, alt, label, isNumber) {
  wordImage.classList.toggle('number-hands', !!isNumber);
  wordImage.src = src;
  wordImage.alt = alt;
  wordLabel.textContent = label || '';
  wordPanel.classList.add('show');
}

// ── Input handling ────────────────────────────────────

/** Delay (ms) before displaying content after a keypress. */
const DISPLAY_DELAY_MS = 1000;

document.addEventListener('keydown', (e) => {
  e.preventDefault();

  if (isSpeaking) return;
  if (MODIFIER_KEYS.has(e.key)) return;

  // Lock immediately so key repeats during the delay are ignored
  isSpeaking = true;

  const key      = e.key;
  const lowerKey = key.toLowerCase();

  // Determine display character
  let displayChar = displayNames[key] || key;
  if (displayChar.length === 1) displayChar = displayChar.toUpperCase();

  // Determine what to speak
  const wordInfo = alphabetWords[lowerKey];
  let spokenText;
  if (wordInfo) {
    spokenText = [displayChar, 'for', wordInfo.word];
  } else {
    let single = keyNames[key] || key;
    if (single.length === 1) single = single.toUpperCase();
    spokenText = single;
  }

  // Hide idle prompt
  promptEl.classList.add('hidden');

  // Delay before showing — gives time to look at the screen
  setTimeout(() => {
    letterEl.textContent = displayChar;
    displayArea.classList.add('show');

    // Show word panel for letters, hand images for numbers, or hide
    const numberImg = numberImages[key];
    if (wordInfo) {
      showWordPanel(wordInfo.image, wordInfo.word, wordInfo.word, false);
    } else if (numberImg) {
      showWordPanel(numberImg, `${key} fingers`, '', true);
    } else {
      wordPanel.classList.remove('show');
    }

    speak(spokenText);
  }, DISPLAY_DELAY_MS);
});

// ── Preload & warm-up on page load ────────────────────

/** Preload all images into the browser cache so they display instantly. */
function preloadImages() {
  const urls = [
    ...Object.values(alphabetWords).map(w => w.image),
    ...Object.values(numberImages),
  ];
  urls.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

window.addEventListener('load', () => {
  preloadImages();

  // Warm up speech synthesis
  const warm = new SpeechSynthesisUtterance('');
  warm.volume = 0;
  window.speechSynthesis.speak(warm);
});
