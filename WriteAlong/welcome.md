---
title: Welcome to Write Along
subtitle: A private word processor that works offline
---

Write Along is a word processor that lives entirely in your browser. There is no account and no cloud storage: you open, edit and save files on your own device, and after the first visit it keeps working without an internet connection.

[TOC]

## Your document is a simple zip

When you press **Save**, Write Along writes a `.zip` file containing:

- `text.md` — every word you write, as plain Markdown that any editor can read
- `template.css` — all of the formatting, so the look travels with the file
- `images/` — any pictures you paste or drop in

Because the content and the style are separate, you can change the whole look of a document in one click without touching the text.

## Writing

Just type. The toolbar and the **Format** menu cover the usual things, and Markdown shortcuts work as you type:

| Type this            | To get          |
| -------------------- | --------------- |
| `#` then space       | Heading 1       |
| `##` then space      | Heading 2       |
| `-` then space       | Bulleted list   |
| `1.` then space      | Numbered list   |
| `[ ]` then space     | Checklist       |
| `>` then space       | Quote           |
| ```` ``` ```` + Enter | Code block      |

- [x] Paste or drop images straight into the page
- [x] Switch to **Markdown** view at any time to edit the source
- [ ] Click the title above to edit the document properties

> Tip: press F7 to check the whole document, or Ctrl+/ for every keyboard shortcut.

## Proofreading, your way

Open the **Proofread** panel on the right. Suggestions are underlined in the text — click one to fix it. You can mix and match engines:

1. **Your browser’s spell checker** — always on, right-click a word for suggestions.
2. **Built-in rules** — instant, offline checks for common slips such as “could of” or “a apple”.
3. **Harper** — an open-source grammar checker that runs offline once downloaded.
4. **LanguageTool** — the public service, a premium account, or your own server.
5. **Chrome built-in AI** — Gemini Nano, running on your device.
6. **Any AI model** — Ollama, LM Studio, llama.cpp and other local servers, or cloud providers such as OpenAI, Anthropic, Gemini, Mistral, Groq and OpenRouter with your own key.

The **AI** panel can also rewrite, shorten, expand or summarise text using whichever model you choose.

## Make it beautiful

Open **File → New from template…** to start from a LaTeX-style article, an academic paper, a report, a book, a letter, a résumé or a manuscript. The **Style** panel lets you change fonts, size, spacing, page size and margins, or edit `template.css` directly.

When you are done, use **File → Export** for a PDF, a self-contained web page, Markdown or plain text.

---

Happy writing! This welcome guide is a normal document: edit it, delete it, or start a **New document** from the File menu.
