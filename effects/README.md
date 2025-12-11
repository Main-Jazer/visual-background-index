# JaZeR Effects Library

A modular, maintainable library of visual background effects built with vanilla JavaScript, Canvas 2D, and Three.js.

## 📁 Directory Structure

```
effects/
├── lib/                          # Core infrastructure
│   ├── EffectBase.js            # Base class for all effects
│   ├── CanvasEffectBase.js      # Base for 2D canvas effects
│   ├── ThreeEffectBase.js       # Base for Three.js effects
│   ├── EffectRegistry.js        # Effect registration & discovery
│   └── EffectLoader.js          # Lazy loading with resource management
│
├── sacred-geometry/              # Sacred geometry effects
│   ├── FlowerOfLife.js
│   ├── SeedOfLife.js
│   ├── SriYantra.js
│   └── MetatronsCube.js
│
├── canvas-effects/               # 2D Canvas effects
│   └── PlasmaStorm.js
│
├── three-effects/                # Three.js effects
│   ├── QuantumFoam.js
│   └── NeonOcean.js
│
├── configs/                      # Configuration files
│   └── effect-metadata.json     # Category & tag metadata
│
├── dev/                          # Test & debug files
│   ├── debug-plasma.html
│   ├── test-basic.html
│   └── test-module.html
│
├── backups/                      # Backup files
│   └── jazer-plasma-storm-backup.html
│
├── gallery.html                  # Main gallery interface
├── README.md                     # This file
└── MIGRATION-GUIDE.md           # Guide for migrating effects
```

## 🚀 Quick Start

### Viewing the Gallery

1. Open `effects/gallery.html` in a web browser
2. Browse effects by category or search
3. Click any effect card to view it full-screen
4. Press ESC or click "Back to Gallery" to return

### Adding a New Effect

#### For 2D Canvas Effects:

```javascript
import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb } from '../../jazer-background-engine.js';

export class MyEffect extends CanvasEffectBase {
  getName() {
    return 'My Awesome Effect';
  }

  getCategory() {
    return 'plasma'; // or 'cosmic', 'cyber', etc.
  }

  getDescription() {
    return 'A brief description of what the effect does';
  }

  getTags() {
    return ['2d', 'particles', 'neon'];
  }

  async createEffect() {
    // Initialize your effect (run once)
    this.particles = [];
  }

  render(time, deltaTime) {
    // Render each frame
    const { ctx, width, height } = this;
    
    // Clear or trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Your drawing code here
  }
}
```

#### For Three.js Effects:

```javascript
import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { mouse } from '../../jazer-background-engine.js';

export class MyThreeEffect extends ThreeEffectBase {
  getName() {
    return 'My 3D Effect';
  }

  getCategory() {
    return 'quantum';
  }

  getDescription() {
    return 'A 3D visualization';
  }

  getTags() {
    return ['3d', 'three.js', 'particles'];
  }

  async createScene() {
    // Create your Three.js scene
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
  }

  render(time, deltaTime) {
    // Update and render
    this.cube.rotation.x = time;
    this.cube.rotation.y = time * 0.5;
    
    super.render(time, deltaTime);
  }
}
```

### Registering Your Effect

In `gallery.html`, add your import and registration:

```javascript
import { MyEffect } from './your-category/MyEffect.js';
registry.register(MyEffect);
```

## 📚 Base Class API Reference

### EffectBase

All effects inherit from `EffectBase`, which provides:

#### Lifecycle Methods (Override these):

- `async init()` - Initialize the effect (called once)
- `update(time, deltaTime)` - Update each frame
- `resize(width, height)` - Handle window resize
- `dispose()` - Clean up resources

#### Metadata Methods (Override these):

- `getName()` - Return effect name (string)
- `getCategory()` - Return category (string)
- `getDescription()` - Return description (string)
- `getTags()` - Return tags array (string[])
- `getDefaultConfig()` - Return default config (object)

#### Control Methods:

- `start()` - Start the animation loop
- `stop()` - Stop the animation loop
- `isRunning` - Boolean indicating if effect is running

### CanvasEffectBase

Extends `EffectBase` with canvas-specific features:

#### Properties:

- `ctx` - Canvas 2D context
- `width` - Canvas width
- `height` - Canvas height
- `centerX` - Center X coordinate
- `centerY` - Center Y coordinate
- `dpr` - Device pixel ratio (capped at 2)

