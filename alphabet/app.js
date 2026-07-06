// ── DOM References ────────────────────────────────────
const letterEl = document.getElementById('letter');
const promptEl = document.getElementById('prompt');
const displayArea = document.getElementById('display-area');
const wordPanel = document.getElementById('word-panel');
const wordImage = document.getElementById('word-image');
const wordLabel = document.getElementById('word-label');
const btnRowLetters = document.getElementById('btn-row-letters');
const btnRowNumbers = document.getElementById('btn-row-numbers');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');

// ── Data ──────────────────────────────────────────────

/** Alphabet → word + image associations (a-z). */
const alphabetWords = {
  a: { word: 'Apple', image: 'images/apple.png' },
  b: { word: 'Bumble Bee', image: 'images/bee.png' },
  c: { word: 'Cat', image: 'images/cat.png' },
  d: { word: 'Dog', image: 'images/dog.png' },
  e: { word: 'Elephant', image: 'images/elephant.png' },
  f: { word: 'Fish', image: 'images/fish.png' },
  g: { word: 'Grapes', image: 'images/grapes.png' },
  h: { word: 'Horse', image: 'images/horse.png' },
  i: { word: 'Ice Cream', image: 'images/icecream.png' },
  j: { word: 'Jellyfish', image: 'images/jellyfish.png' },
  k: { word: 'Kite', image: 'images/kite.png' },
  l: { word: 'Lion', image: 'images/lion.png' },
  m: { word: 'Moon', image: 'images/moon.png' },
  n: { word: 'Nest', image: 'images/nest.png' },
  o: { word: 'Orange', image: 'images/orange.png' },
  p: { word: 'Penguin', image: 'images/penguin.png' },
  q: { word: 'Queen', image: 'images/queen.png' },
  r: { word: 'Rainbow', image: 'images/rainbow.png' },
  s: { word: 'Sun', image: 'images/sun.png' },
  t: { word: 'Turtle', image: 'images/turtle.png' },
  u: { word: 'Umbrella', image: 'images/umbrella.png' },
  v: { word: 'Violin', image: 'images/violin.png' },
  w: { word: 'Whale', image: 'images/whale.png' },
  x: { word: 'Xylophone', image: 'images/xylophone.png' },
  y: { word: 'Yak', image: 'images/yak.png' },
  z: { word: 'Zebra', image: 'images/zebra.png' },
};

/** Number → hand-counting image (0-9). */
const numberImages = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [String(i), `images/hands_${i}.png`])
);

/** Ordered sequence for auto-play: a-z then 0-9. */
const AUTO_PLAY_SEQUENCE = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  ...'0123456789'.split(''),
];

/** Spoken names for special / non-printable keys. */
const keyNames = {
  ' ': 'space',
  'Enter': 'enter',
  'Backspace': 'backspace',
  'Tab': 'tab',
  'Escape': 'escape',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'CapsLock': 'caps lock',
  'Shift': 'shift',
  'Control': 'control',
  'Alt': 'alt',
  'Meta': 'command',
  'Delete': 'delete',
};

/** Display symbols for special keys. */
const displayNames = {
  ' ': '␣',
  'Enter': '⏎',
  'Backspace': '⌫',
  'Tab': '⇥',
  'Escape': 'Esc',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
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

window.speechSynthesis.addEventListener('voiceschanged', () => {
  bestVoice = pickBestVoice();
});
bestVoice = pickBestVoice();

/**
 * Speak one or more words sequentially via the Web Speech API.
 * Accepts a single string or an array of strings (with pauses between each).
 * Calls onDone() when all parts have finished (optional callback).
 */
function speak(words, onDone) {
  window.speechSynthesis.cancel();

  // iOS Safari: synthesis can get stuck in paused state — always resume first
  window.speechSynthesis.resume();

  isSpeaking = true;

  const parts = Array.isArray(words) ? words : [words];
  let index = 0;

  function onFinished() {
    index++;
    if (index < parts.length) {
      setTimeout(speakNext, WORD_PAUSE_MS);
    } else {
      isSpeaking = false;
      if (onDone) onDone();
    }
  }

  function speakNext() {
    if (index >= parts.length) { isSpeaking = false; if (onDone) onDone(); return; }

    const utterance = new SpeechSynthesisUtterance(parts[index]);
    if (bestVoice) utterance.voice = bestVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    let handled = false;
    let keepAlive; // declared before onend so the closure can clear it

    utterance.onend = () => {
      if (!handled) {
        handled = true;
        clearInterval(keepAlive);
        onFinished();
      }
    };
    utterance.onerror = () => {
      clearInterval(keepAlive);
      isSpeaking = false;
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utterance);

    // iOS bug: WebKit silently pauses synthesis ~30 s into a session.
    // Calling resume() every 250 ms keeps the audio session alive.
    keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 250);

    // Poll fallback (Chrome fires onend late)
    const poll = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(poll);
        clearInterval(keepAlive);
        if (!handled) { handled = true; onFinished(); }
      }
    }, 50);
  }

  speakNext();
}

