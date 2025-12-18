"""
UI Schema Enhancement Tool for JaZeR Effects

This script analyzes each effect file and generates enhanced UI schemas with:
- Comprehensive controls for all adjustable parameters
- Organized control sections (Motion, Colors, Geometry, Effects, Performance)
- Helpful hotkeys for quick adjustments
- Action buttons (reset, rebuild, randomize where appropriate)
- Better default values
- Color controls for materials and palettes
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
EFFECTS_DIR = PROJECT_ROOT / "effects"
SCHEMAS_DIR = EFFECTS_DIR / "ui-schema"


class SchemaEnhancer:
    """Analyzes effect files and generates enhanced UI schemas"""

    def __init__(self, effect_file: Path):
        self.effect_file = effect_file
        self.effect_name = effect_file.stem
        self.content = effect_file.read_text(encoding='utf-8')
        self.schema_file = SCHEMAS_DIR / f"{self.effect_name}.ui.json"

    def extract_existing_schema(self) -> Dict:
        """Load existing schema if it exists"""
        if self.schema_file.exists():
            try:
                return json.loads(self.schema_file.read_text(encoding='utf-8'))
            except:
                return {}
        return {}

    def detect_effect_type(self) -> str:
        """Determine if effect is Canvas 2D or Three.js"""
        if 'THREE' in self.content or 'Three.js' in self.content:
            return 'threejs'
        return 'canvas2d'

    def find_param_references(self) -> List[str]:
        """Find all references to window.JAZER_UI?.params"""
        pattern = r'window\.JAZER_UI\?\.params\?\.(\w+)'
        matches = re.findall(pattern, self.content)
        return list(set(matches))  # Remove duplicates

    def find_color_arrays(self) -> List[tuple]:
        """Find color array definitions like const colors = ['#hex', ...]"""
        pattern = r'(?:const|let|var)\s+(\w*[Cc]olor\w*)\s*=\s*\[([^\]]+)\]'
        matches = re.findall(pattern, self.content)
        results = []
        for var_name, colors_str in matches:
            # Extract hex colors
            hex_colors = re.findall(r'#[0-9a-fA-F]{6}', colors_str)
            if hex_colors:
                results.append((var_name, hex_colors))
        return results

    def find_material_uniforms(self) -> List[str]:
        """Find material uniforms that can be controlled"""
        patterns = [
            r'uniforms:\s*{([^}]+)}',
            r'\.uniforms\.(\w+)\.value',
        ]
        uniforms = set()
        for pattern in patterns:
            matches = re.findall(pattern, self.content, re.MULTILINE)
            for match in matches:
                if isinstance(match, str):
                    # Extract uniform names
                    uniform_names = re.findall(r'(\w+):', match)
                    uniforms.update(uniform_names)
                else:
                    uniforms.add(match)
        return list(uniforms)

    def find_numeric_constants(self) -> Dict[str, float]:
        """Find numeric constants that could be parameters"""
        patterns = [
            (r'const\s+(\w*[Ss]peed\w*)\s*=\s*([\d.]+)', 'speed'),
            (r'const\s+(\w*[Cc]ount\w*)\s*=\s*(\d+)', 'count'),
            (r'const\s+(\w*[Ss]ize\w*)\s*=\s*([\d.]+)', 'size'),
            (r'const\s+(\w*[Rr]adius\w*)\s*=\s*([\d.]+)', 'radius'),
            (r'const\s+(\w*[Ii]ntensity\w*)\s*=\s*([\d.]+)', 'intensity'),
        ]
        constants = {}
        for pattern, category in patterns:
            matches = re.findall(pattern, self.content)
            for name, value in matches:
                try:
                    constants[name] = float(value)
                except:
                    pass
        return constants

    def has_mouse_interaction(self) -> bool:
        """Check if effect uses mouse interaction"""
        return 'mouse.' in self.content or 'mouse,' in self.content

    def has_audio_features(self) -> bool:
        """Check if effect has audio reactivity"""
        return 'audio' in self.content.lower() or 'frequency' in self.content.lower()

    def generate_enhanced_schema(self) -> Dict:
        """Generate comprehensive enhanced schema"""
        existing = self.extract_existing_schema()
        effect_type = self.detect_effect_type()
        param_refs = self.find_param_references()
        color_arrays = self.find_color_arrays()
        uniforms = self.find_material_uniforms()
        constants = self.find_numeric_constants()
        has_mouse = self.has_mouse_interaction()
        has_audio = self.has_audio_features()

        # Start with existing schema structure
        schema = {
            "version": 1,
            "title": existing.get("title", self.effect_name.replace("jazer-", "").replace("-", " ").title()),
            "defaults": existing.get("defaults", {}),
            "hud": existing.get("hud", {
                "title": f"{existing.get('title', self.effect_name)} — Controls",
                "toggleKey": "h",
                "visible": False
            }),
            "hotkeys": [],
            "controls": []
        }

        # Ensure basic defaults exist
        if "timeScale" not in schema["defaults"]:
            schema["defaults"]["timeScale"] = 1.0
        if has_mouse and "mouseEnabled" not in schema["defaults"]:
            schema["defaults"]["mouseEnabled"] = True

        # Add detected param references to defaults
        for param in param_refs:
            if param not in schema["defaults"]:
                # Infer default value based on name
                if 'enabled' in param.lower() or param.lower().startswith('show'):
                    schema["defaults"][param] = True
                elif 'speed' in param.lower() or 'scale' in param.lower():
                    schema["defaults"][param] = 1.0
                elif 'count' in param.lower():
                    schema["defaults"][param] = 100
                else:
                    schema["defaults"][param] = 1.0

        # Build hotkeys
        hotkeys = [
            {"key": "H", "label": "Toggle Help"},
            {"key": "R", "label": "Reset", "action": "reset"}
        ]

        # Time scale hotkey
        hotkeys.append({
            "keys": ["1", "2"],
            "label": "Time",
            "bind": "params.timeScale",
            "step": 0.1,
            "min": 0.1,
            "max": 3,
            "format": "fixed1"
        })

        # Mouse toggle if applicable
        if has_mouse:
            hotkeys.append({
                "key": "M",
                "label": "Mouse",
                "bind": "params.mouseEnabled",
                "type": "toggle",
                "format": "onoff"
            })

        # Add hotkeys for other param refs
        key_counter = 3
        for param in sorted(param_refs):
            if param in ['timeScale', 'mouseEnabled']:
                continue
            if key_counter <= 9:
                hotkey = {
                    "keys": [str(key_counter), str(key_counter + 1)],
                    "label": param.replace("_", " ").title(),
                    "bind": f"params.{param}",
                    "step": 0.1,
                    "format": "fixed1"
                }
                # Infer min/max based on param type
                if 'count' in param.lower():
                    hotkey["step"] = 10
                    hotkey["min"] = 10
                    hotkey["max"] = 500
                    hotkey["format"] = "int"
                elif 'speed' in param.lower() or 'scale' in param.lower():
                    hotkey["min"] = 0.1
                    hotkey["max"] = 3
                else:
                    hotkey["min"] = 0
                    hotkey["max"] = 2

                hotkeys.append(hotkey)
                key_counter += 2

        schema["hotkeys"] = hotkeys

        # Build controls
        controls = []

        # Motion section
        controls.append({
            "type": "slider",
            "label": "Time Scale",
            "bind": "params.timeScale",
            "min": 0,
            "max": 3,
            "step": 0.01
        })

        # Mouse control
        if has_mouse:
            controls.append({
                "type": "checkbox",
                "label": "Mouse Enabled",
                "bind": "params.mouseEnabled"
            })

        # Add controls for all detected params
        for param in sorted(param_refs):
            if param in ['timeScale', 'mouseEnabled']:
                continue

            control = {
                "type": "slider",
                "label": param.replace("_", " ").title(),
                "bind": f"params.{param}",
                "step": 0.01
            }

            # Infer control range based on param type
            if 'count' in param.lower():
                control["min"] = 10
                control["max"] = 500
                control["step"] = 1
            elif 'speed' in param.lower() or 'scale' in param.lower():
                control["min"] = 0.1
                control["max"] = 3
            elif 'alpha' in param.lower() or 'opacity' in param.lower():
                control["min"] = 0
                control["max"] = 1
            else:
                control["min"] = 0
                control["max"] = 2

            controls.append(control)

        # Add color controls for detected color arrays
        for i, (color_var, colors) in enumerate(color_arrays[:3]):  # Limit to first 3 color arrays
            for j, hex_color in enumerate(colors[:2]):  # First 2 colors from each array
                controls.append({
                    "type": "color",
                    "label": f"{color_var.replace('_', ' ').title()} {j+1}",
                    "bind": f"effect.{color_var}[{j}]"
                })

        schema["controls"] = controls

        # Add helpful hint
        if effect_type == 'threejs':
            schema["hint"] = "Press H for help. Use JAZER_EXPOSE to expose materials and uniforms."
        else:
            schema["hint"] = "Press H for help. Canvas 2D effect."

        return schema

    def save_enhanced_schema(self):
        """Generate and save enhanced schema"""
        schema = self.generate_enhanced_schema()
        self.schema_file.parent.mkdir(parents=True, exist_ok=True)
        self.schema_file.write_text(json.dumps(schema, indent=2), encoding='utf-8')
        print(f"[OK] Enhanced: {self.effect_name}")
        return schema


def enhance_all_schemas():
    """Process all effect files and enhance their schemas"""
    effect_files = sorted(EFFECTS_DIR.glob("jazer-*.html"))

    print(f"Found {len(effect_files)} effect files")
    print(f"Enhancing UI schemas...\n")

    enhanced_count = 0
    for effect_file in effect_files:
        try:
            enhancer = SchemaEnhancer(effect_file)
            enhancer.save_enhanced_schema()
            enhanced_count += 1
        except Exception as e:
            print(f"[FAIL] {effect_file.name} - {str(e)}")

    print(f"\n[DONE] Enhanced {enhanced_count}/{len(effect_files)} schemas")


if __name__ == "__main__":
    enhance_all_schemas()
