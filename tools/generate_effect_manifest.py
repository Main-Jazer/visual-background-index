#!/usr/bin/env python3
r"""
JaZeR Visual Effects Library — Effect Manifest Generator

Scans a repo directory for effect HTML files and produces:
- docs/effects.manifest.json (machine-readable)
- docs/effects.manifest.md   (optional human-readable summary)

Usage (PowerShell):
  cd "C:\Users\JaZeR\ACTIVE PROJECTS\Three JS Custom JaZeR Visuals"
  python generate_effect_manifest.py

Optional:
  python generate_effect_manifest.py --root "C:\path\to\repo" --out-json "docs\effects.manifest.json" --out-md "docs\effects.manifest.md"
  python generate_effect_manifest.py --include templates --max-bytes 600000
"""


from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional


DEFAULT_ROOT = "."

# Skip directories that will create noise / massive scans.
DEFAULT_IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".next", ".vite", ".cache",
    "dist", "build", "out", "coverage", ".idea", ".vscode"
}

# Prefer effects/ but allow scanning entire repo if needed.
DEFAULT_EFFECT_DIR_HINTS = ("effects", "effect", "visuals", "demos")

# Maximum bytes to read from any single HTML file (safety + speed).
DEFAULT_MAX_BYTES = 450_000


@dataclass
class EffectRecord:
    id: str
    name: str
    title: str
    type: str                 # "three" | "canvas" | "unknown"
    path: str                 # repo-relative path
    size_bytes: int
    modified_utc: str         # ISO8601
    categories: list[str]
    tags: list[str]
    features: list[str]
    gpu_tier: str             # "low" | "med" | "high"
    notes: list[str]


TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)

# Fast heuristics for tech detection
HAS_THREE_RE = re.compile(r"\bthree\b|three\.module\.js|unpkg\.com/three|skypack\.dev/three", re.IGNORECASE)
HAS_CANVAS_RE = re.compile(r"<canvas\b|getcontext\(\s*['\"]2d['\"]\s*\)", re.IGNORECASE)
HAS_WEBGPU_RE = re.compile(r"\bwebgpu\b|navigator\.gpu|GPUDevice|GPUAdapter", re.IGNORECASE)

HAS_SHADER_RE = re.compile(r"ShaderMaterial|RawShaderMaterial|gl_FragColor|fragmentShader|vertexShader", re.IGNORECASE)
HAS_POSTFX_RE = re.compile(r"EffectComposer|RenderPass|UnrealBloomPass|AfterimagePass|SSAOPass|BokehPass|FilmPass", re.IGNORECASE)
HAS_INSTANCING_RE = re.compile(r"InstancedMesh|instanceMatrix|InstancedBufferAttribute", re.IGNORECASE)
HAS_PARTICLES_RE = re.compile(r"PointsMaterial|THREE\.Points|BufferGeometry|particle|particles", re.IGNORECASE)
HAS_NOISE_RE = re.compile(r"simplex|perlin|fbm|fractal\s*brownian|noise\(", re.IGNORECASE)
HAS_AUDIO_RE = re.compile(r"AudioContext|AnalyserNode|getByteFrequencyData|getByteTimeDomainData|microphone|getUserMedia", re.IGNORECASE)

# Category/tag hints
CATEGORY_HINTS = [
    ("sacred", re.compile(r"flower\s*of\s*life|metatron|sri\s*yantra|sacred\s*geometry|merkaba|seed\s*of\s*life", re.IGNORECASE)),
    ("tunnel", re.compile(r"\btunnel\b|wormhole|hyperspace|portal", re.IGNORECASE)),
    ("cosmic", re.compile(r"cosmic|nebula|galaxy|starfield|stardust|astral", re.IGNORECASE)),
    ("cyberpunk", re.compile(r"cyber|neon\s*city|grid|circuit|synthwave|outrun", re.IGNORECASE)),
    ("plasma", re.compile(r"plasma|storm|energy|arc|electric", re.IGNORECASE)),
    ("ocean", re.compile(r"ocean|water|wave|ripples|sea", re.IGNORECASE)),
    ("ambient", re.compile(r"ambient|calm|drift|haze|mist", re.IGNORECASE)),
    ("particles", re.compile(r"particles?|sparkles?|dust", re.IGNORECASE)),
]


