"""
Style Archetypes & Complete Standalone style.css Generator for Write Along.

Each template receives a readable, heavily commented, zero-dependency style.css
built from Layer 1 CSS variables + Layer 2 element selectors + @page margin boxes.
"""


def _page_dims(page_size: str) -> tuple[str, str]:
    key = page_size.strip().lower()
    table = {
        "letter": ("8.5in", "11in"),
        "a4": ("210mm", "297mm"),
        "a5": ("148mm", "210mm"),
        "legal": ("8.5in", "14in"),
        "letter landscape": ("11in", "8.5in"),
        "a4 landscape": ("297mm", "210mm"),
    }
    if key in table:
        return table[key]
    parts = page_size.split()
    if len(parts) == 2:
        return parts[0], parts[1]
    return "8.5in", "11in"


def render_style_css(spec: dict) -> str:
    """Emit a complete, human-readable, heavily commented standalone style.css."""
    name = spec["name"]
    category = spec["category"]
    archetype = spec["archetype"]
    page_size = spec.get("page_size", "Letter")
    pw, ph = _page_dims(page_size)
    margin = spec.get("margin", "0.95in 0.9in 0.95in 0.9in")

    pal = spec["palette"]
    fonts = spec["fonts"]
    body_size = spec.get("body_size", "10.5pt")
    line_height = spec.get("line_height", "1.55")
    scale = spec.get("scale", "1.24")
    columns = spec.get("columns", 1)
    col_gap = spec.get("column_gap", "0.28in")
    para_spacing = spec.get("paragraph_spacing", "0.78em")
    para_indent = spec.get("paragraph_indent", "0")
    radius = spec.get("radius", "4px")
    opts = spec.get("opts", {})

    body_font = f'"{fonts["body"]}", Georgia, serif' if fonts.get("body_kind", "serif") == "serif" else (
        f'"{fonts["body"]}", ui-monospace, monospace' if fonts.get("body_kind") == "mono"
        else f'"{fonts["body"]}", -apple-system, sans-serif'
    )
    heading_font = f'"{fonts["heading"]}", Georgia, serif' if fonts.get("heading_kind", "serif") == "serif" else (
        f'"{fonts["heading"]}", ui-monospace, monospace' if fonts.get("heading_kind") == "mono"
        else f'"{fonts["heading"]}", -apple-system, sans-serif'
    )
    code_font = f'"{fonts.get("code", "JetBrains Mono")}", ui-monospace, monospace'

    header_left = opts.get("running_left", name)
    header_right = opts.get("running_right", category)
    footer_style = opts.get("footer_style", "page_of")
    if footer_style == "plain_num":
        footer_box = f"""  @bottom-center {{
    content: counter(page);
    font-family: {heading_font};
    font-size: 8.5pt;
    color: {pal["muted"]};
  }}"""
    elif footer_style == "right_num":
        footer_box = f"""  @bottom-left {{
    content: "{header_left}";
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
  }}
  @bottom-right {{
    content: "Page " counter(page);
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
  }}"""
    elif footer_style == "rule_footer":
        footer_box = f"""  @bottom-left {{
    content: "{header_right}";
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
    border-top: 0.5pt solid {pal["border"]};
    padding-top: 6pt;
  }}
  @bottom-right {{
    content: counter(page) " / " counter(pages);
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
    border-top: 0.5pt solid {pal["border"]};
    padding-top: 6pt;
  }}"""
    else:
        footer_box = f"""  @bottom-center {{
    content: "Page " counter(page) " of " counter(pages);
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
  }}"""

    top_box = ""
    if opts.get("running_header", True):
        top_box = f"""  @top-left {{
    content: "{header_left}";
    font-family: {heading_font};
    font-size: 8pt;
    letter-spacing: 0.04em;
    color: {pal["muted"]};
  }}
  @top-right {{
    content: "{header_right}";
    font-family: {heading_font};
    font-size: 8pt;
    color: {pal["muted"]};
  }}"""

    # Build Layer 2 Archetype CSS
    arch_css = _archetype_css(archetype, pal, opts)

    # Extra decorative & structural traits
    extras = []

    if columns >= 2:
        extras.append("""/* Full-width figures and tables across two-column layouts (LaTeX table*/figure*) */
.wa-body > table,
.wa-body > .figure {
  column-span: all;
}""")

    if opts.get("drop_cap"):
        extras.append("""/* Literary drop cap on the opening paragraph (Page 1 only) */
.wa-first-body-p::first-letter {
  float: left;
  font-family: var(--heading-font);
  font-size: 3.4em;
  line-height: 0.82;
  padding-right: 0.14em;
  padding-top: 0.04em;
  font-weight: 700;
  color: var(--accent-color);
}""")

    if opts.get("small_caps_opener"):
        extras.append("""/* Small-caps opening line for classic editorial poise */
.wa-first-body-p::first-line {
  font-variant-caps: small-caps;
  letter-spacing: 0.05em;
}""")

    if opts.get("number_headings"):
        extras.append("""/* Automatic LaTeX-style section numbering (continuous across pages) */
.wa-pages, .wa-document { counter-reset: sec; }
.wa-body h2 { counter-increment: sec; counter-reset: subsec; }
.wa-body h2::before {
  content: counter(sec) ". ";
  color: var(--accent-color);
  font-weight: 700;
}
.wa-body h3 { counter-increment: subsec; }
.wa-body h3::before {
  content: counter(sec) "." counter(subsec) " ";
  color: var(--muted-color);
  font-weight: 600;
}""")

    if opts.get("justify"):
        extras.append("""/* Justified book/academic text with hyphenation */
p {
  text-align: justify;
  hyphens: auto;
}""")

    if opts.get("page_border"):
        b_style = opts["page_border"]
        extras.append(f"""/* Decorative sheet frame on every page (screen & print) */
.wa-page, .wa-document {{
  outline: {b_style};
  outline-offset: -18px;
}}""")

    if opts.get("dot_grid"):
        extras.append(f"""/* Subtle dot-grid stationery paper */
.wa-page, .wa-document {{
  background-image: radial-gradient({pal["border"]} 1px, transparent 1px);
  background-size: 16px 16px;
}}""")

    if opts.get("blueprint_grid"):
        extras.append("""/* Blueprint technical drafting grid */
.wa-page, .wa-document {
  background-image:
    linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
  background-size: 22px 22px;
}""")

    if opts.get("lined_paper"):
        extras.append(f"""/* Subtle ruled notebook lines */
.wa-page, .wa-document {{
  background-image: linear-gradient(to bottom, transparent calc(1.75em - 1px), {pal["border"]} 1.75em);
  background-size: 100% 1.75em;
}}""")

    if opts.get("dark_paper"):
        extras.append("""/* High-contrast callouts & tables tuned for dark paper themes */
.callout {
  background: var(--surface-color);
  border-color: var(--border-color);
}
.callout-note .callout-title { color: #7dd3fc; }
.callout-tip .callout-title { color: #86efac; }
.callout-important .callout-title { color: #d8b4fe; }
.callout-warning .callout-title { color: #fcd34d; }
.callout-caution .callout-title { color: #fca5a5; }
th {
  border-top-color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}""")

    if opts.get("uppercase_headings"):
        extras.append("""h2 {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}""")

    if opts.get("left_accent_h2"):
        extras.append("""h2 {
  border-left: 4px solid var(--accent-color);
  padding-left: 0.55em;
}""")

    if opts.get("pill_h2"):
        extras.append("""h2 {
  display: inline-block;
  background: var(--accent-color);
  color: var(--page-background);
  padding: 0.2em 0.65em;
  border-radius: var(--radius);
  font-size: calc(var(--body-size) * 1.15);
}""")

    if opts.get("banner_title"):
        extras.append("""/* Full-width accented title banner */
.title-block {
  background: var(--accent-color);
  color: var(--page-background);
  padding: 1.5em 1.6em;
  border-radius: var(--radius);
  border: 0;
  margin-bottom: 1.8em;
}
.title-block .title,
.title-block .author { color: var(--page-background); }
.title-block .subtitle,
.title-block .date,
.title-block .category,
.title-block .organization,
.title-block .meta-line { color: var(--page-background); opacity: 0.88; }
.title-block .abstract {
  background: rgba(255, 255, 255, 0.14);
  border-left-color: var(--page-background);
  color: var(--page-background);
}
.title-block .abstract-label { color: var(--page-background); }""")

    if opts.get("centered_title"):
        extras.append("""/* Centered classical title block */
.title-block {
  text-align: center;
}
.title-block .meta-line {
  justify-content: center;
}""")

    if opts.get("double_rule_title"):
        extras.append("""/* Double editorial rule beneath header */
.title-block {
  border-top: 3px solid var(--text-color);
  border-bottom: 3px double var(--text-color);
  padding: 1.1em 0;
}""")

    extra_block = "\n\n".join(extras)

    return f"""/* ==========================================================================
   Write Along Template: {name}
   Category: {category} · Archetype: {archetype}
   --------------------------------------------------------------------------
   LAYER 1: Edit the variables inside :root to customize page size, fonts,
            colors, and spacing without writing complex CSS.
   LAYER 2: Element and class rules below control layout and typography.
   ========================================================================== */

:root {{
  /* Page Geometry */
  --page-size: {page_size};
  --page-width: {pw};
  --page-height: {ph};
  --page-margin: {margin};

  /* Color Palette */
  --page-background: {pal["bg"]};
  --text-color: {pal["text"]};
  --muted-color: {pal["muted"]};
  --accent-color: {pal["accent"]};
  --accent-secondary: {pal["accent2"]};
  --surface-color: {pal["surface"]};
  --border-color: {pal["border"]};

  /* Typography */
  --body-font: {body_font};
  --heading-font: {heading_font};
  --code-font: {code_font};
  --body-size: {body_size};
  --line-height: {line_height};
  --scale: {scale};
  --paragraph-spacing: {para_spacing};
  --paragraph-indent: {para_indent};
  --radius: {radius};

  /* Multi-column Layout */
  --columns: {columns};
  --column-gap: {col_gap};
}}

/* Running Headers, Footers & Physical Page Box */
@page {{
  size: {page_size};
  margin: {margin};
  background: {pal["bg"]};
{top_box}
{footer_box}
}}

@page :first {{
  @top-left {{ content: none; }}
  @top-right {{ content: none; }}
}}

/* ==========================================================================
   LAYER 2: Archetype Structure & Element Styling ({archetype})
   ========================================================================== */

{arch_css}

{extra_block}
"""


