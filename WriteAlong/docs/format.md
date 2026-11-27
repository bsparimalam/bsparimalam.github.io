# The `.wa` Document Format Specification (v1.0.0)

A **Write Along** document is a standard filesystem directory whose name ends with `.wa` (for example, `my-paper.wa/`). Because it is a plain folder of Markdown, CSS, images, and static HTML, it can be opened and edited either inside the Write Along editor or in any text editor or IDE.

## 1. Directory Layout

```text
example.wa/
├── content.md      # Document body in strict GitHub Flavored Markdown (GFM)
├── style.css       # Complete visual design & page geometry
├── images/         # Embedded images referenced via relative paths (images/fig1.svg)
├── read.html       # Self-contained static HTML viewer (works over http:// and file://)
└── syntax.md       # Syntax & styling reference (including template variables & AI guide)
```

### File Requirements
1. **`content.md`** (required): UTF-8 Markdown following strict GFM. Must remain cleanly readable in plain-text editors and on GitHub without requiring raw HTML.
2. **`style.css`** (required): Standard CSS using Layer 1 custom properties (`:root`) and Layer 2 documented selectors plus `@page` rules. Must be standalone (no external `@import` dependencies beyond bundled fonts).
3. **`images/`** (required directory): Contains all local images referenced by `content.md` or `style.css` using relative paths like `images/diagram.svg`.
4. **`read.html`** (required): Static viewer with `<meta name="wa-version" content="1.0.0">`. Fetches `content.md` and `style.css` relative to itself when served via HTTP(S), and falls back seamlessly to embedded `<script type="text/plain" id="wa-content">` and `<script type="text/plain" id="wa-style">` blocks when opened directly via `file://`. No toolbar or chrome; print-to-PDF and on-screen preview share the exact same renderer.
5. **`syntax.md`** (required): Complete user and AI-agent reference, appended with a template-specific inventory of custom properties and classes.

## 2. GFM-Compatible Extensions

All extensions degrade gracefully in standard Markdown viewers:

| Feature | Syntax | Plain-GFM Fallback |
|---|---|---|
| Document metadata & title block | YAML front-matter at top of `content.md` (`title`, `subtitle`, `author`, `date`, `abstract`, `category`, `keywords`, `organization`, `cover`, `running_header`, `running_footer`) | Standard YAML front-matter |
| Block classes | HTML comment immediately before or at the end of a block: `<!-- .pull-quote -->`, `<!-- .sidebar -->`, `<!-- .cover -->`, `<!-- .two-col -->`, `<!-- .no-break -->`, `<!-- .abstract -->` | Invisible HTML comment |
| Explicit page break | `---` followed by `<!-- pagebreak -->` (or standalone `<!-- pagebreak -->`) | Horizontal rule / comment |
| Callouts / Admonitions | GitHub Alerts: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` | Native GFM alerts |
| Table of contents | `[TOC]` on its own line | Literal `[TOC]` text |
| Footnotes | `[^1]` and `[^1]: Footnote text.` | Native GFM footnotes (rendered as endnotes) |
| Figures & Captions | Standalone image paragraph `![Caption text](images/fig.png)` renders as `<figure class="figure"><img ...><figcaption class="caption">Caption text</figcaption></figure>` | Standard Markdown image |
| Tables, Task Lists, Strikethrough, Autolinks | Native GFM | Native GFM |

## 3. `style.css` Layer 1 — Custom Properties (`:root`)

Users can restyle any template by editing these documented variables:

| Variable | Description | Example |
|---|---|---|
| `--page-size` | CSS `@page` size | `Letter`, `A4`, `A5`, `Legal`, `6in 9in` |
| `--page-width` | Explicit sheet width for screen preview | `8.5in` |
| `--page-height` | Explicit sheet height for screen preview | `11in` |
| `--page-margin` | Page margins (`top right bottom left`) | `1in 1in 1in 1in` |
| `--page-background` | Paper background color | `#ffffff` |
| `--text-color` | Primary body text color | `#1a1a1a` |
| `--muted-color` | Secondary / caption / metadata color | `#555555` |
| `--accent-color` | Primary accent color | `#7a1f2b` |
| `--accent-secondary` | Secondary accent color | `#2b4c7e` |
| `--surface-color` | Subtle shaded surface (callouts, tables, sidebars) | `#f6f7f9` |
| `--border-color` | Hairline rules and table borders | `#d8dce2` |
| `--body-font` | Body copy font stack | `"EB Garamond", Georgia, serif` |
| `--heading-font` | Headings font stack | `"EB Garamond", Georgia, serif` |
| `--code-font` | Monospace code font stack | `"JetBrains Mono", monospace` |
| `--body-size` | Base font size | `11pt` |
| `--line-height` | Base line height | `1.5` |
| `--scale` | Modular heading scale ratio | `1.25` |
| `--paragraph-spacing` | Vertical gap between paragraphs | `0.85em` |
| `--paragraph-indent` | First-line indent (e.g., for books) | `0` or `1.5em` |
| `--radius` | Border radius for boxes / callouts / code blocks | `4px` |
| `--columns` | Multi-column body count (`1` or `2`) | `1` |
| `--column-gap` | Gap between columns | `0.3in` |

## 4. `style.css` Layer 2 — Document Class Vocabulary

Every rendered `.wa` document exposes this stable DOM structure and class vocabulary:

- **Sheet / Document container**: `.wa-pages`, `.wa-page`, `.wa-page-content`, `.wa-margin-top`, `.wa-margin-bottom`, `.wa-body`, `.wa-cols-2`
- **Front-matter / Title block**: `.title-block`, `.cover`, `.title`, `.subtitle`, `.author`, `.date`, `.organization`, `.abstract`, `.keywords`
- **Typographic elements**: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `blockquote`, `ul`, `ol`, `li`, `hr`, `a`, `strong`, `em`, `del`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `pre`, `code`
- **Rich blocks**:
  - `.callout`, `.callout-title`, `.callout-note`, `.callout-tip`, `.callout-important`, `.callout-warning`, `.callout-caution`
  - `.figure`, `.caption`
  - `.toc`, `.toc-title`, `.toc-list`
  - `.footnotes`, `.footnote-ref`, `.footnote-backref`
  - `.pull-quote`, `.sidebar`, `.two-col`, `.no-break`, `.page-break`
  - `.lead`, `.drop-cap`, `.small-caps`, `.meta-grid`, `.signature-block`, `.kpi-grid`
- **Page furniture**: `.header`, `.footer`, `.page-number` (plus `@page` margin boxes `@top-left`, `@top-center`, `@top-right`, `@bottom-left`, `@bottom-center`, `@bottom-right`)

## 5. Print & Preview Parity Rules

1. `runtime/render.js` and `runtime/paginate.js` parse `content.md` and `style.css` (`@page`, `@page :first`, `--page-*`) into discrete physical `<section class="wa-page">` sheets complete with running headers, footers, and evaluated `counter(page)` / `counter(pages)`.
2. In `@media screen`, `.wa-pages` displays each `.wa-page` sheet at its exact physical dimensions (`--page-width` × `--page-height`) stacked on a neutral desk backdrop.
3. In `@media print`, `@page { size: <W> <H>; margin: 0; }` prints those exact same `.wa-page` sheets 1-to-1 with zero extra chrome—guaranteeing identical line breaks, page breaks, running furniture, and page counts between preview and PDF.
