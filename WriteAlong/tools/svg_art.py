"""Palette-harmonized SVG figure generator for Write Along templates."""
import hashlib


def _seed(template_id: str) -> int:
    return int(hashlib.sha256(template_id.encode("utf-8")).hexdigest()[:8], 16)


def generate_svg_figure(template_id: str, category: str, palette: dict, title: str = "") -> str:
    """Emit a crisp, palette-matched vector illustration tailored to the template category."""
    bg = palette.get("surface", "#f5f7fa")
    page_bg = palette.get("bg", "#ffffff")
    ink = palette.get("text", "#1c2026")
    muted = palette.get("muted", "#5c6470")
    accent = palette.get("accent", "#1f4e79")
    accent2 = palette.get("accent2", "#3b7ea1")
    border = palette.get("border", "#d6dce5")
    s = _seed(template_id)

    cat = category.lower()
    if "academic" in cat or "education" in cat:
        # Scientific multi-series convergence & distribution chart
        pts1 = []
        pts2 = []
        for i in range(8):
            x = 76 + i * 68
            y1 = 188 - int((1 - 0.62 ** (i + 1)) * 112) + ((s >> (i % 6)) % 7 - 3)
            y2 = 194 - int((1 - 0.74 ** (i + 1)) * 84) + ((s >> ((i + 3) % 6)) % 7 - 3)
            pts1.append((x, y1))
            pts2.append((x, y2))
        p1_str = " ".join(f"{x},{y}" for x, y in pts1)
        p2_str = " ".join(f"{x},{y}" for x, y in pts2)
        dots1 = "".join(f'<circle cx="{x}" cy="{y}" r="4.2" fill="{accent}" stroke="{page_bg}" stroke-width="1.5"/>' for x, y in pts1)
        dots2 = "".join(f'<rect x="{x-3.5}" y="{y-3.5}" width="7" height="7" fill="{accent2}" stroke="{page_bg}" stroke-width="1.2"/>' for x, y in pts2)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 250" width="640" height="250">
  <rect width="640" height="250" rx="6" fill="{bg}" stroke="{border}" stroke-width="1.2"/>
  <text x="320" y="28" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="{ink}">Empirical Convergence Across Evaluation Epochs</text>
  <g stroke="{border}" stroke-width="1" stroke-dasharray="3 3">
    <line x1="64" y1="60" x2="590" y2="60"/><line x1="64" y1="105" x2="590" y2="105"/>
    <line x1="64" y1="150" x2="590" y2="150"/><line x1="64" y1="195" x2="590" y2="195"/>
  </g>
  <line x1="64" y1="48" x2="64" y2="205" stroke="{ink}" stroke-width="1.4"/>
  <line x1="64" y1="205" x2="595" y2="205" stroke="{ink}" stroke-width="1.4"/>
  <polyline fill="none" stroke="{accent}" stroke-width="2.5" points="{p1_str}"/>
  <polyline fill="none" stroke="{accent2}" stroke-width="2.2" stroke-dasharray="6 3" points="{p2_str}"/>
  {dots1}
  {dots2}
  <g font-family="sans-serif" font-size="10" fill="{muted}">
    <text x="56" y="64" text-anchor="end">0.95</text><text x="56" y="109" text-anchor="end">0.80</text>
    <text x="56" y="154" text-anchor="end">0.65</text><text x="56" y="199" text-anchor="end">0.50</text>
    <text x="330" y="232" text-anchor="middle">Observation Horizon (Iterations × 10²)</text>
  </g>
  <g font-family="sans-serif" font-size="10" fill="{ink}">
    <circle cx="420" cy="46" r="4" fill="{accent}"/><text x="430" y="50">Proposed Model</text>
    <rect x="518" y="42" width="7" height="7" fill="{accent2}"/><text x="530" y="50">Baseline</text>
  </g>
