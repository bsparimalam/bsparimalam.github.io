"""
Realistic, Purpose-Appropriate Multi-Page Sample Content for Write Along Templates.

Every archetype (and specialized sub-genres like poetry, screenplay, cookbook,
resume, contract) has bespoke, non-lorem-ipsum Markdown that exercises strict GFM
(headings, lists, task lists, tables, blockquotes, GitHub alerts, code, footnotes,
and embedded images/figure-1.svg) and reliably fills 3-5 rendered pages.
"""


def build_content_md(spec: dict) -> str:
    """Return complete YAML front-matter + multi-page Markdown body for a template."""
    meta = spec.get("meta", {})
    title = meta.get("title", spec["name"])
    subtitle = meta.get("subtitle", f"{spec['category']} — Write Along Edition")
    author = meta.get("author", "Elena Rostova")
    date = meta.get("date", "November 2026")
    org = meta.get("organization", "Write Along Press")
    category = spec["category"]
    abstract = meta.get("abstract", "")
    cover = meta.get("cover", False)
    keywords = meta.get("keywords", [])

    fm_lines = [
        "---",
        f'title: "{title}"',
        f'subtitle: "{subtitle}"',
        f'author: "{author}"',
        f'date: "{date}"',
        f'organization: "{org}"',
        f'category: "{category}"',
    ]
    if abstract:
        fm_lines.append(f'abstract: "{abstract}"')
    if keywords:
        kw_str = ", ".join(f'"{k}"' for k in keywords)
        fm_lines.append(f"keywords: [{kw_str}]")
    if cover:
        fm_lines.append("cover: true")
    for extra_k in ("email", "phone", "location", "website", "volume", "issue", "doc_id", "version"):
        if meta.get(extra_k):
            fm_lines.append(f'{extra_k}: "{meta[extra_k]}"')
    fm_lines.append("---\n")
    front_matter = "\n".join(fm_lines)

    kind = spec.get("content_kind", spec["archetype"])
    builders = {
        "academic": _content_academic,
        "book": _content_book,
        "poetry": _content_poetry,
        "script": _content_script,
        "cookbook": _content_cookbook,
        "report": _content_report,
        "letter": _content_letter,
        "resume": _content_resume,
        "magazine": _content_magazine,
        "techdoc": _content_techdoc,
        "education": _content_education,
        "journal": _content_journal,
        "legal": _content_legal,
        "creative": _content_creative,
    }
    body_fn = builders.get(kind, _content_report)
    body = body_fn(spec)
    if spec.get("columns", 1) >= 2 and kind in ("magazine", "resume", "techdoc", "education"):
        body = body + "\n\n" + _twocol_appendix(kind)
    return front_matter + "\n" + body


def _twocol_appendix(kind: str) -> str:
    if kind == "magazine":
        return """## Extended Essay: Paper, Ink & The Future of Long-Form Reading

Across three continents, small presses and civic periodicals are converging on a surprisingly practical insight: readers finish far more long-form journalism when it is delivered in finite, well-proportioned issues rather than infinite scrolling feeds. Finite editions create a natural beginning, middle, and close—giving complex reporting space to breathe while honoring the reader's time.

### Studio Production Notes

When laying out a two-column periodical, optical balance matters more than mathematical rigidity. Subheads should break up long stretches of prose every 250–350 words, pull quotes should echo a genuine turning point in the argument rather than repeating an opening sentence verbatim, and tables should span the full measure whenever numeric comparisons require four or more columns.

- **Paper Weight Recommendation**: 100–120 gsm uncoated natural stock minimizes glare under reading lamps while preventing ink show-through on dense spreads.
- **Line Measure Check**: Keeping column widths between 3.1 and 3.6 inches yields an effortless 42–48 character measure at 9.5pt serif.
- **Archival Export**: Always preserve the original `.wa` folder alongside the press-ready PDF so future anthologies can re-typeset individual dispatches at any trim size.

### Letters to the Editor

> "Your autumn issue on timber branch libraries inspired our town council to commission a daylight reading room study. Thank you for publishing both the architectural drawings and the municipal budget table in full." — *K. Lindholm, Trondheim*

> "As an independent student editor, being able to tweak `--accent-color` and `--body-font` directly in CSS and immediately print a clean proof copy cut our layout weekend in half." — *M. Alvarez, Austin*
"""
    if kind == "resume":
        return """## Selected Architecture Case Studies & Patents

### Zero-Downtime Multi-Region Document Sync (2024)
Designed the conflict-free delta compaction protocol and rolling shard promotion controller powering 18M active workspaces. Introduced deterministic property-based fuzzing over simulated network partitions, eliminating an entire class of split-brain merge regressions prior to global rollout.

### Browser-Native Print Parity Verification Suite (2021)
Created an automated Chromium layout verifier that compares screen DOM geometry against rasterized PDF output across Letter, A4, and A5 sheet sizes. Adopted across 650+ publishing teams to guarantee identical line breaks between interactive web review and print editions.

### Speaking Engagements & Technical Workshops

- **QCon San Francisco (2025)**: *"Building Offline-First Collaborative Apps with Vanilla Web Standards"* — Keynote track (1,400 attendees).
- **Strange Loop (2024)**: *"Sub-50ms Local-First Editing Without Heavy Frameworks"* — Main stage session.
- **W3C Publishing Workshop (2023)**: *"Bridging Strict Markdown and CSS Paged Media for Archival Longevity"* — Invited panelist.
- **MIT CSAIL Alumni Seminar (2022)**: *"Lessons from Operating 100+ Production Print Stylesheets at Scale."*

### Languages & Availability

Fluent in English and Russian; conversational German. Authorized to work in the United States and European Union. Open to Principal / Distinguished Engineer and VP of Engineering advisory mandates.
"""
    if kind == "techdoc":
        return """## 6. CLI Command Quick Reference & Telemetry Signals

Operators frequently rely on a compact set of non-destructive diagnostic commands during canary rollouts and latency investigations. All commands below support `--json` for structured piping into `jq` or incident notebooks.

```bash
# Inspect partition lag and replication watermark
meridian ops shard status --all --format compact

# Verify offline snapshot integrity (SHA-256 chain check)
meridian verify snapshot ./backup-2026-11-26.bin --strict

# Export active cluster topology and rate-limit budgets
meridian config dump --redact-secrets > cluster-audit.toml
```

### Core Prometheus Metrics & Alert Thresholds

| Metric Name | Target SLO | Warning | Critical |
|---|---:|---:|---:|
| `sync_mutation_p99_ms` | < 35 ms | > 75 ms | > 150 ms |
| `sync_queue_depth` | < 500 | > 2,500 | > 5,000 |
| `wal_fsync_duration_ms` | < 4 ms | > 12 ms | > 25 ms |
| `edge_tls_handshake_err` | 0.00% | > 0.05% | > 0.25% |

### Capacity Planning Guidelines

1. **Memory Headroom**: Provision at least 35% free RAM per worker node to absorb zstd decompression bursts during regional reconnect storms.
2. **Disk IOPS**: Keep write-ahead logs on dedicated NVMe volumes separate from compacted snapshot storage to avoid tail-latency interference.
3. **Retention Windows**: Configure 72-hour delta retention on active shards so laptop clients offline over a long weekend synchronize incrementally without full snapshot transfers.
"""
    return """## Extended Concept Bank & Diagnostic Quick-Cards

### Card 1 — Type I vs. Type II Errors
A **Type I error (false positive, probability α)** occurs when we reject a true null hypothesis. A **Type II error (false negative, probability β)** occurs when we fail to reject a false null hypothesis. Statistical power (*1 − β*) rises with larger sample size *n*, larger true effect size *d*, and lower measurement noise *σ*.

### Card 2 — Residual Diagnostics for Linear Regression
Before trusting regression slope p-values or prediction intervals, inspect four diagnostic plots: (1) residuals versus fitted values to verify linearity and constant variance, (2) a normal Q-Q plot of standardized residuals, (3) Cook's distance to identify high-leverage influential points, and (4) autocorrelation plots whenever observations are collected sequentially over time.

### Card 3 — Multiple Comparisons Control
Running twenty independent hypothesis tests at α = 0.05 yields a 64% chance of observing at least one spurious "significant" result by pure luck. Apply **Bonferroni correction** (*α / m*) for strict family-wise error control, or the **Benjamini–Hochberg procedure** to control the False Discovery Rate (FDR) in exploratory studies.

### Card 4 — Checklist Before Submitting Lab Reports

- State the scientific question, population of interest, and sampling mechanism in plain prose.
- Report both point estimates and 95% confidence intervals with physical units intact.
- Include exact sample sizes, missing-data handling rules, and reproducible script versions.
"""


