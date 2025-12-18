# JaZeR Visual Effects Engine

**100+ stunning 3D visual effects for web backgrounds** — Powered by Three.js r160

[**View Live Demo**](https://main-jazer.github.io/Three-JS-Custom-Visuals/) · [Docs](docs/START-HERE.md)

---

## Quick Start

### View Online
Visit: https://main-jazer.github.io/Three-JS-Custom-Visuals/

### Run Locally
```bash
# Start a local server
python -m http.server 8000   # Python
npx http-server -p 8000      # Node.js

# Then open http://localhost:8000
```

---

## Effects (100+)

| Category | Examples |
|----------|----------|
| **Plasma & Energy** | Plasma Storm, Energy Reactor, Plasma Vortex |
| **Cosmic** | Quantum Wormhole, Cosmic Nebula, Particle Galaxy |
| **Sacred Geometry** | Flower of Life, Metatron's Cube, Sri Yantra, Sacred Tesseract |
| **Tunnels** | Hyperspace, Hexagon, Digital Lattice, Neon Tunnel |
| **Cyberpunk** | Neon City, Holographic City, Matrix Rain, Cyber Glitch |
| **Ambient** | Aurora Borealis, Neon Ocean, Synthwave Grid |

---

## Project Structure

```
Three-JS-Custom-Visuals/
├── index.html                 # Main gallery
├── effect-showcase.html       # Featured effects
│
├── effects/                   # 103 visual effect files
│   └── jazer-*.html
│
├── lib/                       # Core JavaScript modules
│   ├── Three.js               # Three.js r160
│   ├── base/                  # Base classes (5 files)
│   ├── canvas/                # Canvas effects modules
│   ├── engine/                # Core engine (jazer-*.js)
│   ├── sacred-geometry/       # Sacred geometry modules
│   └── three/                 # Three.js effect modules
│
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── templates/                 # Effect templates
└── tests/                     # Test files
```

---

## Engine Features

**Noise & Math**
- Simplex Noise (2D/3D/4D), Fractal Brownian Motion
- 30+ easing functions (Quad, Cubic, Elastic, Bounce, etc.)
- Utilities: smoothstep, clamp, lerp, map

**Color System**
- 16 curated palettes (Cyberpunk, Ocean, Neon, Galaxy, etc.)
- HSL/RGB/Hex conversion, color cycling

**Performance**
- Adaptive quality based on FPS
- Mouse/touch tracking with smooth interpolation
- 60+ FPS target on all devices

---

## Usage

### Embed as Background
```html
<iframe src="effects/jazer-plasma-storm.html" 
        style="position:fixed; inset:0; width:100%; height:100%; border:none; z-index:-1;">
</iframe>
```

### Use the Engine API
```javascript
import { noise3D, mouse, ColorPalettes, Easing } from './lib/engine/jazer-background-engine.js';

const value = noise3D(x * 0.01, y * 0.01, time);
mouse.update();
const eased = Easing.easeInOutCubic(t);
```

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome / Edge | ✅ Recommended |
| Firefox | ✅ Supported |
| Safari | ✅ Supported |
| IE | ❌ Not supported |

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

**Made with ❤️ by JaZeR** · [GitHub](https://github.com/Main-Jazer) · Powered by Three.js r160