</svg>"""

    if "report" in cat or "business" in cat or "resume" in cat:
        # Clean executive bar + trend chart
        bars = [58, 76, 92, 114, 134, 152]
        bar_svg = []
        labels = ["Q1", "Q2", "Q3", "Q4", "Q1'", "Q2'"]
        for idx, h in enumerate(bars):
            adj = h + ((s >> (idx * 2)) % 18) - 8
            x = 88 + idx * 78
            y = 196 - adj
            col = accent if idx >= 4 else accent2
            bar_svg.append(f'<rect x="{x}" y="{y}" width="42" height="{adj}" rx="3" fill="{col}" opacity="0.9"/>')
            bar_svg.append(f'<text x="{x+21}" y="{y-7}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="{ink}">{adj}</text>')
            bar_svg.append(f'<text x="{x+21}" y="214" text-anchor="middle" font-family="sans-serif" font-size="10" fill="{muted}">{labels[idx]}</text>')
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" width="640" height="240">
  <rect width="640" height="240" rx="6" fill="{bg}" stroke="{border}" stroke-width="1.2"/>
  <text x="32" y="30" font-family="sans-serif" font-size="12.5" font-weight="700" fill="{ink}">Performance Trajectory &amp; Quarterly Benchmarks</text>
  <line x1="60" y1="196" x2="588" y2="196" stroke="{ink}" stroke-width="1.2"/>
  {"".join(bar_svg)}
</svg>"""

    if "technical" in cat:
        # Clean system architecture pipeline diagram
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="640" height="220">
  <rect width="640" height="220" rx="6" fill="{bg}" stroke="{border}" stroke-width="1.2"/>
  <text x="320" y="28" text-anchor="middle" font-family="monospace" font-size="12" font-weight="700" fill="{ink}">System Architecture &amp; Request Pipeline</text>
  <rect x="30" y="68" width="125" height="84" rx="6" fill="{page_bg}" stroke="{accent}" stroke-width="1.8"/>
  <text x="92" y="104" text-anchor="middle" font-family="sans-serif" font-size="11.5" font-weight="700" fill="{ink}">Edge Gateway</text>
  <text x="92" y="124" text-anchor="middle" font-family="monospace" font-size="9.5" fill="{muted}">TLS · Auth · Rate</text>
  <line x1="155" y1="110" x2="196" y2="110" stroke="{accent}" stroke-width="2"/>
  <polygon points="196,105 206,110 196,115" fill="{accent}"/>
  <rect x="206" y="56" width="170" height="108" rx="6" fill="{accent}"/>
  <text x="291" y="96" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="{page_bg}">Core Worker Pool</text>
  <text x="291" y="116" text-anchor="middle" font-family="monospace" font-size="9.5" fill="{page_bg}" opacity="0.88">Idempotent Queue</text>
  <text x="291" y="134" text-anchor="middle" font-family="monospace" font-size="9.5" fill="{page_bg}" opacity="0.88">p99 &lt; 18ms</text>
  <line x1="376" y1="90" x2="430" y2="82" stroke="{accent2}" stroke-width="2"/>
  <line x1="376" y1="130" x2="430" y2="138" stroke="{accent2}" stroke-width="2"/>
  <rect x="434" y="56" width="174" height="48" rx="5" fill="{page_bg}" stroke="{accent2}" stroke-width="1.6"/>
  <text x="521" y="84" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="{ink}">Primary State Store</text>
  <rect x="434" y="118" width="174" height="48" rx="5" fill="{page_bg}" stroke="{accent2}" stroke-width="1.6"/>
  <text x="521" y="146" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="{ink}">Telemetry &amp; Audit Log</text>
  <text x="320" y="198" text-anchor="middle" font-family="monospace" font-size="9.5" fill="{muted}">Zero-downtime failover topology · Active-Active replication</text>
</svg>"""

    if "book" in cat or "letter" in cat or "legal" in cat:
        # Refined typographic ornamental plate / vignette
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 190" width="640" height="190">
  <rect width="640" height="190" rx="4" fill="{bg}" stroke="{border}" stroke-width="1.2"/>
  <rect x="14" y="14" width="612" height="162" rx="2" fill="none" stroke="{accent}" stroke-width="1" opacity="0.45"/>
  <line x1="72" y1="95" x2="255" y2="95" stroke="{accent}" stroke-width="1.4"/>
  <line x1="385" y1="95" x2="568" y2="95" stroke="{accent}" stroke-width="1.4"/>
  <polygon points="320,44 368,95 320,146 272,95" fill="none" stroke="{accent}" stroke-width="2"/>
  <polygon points="320,58 354,95 320,132 286,95" fill="{accent}" opacity="0.14"/>
  <circle cx="320" cy="95" r="14" fill="{accent}"/>
  <circle cx="320" cy="95" r="5" fill="{page_bg}"/>
  <text x="320" y="166" text-anchor="middle" font-family="serif" font-size="11" letter-spacing="3" fill="{muted}">EX LIBRIS · CHAPTER PLATE</text>
</svg>"""

    # Editorial / Newsletter / Personal / Creative geometric composition
    r1 = 36 + (s % 24)
    r2 = 24 + ((s >> 4) % 22)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="640" height="220">
  <rect width="640" height="220" rx="6" fill="{bg}" stroke="{border}" stroke-width="1.2"/>
  <rect x="24" y="24" width="230" height="172" rx="4" fill="{accent}" opacity="0.14"/>
  <circle cx="140" cy="110" r="{r1}" fill="{accent}"/>
  <circle cx="206" cy="84" r="{r2}" fill="{accent2}" opacity="0.88"/>
  <line x1="286" y1="54" x2="600" y2="54" stroke="{accent}" stroke-width="2.5"/>
  <rect x="286" y="72" width="180" height="14" rx="2" fill="{ink}" opacity="0.82"/>
  <rect x="286" y="98" width="295" height="9" rx="2" fill="{muted}" opacity="0.55"/>
  <rect x="286" y="116" width="268" height="9" rx="2" fill="{muted}" opacity="0.45"/>
  <rect x="286" y="134" width="290" height="9" rx="2" fill="{muted}" opacity="0.38"/>
  <rect x="286" y="160" width="96" height="26" rx="4" fill="{accent}"/>
  <rect x="394" y="160" width="96" height="26" rx="4" fill="none" stroke="{accent2}" stroke-width="1.6"/>
</svg>"""