def _content_academic(spec: dict) -> str:
    return """## Introduction

Deterministic document layout remains a foundational challenge across scientific publishing, archival typography, and reproducible research workflows. While classical typesetting systems such as TeX established an enduring standard for mathematical rhythm and optical margin alignment, contemporary collaborative teams increasingly author manuscripts in plain-text GitHub Flavored Markdown (GFM) stored alongside versioned analysis scripts.[^1]

This study evaluates a unified two-layer CSS specification that decouples semantic manuscript authoring from publication geometry. By constraining content files to strict GFM while expressing page dimensions, running headers, typographic scales, and multi-column flow solely through declarative CSS rules, authors achieve full print-to-PDF parity directly inside modern standards-compliant browsers without external compilation pipelines.

> [!NOTE]
> All experimental benchmarks reported in this manuscript were replicated across three independent paper formats (US Letter, ISO A4, and 6in × 9in monograph trim) using headless Chromium print engines with zero post-processing.

### Research Questions and Contributions

Our investigation addresses three primary questions concerning browser-native paged media:

1. **Typographic Fidelity**: Can declarative CSS custom properties reproduce the visual hierarchy, line measure, and micro-typographic balance of traditional LaTeX journal classes?
2. **Cross-Medium Equivalence**: Does a single shared DOM renderer eliminate drift between interactive screen review and physical print-to-PDF output?
3. **Authoring Accessibility**: How quickly can non-specialist researchers modify font pairings, accent palettes, and margin geometry when settings are surfaced as Layer 1 variables?

## Related Work

Early web-to-print initiatives relied heavily on client-side JavaScript polyfills to fragment DOM trees into fixed-height page containers. Although flexible, scripted pagination frequently introduced layout thrashing, fragile table-splitting heuristics, and inconsistent anchor navigation. By contrast, recent advances in the CSS Paged Media Module (`@page`, margin boxes such as `@top-right` and `@bottom-center`, and `break-after: avoid`) enable native browser layout engines to handle page geometry directly at print time.[^2]

<!-- .pull-quote -->
> Separating semantic prose from visual presentation allows a single manuscript to move effortlessly from conference preprint to archival monograph without altering a single paragraph of source text.

### Comparative Taxonomy of Document Pipelines

Existing scholarly authoring systems trade off portability, learning curve, and visual control in distinct ways. Table 1 summarizes the structural characteristics of four widely adopted publication workflows evaluated during our pilot study.

| Authoring System | Source Format | Runtime Build Required | Print / Screen Parity | Novice Customizability |
|---|---|---:|:---:|:---:|
| Classical LaTeX | `.tex` macros | Yes (PDFTeX / XeTeX) | N/A (PDF only) | Low |
| Word Processors | Binary `.docx` | No | Medium | High |
| Static Site + Print | HTML / MDX | Yes (Node bundler) | Low | Medium |
| Write Along (`.wa`) | Strict GFM + CSS | **No (Static)** | **Exact** | **High** |

## Methodology

We constructed a corpus of 110 heterogeneous publication templates spanning eleven document domains—from dense two-column engineering proceedings to wide-margin literary essays. Each template was evaluated along four quantitative axes: (a) WCAG 2.1 AA luminance contrast between primary ink and paper background, (b) orphan/widow suppression across section boundaries, (c) horizontal overflow tolerance at 300 DPI PDF rasterization, and (d) cold-load rendering latency in offline browser contexts.

![Figure 1: Empirical convergence of layout stability and typographic legibility scores across evaluation epochs.](images/figure-1.svg)

### Formal Specification of the Rendering Pipeline

The shared rendering pipeline transforms Markdown source *M* and stylesheet *S* into a canonical sanitized DOM tree before applying deterministic `@page` rules:

```javascript
// Canonical pipeline shared by live preview and portable read.html
export function renderDocument(markdown, styleCss) {
  const { meta, body } = parseFrontMatter(markdown);
  const { html } = renderMarkdownToHtml(body);
  const pageRules = buildPageRulesCss(styleCss, meta);
  return { meta, html, pageRules };
}
```

Every block element adheres to strict pagination invariants. Headings declare `break-after: avoid`, figures and callouts declare `break-inside: avoid`, and tables repeat `<thead>` rows automatically whenever a multi-row dataset spans a physical page boundary.

> [!IMPORTANT]
> To preserve identical line wrapping between screen review and print-to-PDF, the screen sheet width (`--page-width`) minus horizontal padding (`--page-margin`) must equal the printable content area declared in `@page`.

## Experimental Evaluation

We measured rendering fidelity across 360 test documents compiled under both automated headless print pipelines and interactive desktop browsers. Table 2 details the quantitative outcomes grouped by structural complexity.

| Structural Category | Mean Pages | Overflow Errors | Orphan Headings | Contrast Ratio | Render Time (ms) |
|---|---:|---:|---:|---:|---:|
| Single-Column Serif | 3.8 | 0 | 0 | 14.6 : 1 | 24.1 |
| Two-Column Academic | 3.4 | 0 | 0 | 15.2 : 1 | 29.8 |
| Dense Technical Tables | 4.1 | 0 | 0 | 13.8 : 1 | 31.4 |
| Rich Editorial & Art | 3.6 | 0 | 0 | 11.4 : 1 | 27.2 |

### Qualitative Findings from Author Trials

In structured usability sessions with 24 researchers and graduate students, participants were asked to adapt an existing manuscript to a new journal's typography and margin guidelines within ten minutes:

- **92% of participants** successfully updated page size, font family, and accent color in under three minutes using Layer 1 `:root` variables alone.
- **100% of exported PDFs** matched the interactive Read Mode preview line-for-line, eliminating the iterative "export and check" loop common in traditional markup compilers.
- Reviewers reported that inspecting diffs in `content.md` alongside self-contained `read.html` snapshots substantially reduced friction during collaborative peer review.

### Limitations and Threats to Validity

Certain specialized typographic conventions—such as page-bottom footnotes synchronized across balanced multi-column spreads and marginalia anchored to specific lines—remain constrained by current browser CSS Paged Media implementations. In version 1.0, footnotes are rendered cleanly as hyperlinked endnotes, ensuring predictable behavior across all browsers while leaving room for future CSS `float: footnote` adoption.

## Discussion and Broader Impact

The findings demonstrate that transparent, folder-based document formats reconcile two historically opposing goals: the durability of plain-text engineering artifacts and the aesthetic warmth of fine print typography. Because every `.wa` directory embeds `syntax.md`, both human collaborators and automated editing assistants can reason unambiguously about valid selectors, variable names, and semantic extensions.

### Reproducibility Checklist

- [x] Source manuscript conforms strictly to GitHub Flavored Markdown without raw HTML dependencies.
- [x] All visual assets are stored locally under `images/` with relative paths.
- [x] Color contrast exceeds WCAG AA thresholds across primary copy and table headers.
- [x] Self-contained `read.html` renders identically over both `http://` and `file://` protocols.

## Conclusion

We presented a lightweight, zero-build document architecture that delivers publication-grade typography through strict Markdown and layered CSS. Empirical validation across 110 diverse templates confirms that browser-native `@page` layout provides exact preview-to-print parity, offline resilience, and rapid visual customization. Future work will explore optional mathematical typesetting and automated bibliographic citation formatting.

## References

1. Bringhurst, R. (2012). *The Elements of Typographic Style* (4th ed.). Hartley & Marks.
2. Knuth, D. E. (1984). *The TeXbook*. Addison-Wesley Professional.
3. W3C CSS Working Group (2025). *CSS Paged Media Module Level 3*. World Wide Web Consortium.
4. Gruber, J., & MacFarlane, J. (2024). *GitHub Flavored Markdown Specification*.

[^1]: GitHub Flavored Markdown extends CommonMark with tables, task lists, strikethrough, autolinks, and alert callouts while remaining readable in plain text.
[^2]: Chromium's native print engine supports `@page` size, margin boxes (`@top-left`, `@bottom-center`), and CSS `counter(page)` / `counter(pages)`.
"""


def _content_book(spec: dict) -> str:
    return """## Chapter I — The Cartographer's Lantern

The rain had begun before dusk, falling with the unhurried certainty of late November across the slate roofs of Veren. Inside the upper workshop, Clara leaned over the cedar drafting table, trimming the wick of the brass lamp until its flame steadied into a clear golden spear. Spread beneath her palms lay the coastal survey of 1894—twenty-six sheets of linen rag paper stitched at the spine, every cove and shoal rendered in iron-gall ink that had softened over a century into the color of roasted chestnuts.[^1]

She traced the northern headland with the blunt tip of her dividers. Somewhere between the lighthouse at Oakhaven and the basalt needles of the outer reef, her grandfather had marked a narrow channel with three faint dots and a marginal note in cramped Italian hand: *Only at the equinoctial ebb, when the bells on the buoy fall silent.*

> "Every map is a confession," her grandfather used to tell her, tapping the ash from his pipe against the stove. "It confesses what the surveyor feared, what he hoped to find, and what he agreed to leave unnamed."

Outside, the harbor bell tolled twice through the mist. Clara folded the linen sheet along its original creases, slipped the brass compass into her coat pocket, and descended the narrow spiral stair toward the quay. The tide was already turning, pulling dark ribbons of kelp past the stone pilings like ink unspooling across wet vellum.

### Notes from the Harbor Ledger

Before departing, she copied three brief entries from the customs register kept in the dry drawer beside the barometer. Each vessel had reported the same anomalous sounding along the forty-second parallel, separated by intervals of nineteen years.

| Year | Vessel Name | Master | Sounding (Fathoms) | Barometer (inHg) |
|---|---|---|---:|---:|
| 1856 | *Hesperus* | Capt. M. Aldridge | 14.5 | 29.42 |
| 1875 | *Northern Star* | Capt. E. Lindholm | 11.2 | 29.18 |
| 1894 | *Cormorant* | Capt. H. Vance | 9.8 | 29.05 |

![Plate I: Ornamental compass vignette from the Oakhaven Coastal Folio.](images/figure-1.svg)

---

## Chapter II — Low Water at Oakhaven

By midnight the rain thinned to a cold salt spray that clung to the wool of Clara's collar. The path above the shingle beach wound through wind-sheared gorse and low dry-stone walls, each boulder pale with lichen in the swinging arc of her lantern. Far below, the sea had retreated farther than she had ever witnessed in twenty winters, exposing shelves of dark mussel beds and the ribs of an old timber breakwater long thought swallowed by the channel.

She paused beside the cairn where the pilot's track forked. To the east stood the whitewashed tower of the lighthouse, its fresnel lens sweeping a slow silver band across the cloud deck every twelve seconds. To the west, the basalt needles rose like black chessmen out of the foaming shelf.

> [!NOTE]
> Readers following the geographic annotations in this edition may consult the Appendix of Coastal Soundings at the close of Part Two for modern metric conversions of nineteenth-century fathom measurements.

### The Stone Archway

Halfway across the exposed causeway, her boot struck dressed granite rather than sea-worn basalt. Clara knelt and brushed away a mat of bladderwrack. Carved cleanly into the lintel—undimmed by decades of salt and surge—were three parallel tide-marks and the Roman numerals **MDCCCXCIV**.

<!-- .pull-quote -->
> Beneath the lowest tide lay not a shipwreck, as the townsfolk whispered in winter, but the deliberate masonry of a forgotten observatory built to measure the slow breath of the Atlantic.

She recorded the dimensions in her waxed pocket notebook, sketching the dovetail joints and the bronze ring recessed into the keystone:

1. **Outer Sill**: Forty-two inches wide, angled precisely eleven degrees east of magnetic north to face the winter solstice dawn.
2. **Drainage Channel**: Chiseled along the leeward face to prevent hydrostatic pressure during storm surges.
3. **Keystone Ring**: Forged naval bronze, bearing the stamped hallmark of the Greenwich Instrument Foundry.

---

## Chapter III — Letters from the Observatory

When Clara returned to the workshop just before dawn, the fire in the grate had collapsed into white ash, yet the cedar room smelled strongly of damp cedarwood and ozone. On the drafting table, beside the folded survey, she laid the small brass cylinder she had lifted from the niche behind the keystone ring. Its threads resisted for a moment, crusted with pale sea salt, before yielding with a soft metallic sigh.

Inside lay four tightly rolled leaves of onion-skin paper, dry as autumn birch leaves, written in her grandfather's unmistakable hand.

> *My dear Clara—if these pages reach you, then the equinoctial low has returned on schedule and you have inherited both my stubbornness and my lantern. Do not trust the printed Admiralty charts; the floor of this bay is rising two inches every decade, and the markers I set in stone are our only honest witness.*

### Provisions for the Second Survey

Clara brewed a pot of strong black tea and drew up a quiet list of instruments she would need before the next spring tide arrived in March:

- [x] Calibrate the pocket aneroid barometer against the customs-house mercury column
- [x] Transcribe all four onion-skin letters into the permanent ink ledger
- [ ] Commission a fresh fifty-fathom hemp sounding line with lead markers
- [ ] Photograph the granite lintel inscriptions at low water using dry glass plates

By seven o'clock the storm clouds broke over the eastern headland, pouring pale amber sunlight across the wet roofs of Veren. Clara opened the casement window, breathed in the sharp cold air off the harbor, and turned to a fresh page in her notebook to begin the new survey.[^2]

[^1]: Iron-gall ink, composed of oak gall tannins and ferrous sulfate, darkens upon exposure to air before mellowing into warm umber tones over decades.
[^2]: Excerpted from *The Cartographer's Lantern*, Books I–III, set in the Write Along archival literary edition.
"""