def _archetype_css(archetype: str, pal: dict, opts: dict) -> str:
    if archetype == "academic":
        return """.title-block {
  text-align: center;
  border-bottom: 1pt solid var(--border-color);
  padding-bottom: 1.15em;
  margin-bottom: 1.4em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 1.95);
  letter-spacing: -0.01em;
}
.title-block .meta-line { justify-content: center; font-size: 0.92em; }
.title-block .abstract {
  text-align: left;
  margin-top: 1em;
  padding: 0.8em 1.05em;
  font-size: 0.9em;
  background: var(--surface-color);
  border-left: 3px solid var(--accent-color);
}
h2 {
  font-size: calc(var(--body-size) * 1.24);
  margin-top: 1.35em;
  border-bottom: 0.6pt solid var(--border-color);
  padding-bottom: 0.2em;
  color: var(--accent-color);
}
h3 {
  font-size: calc(var(--body-size) * 1.06);
  font-style: italic;
  margin-top: 1em;
}
table {
  border-top: 1.5pt solid var(--text-color);
  border-bottom: 1.5pt solid var(--text-color);
}
th {
  background: transparent;
  border-top: 0;
  border-bottom: 0.8pt solid var(--text-color);
}
td { border-bottom: 0.4pt solid var(--border-color); }
.figure {
  padding: 0.5em;
  border: 0.5pt solid var(--border-color);
  background: var(--page-background);
}"""

    if archetype == "book":
        return """.title-block {
  text-align: center;
  padding: 2.2em 0 1.8em;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 2em;
}
.title-block .category {
  letter-spacing: 0.22em;
  font-size: 0.78em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.45);
  font-weight: 600;
  letter-spacing: 0.01em;
}
.title-block .subtitle {
  font-style: italic;
  font-size: 1.12em;
}
.title-block .meta-line { justify-content: center; margin-top: 1em; }
h2 {
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-top: 2em;
  margin-bottom: 0.9em;
  color: var(--accent-color);
}
h2::after {
  content: "❦";
  display: block;
  font-size: 0.65em;
  color: var(--muted-color);
  margin-top: 0.35em;
  opacity: 0.7;
}
blockquote {
  background: transparent;
  border-left: 2px solid var(--accent-color);
  font-style: italic;
  margin: 1.2em 1.4em;
  padding: 0.3em 1em;
}
hr {
  border: 0;
  text-align: center;
  margin: 1.8em 0;
}
hr::after {
  content: "·  ✦  ·";
  color: var(--accent-color);
  letter-spacing: 0.3em;
}"""

    if archetype == "report":
        return """.title-block {
  border-left: 5px solid var(--accent-color);
  padding: 0.4em 0 0.6em 1.25em;
  margin-bottom: 1.8em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.35);
  letter-spacing: -0.025em;
}
h2 {
  color: var(--accent-color);
  border-bottom: 1.5px solid var(--accent-color);
  padding-bottom: 0.22em;
  margin-top: 1.6em;
}
h3 {
  color: var(--accent-secondary);
}
table th {
  background: var(--accent-color);
  color: var(--page-background);
  border: 0;
}
table tr:nth-child(even) td {
  background: var(--surface-color);
}
.callout {
  border-left-width: 4px;
  border-radius: var(--radius);
}"""

    if archetype == "letter":
        return """.title-block {
  border-bottom: 2px solid var(--accent-color);
  padding-bottom: 0.9em;
  margin-bottom: 1.6em;
}
.title-block .organization {
  font-size: 1.05em;
  letter-spacing: 0.12em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 1.65);
  margin-bottom: 0.2em;
}
.title-block .abstract { display: none; }
h2 {
  font-size: calc(var(--body-size) * 1.12);
  color: var(--accent-color);
  margin-top: 1.3em;
  margin-bottom: 0.4em;
}
blockquote {
  border-left: 2.5px solid var(--accent-color);
  background: var(--surface-color);
  font-size: 0.95em;
}
table {
  font-size: 0.92em;
}
.signature-block {
  margin-top: 2.2em;
  border-top: 1px solid var(--border-color);
  padding-top: 0.8em;
}"""

    if archetype == "resume":
        return """.title-block {
  border-bottom: 2.5px solid var(--accent-color);
  padding-bottom: 0.85em;
  margin-bottom: 1.25em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.25);
  letter-spacing: -0.02em;
  margin-bottom: 0.15em;
}
.title-block .subtitle {
  color: var(--accent-color);
  font-weight: 600;
  font-size: calc(var(--body-size) * 1.12);
  margin-bottom: 0.45em;
}
.title-block .meta-line {
  gap: 0.25em 1.1em;
  font-size: 0.88em;
}
h2 {
  font-size: calc(var(--body-size) * 1.08);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.2em;
  margin-top: 1.25em;
  margin-bottom: 0.55em;
}
h3 {
  font-size: calc(var(--body-size) * 1.02);
  margin-top: 0.85em;
  margin-bottom: 0.2em;
}
ul {
  padding-left: 1.25em;
  margin-bottom: 0.6em;
}
li { margin-bottom: 0.2em; }
table th {
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  border-bottom: 1.5px solid var(--accent-color);
}"""

    if archetype == "magazine":
        return """.title-block {
  border-top: 4px solid var(--text-color);
  border-bottom: 1.5px solid var(--text-color);
  padding: 1em 0 1.1em;
  margin-bottom: 1.5em;
}
.title-block .category {
  display: inline-block;
  background: var(--accent-color);
  color: var(--page-background);
  padding: 0.18em 0.6em;
  font-size: 0.74em;
  letter-spacing: 0.14em;
  margin-bottom: 0.6em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.6);
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.title-block .subtitle {
  font-style: italic;
  font-size: 1.15em;
  margin-top: 0.35em;
}
h2 {
  font-size: calc(var(--body-size) * 1.32);
  color: var(--accent-color);
  border-top: 2px solid var(--accent-color);
  padding-top: 0.35em;
  margin-top: 1.4em;
}
blockquote {
  border-left: 0;
  border-top: 2px solid var(--accent-color);
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  font-family: var(--heading-font);
  font-size: 1.15em;
  font-style: italic;
  color: var(--accent-color);
  padding: 0.7em 0.4em;
}"""

    if archetype == "techdoc":
        return """.title-block {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-top: 4px solid var(--accent-color);
  border-radius: var(--radius);
  padding: 1.25em 1.4em;
  margin-bottom: 1.6em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.05);
  letter-spacing: -0.02em;
}
h2 {
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.25em;
  margin-top: 1.6em;
}
h3 {
  color: var(--accent-color);
  margin-top: 1.2em;
}
code {
  border: 1px solid var(--border-color);
  color: var(--accent-color);
}
pre {
  border-left: 3px solid var(--accent-color);
  background: var(--surface-color);
}
pre code {
  border: 0;
  color: var(--text-color);
}
table th {
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  border-bottom: 2px solid var(--accent-color);
}"""

    if archetype == "education":
        return """.title-block {
  border: 1.5px solid var(--accent-color);
  border-radius: var(--radius);
  padding: 1.1em 1.35em;
  margin-bottom: 1.5em;
  background: var(--surface-color);
}
.title-block .title {
  font-size: calc(var(--body-size) * 1.9);
  color: var(--accent-color);
}
h2 {
  background: var(--surface-color);
  border-left: 4px solid var(--accent-color);
  padding: 0.3em 0.7em;
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--accent-color);
  margin-top: 1.5em;
}
h3 {
  color: var(--accent-secondary);
}
table th {
  background: var(--surface-color);
  border-top: 1.5px solid var(--accent-color);
  border-bottom: 1.5px solid var(--accent-color);
}"""

    if archetype == "journal":
        return """.title-block {
  border-bottom: 1.5px dashed var(--accent-color);
  padding-bottom: 1em;
  margin-bottom: 1.6em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.15);
  color: var(--accent-color);
}
h2 {
  color: var(--accent-color);
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 0.2em;
  margin-top: 1.55em;
}
blockquote {
  border-left: 3px solid var(--accent-secondary);
  background: var(--surface-color);
  font-style: italic;
}
.callout {
  border-style: dashed;
}"""

    if archetype == "legal":
        return """.title-block {
  text-align: center;
  border-top: 2.5pt double var(--text-color);
  border-bottom: 2.5pt double var(--text-color);
  padding: 1.2em 0.8em;
  margin-bottom: 1.6em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 1.75);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.title-block .meta-line { justify-content: center; }
h2 {
  font-size: calc(var(--body-size) * 1.15);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 0.8pt solid var(--text-color);
  padding-bottom: 0.2em;
  margin-top: 1.5em;
}
h3 {
  font-size: calc(var(--body-size) * 1.04);
  font-weight: 700;
}
p {
  text-align: justify;
  hyphens: auto;
}
table th {
  background: var(--surface-color);
  border-top: 1.2pt solid var(--text-color);
  border-bottom: 1.2pt solid var(--text-color);
}"""

    if archetype == "script":
        return """.title-block {
  text-align: center;
  padding: 2em 0 1.5em;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.8em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 1.85);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.title-block .meta-line { justify-content: center; }
h2 {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: calc(var(--body-size) * 1.1);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.2em;
  margin-top: 1.6em;
}
h3 {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: var(--body-size);
  margin-top: 1.2em;
  margin-bottom: 0.2em;
}
blockquote {
  margin: 0.4em 1.2in;
  padding: 0.3em 0.8em;
  border-left: 2px solid var(--accent-color);
  background: transparent;
}"""

    # Creative / Swiss / Poster / Special
    return """.title-block {
  border-bottom: 3px solid var(--accent-color);
  padding-bottom: 1.1em;
  margin-bottom: 1.6em;
}
.title-block .title {
  font-size: calc(var(--body-size) * 2.45);
  line-height: 1.06;
  letter-spacing: -0.02em;
  color: var(--accent-color);
}
h2 {
  color: var(--accent-color);
  border-bottom: 1.5px solid var(--border-color);
  padding-bottom: 0.22em;
  margin-top: 1.55em;
}
h3 {
  color: var(--accent-secondary);
}
blockquote {
  border-left: 4px solid var(--accent-color);
  background: var(--surface-color);
}
table th {
  background: var(--surface-color);
  border-top: 2px solid var(--accent-color);
  border-bottom: 2px solid var(--accent-color);
}"""