// ── Helpers ───────────────────────────────────────────

/** Show the word/image panel. */
function showWordPanel(src, alt, label, isNumber) {
  wordImage.classList.toggle('number-hands', !!isNumber);
  wordImage.src = src;
  wordImage.alt = alt;
  wordLabel.textContent = label || '';
  wordPanel.classList.add('show');
}

/** Highlight the on-screen button for the active character. */
function setActiveButton(char) {
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-${char}`);
  if (btn) btn.classList.add('active');
}

/**
 * Core display + speech routine.
 * @param {string} char  - the raw character (lowercase letter or digit string)
 * @param {Function} [onDone] - called after speech finishes (used by auto-play)
 */
function triggerChar(char, onDone) {
  if (isSpeaking) return;

  const lowerChar = char.toLowerCase();
  const displayChar = lowerChar.length === 1 ? lowerChar.toUpperCase() : lowerChar;

  const wordInfo = alphabetWords[lowerChar];
  const numberImg = numberImages[char];

  let spokenText;
  if (wordInfo) {
    // Speak the letter as lowercase so iOS doesn't prefix it with "capital"
    spokenText = [lowerChar, 'for', wordInfo.word];
  } else {
    spokenText = char;
  }

  promptEl.classList.add('hidden');
  setActiveButton(lowerChar);

  // ── iOS fix ───────────────────────────────────────────────────────────────
  // iOS Safari requires speechSynthesis.speak() to be called SYNCHRONOUSLY
  // within the user-gesture handler. Putting it inside a setTimeout breaks
  // the gesture chain and iOS silently blocks all audio.
  // Solution: speak immediately, delay only the visual DOM update.
  // ─────────────────────────────────────────────────────────────────────────
  speak(spokenText, onDone);

  // Visual update is still delayed for the nice "look then show" effect
  setTimeout(() => {
    letterEl.textContent = displayChar;
    displayArea.classList.add('show');

    if (wordInfo) {
      showWordPanel(wordInfo.image, wordInfo.word, wordInfo.word, false);
    } else if (numberImg) {
      showWordPanel(numberImg, `${char} fingers`, '', true);
    } else {
      wordPanel.classList.remove('show');
    }
  }, DISPLAY_DELAY_MS);
}

// ── Input handling ────────────────────────────────────

/** Delay (ms) before displaying content after a keypress / tap. */
const DISPLAY_DELAY_MS = 1000;

document.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (isAutoPlaying) return;       // keyboard disabled during auto-play
  if (isSpeaking) return;
  if (MODIFIER_KEYS.has(e.key)) return;

  const key = e.key;

  // For letter/digit keys, delegate to triggerChar
  const lowerKey = key.toLowerCase();
  if (alphabetWords[lowerKey] || numberImages[key]) {
    triggerChar(lowerKey === key ? key : lowerKey);
    return;
  }

  // ── Fallback for special / other keys (original behaviour) ──
  isSpeaking = true;

  let displayChar = displayNames[key] || key;
  if (displayChar.length === 1) displayChar = displayChar.toUpperCase();

  let single = keyNames[key] || key;
  if (single.length === 1) single = single.toUpperCase();

  promptEl.classList.add('hidden');

  setTimeout(() => {
    letterEl.textContent = displayChar;
    displayArea.classList.add('show');
    wordPanel.classList.remove('show');
    speak(single);
  }, DISPLAY_DELAY_MS);
});

// ── On-screen buttons ─────────────────────────────────

/** How long (ms) a finger/cursor must hover before activating a button. */
const HOVER_DWELL_MS = 800;

/**
 * Attach hover-dwell behaviour to a button.
 * After HOVER_DWELL_MS of continuous hover the button fires as if clicked.
 * Works for both mouse (mouseenter/mouseleave) and touch (touchstart/touchend).
 */
function addHoverDwell(btn, activate) {
  let dwellTimer = null;

  function startDwell() {
    if (dwellTimer) return;
    btn.classList.add('dwell-active');
    dwellTimer = setTimeout(() => {
      dwellTimer = null;
      btn.classList.remove('dwell-active');
      activate();
    }, HOVER_DWELL_MS);
  }

  function cancelDwell() {
    if (dwellTimer) {
      clearTimeout(dwellTimer);
      dwellTimer = null;
    }
    btn.classList.remove('dwell-active');
  }

  btn.addEventListener('mouseenter', startDwell);
  btn.addEventListener('mouseleave', cancelDwell);
  // Touch: start dwell on touchstart; cancel if finger moves away
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); startDwell(); }, { passive: false });
  btn.addEventListener('touchend', cancelDwell);
  btn.addEventListener('touchcancel', cancelDwell);
}

function buildButtons() {
  // Letters A–Z
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'char-btn letter-btn';
    btn.id = `btn-${ch}`;
    btn.textContent = ch.toUpperCase();
    const activate = () => {
      if (isAutoPlaying) return;
      if (isSpeaking) return;
      triggerChar(ch);
    };
    btn.addEventListener('click', activate);
    addHoverDwell(btn, activate);
    btnRowLetters.appendChild(btn);
  });

  // Numbers 0–9
  '0123456789'.split('').forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'char-btn number-btn';
    btn.id = `btn-${ch}`;
    btn.textContent = ch;
    const activate = () => {
      if (isAutoPlaying) return;
      if (isSpeaking) return;
      triggerChar(ch);
    };
    btn.addEventListener('click', activate);
    addHoverDwell(btn, activate);
    btnRowNumbers.appendChild(btn);
  });
}

// ── Auto-play ─────────────────────────────────────────

let isAutoPlaying = false;
let autoPlayIndex = 0;
let autoPlayTimer = null;

/** How long (ms) to pause between characters during auto-play. */
const AUTO_PLAY_PAUSE_MS = 600;

function startAutoPlay() {
  isAutoPlaying = true;
  playIcon.innerHTML = '&#9646;&#9646;'; // ❚❚ pause
  playBtn.classList.add('playing');
  scheduleNext();
}

function stopAutoPlay() {
  isAutoPlaying = false;
  clearTimeout(autoPlayTimer);
  window.speechSynthesis.cancel();
  isSpeaking = false;
  playIcon.innerHTML = '&#9654;'; // ▶ play
  playBtn.classList.remove('playing');
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
}

function scheduleNext() {
  if (!isAutoPlaying) return;

  const char = AUTO_PLAY_SEQUENCE[autoPlayIndex];

  // Advance index (wrap around for infinite loop)
  autoPlayIndex = (autoPlayIndex + 1) % AUTO_PLAY_SEQUENCE.length;

  triggerChar(char, () => {
    // After speech finishes, wait a beat then move to next
    if (isAutoPlaying) {
      autoPlayTimer = setTimeout(scheduleNext, AUTO_PLAY_PAUSE_MS);
    }
  });
}

playBtn.addEventListener('click', () => {
  if (isAutoPlaying) {
    stopAutoPlay();
  } else {
    autoPlayIndex = 0;    // always restart from A
    startAutoPlay();
  }
});

// ── Preload & warm-up on page load ────────────────────

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
  buildButtons();
  preloadImages();

  // Warm up speech synthesis
  const warm = new SpeechSynthesisUtterance('');
  warm.volume = 0;
  window.speechSynthesis.speak(warm);
});
