---
title: Write Along Syntax & Template Guide
subtitle: Complete Reference for Authors, Designers, and AI Agents
author: Write Along Documentation
date: Version 2.0.0
category: Reference Manual
abstract: Write Along combines the calm simplicity of GitHub Flavored Markdown with publication-grade CSS typography. Every document is a portable .wa.zip archive containing plain Markdown, CSS, images, a versioned live HTML reader, and an AI-ready syntax reference.
---

[TOC]

## 1. Quick Start in 5 Minutes

Welcome to **Write Along**. Every document you create is stored as a single portable **`.wa.zip`** archive—for example, `quarterly-report.wa.zip`.

1. **Create, name, or open a document**: Use **File → New Document…** to choose a filename and title, click the document name in the topbar (`F2`) to rename inline, browse **Templates → Gallery**, or open an existing `.wa.zip` file from disk (or drag and drop it right onto the editor).
2. **Write in Markdown & manage images**: Edit `content.md` on the left side of Edit Mode using standard GitHub Flavored Markdown—scrolling stays **synced both ways** between `content.md` and the live preview (toggle anytime via **View → Sync Scroll**). Switch to the **`images/`** tab next to `style.css` to upload, preview, rename (auto-updating references), replace, insert, or delete images.
3. **Style & Page Setup**: Open **Edit → Page Setup…** (`Ctrl+Shift+P`) to pick paper size (`Letter`, `A4`, `A5`, `Legal`, `6×9`, or custom), Portrait/Landscape orientation, and margins—or switch to the `style.css` tab to customize any color, font, or selector live.
4. **Preview and Read**: The live preview renders **discrete PDF-like pages** with running headers and page numbers that match print-to-PDF 1-to-1. Press `Ctrl+E` (or click **Read**) to hide the editor and read full-width.
5. **Save, export, or share**: Click **File → Save** (`Ctrl+S`) or **File → Save As…** to write `content.md`, `style.css`, `images/`, live `wa-reader.2.0.0.html`, and `syntax.md` into your `.wa.zip` archive. Export print-ready PDFs anytime via **File → Export PDF (Print)…** (`Ctrl+P`).

> [!TIP]
> You can switch templates at any time without losing a single word. Open **Templates → Gallery** and click **Apply Style** to replace only `style.css` while keeping your `content.md` untouched.

---

## 2. The `.wa.zip` Archive Format

Unlike opaque proprietary formats, a `.wa.zip` document is a standard ZIP archive with plain-text source files at its root:

```text
my-document.wa.zip
├── content.md              # Document text in strict GitHub Flavored Markdown
├── style.css               # Page size, fonts, colors, spacing, and element layout
├── images/                 # Local images referenced as images/figure-1.png
├── wa-reader.2.0.0.html    # Versioned live HTML reader (no embedded copy of content.md)
└── syntax.md               # This reference + template-specific variables & classes
```

Because it is a single ZIP file of standard web & Markdown artifacts:

- You can email, share, upload, or archive it as a **single portable file** without scattered loose folders.
- Unzip it anywhere to inspect or edit `content.md` and `style.css` with **VS Code, Vim, Emacs, or Git**.
- **AI coding assistants** can read `syntax.md`, inspect `style.css`, and help you edit or create custom templates with zero guesswork.
- **`wa-reader.2.0.0.html`** loads `content.md` and `style.css` live (never storing a stale copy)—either over a local HTTP server after unzipping (`python3 -m http.server 8000` or `npx serve .`) or directly via `file://` using its built-in **Open `.wa.zip` File…** button and drag-and-drop support.

---

## 3. GitHub Flavored Markdown Reference

Write Along supports **strict GitHub Flavored Markdown (GFM)**. Every document stays clean and readable on GitHub or in any plain-text viewer.

### Headings

```markdown
# Heading Level 1
## Heading Level 2
### Heading Level 3
#### Heading Level 4
```

Headings automatically receive `break-after: avoid` so they never sit orphaned at the bottom of a printed page.