def _content_poetry(spec: dict) -> str:
    return """## I. Nocturne in Winter Ink

The harbor settles into pewter glass,
a quiet ledger where the ferries write
their silver footnotes on the turning tide,
then vanish in the fog before the bell.[^1]

We keep our promises in linen folds—
small maps of orchards, postcards never sent,
a brass key warming in a coat of wool,
the scent of cedar when the frost arrives.

> *Listen closely when the lantern dims:*
> *the snow remembers every roof it named.*

### Marginalia on Silence

1. First comes the wind along the copper eaves,
2. Then the long pause between the harbor clocks,
3. And last the lamp that holds the room together.

![Plate I: Emblem for the Winter Cycle.](images/figure-1.svg)

---

## II. Letters to the Orchard Keeper

If you return before the apricot
unlocks its pale and paper-thin bouquet,
walk slowly past the cistern by the wall
where moss has stitched the broken limestone seam.

The swallows keep their counsel in the beams.
They do not ask how long the road has been,
nor weigh the mileage in an iron scale;
they measure distance only by the light.

<!-- .pull-quote -->
> What stays with us is never what we hoarded,
> but what we left unguarded in the sun.

### Stanzas from the Coastal Notebook

| Cycle | Season | Meter | Primary Motif |
|---|---|---|---|
| Part I | Late November | Blank Verse | Lanterns & Tide |
| Part II | Early March | Quatrains | Orchards & Stone |
| Part III | Midsummer | Free Verse | Salt & Constellations |
| Part IV | October | Villanelle | Ash & Returning |

> [!NOTE]
> The poems in this sequence were composed between 2023 and 2026 along the northern coast and arranged to be read aloud with unhurried pauses between sections.

---

## III. Cartography of Small Hours

At four o'clock the bakery ignites
its brick-lined hearth beneath the avenue;
a ribbon of warm rye and cardamom
ascends to greet the sleepers on the hill.

The baker dusts his sleeves with winter flour,
draws crosses on the loaves with steady thumb,
and watches through the steam-blurred windowpane
the first blue tramway spark along the rail.

### Inventory of Quiet Things

- A porcelain cup with one hairline gold mend
- Rainwater gathered in a slate-blue bowl
- Three sharpened pencils beside an open page
- The patient hum of radiators at dawn

### Reading Notes & Editorial Colophon

This chapbook edition preserves generous outer margins for reader annotations, breathing room around stanza breaks, and classical proportions inspired by nineteenth-century private press folios. Each section opens on clean air so the voice never feels crowded by the page edge.[^2]

[^1]: First published in the *Northern Literary Review*, Autumn Issue.
[^2]: Set using Write Along's open-license serif typography with print-identical pagination.
"""


def _content_script(spec: dict) -> str:
    return """## ACT I — SCENE 1: EXT. HARBOR OBSERVATORY — DUSK

Heavy Atlantic mist rolls across a weathered stone pier. At the end of the breakwater stands a circular brick observatory, its copper dome oxidized pale green. A single warm light glows from the upper slit.

CLARA VANCE (34), coat collar turned up, carries a leather satchel stuffed with rolled nautical charts. She pauses at the iron gate, checking a pocket chronometer.

### CLARA

> (quietly, to herself)
> Three minutes before slack water. If the ledger was right, the signal should already be visible from the ridge.

She pushes open the gate. Its hinges groan softly over the rhythmic wash of waves.

---

## ACT I — SCENE 2: INT. OBSERVATORY DOME — CONTINUOUS

Brass telescopes, wall-mounted barographs, and shelves of cloth-bound tide tables circle the room. ARTHUR HALE (62), archivist and keeper, bends over a backlit glass table tracing a contour line with a ruling pen.

Clara climbs the iron staircase into the gallery, shaking rainwater from her sleeves.

### ARTHUR

> You made good time from the station. Did the ferry captain mention the northern buoy?

### CLARA

> He said its bell stopped ringing at four. Swore the tide dropped two feet lower than the Admiralty chart predicts.

Arthur sets down the ruling pen. He slides an antique brass key across the illuminated glass.

### ARTHUR

> Then we are not chasing folklore anymore. Look at the 1894 sounding overlay.

![Production Diagram: Camera blocking and lighting elevation for Scene 2.](images/figure-1.svg)

> [!IMPORTANT]
> **Production Note**: Maintain practical warm tungsten key lighting from the drafting table (2700K) contrasted against cool 6500K coastal dusk spill through the dome aperture.

### Scene Breakdown & Technical Cues

| Cue # | Timecode | Department | Description |
|---|---:|---|---|
| C-01 | 00:01:15 | Sound | Distant foghorn (low C, 3-second decay) |
| C-02 | 00:02:40 | Lighting | Slow dim on practical overhead; glass table at 80% |
| C-03 | 00:04:05 | Props | Brass cylinder with removable salt-crusted cap |
| C-04 | 00:05:30 | Camera | Push-in 50mm macro onto engraved Roman numerals |

---

## ACT II — SCENE 1: EXT. EXPOSED CAUSEWAY — NIGHT

Low tide reveals a gleaming corridor of wet granite blocks stretching toward the outer basalt reef. Clara and Arthur move carefully with storm lanterns, boots crunching on shells.

### CLARA

> Hold the light lower—right beneath the lintel. There. Three horizontal marks, chiseled dead level.

### ARTHUR

> (whispering)
> My god. Your grandfather didn't lose his bearings at all. He built a datum station.

A distant swell breaks over the outer shoal, sending a veil of silver spray across the rocks. Arthur pulls a waterproof notebook from his parka.

### Checklist for Location Crew

- [x] Verify tide tables for three consecutive night shoots
- [x] Weather-seal follow-focus motors and wireless monitors
- [ ] Secure Coast Guard harbor clearance for breakwater lighting rigs
- [ ] Prepare duplicate onion-skin prop letters for close-up inserts

---

## ACT II — SCENE 2: INT. HARBOR TELEGRAPH OFFICE — DAWN

Pale amber light slices through Venetian blinds. Clara dictates coordinates while the operator taps steadily at the brass key.[^1]

### CLARA

> Send it to the Hydrographic Office in triplicate. Tell them the reef isn't sinking—the entire shelf is rising.

The telegraph ticks cleanly into the quiet room. **FADE OUT.**

[^1]: Script timing follows standard one-page-per-minute dialogue pacing in 12pt monospace typography.
"""


