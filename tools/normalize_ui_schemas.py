from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
  p = argparse.ArgumentParser(description="Normalize effects/ui-schema/*.ui.json files")
  p.add_argument("--dry-run", action="store_true", help="Report changes without writing")
  p.add_argument("--only", action="append", default=[], help="Only target effect stems; can repeat")
  return p.parse_args()


def normalize_only(values: list[str]) -> set[str]:
  out: set[str] = set()
  for v in values:
    v = v.strip()
    if not v:
      continue
    if v.lower().endswith(".ui.json"):
      v = v[: -len(".ui.json")]
    if v.lower().endswith(".json"):
      v = v[: -len(".json")]
    out.add(v)
  return out


def is_obj(v: Any) -> bool:
  return isinstance(v, dict)


def is_arr(v: Any) -> bool:
  return isinstance(v, list)


def extract_params(schema: dict) -> set[str]:
  keys: set[str] = set()
  def add(bind: Any) -> None:
    if not isinstance(bind, str):
      return
    if not bind.startswith("params."):
      return
    rest = bind[len("params.") :]
    key = rest.split(".", 1)[0].split("[", 1)[0]
    if key:
      keys.add(key)
  for ctl in schema.get("controls", []) if is_arr(schema.get("controls")) else []:
    if is_obj(ctl):
      add(ctl.get("bind"))
  for hk in schema.get("hotkeys", []) if is_arr(schema.get("hotkeys")) else []:
    if is_obj(hk):
      add(hk.get("bind"))
  return keys


def default_for_control(control: dict) -> Any:
  t = control.get("type")
  if t in {"checkbox"}:
    return False
  if t in {"slider"}:
    if isinstance(control.get("min"), (int, float)) and isinstance(control.get("max"), (int, float)):
      mn = float(control["min"])
      mx = float(control["max"])
      return mn if mn <= 0 <= mx else (mn + mx) / 2
    return 0
  if t in {"select"} and is_arr(control.get("options")) and control["options"]:
    opt0 = control["options"][0]
    if isinstance(opt0, (str, int, float)):
      return opt0
    if is_obj(opt0) and "value" in opt0:
      return opt0["value"]
  if t in {"color"}:
    return "#ffffff"
  return 0


def normalize_schema(schema: dict) -> dict:
  title = schema.get("title") if isinstance(schema.get("title"), str) else ""
  version = schema.get("version")
  if not isinstance(version, int):
    version = 1

  defaults = schema.get("defaults") if is_obj(schema.get("defaults")) else {}

  # Ensure defaults for every params.* binding we see.
  params = extract_params(schema)
  if params:
    controls = schema.get("controls", []) if is_arr(schema.get("controls")) else []
    by_key: dict[str, dict] = {}
    for ctl in controls:
      if not is_obj(ctl):
        continue
      bind = ctl.get("bind")
      if isinstance(bind, str) and bind.startswith("params."):
        key = bind[len("params.") :].split(".", 1)[0].split("[", 1)[0]
        by_key.setdefault(key, ctl)

    for key in sorted(params):
      if key in defaults:
        continue
      ctl = by_key.get(key)
      defaults[key] = default_for_control(ctl) if ctl else 0

  # Prefer having a HUD block (Flower-of-life style) if hotkeys exist.
  hud = schema.get("hud") if is_obj(schema.get("hud")) else None
  hotkeys = schema.get("hotkeys") if is_arr(schema.get("hotkeys")) else None
  if hotkeys is not None and hud is None:
    hud = {"title": f"{title} - Controls" if title else "Controls", "toggleKey": "h", "visible": False}

  # Build output with stable key order.
  out: dict[str, Any] = {"version": version}
  if title:
    out["title"] = title
  if defaults:
    out["defaults"] = defaults
  if hud is not None:
    out["hud"] = hud
  if hotkeys is not None:
    out["hotkeys"] = hotkeys
  if "hint" in schema:
    out["hint"] = schema["hint"]
  if "controls" in schema:
    out["controls"] = schema["controls"]
  return out


def main() -> int:
  args = parse_args()
  only = normalize_only(args.only)

  root = Path(__file__).resolve().parents[1]
  schema_dir = root / "effects" / "ui-schema"
  paths = sorted(schema_dir.glob("*.ui.json"))
  if only:
    paths = [p for p in paths if p.stem.replace(".ui", "") in only]

  changed = 0
  for path in paths:
    raw = path.read_text(encoding="utf-8", errors="replace")
    try:
      schema = json.loads(raw)
    except Exception:
      continue
    if not is_obj(schema):
      continue

    normalized = normalize_schema(schema)
    out_text = json.dumps(normalized, indent=2, ensure_ascii=False) + "\n"
    if out_text == raw.replace("\r\n", "\n"):
      continue

    changed += 1
    if args.dry_run:
      print(f"[DRY] normalize: {path.relative_to(root)}")
    else:
      path.write_text(out_text, encoding="utf-8", newline="\n")

  if args.dry_run:
    print(f"Dry-run: would update {changed} schema file(s).")
  else:
    print(f"Updated {changed} schema file(s).")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