### Emphasis & Inline Formatting

| Markdown Source | Rendered Output |
|---|---|
| `**Bold text**` | **Bold text** |
| `*Italic text*` | *Italic text* |
| `***Bold italic***` | ***Bold italic*** |
| `~~Strikethrough~~` | ~~Strikethrough~~ |
| `` `inline code` `` | `inline code` |
| `[Write Along](https://example.com)` | [Write Along](https://example.com) |
| `https://example.com` (autolink) | https://example.com |
| `\*Escaped punctuation\*` | \*Escaped punctuation\* |

### Lists & Task Lists

- Unordered list item one
  - Nested sub-item A
  - Nested sub-item B
- Unordered list item two

1. First ordered step
2. Second ordered step
3. Third ordered step

Task lists render crisp interactive checkboxes:

- [x] Draft the outline in `content.md`
- [x] Pick a typography pairing in `style.css`
- [ ] Export the final print-ready PDF

### Tables

```markdown
| Metric       | Baseline | Target | Status |
|--------------|---------:|-------:|:------:|
| Contrast     |    4.2:1 |  7.0:1 |  Pass  |
| Cold Load    |    1.8 s |  1.2 s |  Pass  |
```

| Metric | Baseline | Target | Status |
|---|---:|---:|:---:|
| Contrast | 4.2:1 | 7.0:1 | Pass |
| Cold Load | 1.8 s | 1.2 s | Pass |

### Code Blocks

````markdown
```css
:root {
  --accent-color: #7a1f2b;
  --body-font: "EB Garamond", serif;
}
```
````

```css
:root {
  --accent-color: #7a1f2b;
  --body-font: "EB Garamond", serif;
}
```

### Blockquotes & GitHub Alerts

> Good typography is invisible until it is absent—and unforgettable when it serves the reader.

GitHub Alerts transform automatically into styled callout boxes:

> [!NOTE]
> Use `> [!NOTE]` for helpful background context and cross-references.

> [!TIP]
> Use `> [!TIP]` for shortcuts, best practices, and workflow recommendations.

> [!IMPORTANT]
> Use `> [!IMPORTANT]` for essential requirements readers must not miss.

> [!WARNING]
> Use `> [!WARNING]` for caveats, compatibility notes, or breaking changes.

> [!CAUTION]
> Use `> [!CAUTION]` for high-risk actions and safety notices.

### Images & Figures

Place an image on its own paragraph to generate a centered `<figure class="figure">` with an automatic `<figcaption class="caption">` taken from the alt text:

```markdown
![Figure 1: Modular page geometry and typographic rhythm.](images/diagram.svg)
```

### Footnotes

Reference footnotes inline with `[^1]` and define them anywhere in the document.[^1]

```markdown
Typography relies on deliberate proportion[^1].

[^1]: Robert Bringhurst, *The Elements of Typographic Style*.
```

[^1]: Footnotes render cleanly as numbered superscript links with an endnotes section at the close of the document.

---

<!-- pagebreak -->

## 4. Write Along Extensions (GFM-Safe)

Write Along adds four minimal extensions that degrade silently in standard Markdown viewers:

| Feature | Syntax | Plain-Markdown Fallback |
|---|---|---|
| **Front-matter** | YAML block at top (`title`, `subtitle`, `author`, `date`, `abstract`, `category`, `organization`, `keywords`, `cover`) | Standard YAML metadata |
| **Block classes** | `<!-- .pull-quote -->` before or at the end of a block | Invisible HTML comment |
| **Page break** | `---` followed by `<!-- pagebreak -->` (or standalone `<!-- pagebreak -->`) | Horizontal rule / comment |
| **Table of Contents** | `[TOC]` on its own line | Literal text `[TOC]` |

### Example: Applying Classes to Blocks

```markdown
<!-- .pull-quote -->
> Design is not just what it looks like—design is how cleanly the page reads.

This opening paragraph uses a subtle lead treatment. <!-- .lead -->
```

<!-- .pull-quote -->
> Design is not just what it looks like—design is how cleanly the page reads.

---

## 5. Styling with `style.css`

`style.css` is organized into **two layers** so non-developers can customize documents in seconds while designers have full CSS control.

### Layer 1: Document Settings (`:root` Variables)

```css
:root {
  --page-size: Letter;              /* Letter | A4 | A5 | Legal | 6in 9in */
  --page-margin: 1in 1in 1in 1in;   /* top right bottom left */
  --page-background: #ffffff;
  --text-color: #1c1f24;
  --muted-color: #5c6470;
  --accent-color: #7a1f2b;
  --accent-secondary: #2b4c7e;
  --surface-color: #f6f7f9;
  --border-color: #d6dce5;

  --body-font: "EB Garamond", Georgia, serif;
  --heading-font: "EB Garamond", Georgia, serif;
  --code-font: "JetBrains Mono", monospace;

  --body-size: 11pt;
  --line-height: 1.55;
  --scale: 1.25;                    /* Modular heading scale */
  --paragraph-spacing: 0.8em;
  --paragraph-indent: 0;            /* Set to 1.5em for book-style indents */
  --radius: 4px;
  --columns: 1;                     /* Set to 2 for two-column layouts */
  --column-gap: 0.3in;
}
```

### Layer 2: Fixed Class Vocabulary

| Selector | Purpose |
|---|---|
| `.wa-document`, `.wa-body` | Root sheet container and document body flow |
| `.title-block`, `.cover` | Front-matter header (add `cover: true` for a full cover page) |
| `.title`, `.subtitle`, `.author`, `.date`, `.organization`, `.category`, `.abstract`, `.keywords` | Front-matter elements |
| `h1`–`h6`, `p`, `ul`, `ol`, `li`, `blockquote`, `table`, `th`, `td`, `pre`, `code`, `hr` | Core Markdown elements |
| `.callout`, `.callout-title`, `.callout-note`, `.callout-tip`, `.callout-important`, `.callout-warning`, `.callout-caution` | GitHub Alert callout boxes |
| `.figure`, `.caption` | Standalone image figures and captions |
| `.toc`, `.toc-title`, `.toc-list` | Auto-generated Table of Contents |
| `.pull-quote`, `.sidebar`, `.lead`, `.drop-cap`, `.small-caps`, `.two-col`, `.no-break`, `.signature-block` | Editorial utility classes |
| `.footnotes`, `.footnote-ref`, `.footnote-backref` | Footnotes / endnotes |
| `@page`, `@top-left`, `@top-center`, `@top-right`, `@bottom-left`, `@bottom-center`, `@bottom-right` | Running headers, footers, and page numbers |

### Page Furniture (`@page` Margin Boxes)

```css
@page {
  size: Letter;
  margin: 0.9in 0.85in 0.95in 0.85in;
  @top-right {
    content: "Annual Review";
    font-family: "Inter", sans-serif;
    font-size: 8.5pt;
    color: #6b7280;
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 8.5pt;
    color: #6b7280;
  }
}

@page :first {
  @top-right { content: none; }
}
```

### Bundled Open-License Fonts

All 25 bundled OFL/Apache font families load automatically offline whenever referenced in `style.css`:

- **Serif**: `EB Garamond`, `Cormorant Garamond`, `Libre Baskerville`, `Crimson Pro`, `Playfair Display`, `Lora`, `Merriweather`, `Source Serif 4`, `IBM Plex Serif`, `Cinzel`
- **Sans-Serif**: `Inter`, `Source Sans 3`, `Work Sans`, `Montserrat`, `Raleway`, `IBM Plex Sans`, `Space Grotesk`, `DM Sans`, `Oswald`, `Bebas Neue`
- **Monospace & Display**: `JetBrains Mono`, `IBM Plex Mono`, `Courier Prime`, `Special Elite`, `Caveat`

---

## 6. Building Your Own Template in 10 Minutes

1. Create a new document in Write Along (**File → New Document…**) or prepare `content.md`, `style.css`, and an `images/` folder locally.
2. Add `content.md` with YAML front-matter and at least 3 pages of realistic sample text (headings, lists, table, quote, callout, and a figure).
3. Write `style.css` starting with a clear `:root` block of Layer 1 variables, followed by `@page` rules and Layer 2 element refinements.
4. Click **File → Save** to package everything cleanly into `my-template.wa.zip` (with `wa-reader.2.0.0.html` and updated `syntax.md`).
5. Toggle **Read Mode** (`Ctrl+E`) and print-preview (**File → Export PDF (Print)…**) to verify page breaks, contrast, and running headers.

---

## 7. Exporting & Printing Tips

- **Background colors & callouts**: In Chrome's Print dialog, enable **Background graphics** (Write Along sets `print-color-adjust: exact` automatically).
- **Margins**: Choose **Margins: Default** in the print dialog so `@page` margins from `style.css` are respected without double-padding.
- **Headers & footers**: Uncheck the browser's built-in "Headers and footers" checkbox so only your template's `@page` margin boxes appear.
- **Standalone HTML**: Use **File → Export Standalone HTML…** to produce a single `.html` file with CSS, fonts, images, and pre-paginated sheets fully embedded for offline sharing.

---

## 8. Troubleshooting

| Symptom | Likely Cause & Fix |
|---|---|
| Images do not appear in preview | Ensure the image is inside `images/` and referenced relatively: `![Alt](images/photo.png)` (no leading `/`). |
| Preview and PDF page breaks differ | Check that your print dialog uses the same paper size (`Letter`/`A4`) as `--page-size` and **Margins: Default**. |
| `wa-reader.2.0.0.html` shows a Local Viewer Guide on `file://` | `wa-reader.2.0.0.html` always loads `content.md` live (never a stale copy), and browsers block local `fetch()` on `file://`. Click **Open .wa.zip File…** right on the page, drop the `.wa.zip` archive onto the card, or serve the unzipped directory with `python3 -m http.server 8000`. |
| Save downloads a new file instead of overwriting in-place | Direct in-place file overwriting (`showSaveFilePicker`) requires Chromium on `localhost` or HTTPS. On Firefox/Safari, Write Along saves cleanly by downloading your `.wa.zip` archive. |

---

## 9. For AI Agents

When an AI assistant edits an existing `.wa.zip` document or designs a new template, follow these mandatory rules:

1. **Preserve GFM purity**: Never inject raw `<div>` or `<style>` hacks into `content.md`. Express layout exclusively in `style.css` and standard GFM + the four documented WA extensions (front-matter, `<!-- .class -->`, `<!-- pagebreak -->`, `[TOC]`).
2. **Use Layer 1 variables first**: Always define `:root` variables (`--page-size`, `--page-margin`, `--page-background`, `--text-color`, `--accent-color`, `--body-font`, `--heading-font`, `--code-font`, `--body-size`, `--line-height`, `--scale`) at the top of `style.css` with helpful comments.
3. **Keep `style.css` standalone**: Do not use `@import` to external CDNs or internal build files. Reference only the 25 bundled font families (plus system fallbacks).
4. **Ensure print fidelity**: Avoid fixed pixel widths wider than the printable content box; set `break-after: avoid` on headings and `break-inside: avoid` on callouts, figures, code blocks, and table rows.
5. **Respect WCAG AA contrast**: Body text vs. `--page-background` must achieve at least **4.5:1** contrast (target 7:1+ for long-form reading).
6. **Validation checklist**:
   - [ ] Archive ends with `.wa.zip` and contains flat-root `content.md`, `style.css`, `images/`, `wa-reader.<version>.html` (live-fetching, no embedded copy), and `syntax.md` (no `.pdf` files).
   - [ ] All `images/...` paths referenced in `content.md` exist inside `images/`.
   - [ ] `style.css` parses cleanly with balanced braces and valid CSS properties.
   - [ ] Document renders cleanly to at least 3 pages with zero horizontal overflow and zero blank pages.
