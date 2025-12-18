---
name: Engine Performance & Quality Tiers
description: FPS-first design, bottlenecks, and validation steps for the JaZeR engine.
color: automatic
---

## Priorities (Tradeoffs)

1) FPS Stability (non-negotiable)
2) Visual Quality (only when headroom confirmed)
3) Developer Ergonomics (additive, no breaking imports)
4) Mobile Support (explicit tiers + graceful degradation)

## What Changed

### 1) Tiered quality budgets (engine-level hints)

`lib/runtime/jazer-background-engine.js` now defines `CONFIG.qualityLevels` as explicit tiers:

- `low`: stability-first fallback, post/volumetrics off
- `medium`: limited post, no volumetrics
- `high`: premium lane, post + volumetrics permitted

Each tier provides:
- `resolutionScale` (primary stability lever)
- `maxEntities` (generic budget)
- `features` (post/volumetrics/shadows/msaa booleans)
- `budgets` (particles/instances/postPasses/volumetricSamples)

Effects can opt into these budgets to scale complexity deterministically.

### 2) More stable adaptive tuning

`QualityAutoTuner` now:
- Ignores samples while hidden and resets streaks on tab hide
- Uses upgrade/downgrade streaks so quality does not oscillate
- Targets 60 FPS by default and only upgrades after sustained headroom

### 3) Base-class adaptive resolution (Canvas + Three.js)

`CanvasEffectBase` and `ThreeEffectBase` now support:
- `autoQuality` (default `true`)
- `qualityUpdateIntervalFrames` (default `30`)
- `getQualitySettings()` to query current tier/budgets/pixel ratio

When enabled, the base classes apply adaptive pixel ratio without requiring effect changes.

## Top Bottlenecks (What Usually Breaks FPS)

### Render loop / CPU
- Per-frame allocations (arrays, vectors, colors, strings) and GC spikes
- Excessive scene graph traversal per frame (especially for thousands of objects)
- Sorting large arrays every frame (particles, instances, draw order)
- Too many DOM reads/writes or layout thrash in the loop

### GPU / Shaders
- High fill-rate: full-screen passes at high DPR, large transparent overdraw
- Expensive fragment shaders (noise in fragment, many texture reads, branching)
- High volumetric sample counts (god rays/fog are sample-loop heavy)
- Too many dynamic lights/shadows (shadow maps are expensive)

### Post stack
- Multiple full-screen passes (bloom + blur chains + DoF + motion blur)
- Using full-resolution post on high-DPI screens without scaling
- Frequent reallocation of render targets on resize or quality changes

### Textures & buffers
- Oversized textures or too many unique textures/materials
- Large render targets (especially HDR + multiple buffers)
- Instancing with large per-instance attributes updated every frame

### Instancing/batching
- CPU-side updates for every instance each frame (matrix math, writes)
- Updating instance matrices/colors when they are not changing
- Not using frustum culling / coarse bounds (for very large fields)

## How To Validate (Manual QA)

1) Start server: `python -m http.server 8000` from repo root
2) Open an effect that is GPU-heavy (post + volumetrics) and watch:
   - No stutter spikes when resizing
   - Quality drops when FPS dips, upgrades only after sustained headroom
3) Open a Canvas effect and confirm it remains sharp but stabilizes FPS under load
4) Check console for errors/warnings

Recommended spot checks:
- `effects/gallery.html` (broad sweep)
- A post-heavy effect (bloom/DoF/motion blur)
- An instancing-heavy effect
- A canvas-heavy effect

