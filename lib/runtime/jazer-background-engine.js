// jazer-background-engine.js
// JaZeR Background Engine (Expert Edition)
// The central hub for visual effects, aggregating specialized modules.
// ============================================================================

import { PALETTES, Palette, Gradient, hexToRgb, rgbToHex, hslToRgb, rgbToHsl, lerpColor, cycleColor } from '../systems/palette/jazer-palette.js';
import { MouseTracker, mouse, CinematicCamera, Shot } from '../systems/motion/jazer-motion.js';
import { LoopClock, breathe, pulse, drift, wave, stagger, periodic } from '../systems/timing/jazer-timing.js';
import { Easing } from '../systems/timing/jazer-easing.js';
import { TemporalField, SpatialDistribution } from '../systems/math/jazer-spatial.js';
import { default as Volumetric } from '../fx/three/jazer-volumetric.js';
import SacredGeometry3D from '../sacred-geometry/SacredGeometry3D.js';
import { EngineRuntime, AdaptiveResolution } from './jazer-engine-runtime.js';

// Re-export for backward compatibility and convenience
export { 
  PALETTES as ColorPalettes, 
  Palette, 
  Gradient,
  MouseTracker, 
  mouse, 
  CinematicCamera, 
  Shot,
  LoopClock,
  breathe, pulse, drift, wave, stagger, periodic,
  Easing,
  hexToRgb, rgbToHex, hslToRgb, rgbToHsl, lerpColor, cycleColor,
  TemporalField,
  SpatialDistribution,
  Volumetric,
  SacredGeometry3D,
  EngineRuntime,
  AdaptiveResolution
};

// ---------------------------------------------------------
// CONFIG: Global quality + performance settings
// ---------------------------------------------------------
export const CONFIG = {
  // Priority order: FPS stability > visual quality > DX > mobile
  // This config is intentionally conservative for stability across devices.
  targetFPS: 60,
  minFPS: 50,

  // Hard caps to avoid runaway VRAM/RT allocations on high-DPI devices.
  maxPixelRatio: 2.0,

  // Resolution scaling is the first lever we pull for stability.
  baseResolutionScale: 1.0,
  maxResolutionScale: 1.0,
  minResolutionScale: 0.55,

  // Shared budget hint for effects (particles/instances/etc).
  maxEntities: 240,

  // Named tier range (used by QualityAutoTuner)
  maxQualityLevel: 'high',
  minQualityLevel: 'low',

  qualityLevels: {
    // Each tier provides:
    // - resolutionScale/pixelRatio knobs (stability-first)
    // - budgets for effect complexity (opt-in by effects)
    // - feature flags for graceful degradation (especially on mobile)
    low: {
      resolutionScale: 0.65,
      maxEntities: 70,
      features: { post: false, volumetrics: false, shadows: false, msaa: false },
      budgets: { particles: 2000, instances: 20000, postPasses: 0, volumetricSamples: 0 }
    },
    medium: {
      resolutionScale: 0.8,
      maxEntities: 130,
      features: { post: true, volumetrics: false, shadows: false, msaa: false },
      budgets: { particles: 8000, instances: 60000, postPasses: 2, volumetricSamples: 0 }
    },
    high: {
      resolutionScale: 1.0,
      maxEntities: 220,
      features: { post: true, volumetrics: true, shadows: false, msaa: true },
      budgets: { particles: 25000, instances: 120000, postPasses: 4, volumetricSamples: 48 }
    }
  },

  // Stability tuning:
  // - evaluate less often to reduce oscillation
  // - require sustained headroom to upgrade visuals
  adjustIntervalFrames: 60,
  upgradeFPSThreshold: 62,
  downgradeFPSThreshold: 55,
  upgradeStreakRequired: 2,
  downgradeStreakRequired: 1
};

// ---------------------------------------------------------
// QualityAutoTuner: Reusable adaptive quality controller
// ---------------------------------------------------------
export class QualityAutoTuner {
  constructor(config = CONFIG) {
    this.config = config;
    this.qualityLevels = this.config.qualityLevels;
    this.currentLevel = 'high';
    this.frameCount = 0;
    this.fpsSamples = [];
    this.maxSamples = 120;
    this.lastFrameStart = performance.now();
    this.lastFrameEnd = performance.now();
    this._visible = true;
    this._upgradeStreak = 0;
    this._downgradeStreak = 0;

    // Bind methods
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onResize = this._onResize.bind(this);

    // Add event listeners
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this._onVisibilityChange);
        window.addEventListener('resize', this._onResize);
    }
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
    if (!this._visible) {
      this.fpsSamples.length = 0;
      this._upgradeStreak = 0;
      this._downgradeStreak = 0;
      this.lastFrameStart = performance.now();
      this.lastFrameEnd = performance.now();
    }
  }

  _onResize() {
    // Can be extended to adjust quality on resize
  }

  _onFrameStart() {
    // Hook for frame start - can be extended
  }

  _onFrame() {
    // Hook for mid-frame - can be extended
  }

  _onFrameEnd() {
    // Hook for frame end - can be extended
  }

  beginFrame() {
    this.lastFrameStart = performance.now();
    this._onFrameStart();
  }

  endFrame() {
    if (!this._visible) return;

    const now = performance.now();
    const dt = now - this.lastFrameStart || 16.67;
    const fps = 1000 / dt;

    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > this.maxSamples) {
      this.fpsSamples.shift();
    }

    this.frameCount++;
    if (this.frameCount % this.config.adjustIntervalFrames === 0) {
      this._evaluateQuality();
    }

    this.lastFrameEnd = now;
    this._onFrameEnd();
  }

  _averageFPS() {
    if (this.fpsSamples.length === 0) return this.config.targetFPS;
    const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
    return sum / this.fpsSamples.length;
  }

  _evaluateQuality() {
    const avgFPS = this._averageFPS();
    const { upgradeFPSThreshold, downgradeFPSThreshold } = this.config;
    const upgradeStreakRequired = this.config.upgradeStreakRequired ?? 2;
    const downgradeStreakRequired = this.config.downgradeStreakRequired ?? 1;

    const order = ['low', 'medium', 'high'];

    const index = order.indexOf(this.currentLevel);

    if (avgFPS < downgradeFPSThreshold && index > 0) {
      this._downgradeStreak++;
      this._upgradeStreak = 0;
      if (this._downgradeStreak >= downgradeStreakRequired) {
        this.currentLevel = order[index - 1];
        this._downgradeStreak = 0;
      }
      return;
    }

    if (avgFPS > upgradeFPSThreshold && index < order.length - 1) {
      this._upgradeStreak++;
      this._downgradeStreak = 0;
      if (this._upgradeStreak >= upgradeStreakRequired) {
        this.currentLevel = order[index + 1];
        this._upgradeStreak = 0;
      }
      return;
    }

    this._upgradeStreak = 0;
    this._downgradeStreak = 0;
  }

  getSettings() {
    const levelConfig = this.qualityLevels[this.currentLevel] || this.qualityLevels.high;
    return {
      level: this.currentLevel,
      ...levelConfig
    };
  }

  destroy() {
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        window.removeEventListener('resize', this._onResize);
    }
  }
}

import { 
  SimplexNoise, Math4D, 
  noise2D, noise3D, noise4D, 
  fbm2D, fbm3D, 
  map, clamp, smoothstep, lerp, inverseLerp, remap 
} from '../systems/math/jazer-math.js';

// Re-export math for convenience
export { 
  SimplexNoise, Math4D, 
  noise2D, noise3D, noise4D, 
  fbm2D, fbm3D, 
  map, clamp, smoothstep, lerp, inverseLerp, remap 
};
