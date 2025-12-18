from __future__ import annotations

import argparse
import re
from pathlib import Path


RE_TIME_ADD = re.compile(r"(\btime\s*\+=\s*)(1\s*/\s*60|0\.016)(\s*;)")
RE_DT_DECL = re.compile(r"^(\s*)const\s+dt\s*=\s*1\s*/\s*60(\s*;.*)?$")


def parse_args() -> argparse.Namespace:
  p = argparse.ArgumentParser(description="Patch effects to respect window.JAZER_UI.params.timeScale")
  p.add_argument("--dry-run", action="store_true", help="Print changes without writing")
  p.add_argument("--only", action="append", default=[], help="Only target effect stems; can repeat")
  return p.parse_args()


def normalize_only(values: list[str]) -> set[str]:
  out: set[str] = set()
  for v in values:
    v = v.strip()
    if not v:
      continue
    if v.lower().endswith(".html"):
      v = v[:-5]
    out.add(v)
  return out


def patch_text(text: str) -> tuple[str, int]:
  if "params?.timeScale" in text or "params.timeScale" in text:
    return text, 0

  changed = 0
  lines = text.splitlines()
  out: list[str] = []

  for line in lines:
    m_dt = RE_DT_DECL.match(line)
    if m_dt:
      indent = m_dt.group(1)
      suffix = m_dt.group(2) or ";"
      out.append(f"{indent}const timeScale = window.JAZER_UI?.params?.timeScale ?? 1;")
      out.append(f"{indent}const dt = (1 / 60) * timeScale{suffix}")
      changed += 1
      continue

    m_time = RE_TIME_ADD.search(line)
    if m_time:
      prefix, expr, suffix = m_time.groups()
      repl = f"{prefix}({expr}) * (window.JAZER_UI?.params?.timeScale ?? 1){suffix}"
      out.append(RE_TIME_ADD.sub(repl, line, count=1))
      changed += 1
      continue

    out.append(line)

  return "\n".join(out), changed


def main() -> int:
  args = parse_args()
  only = normalize_only(args.only)

  root = Path(__file__).resolve().parents[1]
  effects_dir = root / "effects"
  paths = sorted(p for p in effects_dir.glob("*.html") if p.name.lower() != "gallery.html")
  if only:
    paths = [p for p in paths if p.stem in only]

  touched = 0
  total_edits = 0

  for path in paths:
    raw = path.read_bytes()
    nl = "\r\n" if b"\r\n" in raw else "\n"
    text = raw.decode("utf-8", errors="replace")
    updated, edits = patch_text(text)
    if edits <= 0:
      continue

    touched += 1
    total_edits += edits
    if args.dry_run:
      print(f"[DRY] {path.name}: {edits} edit(s)")
      continue

    out = nl.join(updated.split("\n"))
    if raw.endswith(b"\r\n"):
      out += "\r\n"
    elif raw.endswith(b"\n"):
      out += "\n"
    path.write_text(out, encoding="utf-8", newline="")

  print(f"Updated {touched} file(s) ({total_edits} edit(s) total).")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