#### Methods:

- `clear(color)` - Clear canvas with color
- `setupCanvas()` - Configure canvas dimensions
- `render(time, deltaTime)` - Override for frame rendering

### ThreeEffectBase

Extends `EffectBase` with Three.js features:

#### Properties:

- `scene` - THREE.Scene instance
- `camera` - THREE.PerspectiveCamera instance
- `renderer` - THREE.WebGLRenderer instance
- `clock` - THREE.Clock instance

#### Methods:

- `initThreeJS()` - Initialize Three.js (called automatically)
- `createScene()` - Override to create your scene
- `render(time, deltaTime)` - Override to update and render

#### Default Config:

```javascript
{
  fov: 75,
  near: 0.1,
  far: 2000,
  cameraZ: 15,
  antialias: true,
  alpha: true,
  ambientLight: true,
  ambientColor: 0x222255,
  ambientIntensity: 0.3
}
```

## 🎨 Categories

- **sacred-geometry** - Ancient geometric patterns (Flower of Life, Sri Yantra, etc.)
- **plasma** - Dynamic plasma and energy effects
- **cosmic** - Space and nebula visualizations
- **cyber** - Cyberpunk and neon aesthetics
- **quantum** - Quantum physics visualizations
- **tunnel** - Tunnel and vortex effects
- **particle** - Particle systems
- **fractal** - Fractal patterns

## 🏷️ Common Tags

- `2d` / `3d` - Rendering technology
- `geometry` / `sacred` / `mandala` - Visual style
- `particles` / `energy` / `physics` - Effect type
- `three.js` - Technology
- `neon` / `cyber` / `quantum` - Aesthetic

## 🔧 Utilities from jazer-background-engine.js

All effects have access to these utilities:

### Mouse Tracking:
```javascript
import { mouse } from '../../jazer-background-engine.js';

mouse.x          // Normalized 0-1
mouse.y          // Normalized 0-1
mouse.centeredX  // Normalized -1 to 1
mouse.centeredY  // Normalized -1 to 1
mouse.update()   // Call each frame
```

### Noise Functions:
```javascript
import { noise2D, noise3D, noise4D } from '../../jazer-background-engine.js';

const value = noise2D(x, y);
const value3D = noise3D(x, y, z);
```

### Color Utilities:
```javascript
import { hexToRgb, lerpColor, ColorPalettes } from '../../jazer-background-engine.js';

const rgb = hexToRgb('#ff0055');  // {r: 255, g: 0, b: 85}
const color = lerpColor('#ff0000', '#0000ff', 0.5);
const palette = ColorPalettes.cyberpunk;  // ['#ff0055', '#00ffff', ...]
```

### Math Utilities:
```javascript
import { smoothstep, map, clamp } from '../../jazer-background-engine.js';

const smooth = smoothstep(0, 1, 0.5);
const mapped = map(value, 0, 100, 0, 1);
const clamped = clamp(value, 0, 1);
```

## 🎯 Best Practices

1. **Memory Management**: Always dispose of resources in the `dispose()` method
2. **Performance**: Use `requestAnimationFrame` through the base class (automatic)
3. **Responsiveness**: Implement `resize()` to handle window changes
4. **Configuration**: Use `getDefaultConfig()` for customizable parameters
5. **Naming**: Use descriptive names and proper categorization
6. **Documentation**: Add clear descriptions and appropriate tags

## 🔄 Migration

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for instructions on migrating existing HTML effects to the modular format.

## 📊 Performance Tips

- Use `dpr` (device pixel ratio) cap to prevent excessive resolution
- Implement LOD (level of detail) based on performance
- Use `globalCompositeOperation = 'lighter'` for additive blending
- Clear canvas with trail effects instead of full clears for motion blur
- Use geometry instancing in Three.js for many similar objects

## 🛠️ Debugging

1. Open browser DevTools (F12)
2. Check Console for errors
3. Use Network tab to verify resource loading
4. Monitor Performance tab for frame rate
5. Test on different devices/browsers

## 📝 License

Part of the JaZeR Visual Background Index project.

## 🤝 Contributing

1. Create a new effect class extending the appropriate base
2. Test thoroughly in the gallery
3. Add proper metadata (name, category, description, tags)
4. Document any special configuration options
5. Submit for review

---

For questions or issues, refer to the main project documentation.