def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s or "untitled"


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def read_text_limited(path: Path, max_bytes: int) -> tuple[str, int, list[str]]:
    notes: list[str] = []
    try:
        raw = path.read_bytes()
    except Exception as e:
        return "", 0, [f"read_failed:{type(e).__name__}"]

    size = len(raw)
    if size > max_bytes:
        notes.append(f"truncated_read:{size}->{max_bytes}")
        raw = raw[:max_bytes]

    # decode with fallback
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(enc, errors="replace"), size, notes
        except Exception:
            continue
    return raw.decode("utf-8", errors="replace"), size, notes


def detect_type(text: str) -> str:
    if HAS_WEBGPU_RE.search(text):
        return "webgpu"
    has_three = bool(HAS_THREE_RE.search(text))
    has_canvas = bool(HAS_CANVAS_RE.search(text))
    if has_three and not has_canvas:
        return "three"
    if has_canvas and not has_three:
        return "canvas"
    if has_three and has_canvas:
        # Mixed pages exist; choose "three" but note it later.
        return "three"
    return "unknown"


def extract_title(text: str) -> str:
    m = TITLE_RE.search(text)
    if m:
        return strip_html(m.group(1))
    m = H1_RE.search(text)
    if m:
        return strip_html(m.group(1))
    return ""


def detect_features(text: str) -> list[str]:
    feats = []
    if HAS_SHADER_RE.search(text):
        feats.append("shaders")
    if HAS_POSTFX_RE.search(text):
        feats.append("postfx")
    if HAS_INSTANCING_RE.search(text):
        feats.append("instancing")
    if HAS_PARTICLES_RE.search(text):
        feats.append("particles")
    if HAS_NOISE_RE.search(text):
        feats.append("noise")
    if HAS_AUDIO_RE.search(text):
        feats.append("audio-reactive")
    if HAS_WEBGPU_RE.search(text):
        feats.append("webgpu")
    return feats


def infer_gpu_tier(effect_type: str, features: list[str], size_bytes: int) -> str:
    score = 0
    if effect_type in ("three", "webgpu"):
        score += 2
    if "postfx" in features:
        score += 3
    if "shaders" in features:
        score += 2
    if "particles" in features:
        score += 2
    if "instancing" in features:
        score += 1
    if "webgpu" in features:
        score += 3
    if size_bytes > 200_000:
        score += 1
    if size_bytes > 450_000:
        score += 1

    if score >= 7:
        return "high"
    if score >= 4:
        return "med"
    return "low"


def infer_categories_and_tags(text: str) -> tuple[list[str], list[str]]:
    cats = set()
    tags = set()
    for name, rx in CATEGORY_HINTS:
        if rx.search(text):
            cats.add(name)
            tags.add(name)
    # a couple extra tag heuristics based on feature keywords
    if re.search(r"\bfog\b|FogExp2|fogDensity", text, re.IGNORECASE):
        tags.add("fog")
    if re.search(r"bloom|UnrealBloomPass", text, re.IGNORECASE):
        tags.add("bloom")
    if re.search(r"ACESFilmicToneMapping|toneMappingExposure", text, re.IGNORECASE):
        tags.add("filmic")
    return sorted(cats), sorted(tags)


def is_effect_html(path: Path) -> bool:
    if path.suffix.lower() != ".html":
        return False
    name = path.name.lower()
    if name.startswith("jazer-") or "effect" in name or "visual" in name:
        return True
    # Also treat anything under effects/ as an effect
    parts = [p.lower() for p in path.parts]
    return "effects" in parts


def should_ignore_dir(d: Path, ignore_dirs: set[str]) -> bool:
    return d.name in ignore_dirs


def find_candidate_html_files(root: Path, ignore_dirs: set[str]) -> list[Path]:
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dp = Path(dirpath)
        # prune ignored dirs
        dirnames[:] = [dn for dn in dirnames if dn not in ignore_dirs]
        for fn in filenames:
            p = dp / fn
            if is_effect_html(p):
                files.append(p)
    return sorted(files)


