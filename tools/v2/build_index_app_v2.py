#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from datetime import datetime

HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>JaZeR Visual Background Index (v2)</title>
  <meta name="color-scheme" content="dark light" />
  <style>
    :root {{
      --bg: #05030a;
      --panel: rgba(15, 10, 30, 0.72);
      --border: rgba(120, 140, 220, 0.22);
      --text: rgba(225, 235, 255, 0.92);
      --muted: rgba(180, 190, 220, 0.75);
      --gold: rgba(255, 200, 80, 0.85);
    }}
    * {{ box-sizing: border-box; }}
    html, body {{ height: 100%; }}
    body {{
      margin: 0;
      background: radial-gradient(1200px 700px at 50% -10%, rgba(120,80,255,0.18), transparent 60%),
                  radial-gradient(900px 500px at 10% 20%, rgba(0,200,255,0.10), transparent 55%),
                  var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      overflow: hidden;
    }}
    .app {{
      display: grid;
      grid-template-columns: 440px 1fr;
      height: 100%;
      gap: 14px;
      padding: 14px;
    }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      backdrop-filter: blur(10px);
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      min-height: 0;
    }}
    .left {{
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      min-height: 0;
    }}
    header {{
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--border);
    }}
    header .title {{
      font-size: 13px;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: rgba(210,220,255,0.92);
    }}
    header .sub {{
      margin-top: 6px;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }}
    .controls {{
      padding: 12px 14px;
      display: grid;
      gap: 10px;
      border-bottom: 1px solid var(--border);
    }}
    input[type="search"] {{
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(0,0,0,0.25);
      color: var(--text);
      outline: none;
    }}
    .row {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }}
    select {{
      padding: 10px 10px;
      border-radius: 10px;
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(0,0,0,0.25);
      color: var(--text);
      outline: none;
      width: 100%;
    }}
    .list {{
      min-height: 0;
      overflow: auto;
    }}
    .item {{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(140,160,240,0.14);
      cursor: pointer;
    }}
    .item:hover {{ background: rgba(255,255,255,0.03); }}
    .item .name {{ font-size: 13px; }}
    .item .meta {{ font-size: 11px; color: var(--muted); margin-top: 4px; }}
    .item .badge {{
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(0,0,0,0.18);
      color: rgba(210,225,255,0.82);
      align-self: start;
      white-space: nowrap;
    }}
    .footer {{
      padding: 10px 14px;
      font-size: 11px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }}
    .right {{
      display: grid;
      grid-template-rows: auto 1fr;
      min-height: 0;
    }}
    .topbar {{
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .topbar .now {{
      font-size: 12px;
      color: var(--muted);
    }}
    .actions {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }}
    button {{
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(0,0,0,0.22);
      color: rgba(220,235,255,0.92);
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
    }}
    button:hover {{ background: rgba(255,255,255,0.05); }}
    button.primary {{
      border-color: rgba(255,200,80,0.28);
      background: rgba(255,200,80,0.12);
      color: rgba(255,235,200,0.92);
    }}
    iframe {{
      width: 100%;
      height: 100%;
      border: 0;
      background: #000;
    }}
    @media (max-width: 980px) {{
      body {{ overflow: auto; }}
      .app {{ grid-template-columns: 1fr; height: auto; }}
      .right {{ height: 70vh; }}
    }}
  </style>
</head>
<body>
  <div class="app">
    <section class="card left">
      <header>
        <div class="title">JaZeR Visual Background Index (v2)</div>
        <div class="sub">
          Non-destructive build: docs/v2/* only.<br/>
          Serve via localhost for best results.
        </div>
      </header>

      <div class="controls">
        <input id="q" type="search" placeholder="Search effects..." autocomplete="off" />
        <div class="row">
          <select id="type">
            <option value="all">Type: All</option>
            <option value="three">Type: Three.js</option>
            <option value="canvas">Type: Canvas</option>
          </select>
          <select id="sort">
            <option value="name">Sort: Name</option>
            <option value="path">Sort: Path</option>
          </select>
        </div>
      </div>

      <div class="list" id="list"></div>

      <div class="footer">
        <div><span id="count"></span></div>
        <div>Build: {build_stamp}</div>
      </div>
    </section>

    <section class="card right">
      <div class="topbar">
        <div>
          <div style="font-size:13px" id="activeName">Select an effect</div>
          <div class="now" id="activePath">—</div>
        </div>
        <div class="actions">
          <button id="btn-random">Random</button>
          <button id="btn-open" class="primary">Open</button>
          <button id="btn-reload">Reload</button>
        </div>
      </div>
      <iframe id="frame" title="Effect preview"></iframe>
    </section>
  </div>

  <script>
    const MANIFEST = {manifest_json};

    const el = (id) => document.getElementById(id);
    const $q = el("q");
    const $type = el("type");
    const $sort = el("sort");
    const $list = el("list");
    const $count = el("count");
    const $frame = el("frame");
    const $activeName = el("activeName");
    const $activePath = el("activePath");

    function classify(item) {{
      const p = (item.path || "").toLowerCase();
      if (p.includes("/canvas/")) return "canvas";
      return "three";
    }}

    function normalize(s) {{ return (s || "").toLowerCase(); }}

    function filtered() {{
      const q = normalize($q.value);
      const t = $type.value;

      return MANIFEST
        .map(x => ({{...x, _type: classify(x)}}))
        .filter(x => {{
          if (t !== "all" && x._type !== t) return false;
          if (!q) return true;
          const hay = normalize((x.name||"") + " " + (x.path||""));
          return hay.includes(q);
        }})
        .sort((a,b) => {{
          const ka = $sort.value === "path" ? (a.path||"") : (a.name||"");
          const kb = $sort.value === "path" ? (b.path||"") : (b.name||"");
          return ka.localeCompare(kb);
        }});
    }}

    function render() {{
      const items = filtered();
      $count.textContent = `${{items.length}} effects`;
      $list.innerHTML = "";

      for (const it of items) {{
        const row = document.createElement("div");
        row.className = "item";
        row.innerHTML = `
          <div>
            <div class="name">${{escapeHtml(it.name || it.path)}}</div>
            <div class="meta">${{escapeHtml(it.path)}}</div>
          </div>
          <div class="badge">${{it._type === "canvas" ? "Canvas" : "Three.js"}}</div>
        `;
        row.addEventListener("click", () => select(it));
        $list.appendChild(row);
      }}
    }}

    function escapeHtml(s) {{
      return String(s).replace(/[&<>"]/g, (c) => ({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}}[c]));
    }}

    let active = null;

    function select(it) {{
      active = it;
      $activeName.textContent = it.name || it.path;
      $activePath.textContent = it.path;
      $frame.src = it.path;
    }}

    el("btn-random").addEventListener("click", () => {{
      const items = filtered();
      if (!items.length) return;
      select(items[Math.floor(Math.random() * items.length)]);
    }});

    el("btn-reload").addEventListener("click", () => {{
      if ($frame.src) $frame.src = $frame.src;
    }});

    el("btn-open").addEventListener("click", () => {{
      if (active?.path) window.open(active.path, "_blank");
    }});

    $q.addEventListener("input", render);
    $type.addEventListener("change", render);
    $sort.addEventListener("change", render);

    render();
  </script>
</body>
</html>
"""

def main() -> int:
    ap = argparse.ArgumentParser(description="Build JaZeR Index App v2 (writes docs/v2, does not overwrite existing files).")
    ap.add_argument("--root", required=True, help="Repo root (where effects/ lives).")
    ap.add_argument("--effects-dir", default="effects", help="Effects directory relative to root.")
    ap.add_argument("--manifest-out", default="docs/v2/effects.manifest.v2.json", help="Manifest output path relative to root.")
    ap.add_argument("--index-out", default="docs/v2/index.html", help="Index HTML output path relative to root.")
    args = ap.parse_args()

    root = Path(args.root).expanduser()
    effects_dir = (root / args.effects_dir).resolve()
    manifest_out = (root / args.manifest_out).resolve()
    index_out = (root / args.index_out).resolve()

    if not effects_dir.exists():
        raise SystemExit(f"Effects dir not found: {effects_dir}")

    # Scan for HTML effects only (tweak if you also index non-HTML later)
    items = []
    for p in sorted(effects_dir.rglob("*.html")):
        rel = p.relative_to(root).as_posix()
        items.append({
            "name": p.stem.replace("_", " ").replace("-", " "),
            "path": rel
        })

    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    index_out.parent.mkdir(parents=True, exist_ok=True)

    manifest_out.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")

    html = HTML_TEMPLATE.format(
        build_stamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        manifest_json=json.dumps(items, ensure_ascii=False)
    )
    index_out.write_text(html, encoding="utf-8")

    print(f"Wrote manifest: {manifest_out}")
    print(f"Wrote index:    {index_out}")
    print("Next:")
    print("  python -m http.server 8000")
    print("  http://localhost:8000/docs/v2/index.html")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
