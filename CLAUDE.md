# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JaZeR Visual Effects is a collection of 37+ standalone HTML visual effects powered by the JaZeR Background Engine and Three.js r160. Each effect is a self-contained HTML file that can be used as a web background or standalone visual experience.

## Development Server

**CRITICAL**: Effects MUST be served via HTTP (not `file://`) due to ES6 module imports.

Start local server:
```bash
# Option A: Python (recommended)
python -m http.server 8000

# Option B: Node.js
npx http-server -p 8000

# Option C: Use START-SERVER.bat on Windows
```

Then access via `http://localhost:8000`

## Testing Changes

Always test using the verification suite:
```
http://localhost:8000/TEST-FIXES.html
```

All 3 tests must pass:
1. Background Engine module loads
2. Three.js module loads
3. Core functions are accessible

## Architecture

### Core Libraries

**jazer-background-engine.js** - Main engine providing:
- Simplex noise (2D/3D/4D) and FBM functions
- 30+ easing functions (Quad, Cubic, Elastic, Back, Bounce, etc.)
- Mouse tracking with smooth interpolation
- 16 curated color palettes (Cyberpunk, Ocean, Sunset, Matrix, Vapor, etc.)
- Math utilities (map, clamp, smoothstep, distance, normalize, etc.)
- `QualityAutoTuner` class for adaptive performance (targets 60+ FPS)

**jazer-shaders.js** - GLSL utilities:
- Common shader snippets (fullscreen quad, uniforms)
- GLSL noise implementations (2D/3D simplex)
- FBM and turbulence functions
- Color conversion utilities for shaders

**jazer-post-fx.js** - Post-processing module:
- FX presets (subtle, moderate, intense, cinematic, dreamy)
- Bloom, chromatic aberration, vignette, grain effects
- Tonemapping options (ACES, Reinhard, Filmic)
- Sharpen and glow effects

**Three.js** - Three.js r160 library (ES6 module export)

### Effect Types

**Canvas 2D Effects** (~19 effects):
- Use Canvas 2D API and JaZeR Background Engine
- Import pattern: `import { noise2D, mouse, hexToRgb, ... } from '../lib/jazer-background-engine.js'`
- Examples: Plasma Storm, Hyperspace Tunnel, Matrix Rain, DNA Helix

**Three.js 3D Effects** (~18 effects):
- Use Three.js for WebGL rendering
- Import pattern:
  ```javascript
  import * as THREE from '../lib/Three.js';
  import { noise3D, mouse, ... } from '../lib/jazer-background-engine.js';
  window.THREE = THREE; // Make available globally if needed
  ```
- Examples: Neon City, Crystal Cave, Particle Galaxy, Quantum Wormhole

### File Structure

```
/
├── index.html                     # Gallery page with all effects
├── effect-showcase.html          # Showcase page for effects
├── lib/                          # Library files
│   ├── Three.js                  # Three.js r160 (ES6 module)
│   ├── jazer-background-engine.js    # Core engine (noise, easing, mouse, colors)
│   ├── jazer-shaders.js          # GLSL shader utilities
│   ├── jazer-post-fx.js          # Post-processing effects
│   ├── jazer-three-fx.js         # Three.js helper functions
│   └── jazer-canvas-fx.js        # Canvas 2D helper functions
├── effects/                      # 96 effect files
│   └── jazer-*.html              # Individual effect files
└── templates/                    # Effect templates
```

## Creating New Effects

### Canvas 2D Effect Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Effect Name - JaZeR</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
        canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="c"></canvas>
    <script type="module">
        import { noise2D, noise3D, mouse, hexToRgb, ColorPalettes } from '../lib/jazer-background-engine.js';

        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W, H, time = 0;

        function resize() {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function animate() {
            time += 0.01;
            mouse.update();

            // Your rendering code here

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        animate();
    </script>
</body>
</html>
```

### Three.js Effect Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Effect Name - JaZeR</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
        canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="c"></canvas>
    <script type="module">
        import * as THREE from '../lib/Three.js';
        import { noise3D, mouse, hexToRgb } from '../lib/jazer-background-engine.js';

        window.THREE = THREE;
        const canvas = document.getElementById('c');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Your scene setup here

        function animate() {
            mouse.update();

            // Your animation code here

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
    </script>
</body>
</html>
```

## Common Patterns

### Module Import Pattern (CRITICAL)

All Three.js effects MUST use ES6 module imports:
```javascript
// CORRECT:
import * as THREE from '../lib/Three.js';
window.THREE = THREE;

// WRONG (will fail):
<script src="../lib/Three.js"></script>
<script>
    const THREE = window.THREE; // undefined!
</script>
```

### Performance Optimization

Use `QualityAutoTuner` for adaptive quality:
```javascript
import { QualityAutoTuner, CONFIG } from '../lib/jazer-background-engine.js';

const tuner = new QualityAutoTuner(CONFIG);

function animate() {
    tuner.beginFrame();

    // Your rendering code

    tuner.endFrame();
    requestAnimationFrame(animate);
}
```

Tuner auto-adjusts resolution and entity count based on FPS to maintain 60+ FPS target.

### Mouse Interaction

```javascript
import { mouse } from '../lib/jazer-background-engine.js';

function animate() {
    mouse.update();

    // Normalized coordinates (0-1)
    const mx = mouse.x;
    const my = mouse.y;

    // Centered coordinates (-0.5 to 0.5)
    const cx = mouse.centered.x;
    const cy = mouse.centered.y;
}
```

### Color Palettes

```javascript
import { ColorPalettes, cycleColor } from '../lib/jazer-background-engine.js';

// Available palettes:
// cyberpunk, ocean, sunset, fire, ice, matrix, vapor, galaxy, neon, plasma, etc.

const color = cycleColor(ColorPalettes.cyberpunk, time, 0.5);
```

## Debugging

1. Open browser console (F12)
2. Check TEST-FIXES.html for import/module issues
3. Verify local server is running (not `file://` protocol)
4. Check for ES6 module import errors
5. Verify Three.js imports use correct path `'../Three.js'`

## Known Issues & Fixes

**Three.js "not defined" errors**: Effect must import Three.js as ES6 module, not via script tag

**Module loading fails**: Verify serving via HTTP, not `file://` protocol

**Performance issues**: Use `QualityAutoTuner` for adaptive quality control

## Gallery Integration

To add new effect to index.html gallery, add card entry:
```javascript
{
    title: 'Effect Name',
    file: 'jazer-effect-name.html',
    description: 'Brief description',
    type: 'canvas2d' // or 'threejs'
}
```