def relpath_str(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def build_record(root: Path, html_path: Path, max_bytes: int) -> EffectRecord:
    text, size_bytes, notes = read_text_limited(html_path, max_bytes=max_bytes)
    title = extract_title(text) or html_path.stem
    eff_type = detect_type(text)
    features = detect_features(text)
    categories, tags = infer_categories_and_tags(text)

    # If it includes both canvas and three hints, add note
    if HAS_THREE_RE.search(text) and HAS_CANVAS_RE.search(text):
        notes.append("mixed_three_and_canvas_detected")

    # derive an id/name
    base_name = html_path.stem
    if base_name.lower().startswith("jazer-"):
        base_name = base_name[6:]
    nice_name = title or base_name
    eff_id = slugify(f"jazer-{base_name}")

    mtime = datetime.fromtimestamp(html_path.stat().st_mtime, tz=timezone.utc).isoformat()

    gpu_tier = infer_gpu_tier(eff_type, features, size_bytes)

    return EffectRecord(
        id=eff_id,
        name=strip_html(nice_name),
        title=strip_html(title) if title else strip_html(nice_name),
        type=eff_type,
        path=relpath_str(root, html_path),
        size_bytes=size_bytes,
        modified_utc=mtime,
        categories=categories,
        tags=tags,
        features=sorted(set(features)),
        gpu_tier=gpu_tier,
        notes=notes,
    )


def write_json(out_path: Path, payload: dict) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_md(out_path: Path, payload: dict) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    effects = payload.get("effects", [])
    lines = []
    lines.append(f"# Effects Manifest\n")
    lines.append(f"- Generated: `{payload.get('generated_utc','')}`\n")
    lines.append(f"- Root: `{payload.get('root','')}`\n")
    lines.append(f"- Count: **{len(effects)}**\n")

    # group by category
    by_cat: dict[str, list[dict]] = {}
    for e in effects:
        cats = e.get("categories") or ["uncategorized"]
        for c in cats:
            by_cat.setdefault(c, []).append(e)

    for cat in sorted(by_cat.keys()):
        lines.append(f"\n## {cat}\n")
        for e in sorted(by_cat[cat], key=lambda x: x.get("name", "")):
            feats = ", ".join(e.get("features", []))
            tags = ", ".join(e.get("tags", []))
            lines.append(f"- **{e.get('name','')}** (`{e.get('type','')}`, GPU: `{e.get('gpu_tier','')}`)  \n"
                         f"  Path: `{e.get('path','')}`  \n"
                         f"  Features: {feats if feats else '—'}  \n"
                         f"  Tags: {tags if tags else '—'}\n")
    out_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=DEFAULT_ROOT, help="Repo root to scan")
    ap.add_argument("--out-json", default=r"docs\effects.manifest.json", help="Output JSON path (relative to root if not absolute)")
    ap.add_argument("--out-md", default=r"docs\effects.manifest.md", help="Output MD path (relative to root if not absolute)")
    ap.add_argument("--no-md", action="store_true", help="Do not emit markdown summary")
    ap.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES, help="Max bytes to read per HTML file")
    ap.add_argument("--ignore", nargs="*", default=sorted(DEFAULT_IGNORE_DIRS), help="Directory names to ignore")
    args = ap.parse_args()

    root = Path(args.root).expanduser()
    if not root.exists() or not root.is_dir():
        print(f"ERROR: root is not a directory: {root}", file=sys.stderr)
        return 1

    ignore_dirs = set(args.ignore)

    html_files = find_candidate_html_files(root, ignore_dirs=ignore_dirs)

    effects: list[dict] = []
    for p in html_files:
        rec = build_record(root, p, max_bytes=args.max_bytes)
        effects.append(asdict(rec))

    payload = {
        "schema_version": 1,
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "root": str(root),
        "ignore_dirs": sorted(ignore_dirs),
        "max_bytes_per_file": args.max_bytes,
        "effects": effects,
    }

    out_json = Path(args.out_json)
    if not out_json.is_absolute():
        out_json = root / out_json

    write_json(out_json, payload)

    if not args.no_md:
        out_md = Path(args.out_md)
        if not out_md.is_absolute():
            out_md = root / out_md
        write_md(out_md, payload)

    print(f"OK: wrote {len(effects)} effects to:")
    print(f" - {out_json}")
    if not args.no_md:
        print(f" - {out_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