def _content_cookbook(spec: dict) -> str:
    return """## Autumn Hearth & Kitchen Philosophy

Good seasonal cooking depends far more on patience, salt timing, and honest heat than on elaborate equipment. The three dishes collected in this folio—a slow-braised fennel and white-bean ragout, a blistered sourdough focaccia with rosemary oil, and a poached pear galette—are designed to share a single warm oven over a unhurried Sunday afternoon.[^1]

> [!TIP]
> Prepare the focaccia dough the evening before and let it cold-ferment in the refrigerator for 14–18 hours. Overnight fermentation builds deep wheat aroma and an open, custardy crumb without commercial enhancers.

---

## Recipe 1: Hearth-Roasted Fennel & Cannellini Ragout

**Prep Time:** 20 minutes · **Cook Time:** 55 minutes · **Yield:** 4 generous bowls

### Ingredients

| Ingredient | Metric | US Volume | Notes |
|---|---:|---:|---|
| Dried cannellini beans (soaked) | 300 g | 1½ cups | Or 2 cans, rinsed & drained |
| Fresh fennel bulbs | 450 g | 2 medium | Trimmed, cut into 8 wedges |
| Extra-virgin olive oil | 60 ml | ¼ cup | Plus extra for finishing |
| Yellow onion, thinly sliced | 180 g | 1 large | Sweet or yellow |
| Garlic cloves, smashed | 20 g | 5 cloves | Skin removed |
| Dry white wine | 120 ml | ½ cup | Vermentino or Pinot Grigio |
| Crushed San Marzano tomatoes | 400 g | 1¾ cups | Hand-crushed |
| Fresh thyme & bay leaf | 6 g | 4 sprigs | Tied with kitchen twine |
| Fine sea salt & cracked pepper | 8 g | 1½ tsp | Adjust to taste |

### Preparation Steps

1. **Caramelize the fennel**: Warm half the olive oil in a heavy enameled Dutch oven over medium-high heat. Arrange fennel wedges cut-side down and sear undisturbed for 4 minutes per side until deeply golden. Transfer to a warm plate.
2. **Build the soffritto**: Lower heat to medium, add remaining oil, and sweat the sliced onion with a pinch of salt for 8 minutes until translucent and sweet. Stir in smashed garlic and cook 90 seconds until fragrant.
3. **Deglaze and simmer**: Pour in white wine and scrape up the browned fond with a wooden spoon. Simmer until reduced by half, then fold in crushed tomatoes, drained beans, herb bundle, and 350 ml warm water or vegetable stock.
4. **Braise gently**: Nestle the seared fennel back on top, cover partially, and braise in a 175°C (350°F) oven for 40 minutes until the broth turns glossy and velvety. Finish with lemon zest and chopped fennel fronds.

![Kitchen Plate: Flavor balance & oven temperature schedule for the Sunday Hearth menu.](images/figure-1.svg)

---

## Recipe 2: Rosemary & Flaky Salt Sourdough Focaccia

**Active Time:** 25 minutes · **Fermentation:** 16 hours · **Bake:** 24 minutes at 225°C (435°F)

### Baker's Formula

- **Bread flour (12.5% protein):** 500 g (100%)
- **Warm filtered water (28°C):** 390 g (78% hydration)
- **Active levain or starter:** 100 g (20%)
- **Fine sea salt:** 11 g (2.2%)
- **Extra-virgin olive oil:** 30 g in dough, plus 30 g for the pan

<!-- .pull-quote -->
> Dimple the dough firmly with oiled fingertips all the way to the base of the pan—those deep pockets catch pooling olive oil and crisp into golden lace along the crust.

### Baking Workflow Checklist

- [x] Perform 3 sets of gentle coil folds spaced 30 minutes apart
- [x] Proof in an oiled 9×13-inch steel pan until jiggly and blistered
- [ ] Drizzle rosemary-infused olive oil and flaky Maldon salt immediately before baking
- [ ] Cool on a wire rack for at least 15 minutes so the crumb sets cleanly

---

## Recipe 3: Brown-Butter Spiced Pear Galette

A rustic free-form tart that requires no specialty tin. Toss thinly sliced Bosc pears with 40 g dark muscovado sugar, a grating of fresh nutmeg, 1 tablespoon toasted cornstarch, and a splash of dark rum. Mound over a chilled flaky all-butter pastry circle brushed with browned-butter almond frangipane, pleat the edges loosely, and bake at 200°C (400°F) for 38 minutes until the juices bubble dark amber.[^2]

[^1]: Tested at sea level using an oven thermometer to verify true cavity temperature.
[^2]: Serve warm with lightly whipped crème fraîche and toasted hazelnuts.
"""


def _content_report(spec: dict) -> str:
    return """## Executive Summary

Over the past twelve months, our organization executed a comprehensive operational modernization across regional delivery hubs, digital infrastructure, and customer retention programs. Consolidated revenue expanded **24.6% year-over-year** to **$148.4 million**, while operating margins improved by 310 basis points due to automated fulfillment routing and disciplined cloud cost governance.[^1]

This report synthesizes audited performance metrics, market positioning analysis, and strategic capital allocations for the upcoming fiscal year. Across every core business unit, reliability and customer satisfaction reached five-year highs even as total transaction volume doubled.

> [!IMPORTANT]
> **Board Takeaway**: Free cash flow conversion reached **86.2%** in Q4, providing sufficient internal capital to fund Phase II regional expansion without raising incremental debt.

### Headline Strategic Milestones

- **Enterprise Adoption**: Signed 42 multi-year enterprise agreements with average contract values rising 31% over the prior fiscal year.
- **Platform Reliability**: Delivered **99.985% global uptime** across 1.4 billion API transactions with p99 latency held below 42 milliseconds.
- **Sustainability Targets**: Reduced per-unit logistics emissions by 19.4% through consolidated rail corridors and renewable data-center power purchase agreements.
- **Talent Retention**: Maintained 94.1% engineering and operations retention following the rollout of transparent career ladders.

[TOC]

## Financial & Operational Performance

Balanced execution across North America, Europe, and Asia-Pacific drove broad-based growth without over-reliance on any single vertical. Table 1 presents key financial and operational KPIs comparing actual results against our annual operating plan.

| Performance Metric | FY2025 Actual | FY2026 Plan | FY2026 Actual | YoY Variance |
|---|---:|---:|---:|---:|
| Gross Revenue ($M) | $119.1 | $140.0 | **$148.4** | +24.6% |
| Gross Margin (%) | 68.4% | 70.0% | **71.5%** | +310 bps |
| Operating Income ($M) | $18.2 | $24.5 | **$28.9** | +58.8% |
| Net Dollar Retention | 114% | 116% | **121%** | +700 bps |
| Customer NPS | 58 | 62 | **67** | +9 pts |

![Figure 1: Quarterly benchmark performance trajectory across fiscal periods.](images/figure-1.svg)

<!-- .pull-quote -->
> Sustainable margin expansion came not from cutting service quality, but from eliminating structural handoff delays across engineering, fulfillment, and client onboarding.

### Regional Revenue Mix & Unit Economics

Customer acquisition payback shortened from 14.2 months to **10.8 months** as organic referrals and partner-sourced deployments climbed to 38% of new bookings. Europe emerged as our fastest-growing theater (+34.2% YoY) following localized compliance certifications and regional support centers in Amsterdam and Munich.

## Market Landscape & Competitive Positioning

Enterprise buyers increasingly favor transparent, open-standard platforms over closed proprietary ecosystems. Independent analyst surveys conducted in Q3 indicate that **74% of mid-market CIOs** now list data portability and offline continuity as mandatory procurement criteria.

### Risk Register & Mitigation Controls

| Risk Domain | Likelihood | Impact | Active Mitigation Program |
|---|---:|---:|---|
| Supply-Chain Lead Times | Medium | High | Dual-source critical hardware across two continents |
| Regulatory Shifts (AI/Data) | High | Medium | Automated regional data residency & ISO-27001 audits |
| Cloud Egress Inflation | Medium | Medium | Multi-region caching tier reduced egress spend by 27% |
| Key-Account Concentration | Low | High | No single customer exceeds 4.2% of consolidated revenue |

> [!TIP]
> Quarterly scenario drills have shortened incident escalation times by 46% compared with the prior twelve-month rolling average.

## Strategic Roadmap (FY2027)

Capital allocation for the coming year centers on three high-conviction initiatives, each gated by measurable quarterly milestones:

1. **Core Platform Velocity ($14.5M)**: Complete active-active multi-region replication and launch self-service analytics workbenches for enterprise administrators.
2. **Partner Ecosystem Expansion ($6.2M)**: Certify 60 system integrators across EMEA and APAC with co-selling playbooks and standardized implementation toolkits.
3. **Operational Resilience ($4.8M)**: Automate continuous compliance telemetry, disaster-recovery failover tests, and carbon-intensity workload scheduling.

### Implementation Governance Checklist

- [x] Finalize departmental operating budgets and quarterly OKR scorecards
- [x] Approve security audit calendar with independent external assessors
- [ ] Launch Q1 customer advisory council across top 25 enterprise accounts
- [ ] Publish mid-year sustainability and governance transparency report

## Closing Outlook

With a fortified balance sheet, resilient unit economics, and a deeply engaged customer community, the organization enters FY2027 positioned to compound long-term value responsibly. Leadership remains committed to clear communication, rigorous stewardship of capital, and durable product craftsmanship.[^2]

[^1]: All financial figures are presented on a consolidated GAAP basis unless explicitly marked as non-GAAP operational KPIs.
[^2]: Forward-looking roadmap allocations are subject to quarterly board review and macroeconomic conditions.
"""


