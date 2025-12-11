# Effect Migration Guide

This guide provides step-by-step instructions for converting existing HTML effects to the new modular JavaScript format.

## Table of Contents

1. [Why Migrate?](#why-migrate)
2. [Before You Start](#before-you-start)
3. [Migration Steps](#migration-steps)
4. [Canvas Effect Example](#canvas-effect-example)
5. [Three.js Effect Example](#threejs-effect-example)
6. [Common Patterns](#common-patterns)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Why Migrate?

### Benefits:
- ✅ **Eliminate Duplication**: Remove ~2,200+ lines of boilerplate HTML/CSS
- ✅ **Centralized Management**: Single gallery interface for all effects
- ✅ **Better Organization**: Clear directory structure and categorization
- ✅ **Resource Management**: Proper cleanup and memory management
- ✅ **Searchable**: Effects are discoverable through search and categories
- ✅ **Maintainable**: Changes to base classes affect all effects
- ✅ **Modular**: Effects can be imported and reused easily

## Before You Start

### 1. Choose the Right Base Class

| Effect Type | Base Class | Use When |
|------------|------------|----------|
| 2D Canvas | `CanvasEffectBase` | Drawing with 2D context (circles, lines, paths) |
| Three.js | `ThreeEffectBase` | 3D scenes, WebGL shaders, Three.js objects |

### 2. Identify Components

In your HTML file, identify:
- **Setup code** (canvas init, variables) → Goes in `createEffect()` or `createScene()`
- **Animation loop** (render function) → Goes in `render()`
- **Helper functions** → Standalone functions at bottom of file
- **Classes** → Keep as classes in the file

### 3. Determine Category

Choose the most appropriate category:
- `sacred-geometry` - Sacred geometric patterns
- `plasma` - Plasma and energy effects
- `cosmic` - Space and nebula
- `cyber` - Cyberpunk and neon
- `quantum` - Quantum physics
- `tunnel` - Tunnel effects
- `particle` - Particle systems
- `fractal` - Fractal patterns

## Migration Steps

### Step 1: Create New File

Create a new `.js` file in the appropriate category folder:

```bash
effects/
  your-category/
    YourEffectName.js
```

### Step 2: Set Up Imports

Add necessary imports at the top:

```javascript
// For Canvas effects:
import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb, noise2D, smoothstep } from '../../jazer-background-engine.js';

// For Three.js effects:
import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { mouse, noise3D } from '../../jazer-background-engine.js';
```

### Step 3: Create Class Structure

```javascript
export class YourEffectName extends CanvasEffectBase {  // or ThreeEffectBase
  getName() {
    return 'Your Effect Name';
  }

  getCategory() {
    return 'your-category';
  }

  getDescription() {
    return 'Brief description of what the effect does';
  }

  getTags() {
    return ['2d', 'geometry', 'neon'];  // Relevant tags
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      // Your custom config here
      particleCount: 100,
      speed: 1.0
    };
  }

  async createEffect() {  // or createScene() for Three.js
    // Initialization code here
  }

  render(time, deltaTime) {
    // Animation loop code here
  }
}
```

### Step 4: Move Initialization Code

Take the setup code from your HTML and move it to `createEffect()`:

**Before (HTML):**
```javascript
const palette = ['#ffd700', '#ff6b35'];
const layerCount = 12;
let layers = Array.from({ length: layerCount }, (_, i) => new Layer(i));
```

**After (JS Module):**
```javascript
async createEffect() {
  this.palette = ['#ffd700', '#ff6b35'];
  this.layers = Array.from(
    { length: this.config.layerCount },
    (_, i) => new Layer(i, this.palette)
  );
}

getDefaultConfig() {
  return {
    ...super.getDefaultConfig(),
    layerCount: 12
  };
}
```

### Step 5: Move Render Loop

Take your render function and adapt it to the `render()` method:

**Before (HTML):**
```javascript
function render() {
  time += 1 / 60;
  mouse.update();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, W, H);
  
  // Drawing code...
  
  requestAnimationFrame(render);
}
```

**After (JS Module):**
```javascript
render(time, deltaTime) {
  // mouse.update() is called automatically
  const { ctx, width: W, height: H } = this;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, W, H);
  
  // Drawing code...
  // No requestAnimationFrame needed - handled by base class
}
```

### Step 6: Move Helper Functions & Classes

Place them after your main class:

```javascript
export class YourEffect extends CanvasEffectBase {
  // ... class code
}

// Helper classes
class Layer {
  constructor(index, palette) {
    this.index = index;
    this.palette = palette;
  }
  
  draw(ctx, cx, cy) {
    // ...
  }
}

// Helper functions
function drawCircle(ctx, x, y, radius, color) {
  // ...
}
```

### Step 7: Update Variable References

Change global variables to instance properties:

- `W, H` → `this.width, this.height`
- `cx, cy` → `this.centerX, this.centerY`
- `ctx` → `this.ctx`
- `time` → Use parameter: `render(time, deltaTime)`
- `palette` → `this.palette`
- `layers` → `this.layers`

### Step 8: Register in Gallery

Add to `gallery.html`:

```javascript
import { YourEffect } from './your-category/YourEffect.js';
registry.register(YourEffect);
```

## Canvas Effect Example

### Original HTML (simplified):

```html
<!DOCTYPE html>
<html>
<head>
  <title>Spiral Effect</title>
  <style>/* ... styles ... */</style>
</head>
<body>
  <canvas id="c"></canvas>
  <script type="module">
    import { mouse, hexToRgb } from '../jazer-background-engine.js';
    
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let W, H;
    let time = 0;
    const colors = ['#ff0055', '#00f5ff'];
    
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    }
    
    function render() {
      time += 0.016;
      mouse.update();
      
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, W, H);
      
      const rgb = hexToRgb(colors[0]);
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.beginPath();
      ctx.arc(W/2, H/2, 50 + Math.sin(time) * 20, 0, Math.PI * 2);
      ctx.fill();
      
      requestAnimationFrame(render);
    }
    
    window.addEventListener('resize', resize);
    resize();
    render();
  </script>
</body>
</html>
```

### Migrated Module:

```javascript
import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb } from '../../jazer-background-engine.js';

export class SpiralEffect extends CanvasEffectBase {
  getName() {
    return 'Spiral Effect';
  }

  getCategory() {
    return 'cosmic';
  }

  getDescription() {
    return 'A pulsing spiral pattern';
  }

  getTags() {
    return ['2d', 'geometry', 'animated'];
  }

  async createEffect() {
    this.colors = ['#ff0055', '#00f5ff'];
  }

  render(time, deltaTime) {
    const { ctx, width: W, height: H } = this;
    
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, W, H);
    
    const rgb = hexToRgb(this.colors[0]);
    ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    ctx.beginPath();
    ctx.arc(W/2, H/2, 50 + Math.sin(time) * 20, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

## Three.js Effect Example

### Original HTML (simplified):

```html
<!DOCTYPE html>
<html>
<body>
  <canvas id="c"></canvas>
  <script type="module">
    import * as THREE from '../Three.js';
    import { mouse } from '../jazer-background-engine.js';
    
    const canvas = document.getElementById('c');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    function animate() {
      requestAnimationFrame(animate);
      mouse.update();
      
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      
      renderer.render(scene, camera);
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

### Migrated Module:

```javascript
import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { mouse } from '../../jazer-background-engine.js';

export class RotatingCube extends ThreeEffectBase {
  getName() {
    return 'Rotating Cube';
  }

  getCategory() {
    return 'cyber';
  }

  getDescription() {
    return 'A simple rotating cube';
  }

  getTags() {
    return ['3d', 'three.js', 'geometry'];
  }

  async createScene() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
  }

  render(time, deltaTime) {
    this.cube.rotation.x += deltaTime;
    this.cube.rotation.y += deltaTime;
    
    super.render(time, deltaTime);
  }
}
```

## Common Patterns

### Pattern 1: Layers with Depth

**Before:**
```javascript
class Layer {
  constructor(index) {
    this.z = index * 0.15;
  }
}
const layers = Array.from({ length: 12 }, (_, i) => new Layer(i));
```

**After:**
```javascript
async createEffect() {
  this.layers = Array.from(
    { length: this.config.layerCount },
    (_, i) => new Layer(i)
  );
}

getDefaultConfig() {
  return {
    ...super.getDefaultConfig(),
    layerCount: 12
  };
}
```

### Pattern 2: Mouse Interaction

**Before:**
```javascript
const offsetX = mouse.centeredX * 100;
const offsetY = mouse.centeredY * 100;
```

**After:**
```javascript
render(time, deltaTime) {
  // mouse.update() called automatically
  const offsetX = mouse.centeredX * 100;
  const offsetY = mouse.centeredY * 100;
}
```

### Pattern 3: Resize Handling

Canvas effects get automatic resize handling. For custom behavior:

```javascript
resize(width, height) {
  // Optional: custom resize logic
  // Base class already handles canvas sizing
  this.customValue = width / height;
}
```

## Testing

### 1. Local Testing

1. Open `effects/gallery.html` in a browser
2. Find your effect in the list
3. Click to view it full-screen
4. Test:
   - Visual appearance matches original
   - Mouse interaction works
   - Resize works (drag browser window)
   - ESC key returns to gallery
   - No console errors

### 2. Performance Testing

- Open DevTools Performance tab
- Record for 10-15 seconds
- Check frame rate stays above 30 FPS
- Look for memory leaks

### 3. Cross-Browser Testing

Test in:
- Chrome/Edge
- Firefox
- Safari (if available)

## Troubleshooting

### Issue: Effect doesn't appear

**Check:**
- Import path is correct (../../ for engine, ../ for lib)
- Effect is registered in gallery.html
- No console errors
- `createEffect()` or `createScene()` completes without errors

### Issue: Variables are undefined

**Fix:**
- Change `W, H` to `this.width, this.height`
- Change `ctx` to `this.ctx`
- Change global vars to `this.varName`

### Issue: Animation is too fast/slow

**Fix:**
Use `deltaTime` instead of fixed time steps:

```javascript
// Before
position += 0.016;

// After
position += deltaTime;
```

### Issue: Memory leak

**Fix:**
Implement proper cleanup:

```javascript
dispose() {
  super.dispose();
  
  // Clean up your resources
  if (this.particles) {
    this.particles = null;
  }
}
```

### Issue: Three.js objects don't render

**Check:**
- Objects are added to `this.scene`
- Camera is positioned correctly
- `super.render(time, deltaTime)` is called
- Materials are visible (not transparent: true with opacity: 0)

## Next Steps

After successful migration:

1. Test thoroughly
2. Compare with original HTML version
3. Document any special configuration
4. Consider adding performance optimizations
5. Delete or move original HTML to `/effects/legacy/`

## Need Help?

- Check existing migrated effects for examples
- Review base class documentation in README.md
- Check console for error messages
- Test in isolation before adding to gallery

---

Happy migrating! 🚀
