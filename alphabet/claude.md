# Key Speaker — Alphabet & Number Learning Tool

## Overview

An interactive, full-screen learning tool for young children. When a key is pressed, the character is displayed large on screen with animations and spoken aloud via the Web Speech API. Designed to be distraction-free (plain black background) and child-friendly.

## Project Structure

```
alphabet/
├── index.html      # Minimal markup — no inline CSS or JS
├── style.css       # All styles, animations, and keyframes
├── app.js          # All application logic
├── claude.md       # This file — AI context for future sessions
└── images/
    ├── apple.png … zebra.png    # 26 alphabet word-association images (a-z)
    └── hands_0.png … hands_9.png  # 10 hand-counting images (0-9)
```

## Key Concepts

### Three input categories
1. **Letters (a-z)** — Displays uppercase letter + associated word + image. Speaks: "A … for … Apple".
2. **Numbers (0-9)** — Displays numeral + hand-counting image. Speaks the number.
3. **Special keys** — Displays a symbol (e.g. `⏎` for Enter). Speaks the key name.

### Speech system (`speak()`)
- Uses the **Web Speech API** (`SpeechSynthesisUtterance`).
- Accepts a single string or an **array of strings** — each spoken sequentially with a configurable pause (`WORD_PAUSE_MS`).
- Includes a **polling fallback** (50ms interval) because Chrome fires `onend` late, which would otherwise block input.
- The `isSpeaking` flag **locks input** during speech and during the display delay to prevent overlapping animations.

### Display delay
- A **1-second delay** (`DISPLAY_DELAY_MS`) between keypress and content appearing gives the child time to look at the screen.
- Input is locked immediately on keypress (before the delay) to prevent key-repeat noise.

### Display style
- No bounce/pop/particle animations — content simply appears via a smooth CSS opacity transition (`0.3s ease`).
- The idle prompt fades out on first keypress (`transition: opacity 0.4s ease`).

### Helper patterns
- `showWordPanel(src, alt, label, isNumber)` — sets up the word/image panel in one call.

## Design Decisions

- **No build tools / bundler** — this is a static site served by opening `index.html` directly or via a simple server.
- **No frameworks** — vanilla HTML/CSS/JS keeps it fast and dependency-free.
- **Black background** — deliberately plain to minimize distraction for a toddler.
- **Image preloading** — all 36 images are loaded into the browser cache on page load (`preloadImages()`) to eliminate flash/pop-in when a key is first pressed.
- **Modifier keys ignored** — Shift, Ctrl, Alt, Meta are filtered out since they have no educational value.
- **`numberImages` generated programmatically** — `Object.fromEntries(Array.from(...))` instead of a manual 10-entry object.

## Common Modifications

| Task | Where to change |
|---|---|
| Change a word association | `alphabetWords` in `app.js` (images are preloaded automatically) |
| Add/replace an image | Drop PNG into `images/`, update the matching entry in `alphabetWords` or `numberImages` |
| Adjust speech speed/pitch | `utterance.rate` / `utterance.pitch` in `speak()` |
| Change display delay | `DISPLAY_DELAY_MS` constant in `app.js` |
| Change pause between words | `WORD_PAUSE_MS` constant in `app.js` |
| Add new special key names | Add to `keyNames` and/or `displayNames` objects |
| Adjust fade speed | Change `transition` duration on `#display-area` in `style.css` |
| Change font | Update the Google Fonts `<link>` in `index.html` and `font-family` in `style.css` |