def _content_letter(spec: dict) -> str:
    return """**Ms. Margaret Chen**  
Director of Institutional Partnerships  
Pacific Civic Foundation  
420 Montgomery Street, Suite 1800  
San Francisco, CA 94104

**Subject:** Formal Proposal for the 2027 Regional Archival & Literacy Fellowship

Dear Ms. Chen,

I am writing on behalf of our editorial and research team to submit our formal application and detailed partnership proposal for the **2027 Regional Archival & Literacy Fellowship**. Following our productive conversation at the Civic Design Symposium last month, we have refined our implementation timeline, community outreach milestones, and open-access publishing commitments so that every public library in the six-county consortium can participate without recurring software licensing costs.[^1]

Over the past four years, our initiative has helped 38 community archives, municipal history societies, and public high schools transition fragile paper holdings into durable, plain-text digital editions. Unlike proprietary publishing platforms that lock civic records behind vendor subscriptions, our open folder-based `.wa` standard guarantees that local historians can inspect, print, and preserve their collections decades from now using nothing more than an ordinary web browser.

> [!NOTE]
> Complete financial statements, letters of endorsement from four county library directors, and sample archival editions are enclosed in the accompanying digital dossier.

## Scope of the Proposed Fellowship Program

If awarded, the twelve-month fellowship will fund three concrete deliverables designed to deliver lasting institutional capacity rather than temporary project staffing:

1. **Public Digitization Workshops**: Twelve hands-on weekend clinics hosted across partner branches, training 180 librarians, educators, and student volunteers in clean Markdown transcription, accessible CSS typography, and archival print preparation.
2. **Open-License Template Library**: Twenty bespoke, WCAG-compliant civic publication templates tailored for oral history transcripts, local museum catalogs, municipal annual reports, and student literary journals.
3. **Offline Preservation Toolkit**: Zero-dependency static web packages that run entirely offline on reading-room workstations and produce print-identical PDF editions for physical library binding.

<!-- .pull-quote -->
> Civic memory endures only when the tools required to read, edit, and reprint it remain permanently in public hands.

## Proposed Budget & Matching Contributions

To ensure strong fiscal stewardship, our coalition has secured 40% matching support through in-kind university server hosting, donated flatbed book scanners, and faculty advisory hours. Table 1 outlines the full grant request and matching allocation.

| Budget Category | Grant Request | Matching Support | Total Value | Key Deliverable |
|---|---:|---:|---:|---|
| Workshop Instruction & Stipends | $28,000 | $8,500 | $36,500 | 12 regional clinics (180 trainees) |
| Archival Template Engineering | $18,500 | $12,000 | $30,500 | 20 open-license `.wa` templates |
| Print Proofing & Binding Copies | $9,200 | $4,000 | $13,200 | Archival reference copies for 38 branches |
| Accessibility & Audit Review | $6,300 | $3,500 | $9,800 | WCAG AA + print fidelity verification |
| **Total Program Budget** | **$62,000** | **$28,000** | **$90,000** | **12-Month Full Consortium Rollout** |

![Enclosure A: Regional consortium rollout schedule and archival milestones.](images/figure-1.svg)

## Twelve-Month Implementation Schedule

- **Quarter 1 (Jan–Mar)**: Finalize consortium memoranda of understanding, publish open-source archival templates, and open workshop registration across all six counties.
- **Quarter 2 (Apr–Jun)**: Conduct the first six regional clinics and digitize twelve flagship oral history collections with full print proofing.
- **Quarter 3 (Jul–Sep)**: Complete remaining six clinics, incorporate librarian usability feedback, and publish the bilingual educator's handbook.
- **Quarter 4 (Oct–Dec)**: Host the public Regional Archives Showcase, distribute bound archival editions to every branch, and submit the final audited impact report.

### Pre-Award Readiness Checklist

- [x] Signed fiscal sponsorship confirmation and 501(c)(3) determination letter attached
- [x] Letters of commitment received from six regional public library systems
- [x] Open-license font and software compliance audit verified
- [ ] Schedule site visit and live demonstration with the Foundation Grants Committee

We would welcome the opportunity to meet with you and your review committee at your convenience to walk through sample printed folios and answer any questions regarding our methodology or budget. Thank you sincerely for your thoughtful consideration and for the Foundation's enduring investment in public literacy and regional heritage.[^2]

With warm regards,

---

**Dr. Clara Vance**  
Executive Director, Open Archival Press  
clara.vance@openarchivalpress.org · (415) 555-0194

*Enclosures: Audited Financial Summary; Consortium Endorsement Letters; Sample Archival Folio.*

[^1]: All workshop materials and templates produced under this fellowship will be released under the CC BY-SA 4.0 and MIT open licenses.
[^2]: Direct inquiries regarding matching university contributions may be routed to the Office of Sponsored Programs, Ref. #2027-OAP-08.
"""


def _content_resume(spec: dict) -> str:
    return """## Professional Profile

Principal Software Architect and Engineering Leader with **12+ years of experience** designing resilient distributed systems, developer platforms, and high-craft web applications. Proven track record guiding multi-disciplinary teams from early architectural RFCs to planet-scale production deployments serving 40M+ monthly active users with 99.99% availability.[^1]

> [!TIP]
> **Core Strengths**: Distributed Systems Architecture · Browser Runtime Engineering · Performance Optimization · Technical Mentorship · Executive Product Strategy

## Professional Experience

### Principal Staff Engineer — Meridian Cloud Systems *(San Francisco, CA · 2022 – Present)*

- Architected a zero-downtime multi-region document synchronization engine supporting 18M concurrent workspaces, cutting global p99 sync latency from 210 ms to **28 ms** and reducing infrastructure spend by **$3.4M annually**.
- Led a cross-functional task force of 22 engineers to ship offline-first Service Worker caching and local File System Access storage, raising enterprise session retention by 26%.
- Authored 14 organization-wide engineering RFCs establishing observability standards, chaos testing drills, and automated accessibility compliance gates.
- Mentored 8 senior engineers to staff-level promotions through biweekly design reviews and structured architecture clinics.

### Staff Software Engineer — Northstar Publishing Technologies *(Seattle, WA · 2018 – 2022)*

- Spearheaded the next-generation browser typesetting and PDF export engine used by 650+ academic journals and technical publishers worldwide.
- Eliminated visual divergence between live web preview and print-ready PDF pipelines by unifying rendering around standards-based CSS Paged Media (`@page`) and deterministic font subsetting.
- Scaled automated visual regression infrastructure across headless Chromium fleets, catching 99.4% of layout regressions prior to release while cutting CI wall-clock time by 61%.
- Partnered directly with design leadership to open-source a 100+ template typography system that attracted 19,000 GitHub stars in its first year.

### Senior Software Engineer — Civic Data Labs *(Boston, MA · 2015 – 2018)*

- Built high-throughput geospatial ingestion pipelines in Python, Go, and PostgreSQL processing 1.2 TB of municipal transit telemetry per week.
- Designed an interactive browser-based report builder enabling non-technical policy analysts to publish accessible public dashboards and print-ready briefs in minutes.
- Reduced database query tail latency by 78% through composite indexing, read-replica routing, and materialized reporting views.

### Software Engineer — Harbor Interactive *(Boston, MA · 2014 – 2015)*

- Developed modular ES6 front-end components, SVG data visualizations, and automated end-to-end test suites for healthcare and higher-education clients.

![Career Impact Summary: Latency reduction and system reliability benchmarks across roles.](images/figure-1.svg)

## Technical Skills & Domain Expertise

| Domain | Technologies & Standards | Proficiency |
|---|---|---|
| Languages | TypeScript, JavaScript (ESM), Python, Go, Rust, SQL | Expert |
| Web & Document Engines | HTML5, CSS Paged Media, CodeMirror 6, Web Workers, PWA / Service Workers | Expert |
| Distributed Infrastructure | Kubernetes, PostgreSQL, Redis, Kafka, gRPC, OpenTelemetry | Advanced |
| Testing & Verification | Playwright, Puppeteer, Headless Chromium, Visual Diffing, Property Testing | Expert |

## Selected Open-Source Projects & Publications

1. **PrintParity (Creator & Maintainer)**: Open-source browser layout verifier comparing screen DOM snapshots against PDF rasterizations across 100+ print stylesheets.
2. **“Deterministic Offline Publishing with Plain Folders”** (*ACM Queue*, Vol. 23, No. 4, 2025): Case study on transparent directory-based document formats and long-term archival longevity.
3. **“Sub-50ms Collaborative Editing Without Heavy Frameworks”** (*Strange Loop Keynote*, 2024): Practical patterns for vanilla ES modules, CRDTs, and IndexedDB durability.

## Education & Certifications

- **M.S. in Computer Science**, Massachusetts Institute of Technology *(2014)* — Focus: Distributed Systems & Human-Computer Interaction. Thesis: *Conflict-Free Replication for Structured Documents*.
- **B.S. in Electrical Engineering & Computer Science** (*Summa Cum Laude*), University of California, Berkeley *(2012)* — Regent's Scholar.
- **Certifications**: AWS Certified Solutions Architect (Professional) · W3C Web Accessibility Specialist (WAS).

## Community Leadership, Speaking & Advisory

- **Keynote Speaker, QCon San Francisco (2025)**: *"Building Offline-First Collaborative Applications with Vanilla Web Standards"* — main engineering track (1,400 attendees).
- **Program Committee Member**, *Web Typography & Digital Publishing Conference* (2023–2026) — reviewing systems, accessibility, and browser layout papers.
- **Technical Mentor**, *Code for Civic Archives* — guiding volunteer engineers digitizing public library collections across four states.
- **Guest Lecturer**, MIT & UC Berkeley undergraduate capstone seminars on resilient distributed architecture, automated browser layout verification, and typographic engineering.
- **Languages & Work Authorization**: Fluent in English and Russian; conversational German. Authorized to work in the United States and European Union.[^2]

[^1]: Full portfolio, open-source repositories, and recorded conference talks available upon request.
[^2]: Professional references from executive engineering leaders and product partners available immediately.
"""


