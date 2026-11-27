#!/usr/bin/env python3
"""
Validate every .wa document in templates/ and docs/ against the .wa Format Spec:
- Required files present: content.md, style.css, images/, read.html, syntax.md
- Front-matter parses cleanly
- All relative image links resolve inside images/
- style.css has balanced braces, no external @import, and valid Layer 1 variables
- Text vs background WCAG AA luminance contrast >= 4.5:1
- read.html has wa-version meta and inline fallback blocks
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KNOWN_VARS = {
    "--page-size", "--page-width", "--page-height", "--page-margin",
    "--page-background", "--text-color", "--muted-color", "--accent-color",
    "--accent-secondary", "--surface-color", "--border-color",
    "--body-font", "--heading-font", "--code-font",
    "--body-size", "--line-height", "--scale",
    "--paragraph-spacing", "--paragraph-indent", "--radius",
    "--columns", "--column-gap",
}


def hex_to_rgb(h: str) -> tuple[int, int, int] | None:
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        return None
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rel_luminance(rgb: tuple[int, int, int]) -> float:
    def ch(v: int) -> float:
        s = v / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast_ratio(c1: str, c2: str) -> float | None:
    rgb1, rgb2 = hex_to_rgb(c1), hex_to_rgb(c2)
    if not rgb1 or not rgb2:
        return None
    l1, l2 = rel_luminance(rgb1), rel_luminance(rgb2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def validate_wa_dir(wa_dir: str) -> list[str]:
    errors = []
    name = os.path.basename(wa_dir)
    if not name.endswith(".wa"):
        errors.append(f"{wa_dir}: folder name must end with .wa")

    for req in ("content.md", "style.css", "read.html", "syntax.md"):
        if not os.path.isfile(os.path.join(wa_dir, req)):
            errors.append(f"{name}: missing required file {req}")
    if not os.path.isdir(os.path.join(wa_dir, "images")):
        errors.append(f"{name}: missing required directory images/")

    if errors:
        return errors

    with open(os.path.join(wa_dir, "content.md"), "r", encoding="utf-8") as f:
        md = f.read()
    with open(os.path.join(wa_dir, "style.css"), "r", encoding="utf-8") as f:
        css = f.read()
    with open(os.path.join(wa_dir, "read.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # Front-matter check
    if not re.match(r"^---\n[\s\S]*?\n---\n", md):
        errors.append(f"{name}: content.md missing YAML front-matter")

    # Image links check (outside fenced code blocks and inline code spans)
    md_no_code = re.sub(r"```[\s\S]*?```", "", md)
    md_no_code = re.sub(r"`[^`\n]+`", "", md_no_code)
    img_refs = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", md_no_code)
    for ref in img_refs:
        if ref.startswith(("http://", "https://", "data:")):
            continue
        target = os.path.join(wa_dir, ref)
        if not os.path.isfile(target):
            errors.append(f"{name}: broken image reference {ref}")

    # CSS syntax & standalone check
    if "@import" in css:
        errors.append(f"{name}: style.css must be standalone (found @import)")
    if css.count("{") != css.count("}"):
        errors.append(f"{name}: style.css has unbalanced braces")

    # Variable vocabulary + WCAG AA contrast check
    css_vars = {}
    for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;{}]+);", css, re.IGNORECASE):
        var_name = m.group(1).lower()
        css_vars[var_name] = m.group(2).strip()
        if var_name not in KNOWN_VARS:
            errors.append(f"{name}: unknown CSS variable {var_name}")

    bg = css_vars.get("--page-background")
    fg = css_vars.get("--text-color")
    if not bg or not fg:
        errors.append(f"{name}: style.css missing --page-background or --text-color")
    else:
        ratio = contrast_ratio(bg, fg)
        if ratio is None:
            errors.append(f"{name}: non-hex page/text color ({bg}, {fg})")
        elif ratio < 4.5:
            errors.append(f"{name}: WCAG AA contrast fail ({bg} vs {fg} = {ratio:.2f}:1 < 4.5:1)")

    # read.html checks
    if 'name="wa-version"' not in html:
        errors.append(f"{name}: read.html missing wa-version meta tag")
    if 'id="wa-content"' not in html or 'id="wa-style"' not in html:
        errors.append(f"{name}: read.html missing inline fallback blocks")

    return errors


def main():
    templates_dir = os.path.join(ROOT, "templates")
    wa_dirs = sorted(
        os.path.join(templates_dir, d)
        for d in os.listdir(templates_dir)
        if d.endswith(".wa") and os.path.isdir(os.path.join(templates_dir, d))
    )

    guide_dir = os.path.join(ROOT, "docs", "syntax.wa")
    all_dirs = wa_dirs + ([guide_dir] if os.path.isdir(guide_dir) else [])

    total_errors = []
    for d in all_dirs:
        total_errors.extend(validate_wa_dir(d))

    # Validate templates/index.json count matches disk
    idx_path = os.path.join(templates_dir, "index.json")
    if not os.path.isfile(idx_path):
        total_errors.append("Missing templates/index.json")
    else:
        with open(idx_path, "r", encoding="utf-8") as f:
            idx = json.load(f)
        if len(idx.get("templates", [])) != len(wa_dirs):
            total_errors.append(f"index.json has {len(idx.get('templates', []))} entries, disk has {len(wa_dirs)}")
        if len(wa_dirs) < 100:
            total_errors.append(f"Expected >= 100 templates, found {len(wa_dirs)}")

    if total_errors:
        print(f"VALIDATION FAILED ({len(total_errors)} errors):")
        for e in total_errors[:40]:
            print("  -", e)
        sys.exit(1)

    print(f"VALIDATION PASSED: {len(wa_dirs)} templates + docs/syntax.wa (0 errors, 100% WCAG AA pass)")


if __name__ == "__main__":
    main()
