import json
from pathlib import Path

def generate_schema(effect_path):
    name = effect_path.stem
    try:
        content = effect_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        content = ""

    has_mouse = "mouse" in content and ("from '../lib/engine/jazer-background-engine.js'" in content or "uMouse" in content)

    schema = {
        "version": 1,
        "title": name.replace('jazer-', '').replace('-', ' ').title(),
        "defaults": {
            "timeScale": 1
        },
        "hotkeys": [
            { "key": "H", "label": "Toggle Help" },
            { "key": "R", "label": "Reset", "action": "reset" },
            { "keys": ["1", "2"], "label": "Time", "bind": "params.timeScale", "step": 0.1, "min": 0.1, "max": 3, "format": "fixed1" }
        ],
        "controls": [
            { "type": "slider", "label": "Time Scale", "bind": "params.timeScale", "min": 0, "max": 3, "step": 0.01 }
        ]
    }

    if has_mouse:
        schema["defaults"]["mouseEnabled"] = True
        schema["controls"].append({ "type": "checkbox", "label": "Mouse Enabled", "bind": "params.mouseEnabled" })
        schema["hotkeys"].append({ "key": "M", "label": "Mouse", "bind": "params.mouseEnabled", "type": "toggle", "format": "onoff" })

    return schema

def main():
    root = Path(__file__).resolve().parents[1]
    effects_dir = root / "effects"
    schema_dir = effects_dir / "ui-schema"
    schema_dir.mkdir(parents=True, exist_ok=True)

    effects = sorted(effects_dir.glob("*.html"))
    for effect in effects:
        if effect.name == "gallery.html":
            continue
            
        schema_path = schema_dir / f"{effect.stem}.ui.json"
        if schema_path.exists():
            print(f"Skipping existing: {schema_path.name}")
            continue

        print(f"Generating: {schema_path.name}")
        schema = generate_schema(effect)
        with open(schema_path, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2)

if __name__ == "__main__":
    main()