def _content_magazine(spec: dict) -> str:
    return """## The Quiet Renaissance of Independent Print

Walk into almost any neighborhood bookshop from Lisbon to Kyoto and you will notice an unexpected sight beside the coffee counter: thick, tactile independent magazines printed on uncoated cream stock, their covers set in bold serif headlines and generous margins. Ten years after analysts predicted the total extinction of long-form periodical design, small editorial studios are thriving precisely because readers have grown weary of endless algorithmic feeds.[^1]

What changed is not nostalgia—it is the economics of craft. Modern browser-native typesetting and short-run digital presses have collapsed the barrier between an idea drafted in plain Markdown and a crisp, collectible quarterly issue. A two-person editorial team can now design a forty-page monograph with museum-grade typography in a single afternoon.

<!-- .pull-quote -->
> "Readers don't want more content. They want fewer pages, better paper, and the feeling that a human editor cared where every sentence landed."

### Inside Three Studios Redefining Editorial Rhythm

We spent six weeks visiting independent publishers who bridge digital reading and physical print using unified stylesheets. Their secret is disarmingly practical: treat every article as structured plain text, build a disciplined modular type scale, and let whitespace do half the storytelling.

![Editorial Feature: Typographic rhythm and modular grid composition in contemporary print.](images/figure-1.svg)

| Publication | City | Frequency | Trim Size | Signature Typeface |
|---|---|---|---|---|
| *Northbound Quarterly* | Portland | Quarterly | 8.5 × 11 in | Playfair Display & Lora |
| *Atelier Monograph* | Milan | Biannual | A4 Portrait | Cormorant Garamond |
| *Signal & Noise* | Zurich | Monthly | Letter (2-Col) | Inter & IBM Plex Mono |
| *Fieldnotes Press* | Kyoto | Seasonal | A5 Pocket | Crimson Pro |

> [!TIP]
> **Designer's Margin Rule**: Aim for 55 to 72 characters per line in single-column essays, or 38 to 48 characters per column in two-column magazine spreads.

## Feature Dispatch: The Craft of Slow Reporting

In an era measured in push notifications, slow reporting feels almost subversive. *Northbound Quarterly* assigns a single writer and a single illustrator to each story for ninety days. There are no breaking updates, no pop-up banners, and no embedded autoplay videos—only reported prose, carefully drawn diagrams, and an unhurried table of facts at the close of each section.

### Five Editorial Principles Worth Stealing

1. **Lead with a human scene**: Anchor abstract ideas in a physical room, a specific morning, or a concrete object before zooming out to data.
2. **Respect the reader's eye**: Pair one expressive display typeface with a calm, high-x-height text face—never let ornaments compete with comprehension.
3. **Design for print first**: A page that balances cleanly on physical Letter or A4 paper almost always reads effortlessly on a tablet or laptop screen.
4. **Edit ruthlessly**: Trim 15% of every first draft so the surviving sentences carry genuine cadence and surprise.
5. **Preserve an open archive**: Publish every issue in durable HTML and PDF editions so stories remain readable twenty years after launch.

## Dispatch Notes & Culture Briefs

### Architecture — Timber Libraries of the North
Municipal planners across Scandinavia are turning to cross-laminated timber for new branch libraries, pairing acoustic warmth with daylight reading halls that require zero artificial lighting from April through September.

### Typography — The Open-Font Boom
Over the past decade, Open Font License (OFL) families such as EB Garamond, Source Serif 4, and Space Grotesk have narrowed the aesthetic gap between free community typefaces and historic foundry specimens to near zero.

### Reader Checklist for Launching Your Own Zine

- [x] Pick a clear editorial focus and publish a 3-issue thematic calendar
- [x] Lock in a two-font pairing and a disciplined three-color palette
- [ ] Gather three long-form dispatches, one data table, and original illustrations
- [ ] Proof a physical test copy at 100% scale before opening subscriptions

---

## Colophon & Subscriber Notes

Every dispatch in this issue was authored in strict GitHub Flavored Markdown and typeset directly in the browser without proprietary layout licenses. Readers wishing to remix our column grids, pull-quote rules, or running headers can inspect `style.css` directly inside the `.wa` package.[^2]

[^1]: Independent Print Circulation Survey, International Periodical Designers Guild (2026).
[^2]: All photography placeholders and geometric plates are rendered as resolution-independent vector SVG graphics for crisp 300+ DPI printing.
"""


def _content_techdoc(spec: dict) -> str:
    return """[TOC]

## 1. Overview & Architecture

The **Meridian Edge Sync Engine (v3.4)** provides low-latency, conflict-free state replication between offline-capable browser clients and geo-distributed backend clusters. Designed around deterministic JSON snapshots and idempotent write-ahead logs, the service guarantees **at-least-once delivery** with automatic client deduplication and zero-downtime regional failover.[^1]

This manual serves as both an operational reference and a hands-on integration guide for platform engineers. Every configuration snippet, API schema, and diagnostic procedure has been verified against production release `3.4.2`.

> [!IMPORTANT]
> **Breaking Change in v3.4**: Clients must include the `X-Idempotency-Key` header (UUIDv4) on all `POST /v3/mutations` requests. Unkeyed writes are rejected with `400 Bad Request`.

![Figure 1: Edge Gateway, Idempotent Worker Pool, and Active-Active State Store topology.](images/figure-1.svg)

### Key Design Properties

- **Deterministic Conflict Resolution**: Hybrid Logical Clocks (HLC) guarantee total ordering across disconnected peers without central clock coordination.
- **Zero-Allocation Streaming**: Wire payloads use length-prefixed framing with optional zstd compression, sustaining 45,000 messages/sec per core.
- **Strict Tenant Isolation**: Every workspace is encrypted at rest using per-tenant envelope keys rotated automatically every 90 days.

## 2. Quickstart Installation

Install the CLI and verify connectivity to your staging cluster:

```bash
# Install the Meridian CLI (Linux / macOS)
curl -fsSL https://get.meridian.example/install.sh | sh

# Authenticate and inspect cluster health
meridian auth login --region us-west-2
meridian cluster status --output table
```

### Minimal Client Configuration (`meridian.toml`)

```toml
[cluster]
endpoint = "https://sync.us-west-2.meridian.example"
timeout_ms = 2500
retry_max_attempts = 4

[storage]
engine = "indexeddb"
snapshot_interval_sec = 30
compression = "zstd"
```

> [!TIP]
> Set `MERIDIAN_LOG_LEVEL=debug` locally to inspect wire-frame checksums, HLC timestamps, and retry backoff intervals in real time.

## 3. REST & Streaming API Reference

All endpoints require Bearer JWT authentication (`Authorization: Bearer <token>`) and return structured `application/json` payloads.

| Method | Endpoint | Description | Rate Limit | Idempotent |
|---|---|---|---:|:---:|
| `GET` | `/v3/workspaces/{id}` | Retrieve latest workspace manifest & head revision | 600 req/min | Yes |
| `POST` | `/v3/workspaces/{id}/mutations` | Append atomic CRDT delta batch | 300 req/min | Yes (Keyed) |
| `GET` | `/v3/workspaces/{id}/snapshots` | Download compacted binary checkpoint | 120 req/min | Yes |
| `DELETE` | `/v3/workspaces/{id}/sessions/{sid}` | Revoke active sync session token | 60 req/min | Yes |

### Example Mutation Payload

```json
{
  "workspaceId": "ws_01JH7X9K2M4P",
  "baseRevision": 4182,
  "hlc": "2026-11-26T18:42:11.004Z-0001-nodeA",
  "operations": [
    { "op": "replace", "path": "/title", "value": "Q4 Architecture Review" },
    { "op": "append", "path": "/tags", "value": "verified" }
  ]
}
```

### Standard Error Codes

| HTTP Status | Error Code | Root Cause | Recommended Action |
|---:|---|---|---|
| `400` | `INVALID_HLC_DRIFT` | Client clock exceeds ±60s skew bound | Synchronize NTP and retry |
| `409` | `REVISION_CONFLICT` | Stale `baseRevision` during strict CAS write | Pull delta stream and rebase |
| `429` | `QUOTA_EXCEEDED` | Token bucket exhausted for tenant | Apply exponential jitter backoff |
| `503` | `REGION_DRAINING` | Planned maintenance failover in progress | Fail over to secondary endpoint |

## 4. Operations Runbook & Troubleshooting

When alert `SyncQueueLagHigh` triggers (queue depth > 5,000 for 3 consecutive minutes), on-call engineers should execute the following triage sequence:

1. **Verify regional ingress health**: Check `edge_gateway_5xx_ratio` and TLS certificate expiry metrics in the primary telemetry dashboard.
2. **Inspect worker saturation**: Run `meridian ops workers top --sort queue_wait` to distinguish CPU throttling from downstream state-store lock contention.
3. **Drain unhealthy shards**: If a single partition shows elevated write latency (> 120 ms p99), shift traffic to its hot standby via `meridian ops shard promote --shard <id>`.

> [!WARNING]
> Never force-truncate the write-ahead log (`--unsafe-reset-wal`) on a live primary shard; doing so can discard uncompacted client acknowledgments.

### Production Release Verification Checklist

- [x] Unit, integration, and Jepsen-style partition tests pass 100%
- [x] Canary deployment holds < 0.01% error rate for 60 minutes
- [x] Schema migration verified backward-compatible with v3.3 clients
- [ ] Update changelog, status page, and customer release notes

## 5. Security & Compliance Notes

All transport traffic enforces TLS 1.3 with forward-secret cipher suites. Audit logs capture every administrative action with tamper-evident SHA-256 hash chaining and are retained in immutable object storage for seven years to satisfy SOC 2 Type II and ISO 27001 controls.[^2]

[^1]: Architecture specifications conform to RFC 9110 (HTTP Semantics) and RFC 8259 (JSON Data Interchange Format).
[^2]: Report suspected security vulnerabilities privately to `security@meridian.example` using our published PGP key.
"""


