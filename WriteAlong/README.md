# Write Along

Write Along is an offline-first word processor that runs as a static web page. Documents are opened, edited and saved in the browser; there is no backend, no account and no cloud storage.

## The file format

A Write Along document is an ordinary `.zip`:

```
My Essay.zip
├── text.md        all of the content (GitHub-flavoured Markdown + optional YAML front matter)
├── template.css   all of the formatting for the rendered Markdown
└── images/        pictures referenced from text.md as images/<name>
```

Conventions inside `text.md` (they match pandoc's where possible):

| Markdown                                   | Meaning                                   |
| ------------------------------------------ | ----------------------------------------- |
| YAML `title`, `subtitle`, `author`, `date`, `abstract` | Title block (`header#title-block-header`) |
| `![Caption](images/x.png)` on its own line | Figure with a caption                     |
| `\newpage`                                 | Page break (`div.page-break`)             |
| `[TOC]`                                    | Generated table of contents (`nav.toc`)   |

Any other front-matter keys are kept as they are. The app also opens plain `.md`, `.txt` and `.html` files and can export PDF (via print), a self-contained HTML file with fonts and images embedded, Markdown, plain text, and the stylesheet.

## Page view and paper

By default the editor shows the document as the pages it will print on. It uses the page size and margins from `template.css` and applies the template's `@media print` rules. Paragraphs split across pages exactly where printing splits them. Each page is a fragment of a wrapping multi-column layout (`column-height` + `column-wrap`, Chrome/Edge 145+), so the browser's own print fragmentation engine decides the breaks. Browsers without `column-wrap` get one long sheet with guide lines where each page would end. Those positions are approximate.

The status bar shows "Page n of m", the page size, and buttons for page view and paper brightness. The page size menu (also under View → Page size and in the Style panel) writes `--page-width`, `--page-min-height` and `@page { size }` into `template.css`, so printing uses the same size. Page view itself is a display preference and is not saved in the document.

Paper brightness is screen-only; printing and exports keep the real colours. The options are:

- **Automatic:** bright paper with a light interface, dimmed paper with a dark one.
- **Bright**
- **Dimmed**
- **Dark:** colours inverted with hues preserved, and images kept natural.

## Proofreading and AI

| Engine | Runs where | Notes |
| --- | --- | --- |
| Browser spell check | Device | Built into the browser (red squiggles, right-click for suggestions). |
| Built-in rules | Device | Instant "pre-LLM" checks: common misspellings, confusions (*could of*, *more then*), a/an, repeated words, spacing, capitalisation, wordiness and redundancy. Passive voice, long sentences and typography are optional. |
| [Harper](https://writewithharper.com) | Device | Open-source grammar checker compiled to WebAssembly. About 8 MB (gzip) is downloaded the first time it is switched on, then it works offline. |
| [LanguageTool](https://languagetool.org) | Public API, Premium, or self-hosted | Self-host it with `docker run -d -p 8081:8010 erikvl87/languagetool`. |
| Chrome built-in AI | Device | Uses the Proofreader, Prompt (`LanguageModel`), Rewriter, Writer and Summarizer APIs (Gemini Nano). |
| Local servers | Your machine | Ollama, LM Studio, llama.cpp, Jan, LocalAI, vLLM, KoboldCpp, text-generation-webui, or any OpenAI-compatible URL. |
| Cloud providers | Provider | OpenAI, Anthropic, Google Gemini, OpenRouter (API key or "Sign in with OpenRouter" via PKCE), Mistral, Groq, DeepSeek, xAI, Together, or a custom endpoint with your own key. |

API keys are kept in the browser's `localStorage`. Requests go straight from the browser to the provider you pick and nowhere else.

**How AI proofreading works.** There are two methods:

- **Explained issues:** the model returns a JSON list of errors with explanations. Large cloud models do this well.
- **Corrected text:** the model just returns the corrected paragraph. Write Along then compares it with the original word by word and turns each difference into a suggestion. Changes that are really rewrites are discarded: more than half the words changed, or a whole phrase deleted.

"Automatic" uses explained issues for cloud providers and corrected text for on-device and local models. Small models can't reliably produce structured lists. Tested with Ollama:

- `gemma3:1b` with corrected text found all 12 errors in a test paragraph (about 9 s on CPU). The same model in explained-issues mode found none.
- `gemma3:270m` runs but makes wrong suggestions, so it isn't recommended for proofreading.

**Rewriting and restyling with AI.**

*Rewrite whole document* (AI panel) applies an instruction to the entire document, such as "more formal", "plain English", "shorten by half" or "translate into Spanish".

- **Long documents** are sent section by section: up to about 30,000 characters per request for cloud models, 6,000 for local ones and 2,500 for Chrome's on-device model.
- **Title block:** with local and on-device models it is left unchanged.
- **Markers:** a `[TOC]` marker the model drops is put back. You get a warning if images or page breaks were removed, or if the length changed a lot.
- **Review:** a word-level diff opens before you choose Keep or Revert.

*Restyle with AI* (Style panel) changes `template.css` from a description.

- **Cloud models** add CSS rules ("Adjust") or write a whole new stylesheet ("Redesign").
- **Local and on-device models** can't write reliable CSS. In "Adjust" they only pick settings from a fixed list: bundled fonts, size, line spacing, colours, heading rules, justification and paragraph spacing. The app turns those settings into CSS. Colours named in the request ("navy headings", "off-white page") are applied directly.
- **Safety checks:**
  - Colours that would make text unreadable are dropped.
  - Rules that change nothing are removed.
  - Page size and margins are changed only when the request mentions them.
  - `@import` and external URLs are always stripped.

Both features apply the change straight away, then show a Keep / Revert bar.

**Connecting to local servers.** Settings → AI models checks the connection live. If the model is left empty, Write Along uses one that is installed (Ollama's default suggestion is no longer `llama3.2`). When something is wrong it says which of four problems it is, with copyable fix commands for your OS:

- **Not reachable:** the server isn't running, or it's on a different port.
- **Blocked by CORS:** the server is running but doesn't allow this site.
- **No models installed:** on Linux, the `ollama` system service keeps its models in `/usr/share/ollama/.ollama`, but an `ollama serve` started by hand uses `~/.ollama`. The two see different models.
- **Model not installed:** the model you picked isn't on the server.

**Local servers and CORS.** A browser can only call a local server that allows the site's origin. For example, start Ollama with:

```sh
OLLAMA_ORIGINS="https://your-site.example" ollama serve
```

LM Studio has a "CORS" switch in its server settings. Chrome lets HTTPS pages call `http://localhost`, though newer versions ask for permission first (the "local network access" prompt). Safari may block calls from HTTPS pages to plain-HTTP servers; if it does, put the local server behind HTTPS.

## Deploying

This repository is the deployable site; there is no compile step. The only build step regenerates the offline manifest:

```sh
node tools/build.mjs      # run after any change, before uploading
```

Upload everything except `tools/` and this README to any static host: GitHub Pages, Netlify, Cloudflare Pages, S3/CloudFront, or nginx. Paths are relative, so the site also works from a sub-folder. The host must serve `.wasm` as `application/wasm`; most hosts already do.

### Offline support and bandwidth

`sw.js` is a service worker with a content-hashed precache of about 1.4 MB: the app, the fonts and the templates. After the first visit:

- Reloads are served from the device. The only network request is the browser's check for a changed `sw.js`, a few kilobytes that usually comes back `304 Not Modified`.
- When you deploy a new version, the browser downloads only the files whose hash changed. Unchanged files are copied from the old cache, and the user sees a "new version ready, reload" prompt.
- The Harper engine (about 20 MB raw, about 8 MB gzipped) is cached on demand, only for people who switch it on. It is not downloaded again when the app updates unless Harper itself changed.

Run it locally with any static server, for example `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Templates

`templates/<id>/template.css` and `templates/<id>/sample.md` hold the bundled templates: Clean, LaTeX Article, Academic Paper (two-column), Modern Report, Book, Formal Letter, Résumé and Manuscript. The comment at the top of each stylesheet documents the Markdown structure it expects.

To add a template:

1. Create `templates/<id>/template.css` and `templates/<id>/sample.md`.
2. List the template in `js/templates.js`.
3. Re-run the build.

Templates control page geometry only through these variables on `:root`:

- `--page-width`
- `--page-min-height`
- `--page-padding`
- `--page-background`
- `--desk-background`

Each template also needs an `@page` rule for printing. The Style panel's quick settings override `--font-body`, `--font-heading`, `--font-size`, `--line-height` and `--accent`.

Bundled fonts (SIL OFL), latin subsets: Computer Modern Unicode, EB Garamond, Inter, Source Serif 4 and JetBrains Mono. They live in `fonts/fonts.css`. A `template.css` names them with system fallbacks, so a document still looks reasonable outside the app.

## Project layout

```
index.html, css/app.css     application shell and UI
css/page.css                "paper on a desk" page chrome, also used in HTML export
js/app.js                   wiring: menus, files, autosave, modes, service worker
js/editor.js                contenteditable editor inside an iframe styled by template.css
js/markdown.js              Markdown ⇄ editor DOM (marked + a custom serialiser)
js/zip.js                   zip reader/writer on native Compression Streams
js/files.js                 open/save (File System Access API or download) and export
js/proof/                   rules, Harper, LanguageTool, Chrome AI, LLM providers, engine
js/ui/                      side panels, settings, dialogs
templates/                  bundled templates
vendor/                     marked (MIT), Harper (Apache-2.0)
```
