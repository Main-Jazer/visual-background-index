from __future__ import annotations

import argparse
from pathlib import Path


UI_IMPORT = "import { attachEffectUI } from '../lib/engine/jazer-effect-ui-schema.js';"
MARKER = "// --- JaZeR UI schema (injected) ---"


def detect_newline(raw: bytes) -> str:
  return "\r\n" if b"\r\n" in raw else "\n"


def inject_into_html(text: str) -> str | None:
  if "attachEffectUI(" in text or MARKER in text:
    return None

  lines = text.splitlines()
  script_idx = next((i for i, l in enumerate(lines) if "<script" in l and 'type="module"' in l), None)
  if script_idx is None:
    return None

  i = script_idx + 1
  while i < len(lines) and lines[i].strip() == "":
    i += 1

  indent = ""
  if i < len(lines):
    indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]

  j = i
  while j < len(lines) and lines[j].lstrip().startswith("import "):
    j += 1

  if UI_IMPORT not in text:
    lines.insert(j, indent + UI_IMPORT)
    j += 1

  if j < len(lines) and lines[j].strip() != "":
    lines.insert(j, "")
    j += 1

  init = [
    MARKER,
    "const __jazerEffectFile = location.pathname.split('/').pop() || '';",
    "const __jazerEffectName = __jazerEffectFile.replace(/\\.html$/i, '');",
    "const { ui, expose, ready } = attachEffectUI({",
    "  title: document.title,",
    "  schemaUrl: new URL(`./ui-schema/${__jazerEffectName}.ui.json`, import.meta.url)",
    "});",
    "window.JAZER_UI = ui;",
    "window.JAZER_EXPOSE = expose;",
    "window.JAZER_UI_READY = ready;",
    "// ------------------------------------",
    ""
  ]

  for k, ln in enumerate(init):
    lines.insert(j + k, indent + ln if ln else ln)

  return "\n".join(lines)


def ensure_schema(effect_html: Path, schema_dir: Path) -> None:
  name = effect_html.stem
  schema_path = schema_dir / f"{name}.ui.json"
  if schema_path.exists():
    return

  # Read file to detect features
  try:
    content = effect_html.read_text(encoding="utf-8", errors="replace")
  except Exception:
    content = ""

  has_mouse = "mouse" in content and ("from '../lib/engine/jazer-background-engine.js'" in content or "uMouse" in content)

  # Build controls and defaults
  defaults = []
  controls = []
  hotkeys = [
    { "key": "H", "label": "Toggle Help" },
    { "key": "R", "label": "Reset", "action": "reset" }
  ]

  # Default: Time Scale
  defaults.append('"timeScale": 1')
  controls.append('{ "type": "slider", "label": "Time Scale", "bind": "params.timeScale", "min": 0, "max": 3, "step": 0.01 }')
  hotkeys.append('{ "keys": ["1", "2"], "label": "Time", "bind": "params.timeScale", "step": 0.1, "min": 0.1, "max": 3, "format": "fixed1" }')

  # Conditional: Mouse
  if has_mouse:
    defaults.append('"mouseEnabled": true')
    controls.append('{ "type": "checkbox", "label": "Mouse Enabled", "bind": "params.mouseEnabled" }')
    hotkeys.append('{ "key": "M", "label": "Mouse", "bind": "params.mouseEnabled", "type": "toggle", "format": "onoff" }')

  # Construct JSON
  defaults_str = ",\n    ".join(defaults)
  controls_str = ",\n    ".join(controls)
  hotkeys_str = ",\n    ".join(hotkeys)

  schema = f"""{{
  "version": 1,
  "title": "{name.replace('jazer-', '').replace('-', ' ').title()}",
  "defaults": {{
    {defaults_str}
  }},
  "hotkeys": [
    {hotkeys_str}
  ],
  "controls": [
    {controls_str}
  ]
}}
"""
  schema_path.write_text(schema, encoding="utf-8", newline="\n")


def parse_args() -> argparse.Namespace:
  p = argparse.ArgumentParser(description="Inject JaZeR schema-driven UI into effects/*.html")
  p.add_argument("--dry-run", action="store_true", help="Print actions without writing files")
  p.add_argument("--only", action="append", default=[], help="Only target this effect (stem or filename); can repeat")
  p.add_argument("--no-schema", action="store_true", help="Do not create missing schema files")
  p.add_argument("--no-inject", action="store_true", help="Do not inject JS loader into HTML files")
  return p.parse_args()


def normalize_only(names: list[str]) -> set[str]:
  out: set[str] = set()
  for n in names:
    n = n.strip()
    if not n:
      continue
    if n.lower().endswith(".html"):
      n = n[:-5]
    out.add(n)
  return out


def main() -> int:
  args = parse_args()
  root = Path(__file__).resolve().parents[1]
  effects_dir = root / "effects"
  schema_dir = effects_dir / "ui-schema"
  only = normalize_only(args.only)

  if not args.no_schema and not args.dry_run:
    schema_dir.mkdir(parents=True, exist_ok=True)

  targets = sorted(p for p in effects_dir.glob("*.html") if p.name.lower() != "gallery.html")
  if only:
    targets = [p for p in targets if p.stem in only]

  changed = 0
  skipped = 0

  for path in targets:
    if not args.no_schema:
      if args.dry_run:
        schema_path = schema_dir / f"{path.stem}.ui.json"
        if not schema_path.exists():
          print(f"[DRY] create schema: {schema_path}")
      else:
        ensure_schema(path, schema_dir)

    if args.no_inject:
      continue

    raw = path.read_bytes()
    nl = detect_newline(raw)
    text = raw.decode("utf-8", errors="replace")

    updated = inject_into_html(text)
    if updated is None:
      skipped += 1
      continue

    if args.dry_run:
      print(f"[DRY] inject: {path}")
      changed += 1
    else:
      out = nl.join(updated.split("\n"))
      if raw.endswith(b"\r\n"):
        out = out + "\r\n"
      elif raw.endswith(b"\n"):
        out = out + "\n"

      path.write_text(out, encoding="utf-8", newline="")
      changed += 1

  if args.dry_run:
    print(f"Dry-run: would inject into {changed} file(s); would skip {skipped}.")
  else:
    print(f"Injected schema UI into {changed} file(s); skipped {skipped}.")
    print(f"Schema folder: {schema_dir}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