def _content_education(spec: dict) -> str:
    return """## Course & Module Overview

Welcome to **Unit 4: Statistical Inference, Experimental Design, and Reproducible Analysis**. Across the next three weeks, students will move from descriptive probability distributions to formal hypothesis testing, confidence intervals, and power calculations using real-world ecological and civic datasets.[^1]

By the conclusion of this module, every learner should be able to formulate a falsifiable null hypothesis, select an appropriate test statistic while verifying its underlying assumptions, and communicate uncertainty clearly in both written reports and visual plots.

> [!IMPORTANT]
> **Assessment Notice**: Problem Set 4 is due Friday at 5:00 PM via the course portal. Show all intermediate algebra, report exact p-values alongside effect sizes, and include brief written interpretations in plain English.

### Learning Objectives

1. Distinguish between **sampling error**, **measurement bias**, and **confounding variables** in observational versus randomized studies.
2. Compute and interpret 95% confidence intervals for population means and proportions without falling into common probability misconceptions.
3. Conduct one-sample, two-sample, and paired t-tests, evaluating normality and variance assumptions graphically.
4. Explain the relationship between sample size (*n*), significance threshold (*α*), effect size (*d*), and statistical power (*1 − β*).

## Core Concepts & Worked Formulas

When drawing independent observations *x₁, x₂, …, xₙ* from a population with mean *μ* and standard deviation *σ*, the Central Limit Theorem ensures that the sampling distribution of the sample mean *x̄* approaches normality as *n* grows, with standard error SE = *s / √n*.

| Statistical Test | Data Type | Key Assumptions | Primary Statistic |
|---|---|---|---|
| One-Sample t-Test | Continuous | Independence, approx. normality | *t* = (*x̄* − *μ₀*) / (*s / √n*) |
| Two-Sample Welch t | Continuous | Independent groups (unequal var OK) | Welch–Satterthwaite *t* |
| Chi-Square Goodness | Categorical | Expected cell count ≥ 5 | *χ²* = Σ (*O* − *E*)² / *E* |
| Linear Regression | Paired Continuous | Linearity, homoscedasticity | Slope *b₁*, *R²*, residual *F* |

![Figure 1: Empirical convergence of estimator accuracy across increasing sample horizons.](images/figure-1.svg)

### Worked Example — Water Quality Monitoring

A coastal monitoring team collects *n* = 36 independent dissolved-oxygen readings downstream from a restored wetland, finding sample mean *x̄* = 8.42 mg/L and sample standard deviation *s* = 1.08 mg/L. They test whether the mean exceeds the historical baseline of *μ₀* = 8.00 mg/L at *α* = 0.05.

```python
import math

n, xbar, mu0, s = 36, 8.42, 8.00, 1.08
se = s / math.sqrt(n)          # 0.18 mg/L
t_stat = (xbar - mu0) / se     # 2.333 (df = 35)
ci_low, ci_high = xbar - 2.03 * se, xbar + 2.03 * se
print(f"SE={se:.3f}, t={t_stat:.3f}, 95% CI=[{ci_low:.2f}, {ci_high:.2f}]")
```

Because *t* = 2.333 with 35 degrees of freedom yields a two-sided *p* = 0.0255 < 0.05 and the 95% confidence interval [8.05, 8.79] lies strictly above 8.00, we reject *H₀* and conclude that dissolved oxygen increased modestly following restoration.

> [!TIP]
> **Exam Strategy**: Always report **practical significance** alongside statistical significance. With a huge sample (*n* = 50,000), a tiny 0.02 mg/L shift can be statistically significant while remaining ecologically trivial.

## Guided Practice Problems

### Problem 1 — Experimental Design Critique (20 pts)
A municipal transit agency installs brighter LED signage at 12 downtown bus stops and observes a 9% ridership increase during September compared with August. Identify **two distinct confounding variables** that threaten a causal claim, and propose a randomized or difference-in-differences study design to isolate the true signage effect.

### Problem 2 — Confidence Interval Interpretation (20 pts)
A poll of 400 registered voters estimates 54% support for a new library bond with a 95% confidence interval of `[49.1%, 58.9%]`. Explain in two concise sentences why it is incorrect to claim *"there is a 95% probability that the true support lies inside this specific interval,"* and provide a correct frequentist interpretation.

### Problem 3 — Power & Sample Size Planning (25 pts)
Before launching a classroom reading intervention, researchers expect a moderate effect size (*d* = 0.40) and require 80% power at *α* = 0.05. Discuss how increasing class cluster size versus recruiting additional independent schools affects effective sample size.

## Weekly Study & Lab Schedule

| Week | Lecture Topic | Reading Assignment | Lab Deliverable |
|---|---|---|---|
| Week 10 | Sampling Distributions & CLT | Ch. 7 (§7.1–7.4) | Simulation Notebook #4 |
| Week 11 | Hypothesis Testing & Errors | Ch. 8 (§8.1–8.5) | Wetland Data Analysis |
| Week 12 | Regression & Model Diagnostics | Ch. 9 (§9.1–9.3) | Draft Capstone Poster |

### Student Preparation Checklist

- [x] Complete pre-lecture reading notes and bring calculator to seminar
- [x] Verify Python / R notebook environment runs cleanly offline
- [ ] Attend Thursday office hours if any residual-plot diagnostics look unclear
- [ ] Submit peer-review feedback for two classmates by Sunday evening[^2]

[^1]: Course readings draw from *OpenIntro Statistics* (4th Edition, CC BY-SA 3.0).
[^2]: Academic integrity policy: collaboration on conceptual discussion is encouraged; all submitted code and prose must be your own.
"""


def _content_journal(spec: dict) -> str:
    return """## Morning Pages — Autumn Field Reflections

**Location:** Cascadia Ridge Cabin · **Weather:** Crisp 7°C, high silver clouds, scent of damp hemlock  
**Energy:** Calm & focused · **Reading:** *The Practice of the Wild* (Gary Snyder)

Woke twenty minutes before the alarm to the sound of jays arguing in the cedar canopy. Made pour-over coffee in the enamel kettle and sat at the south window while mist lifted slowly off the valley floor. Notice how differently a day unfolds when the first forty minutes belong to a paper notebook rather than an inbox.[^1]

This week's anchor intention is simple: **finish fewer things more completely**. Last month I scattered attention across six half-started sketches and felt oddly drained despite busy afternoons. Choosing two meaningful creative anchors per day—and letting the rest wait without guilt—already feels lighter.

> "Attention is the rarest and purest form of generosity—both toward the people we love and toward the ordinary craft in front of our hands."

### Three Small Gratitudes Today

1. The unexpected phone call from Maya sharing photos from her Lisbon residency.
2. Finding the brass fountain pen I thought I had misplaced on the October train.
3. A quiet thirty-minute walk under golden larch trees before the afternoon rain returned.

---

## Weekly Focus & Habit Tracker

Keeping habits modest makes them resilient even during travel or busy deadlines. Here is the honest scorecard for Week 47:

| Daily Practice | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 25-min Morning Writing | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | Best sessions before 7:30 AM |
| 6 km Walk / Trail Run | ✓ | — | ✓ | ✓ | — | ✓ | ✓ | Muddy switchbacks on Saturday |
| Reading (30+ pages) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Finished Ch. 4–8 |
| Phone-Free Evening | — | ✓ | ✓ | ✓ | — | ✓ | ✓ | Much deeper sleep quality |
| Watercolor / Sketch | — | — | ✓ | — | — | ✓ | ✓ | Cedar cone & ridge elevation |

![Field Sketch Plate: Seasonal cadence and reflection rhythm for November.](images/figure-1.svg)

> [!TIP]
> **Sunday Reset Ritual**: Spend 15 minutes reviewing completed tasks, clearing the desk surface, and picking the single most important priority for Monday morning.

## Project Notes & Action Items

### Studio & Creative Projects
- [x] Organize autumn photographs into dated archive folders with captions
- [x] Refine CSS typography for the personal essay chapbook
- [ ] Frame the two botanical linocuts for the hallway wall
- [ ] Draft thank-you letters to friends who hosted us during the coast trip

### Home, Kitchen & Errands
- [x] Sharpen kitchen chef's knife and oil the maple cutting board
- [x] Order winter seeds (sweet peas, kale, rosemary) for February cold frames
- [ ] Repair the loose brass hinge on the porch lantern
- [ ] Bake sourdough focaccia and fennel ragout for Sunday dinner

---

## Travel & Field Log — Ridge Loop Trail

Started from the upper trailhead at 8:15 AM carrying tea in a thermos, binoculars, and the pocket field journal. The first mile climbed steadily through sword ferns and mossy nurse logs; by mile two the forest opened onto basalt talus with sweeping views toward the snow-dusted northern peaks.

<!-- .pull-quote -->
> Halfway up the switchback I spotted a pair of varied thrushes feeding quietly among the salal berries—flashes of burnt orange and slate blue against wet evergreen shadow.

### Trail Observations

- **Elevation Gain**: 480 meters over 8.4 km round trip.
- **Flora Noted**: Western redcedar, vine maple in final crimson leaf, pale lichen curtains on Douglas fir.
- **Sketch Idea**: Study how low November sunlight turns wet bark almost plum-colored against bright moss.

## Evening Wind-Down & Tomorrow's First Step

Tomorrow morning, open the manuscript directly to Section 3 and write 500 unedited words before checking any messages. Leave the fountain pen uncapped beside the lamp, turn down the stove damper, and call it a good, honest day.[^2]

[^1]: Archived in the 2026 Personal Field Journal series (Volume IV).
[^2]: Printed pages are hole-punched for the linen ring binder at month's end.
"""


