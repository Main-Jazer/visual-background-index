from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Issue:
  level: str  # "ERROR" | "WARN" | "INFO"
  file: Path
  message: str


def read_text(path: Path) -> str:
  return path.read_text(encoding="utf-8", errors="replace")


def load_json(path: Path) -> object:
  return json.loads(read_text(path))


def is_obj(v: object) -> bool:
  return isinstance(v, dict)


def is_arr(v: object) -> bool:
  return isinstance(v, list)


def schema_param_keys(schema: dict) -> set[str]:
  keys: set[str] = set()

  def add_bind(bind: object) -> None:
    if not isinstance(bind, str):
      return
    if bind.startswith("params."):
      rest = bind[len("params.") :]
      key = rest.split(".", 1)[0].split("[", 1)[0]
      if key:
        keys.add(key)

  for ctl in schema.get("controls", []) if is_arr(schema.get("controls")) else []:
    if is_obj(ctl):
      add_bind(ctl.get("bind"))
  for hk in schema.get("hotkeys", []) if is_arr(schema.get("hotkeys")) else []:
    if is_obj(hk):
      add_bind(hk.get("bind"))

  return keys


def schema_effect_roots(schema: dict) -> set[str]:
  roots: set[str] = set()

  def add_bind(bind: object) -> None:
    if not isinstance(bind, str):
      return
    if not bind.startswith("effect."):
      return
    rest = bind[len("effect.") :]
    root = rest.split(".", 1)[0].split("[", 1)[0]
    if root:
      roots.add(root)

  for ctl in schema.get("controls", []) if is_arr(schema.get("controls")) else []:
    if is_obj(ctl):
      add_bind(ctl.get("bind"))
  for hk in schema.get("hotkeys", []) if is_arr(schema.get("hotkeys")) else []:
    if is_obj(hk):
      add_bind(hk.get("bind"))

  return roots


def schema_action_names(schema: dict) -> set[str]:
  out: set[str] = set()
  for hk in schema.get("hotkeys", []) if is_arr(schema.get("hotkeys")) else []:
    if is_obj(hk) and isinstance(hk.get("action"), str):
      out.add(hk["action"])
  return out


def file_has_attach_ui(effect_html: str) -> bool:
  return "attachEffectUI(" in effect_html


def file_has_exposed_action(effect_html: str, name: str) -> bool:
  # Covers: expose('reset', ...) or window.JAZER_EXPOSE?.('reset', ...)
  return (f"expose('{name}'" in effect_html) or (f'expose("{name}"' in effect_html) or (f"JAZER_EXPOSE?.('{name}'" in effect_html) or (f'JAZER_EXPOSE?.("{name}"' in effect_html)


def file_reads_param(effect_html: str, key: str) -> bool:
  # Conservative: only treat as read if it comes from JAZER_UI.params or ui.params.
  patterns = [
    rf"(?:window\.)?JAZER_UI\s*\?\.\s*params\s*\?\.\s*{re.escape(key)}\b",
    rf"(?:window\.)?JAZER_UI\s*\.\s*params\s*\.\s*{re.escape(key)}\b",
    rf"\bui\s*\.\s*params\s*\.\s*{re.escape(key)}\b",
    rf"\bui\s*\?\.\s*params\s*\?\.\s*{re.escape(key)}\b",
    rf"\bui\s*\.\s*params\s*\?\.\s*{re.escape(key)}\b"
  ]
  return any(re.search(p, effect_html) for p in patterns)


def file_exposes_effect_root(effect_html: str, root: str) -> bool:
  patterns = [
    rf"expose\(\s*['\"]{re.escape(root)}['\"]\s*,",
    rf"(?:window\.)?JAZER_EXPOSE\?\.\(\s*['\"]{re.escape(root)}['\"]\s*,"
  ]
  return any(re.search(p, effect_html) for p in patterns)


def main() -> int:
  root = Path(__file__).resolve().parents[1]
  schema_dir = root / "effects" / "ui-schema"
  effects_dir = root / "effects"

  issues: list[Issue] = []

  if not schema_dir.exists():
    print(f"Missing schema dir: {schema_dir}")
    return 2

  schema_paths = sorted(schema_dir.glob("*.ui.json"))
  if not schema_paths:
    print(f"No schemas found in: {schema_dir}")
    return 2

  for schema_path in schema_paths:
    try:
      raw = load_json(schema_path)
    except Exception as e:
      issues.append(Issue("ERROR", schema_path, f"Invalid JSON: {e}"))
      continue

    if not is_obj(raw):
      issues.append(Issue("ERROR", schema_path, "Schema root must be an object"))
      continue

    schema = raw
    title = schema.get("title")
    if not isinstance(title, str) or not title.strip():
      issues.append(Issue("WARN", schema_path, "Missing/empty `title`"))

    defaults = schema.get("defaults")
    if defaults is not None and not is_obj(defaults):
      issues.append(Issue("ERROR", schema_path, "`defaults` must be an object when present"))
      defaults = {}
    if defaults is None:
      defaults = {}

    params = schema_param_keys(schema)
    for key in sorted(params):
      if key not in defaults:
        issues.append(Issue("WARN", schema_path, f"Missing default for `params.{key}` (referenced by bind)"))

    if is_arr(schema.get("hotkeys")) and schema.get("hud") is None:
      issues.append(Issue("INFO", schema_path, "No `hud` block (HUD still auto-creates; add hud.toggleKey/visible to customize)"))

    effect_html_path = effects_dir / f"{schema_path.stem.replace('.ui', '')}.html"
    if not effect_html_path.exists():
      # Some effects might not have an HTML partner (or name mismatch)
      issues.append(Issue("WARN", schema_path, f"Missing effect HTML: {effect_html_path.name}"))
      continue

    effect_html = read_text(effect_html_path)
    wired = file_has_attach_ui(effect_html)
    if not wired:
      issues.append(Issue("WARN", schema_path, f"Effect not wired for schemas (missing `attachEffectUI`): {effect_html_path.name}"))

    if wired:
      for key in sorted(params):
        if not file_reads_param(effect_html, key):
          issues.append(Issue("WARN", schema_path, f"Dead control: `params.{key}` never read in {effect_html_path.name}"))

      for root_name in sorted(schema_effect_roots(schema)):
        if not file_exposes_effect_root(effect_html, root_name):
          issues.append(Issue("WARN", schema_path, f"Missing expose: `effect.{root_name}.*` referenced but `{root_name}` not exposed in {effect_html_path.name}"))

    for action in sorted(schema_action_names(schema)):
      if action in {"reset", "resetParams"}:
        # Provided by `attachEffectUI` even if the effect doesn't expose it explicitly.
        continue
      if not file_has_exposed_action(effect_html, action):
        issues.append(Issue("WARN", schema_path, f"Hotkey action `{action}` not found via expose/JAZER_EXPOSE in {effect_html_path.name}"))

  by_level = {"ERROR": 0, "WARN": 0, "INFO": 0}
  for i in issues:
    by_level[i.level] = by_level.get(i.level, 0) + 1
    print(f"[{i.level}] {i.file.relative_to(root)}: {i.message}")

  print(f"\nTotals: ERROR={by_level['ERROR']} WARN={by_level['WARN']} INFO={by_level['INFO']}")
  return 1 if by_level["ERROR"] else 0


if __name__ == "__main__":
  raise SystemExit(main())
