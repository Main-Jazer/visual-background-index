#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from datetime import datetime

HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>JaZeR Visual Background Index</title>
  <meta name="color-scheme" content="dark light" />
  <style>
    :root {{
      --bg: #05030a;
      --panel: rgba(15, 10, 30, 0.72);
      --border: rgba(120, 140, 220, 0.22);
      --text: rgba(225, 235, 255, 0.92);
      --muted: rgba(180, 190, 220, 0.75);
      --chip: rgba(80, 110, 255, 0.16);
      --chip2: rgba(120, 200, 180, 0.16);
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
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      overflow: hidden;
    }}
    .app {{
      display: grid;
      grid-template-columns: 420px 1fr;
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
      font-size: 14px;
      letter-spacing: 0.08em;
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
    .row {{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
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
    select {{
      padding: 10px 10px;
      border-radius: 10px;
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(0,0,0,0.25);
      color: var(--text);
      outline: none;
      max-width: 190px;
    }}
    .chips {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .chip {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(140,160,240,0.22);
      background: rgba(80,110,255,0.12);
      color: rgba(210,225,255,0.9);
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      transition: transform .08s ease, background .15s ease;
    }}
    .chip:hover {{ transform: translateY(-1px); }}
    .chip[data-on="1"] {{
      background: rgba(120, 200, 180, 0.16);
      border-color: rgba(120, 200, 180, 0.30);
      color: rgba(220, 255, 245, 0.92);
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
        <div class="title">JaZeR Visual Background Index</div>
        <div class="sub">
          Search + launch effects. Generated from manifest.<br/>
          Tip: Run via a local server for best results.
        </div>
      </header>

      <div class="controls">
        <input id="q" type="search" placeholder="Search effects by name / filename..." autocomplete="off" />
        <div class="row">
          <select id="group">
            <option value="all">Group: All</option>
            <option value="folder">Group: Folder</option>
            <option value="type">Group: Type (three/canvas)</option>
          </select>
          <select id="sort">
            <option value="name">Sort: Name</option>
            <option value="path">Sort: Path</option>
          </select>
        </div>
        <div class="chips">
          <div class="chip" id="chip-three" data-on="1">Three.js</div>
          <div class="chip" id="chip-canvas" data-on="1">Canvas</div>
          <div class="chip" id="chip-favs" data-on="0">Favorites</div>
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
          <button id="btn-fav">★ Favorite</button>
          <button id="btn-open" class="primary">Open in New Tab</button>
          <button id="btn-reload">Reload</button>
        </div>
      </div>
      <iframe id="frame" title="Effect preview"></iframe>
    </section>
  </div>

  <script>
    // Embedded manifest (no fetch required)
    const MANIFEST = {manifest_json};

    const LS_KEY = "jazer:indexapp:v1";
    const state = (() => {{
      try {{
        const s = JSON.parse(localStorage.getItem(LS_KEY) || "{{}}");
        return {{
          q: s.q || "",
          group: s.group || "all",
          sort: s.sort || "name",
          showThree: s.showThree ?? true,
          showCanvas: s.showCanvas ?? true,
          favOnly: s.favOnly ?? false,
          favs: new Set(s.favs || []),
          active: s.active || null,
        }};
      }} catch {{
        return {{
          q: "", group: "all", sort: "name",
          showThree: true, showCanvas: true, favOnly: false,
          favs: new Set(), active: null
        }};
      }}
    }})();

    const el = (id) => document.getElementById(id);
    const $q = el("q");
    const $group = el("group");
    const $sort = el("sort");
    const $list = el("list");
    const $count = el("count");
    const $frame = el("frame");
    const $activeName = el("activeName");
    const $activePath = el("activePath");

    const chipThree = el("chip-three");
    const chipCanvas = el("chip-canvas");
    const chipFavs = el("chip-favs");

    function persist() {{
      const out = {{
        q: state.q,
        group: state.group,
        sort: state.sort,
        showThree: state.showThree,
        showCanvas: state.showCanvas,
        favOnly: state.favOnly,
        favs: Array.from(state.favs),
        active: state.active
      }};
      localStorage.setItem(LS_KEY, JSON.stringify(out));
    }}

    function classify(item) {{
      const p = (item.path || item.file || "").toLowerCase();
      if (p.includes("/effects/")) {{
        if (p.includes("/effects/canvas/")) return "canvas";
        if (p.includes("/effects/three/")) return "three";
      }}
      if (p.includes("/canvas/")) return "canvas";
      return "three"; // default
    }}

    function groupKey(item) {{
      if (state.group === "folder") {{
        // top folder under root like "effects" or "lib"
        const p = (item.path || item.file || "");
        const parts = p.split("/").filter(Boolean);
        return parts[0] || "root";
      }}
      if (state.group === "type") return classify(item);
      return "all";
    }}

    function normalize(s) {{
      return (s || "").toLowerCase();
    }}

    function filtered() {{
      const q = normalize(state.q);
      return MANIFEST
        .map(x => ({{ ...x, _type: classify(x) }}))
        .filter(x => {{
          if (!state.showThree && x._type === "three") return false;
          if (!state.showCanvas && x._type === "canvas") return false;
          if (state.favOnly && !state.favs.has(x.path || x.file)) return false;
          if (!q) return true;
          const hay = normalize((x.name || "") + " " + (x.path || x.file || ""));
          return hay.includes(q);
        }})
        .sort((a,b) => {{
          const ka = state.sort === "path" ? (a.path||a.file||"") : (a.name||"");
          const kb = state.sort === "path" ? (b.path||b.file||"") : (b.name||"");
          return ka.localeCompare(kb);
        }});
    }}

    function render() {{
      const items = filtered();
      $count.textContent = `${{items.length}} effects`;

      // grouping
      const groups = new Map();
      for (const it of items) {{
        const key = groupKey(it);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(it);
      }}

      const keys = Array.from(groups.keys());
      $list.innerHTML = "";

      for (const g of keys) {{
        if (state.group !== "all") {{
          const h = document.createElement("div");
          h.style.padding = "10px 14px";
          h.style.fontSize = "11px";
          h.style.color = "rgba(210,225,255,0.75)";
          h.style.letterSpacing = "0.08em";
          h.style.textTransform = "uppercase";
          h.textContent = g;
          $list.appendChild(h);
        }}

        for (const it of groups.get(g)) {{
          const row = document.createElement("div");
          row.className = "item";
          const key = it.path || it.file;
          const isFav = state.favs.has(key);
          const badge = it._type === "canvas" ? "Canvas" : "Three.js";

          row.innerHTML = `
            <div>
              <div class="name">${{escapeHtml(it.name || key)}}</div>
              <div class="meta">${{escapeHtml(key)}}</div>
            </div>
            <div class="badge">${{badge}}${{isFav ? " • ★" : ""}}</div>
          `;

          row.addEventListener("click", () => selectEffect(it));
          $list.appendChild(row);
        }}
      }}
    }}

    function escapeHtml(s) {{
      return String(s).replace(/[&<>"]/g, (c) => ({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}}[c]));
    }}

    function effectUrl(it) {{
      // If your manifest stores relative paths like "effects/jazer-foo.html", this works.
      // If you store absolute paths, normalize before embedding.
      return it.path || it.file;
    }}

    function selectEffect(it) {{
      const url = effectUrl(it);
      state.active = url;
      persist();

      $activeName.textContent = it.name || url;
      $activePath.textContent = url;
      $frame.src = url;
      syncFavButton();
    }}

    function syncChips() {{
      chipThree.dataset.on = state.showThree ? "1" : "0";
      chipCanvas.dataset.on = state.showCanvas ? "1" : "0";
      chipFavs.dataset.on = state.favOnly ? "1" : "0";
    }}

    function syncFavButton() {{
      const btn = el("btn-fav");
      if (!state.active) {{
        btn.textContent = "★ Favorite";
        return;
      }}
      const on = state.favs.has(state.active);
      btn.textContent = on ? "★ Favorited" : "★ Favorite";
    }}

    function randomPick() {{
      const items = filtered();
      if (!items.length) return;
      const it = items[Math.floor(Math.random() * items.length)];
      selectEffect(it);
    }}

    // Wire controls
    $q.value = state.q;
    $group.value = state.group;
    $sort.value = state.sort;
    syncChips();
    syncFavButton();

    $q.addEventListener("input", () => {{
      state.q = $q.value;
      persist();
      render();
    }});
    $group.addEventListener("change", () => {{
      state.group = $group.value;
      persist();
      render();
    }});
    $sort.addEventListener("change", () => {{
      state.sort = $sort.value;
      persist();
      render();
    }});

    chipThree.addEventListener("click", () => {{
      state.showThree = !state.showThree;
      persist(); syncChips(); render();
    }});
    chipCanvas.addEventListener("click", () => {{
      state.showCanvas = !state.showCanvas;
      persist(); syncChips(); render();
    }});
    chipFavs.addEventListener("click", () => {{
      state.favOnly = !state.favOnly;
      persist(); syncChips(); render();
    }});

    el("btn-random").addEventListener("click", randomPick);
    el("btn-reload").addEventListener("click", () => {{
      if ($frame.src) $frame.src = $frame.src;
    }});
    el("btn-open").addEventListener("click", () => {{
      if (state.active) window.open(state.active, "_blank");
    }});
    el("btn-fav").addEventListener("click", () => {{
      if (!state.active) return;
      if (state.favs.has(state.active)) state.favs.delete(state.active);
      else state.favs.add(state.active);
      persist();
      syncFavButton();
      render();
    }});

    // First render + restore active
    render();
    if (state.active) {{
      const found = MANIFEST.find(x => (x.path||x.file) === state.active);
      if (found) selectEffect(found);
    }}
  </script>
</body>
</html>
"""

def main() -> int:
    ap = argparse.ArgumentParser(description="Build JaZeR index app HTML from manifest JSON.")
    ap.add_argument("--root", default=".", help="Repo root (where effects/ lives).")
    ap.add_argument("--manifest", default="effects.manifest.json", help="Manifest JSON file path (relative to root).")
    ap.add_argument("--out", default="docs/index.html", help="Output HTML path (relative to root).")
    ap.add_argument("--url-prefix", default="", help="String to prepend to effect paths (e.g. '../').")
    args = ap.parse_args()

    root = Path(args.root).expanduser().resolve()
    manifest_path = (root / args.manifest).resolve()
    out_path = (root / args.out).resolve()

    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    data = json.loads(manifest_path.read_text(encoding="utf-8"))

    # Handle both new-style (dict with "effects" key) and old-style (list) manifests
    items = []
    if isinstance(data, dict):
        items = data.get("effects", [])
    elif isinstance(data, list):
        items = data
    else:
        print(f"Warning: Manifest format unknown ({type(data)}), expected dict or list.")

    # Expected manifest item shape:
    # { "name": "...", "path": "effects/...", ... }
    # Normalize minimal fields
    
    # Use explicit prefix
    rel_to_root = args.url_prefix

    normalized = []
    for it in items:
        p = it.get("path") or it.get("file") or it.get("href")
        if not p:
            continue
        name = it.get("name") or Path(p).stem
        # ensure web-ish slashes and prepend relative prefix
        p = str(p).replace("\\", "/")
        full_path = f"{rel_to_root}{p}"
        normalized.append({"name": name, "path": full_path})

    out_path.parent.mkdir(parents=True, exist_ok=True)

    html = HTML_TEMPLATE.format(
        build_stamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        manifest_json=json.dumps(normalized, ensure_ascii=False)
    )
    out_path.write_text(html, encoding="utf-8")
    print(f"Wrote: {out_path}")
    print("Tip: run a local server at repo root, e.g.:")
    print("  python -m http.server 8000")
    print("Then open:")
    print("  http://localhost:8000/docs/index.html")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