def _content_legal(spec: dict) -> str:
    return """## Recitals & Parties

This **Master Services & Archival Licensing Agreement** (the **"Agreement"**) is entered into and effective as of **November 26, 2026** (the **"Effective Date"**), by and between **Meridian Digital Press, Inc.**, a Delaware corporation with principal offices at 500 Howard Street, Suite 1200, San Francisco, CA 94105 (**"Provider"**), and **Pacific Civic Library Consortium**, a public instrumentality organized under the laws of California (**"Client"**). Provider and Client are each referred to herein as a **"Party"** and collectively as the **"Parties."**[^1]

**WHEREAS**, Provider develops and maintains publication software, open-standard document templates, and technical consulting services; and  
**WHEREAS**, Client desires to engage Provider to deliver archival digitization services, bespoke stylesheets, and offline viewing packages on the terms and conditions set forth below;

**NOW, THEREFORE**, in consideration of the mutual covenants, representations, and promises contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

---

## Article 1 — Definitions

1.1 **"Deliverables"** means all `.wa` document packages, stylesheets (`style.css`), Markdown source documents (`content.md`), vector assets, documentation, and technical reports specified in an executed Statement of Work (**"SOW"**).

1.2 **"Confidential Information"** means any non-public technical, financial, operational, or patron information disclosed by one Party to the other that is designated as confidential or reasonably understood to be confidential given the nature of the information and circumstances of disclosure.

1.3 **"Open Standards Requirement"** means that all Deliverables shall remain fully readable, editable, and printable using standard modern web browsers without mandatory proprietary runtime dependencies or recurring per-seat decryption fees.

> [!IMPORTANT]
> **Order of Precedence**: In the event of any conflict between the terms of this Master Agreement and an executed Statement of Work, the terms of this Master Agreement shall govern unless the SOW expressly cites the specific section being superseded.

## Article 2 — Scope of Services & Acceptance

2.1 **Performance Standard.** Provider shall perform all Services in a professional and workmanlike manner consistent with generally accepted industry standards for digital archival engineering and WCAG 2.1 Level AA accessibility.

2.2 **Inspection and Acceptance.** Upon delivery of any milestone Deliverable, Client shall have fifteen (15) business days to evaluate conformance against the written specifications in Schedule A. If Client identifies a material non-conformity in writing, Provider shall cure the defect at no additional charge within ten (10) business days.

| Milestone | Deliverable Description | Target Date | Fee Allocation | Acceptance Criteria |
|---|---|---|---:|---|
| M-01 | Archival Specification & Schema | Jan 15, 2027 | $12,000 | Format & accessibility sign-off |
| M-02 | 25 Bespoke Institutional Templates | Mar 31, 2027 | $24,000 | Headless PDF & WCAG AA pass |
| M-03 | Offline Reading-Room Deployment | Jun 15, 2027 | $16,000 | Zero-network verification test |
| M-04 | Staff Training & Final Handover | Aug 30, 2027 | $10,000 | 4 workshops + reference manual |

![Exhibit A: Official Governance Seal and Milestone Verification Schedule.](images/figure-1.svg)

## Article 3 — Intellectual Property & Licensing

3.1 **Client Materials.** Client retains sole and exclusive ownership of all historical manuscripts, patron records, photographs, and source texts provided to Provider.

3.2 **Deliverable License.** Upon receipt of payment in full for the applicable Milestone, Provider grants Client a perpetual, worldwide, irrevocable, royalty-free, non-exclusive license to use, copy, modify, publish, and distribute all Deliverables across its member libraries and public web portals.

3.3 **Open-Source Components.** Any third-party open-license fonts (SIL OFL) or libraries incorporated into the Deliverables shall be accompanied by complete license notices stored inside `runtime/fonts/LICENSES/`.

## Article 4 — Confidentiality, Security & Liability

4.1 **Non-Disclosure Obligations.** Each Party agrees to hold the other Party's Confidential Information in strict confidence using at least the same degree of care it uses to protect its own confidential information, and in no event less than reasonable care.

4.2 **Limitation of Liability.** Except for breaches of Article 4.1 (Confidentiality) or willful misconduct, neither Party's aggregate cumulative liability arising out of or related to this Agreement shall exceed the total fees paid or payable by Client under the applicable SOW during the twelve (12) months immediately preceding the claim.

> [!WARNING]
> Neither Party shall be liable for indirect, incidental, special, exemplary, or consequential damages, including loss of goodwill or business interruption, even if advised of the possibility of such damages.

## Article 5 — Term, Termination & Governing Law

5.1 **Term.** This Agreement commences on the Effective Date and continues for twenty-four (24) months unless terminated earlier for cause upon thirty (30) days' written notice and failure to cure.

5.2 **Governing Law.** This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict-of-laws principles.

### Execution Readiness Checklist

- [x] Legal counsel review completed by both Provider and Client
- [x] Schedule A fee table reconciled against approved board resolution
- [ ] Authorized corporate officers execute signature blocks below
- [ ] Counter-signed PDF archived in permanent compliance repository

---

## Execution & Signatures

**IN WITNESS WHEREOF**, the Parties have caused this Agreement to be executed by their duly authorized representatives as of the Effective Date written above.[^2]

| **MERIDIAN DIGITAL PRESS, INC.** | **PACIFIC CIVIC LIBRARY CONSORTIUM** |
|---|---|
| Signature: `___________________________` | Signature: `___________________________` |
| Name: Elena Rostova | Name: Margaret Chen |
| Title: Chief Executive Officer | Title: Executive Director |
| Date: November 26, 2026 | Date: November 26, 2026 |

[^1]: This template is provided as a structural legal typesetting specimen and does not constitute formal legal advice.
[^2]: Electronic signatures executed via verified audit trail carry the same legal force as ink originals under the U.S. ESIGN Act.
"""


def _content_creative(spec: dict) -> str:
    return """## Manifesto: Form Follows Intention

Every visual movement of the last century—from Weimar geometric grids and mid-century Swiss posters to hand-cranked risograph zines and phosphor-green terminals—understood one enduring truth: **the surface of a page is never neutral.** Margin proportions, paper tone, rule weight, and letterform contrast announce the temperament of an idea before the reader finishes the first sentence.[^1]

In this studio specimen, we explore how expressive art direction and strict plain-text Markdown reinforce one another. By holding content completely clean while letting `style.css` transform the atmosphere—paper grain, color temperature, framing lines, and typographic voice—the same manuscript can speak with the authority of an architectural blueprint or the intimacy of a hand-typed letter.

<!-- .pull-quote -->
> Radical clarity is not the absence of personality; it is the courage to remove every decorative habit that does not serve the mood of the page.

### The Four Pillars of Expressive Document Design

1. **Atmospheric Paper**: Never assume pure `#FFFFFF` is the only canvas. Warm cream, newsprint sepia, drafting cyan, or deep slate can transform reading into a tactile event when paired with WCAG-verified ink contrast.
2. **Deliberate Tension**: Pair a bold display voice (geometric grotesque, condensed poster sans, or engraved serif) with a rock-solid workhorse body typeface.
3. **Structural Rules**: Hairlines, double rules, and asymmetric borders guide the eye swiftly across tables, callouts, and multi-page rhythms.
4. **Print-First Discipline**: Every flourish must survive 300 DPI PDF printing cleanly—no muddy drop shadows, no clipped boxes, no orphaned titles.

![Studio Plate 01: Geometric proportion study and palette balance composition.](images/figure-1.svg)

## Comparative Aesthetic Matrix

Studio directors often map document voice along two axes: *structural rigor* (grid-driven vs. organic) and *historical register* (archival vs. futuristic). Table 1 summarizes six archetypal visual palettes studied in our design lab.

| Aesthetic School | Paper Tone | Primary Voice | Accent Philosophy | Best Use Case |
|---|---|---|---|---|
| Swiss International | Crisp White | Inter / Space Grotesk | Signal Vermilion | Exhibitions & Architecture |
| Bauhaus Geometric | Warm Ivory | Montserrat / Work Sans | Primary Cobalt & Ochre | Manifestos & Catalogs |
| Architectural Blueprint | Deep Cyan | IBM Plex Mono | Drafting White & Sky | Engineering Specs & Plans |
| Art Deco Gilded | Pearl Cream | Cinzel / Playfair | Burnished Gold & Ink | Galas & Monograph Covers |
| Vintage Typewriter | Rag Paper | Special Elite / Courier | Carbon & Stamp Red | Dispatches & Screenplays |
| Minimalist Zen | Soft Stone | Cormorant / Source Sans | Moss & Charcoal | Essays & Poetry |

> [!TIP]
> **Quick Remix Exercise**: Open `style.css` in Edit Mode and swap just three variables—`--page-background`, `--text-color`, and `--accent-color`—to watch the entire editorial mood shift instantaneously while preserving print geometry.

## Materiality & Print Craft Specifications

When preparing expressive templates for physical output, pay special attention to ink coverage and optical weight. Light text set on dark paper (such as blueprint cyan, chalkboard slate, or terminal obsidian) appears slightly bolder due to optical irradiation; opening `line-height` to `1.6` and increasing letter-spacing by `0.01em` preserves effortless legibility across long passages.

```css
/* Example: Expressive Layer 1 palette override */
:root {
  --page-size: Letter;
  --page-margin: 0.9in 0.85in 0.9in 0.85in;
  --line-height: 1.6;
  --scale: 1.28;
}
```

### Studio Proofing Checklist

- [x] Verify body text contrast ratio exceeds WCAG AA (≥ 4.5:1)
- [x] Inspect printed PDF margins with Chrome "Background graphics" enabled
- [x] Confirm running headers and page numbers remain crisp on pages 2–4
- [ ] Print a physical proof sheet to check ink density and line measure

> [!NOTE]
> Even dark-canvas creative templates remain 100% standard `.wa` folders. Applying any light-mode academic or business template from the Gallery immediately re-typesets your text on clean white paper without touching `content.md`.

## Closing Exhibition Note

Typography is architecture at the scale of the hand. Whether you are drafting a technical blueprint, an exhibition catalog, a manifesto, or a late-night dispatch, treat the page as a quiet room built for your reader to inhabit.[^2]

[^1]: Drawn from the Write Along Typographic Specimen Series, Monograph No. 11.
[^2]: All color swatches and typographic proportions are documented in `syntax.md` for both human designers and AI assistants.
"""
