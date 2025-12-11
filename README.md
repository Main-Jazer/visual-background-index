# 🎨 JaZeR Visual Effects - 37 Stunning Effects ✨

**All effects are now working!** See [FIXES-APPLIED.md](FIXES-APPLIED.md) for details.

Stunning infinite 3D visual effects for web backgrounds. Powered by the JaZeR Background Engine with Three.js r160.

## 🚀 Quick Start

### Step 1: Start Local Server
```bash
# Option A: Python (recommended)
python -m http.server 8000

# Option B: Node.js
npx http-server -p 8000

# Option C: VS Code Live Server extension
```

### Step 2: Test Everything Works
Open: `http://localhost:8000/TEST-FIXES.html`

All 3 tests should show ✓ PASSED

### Step 3: View Gallery
Open: `http://localhost:8000/index.html`

Click any effect to launch it!

## ✨ 37 Effects Included

### 🔥 Intense Effects (7)
- **Plasma Storm** - Electric arcs with lightning (Canvas 2D)
- **Plasma Vortex** - Swirling plasma formation (Three.js)
- **Cyber Glitch** - RGB splitting & data corruption (Canvas 2D)
- **Singularity** - 15,000 particles spiraling into black hole (Three.js)
- **Neon City** - Cyberpunk cityscape flythrough (Three.js)
- **Particle Galaxy** - 50,000 star spiral galaxy (Three.js)
- **Digital Lattice Tunnel** - Hexagonal wireframe tunnel (Canvas 2D)

### 🌌 Cosmic & Portals (2)
- **Quantum Wormhole** - Gravitational vortex portal (Three.js)
- **Cosmic Nebula** - Volumetric nebula clouds (Three.js)

### ⚡ Advanced 3D Tech (6)
- **Laser Grid Sphere** - Geodesic sphere with lasers (Three.js)
- **Neural Network** - 150 interconnected nodes (Three.js)
- **Holographic City** - Futuristic city with RGB glitch (Three.js)
- **Energy Reactor** - Pulsing fusion reactor core (Three.js)
- **Quantum Foam** - Space-time fluctuations (Three.js)
- **Neon Ocean** - Undulating wave mesh (Three.js)

### 🔮 Sacred Geometry (7)
- **Flower of Life Mandala** - Ancient sacred circles (Canvas 2D)
- **Metatron's Cube** - 3D unfolding Platonic solids (Three.js)
- **Sri Yantra** - Interlocking triangles (Canvas 2D)
- **Torus Knot Tunnel** - Wireframe knots (Three.js)
- **Seed of Life** - 7 overlapping circles portal (Canvas 2D)
- **Sacred Tesseract** - 4D hypercube projection (Three.js)
- **Crystal Lattice Network** - Interconnected crystals (Three.js)

### ⚡ Original Effects (15+)
- **Hyperspace Tunnel** - Infinite wireframe vortex (Canvas 2D)
- **Hexagon Tunnel** - Pulsating hexagons (Canvas 2D)
- **Cosmic Stardust** - 800 particles with nebula (Canvas 2D)
- **Synthwave Grid** - Outrun aesthetic with mountains (Canvas 2D)
- **DNA Helix** - Double helix molecular spiral (Canvas 2D)
- **Crystal Cave** - Glowing ice cavern flythrough (Three.js)
- **Matrix Rain** - Classic digital rain in 3D (Canvas 2D)
- **Möbius Infinity** - Non-orientable surface (Three.js)
- **Aurora Borealis** - Northern lights ribbons (Canvas 2D)
- **Fractal Cubes** - Recursive cube structures (Three.js)
- And more!

## 🚀 Engine Features

### Noise Functions
- **Simplex Noise** - 2D/3D/4D procedural noise
- **FBM** - Fractal Brownian Motion for natural textures

### Easing Functions (30+)
- Quad, Cubic, Quart, Quint
- Sine, Expo, Circ
- Elastic, Back, Bounce
- All with In/Out/InOut variants

### Mouse Tracking
- Smooth interpolation
- Velocity calculation
- Centered coordinates
- Touch support

### Color System
- **16 Curated Palettes** - Cyberpunk, Ocean, Sunset, Matrix, Vapor, Fire, Ice, Galaxy, Neon, etc.
- **Color Tools** - hexToRgb, rgbToHex, hslToRgb, lerpColor, cycleColor

### Math Utilities
- map, clamp, smoothstep, smootherstep
- fract, mod, mix, step, pulse
- distance, normalize, dot products
- Angle conversions

### Performance
- **Adaptive Quality** - Auto-adjusts resolution and entity count based on FPS
- **Quality Levels** - Low, Medium, High with configurable thresholds
- **60+ FPS Target** - Smooth animations on all devices

## 📁 Project Structure

```
Three JS Custom JaZeR Visuals/
├── 📄 index.html                  # Main gallery page
├── 📄 TEST-FIXES.html             # Test suite (NEW!)
├── 📄 FIXES-APPLIED.md            # Detailed fix documentation (NEW!)
├── 📄 README.md                   # This file
├── 📄 jazer-background-engine.js  # Core engine library
├── 📄 jazer-shaders.js            # GLSL shader utilities
├── 📄 Three.js                    # Three.js r160
└── 📁 effects/                    # 37 visual effects
    ├── jazer-plasma-storm.html
    ├── jazer-neon-city.html
    ├── jazer-crystal-cave.html
    └── ... (34 more)
```

## ✅ What Was Fixed?

**Problem:** Three.js wasn't loading correctly - files used `<script src="">` but needed ES6 modules

**Solution:** Changed 18 Three.js effect files to use:
```javascript
import * as THREE from '../Three.js';
```

**Result:** ✓ All 37 effects now work perfectly!

See [FIXES-APPLIED.md](FIXES-APPLIED.md) for complete details.

## 🔧 Usage Examples

### Basic Effect Integration
```html
<iframe src="effects/jazer-plasma-storm.html" 
        style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; border: none; z-index: -1;">
</iframe>
```

### Background Engine API
```javascript
import { 
    noise2D, 
    noise3D, 
    mouse,
    ColorPalettes,
    Easing 
} from './jazer-background-engine.js';

// Procedural noise
const value = noise2D(x * 0.01, y * 0.01);

// Mouse tracking
mouse.update();
console.log(mouse.x, mouse.y); // Normalized 0-1

// Color cycling
const color = cycleColor(ColorPalettes.cyberpunk, time, 0.5);

// Smooth easing
const eased = Easing.easeInOutCubic(t);
```

## 🌐 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ❌ Internet Explorer (ES6 modules required)

## 🛟 Troubleshooting

### Effects don't load?
1. ✓ Run TEST-FIXES.html first
2. ✓ Use a local server (not file://)
3. ✓ Check browser console (F12)
4. ✓ Use a modern browser

### Common Issues (Now Fixed!)
- ❌ "THREE is not defined" → ✓ Fixed
- ❌ "Module not found" → ✓ Fixed
- ❌ "Unexpected token 'export'" → ✓ Fixed

## 💡 Tips

1. **Performance** - Effects auto-adjust quality based on your device
2. **Interaction** - Many effects respond to mouse movement
3. **Customization** - Each effect file is standalone and easy to edit
4. **Testing** - Always run TEST-FIXES.html after making changes

## 📜 License

MIT License - Use freely for your projects!

## 🎉 Enjoy!

All 37 effects are working perfectly. Start with TEST-FIXES.html to verify, then explore the gallery!

---

Made with ❤️ using Three.js r160 and the JaZeR Background Engine
