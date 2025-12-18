// jazer-background-engine.js
// JaZeR Background Engine
// Canvas + WebGL neon tunnel backgrounds with adaptive quality


// ---------------------------------------------------------
// CONFIG: Global quality + performance settings
// ---------------------------------------------------------
export const CONFIG = {
  targetFPS: 120,
  minFPS: 60,
  maxPixelRatio: 5.0,
  baseResolutionScale: 1.0,
  maxEntities: 239,
  maxResolutionScale: 1.0,
  minResolutionScale: 0.6,
  maxQualityLevel: 'high',
  minQualityLevel: 'low',

  qualityLevels: {
    low: { resolutionScale: 0.6 * 0.9, maxEntities: 60 },
    medium: { resolutionScale: 0.85 * 0.9, maxEntities: 120 },
    high: { resolutionScale: 1.0 * 0.9, maxEntities: 200 },
    max: { resolutionScale: 1.0 * 0.9, maxEntities: 239 }
  },
  adjustIntervalFrames: 120,
  upgradeFPSThreshold: 120 * 1.1,
  downgradeFPSThreshold: 60 * 0.9
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

    // Bind methods
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onResize = this._onResize.bind(this);

    // Add event listeners
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('resize', this._onResize);
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
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

    // Support 'max' quality level if it exists
    const order = ['low', 'medium', 'high'];
    if (this.qualityLevels.max) order.push('max');

    const index = order.indexOf(this.currentLevel);

    if (avgFPS < downgradeFPSThreshold && index > 0) {
      this.currentLevel = order[index - 1];
    } else if (avgFPS > upgradeFPSThreshold && index < order.length - 1) {
      this.currentLevel = order[index + 1];
    }
  }

  getSettings() {
    const levelConfig = this.qualityLevels[this.currentLevel] || this.qualityLevels.high;
    return {
      level: this.currentLevel,
      ...levelConfig
    };
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('resize', this._onResize);
  }
}

// ---------------------------------------------------------
// SIMPLEX NOISE: Fast, high-quality procedural noise
// Based on Stefan Gustavson's simplex noise implementation
// ---------------------------------------------------------
export class SimplexNoise {
  constructor(seed = Math.random() * 65536 * 65536) {
    this.p = new Uint8Array(256 * 256);
    this.perm = new Uint8Array(512 * 256);
    this.permMod12 = new Uint8Array(512 * 256);

    // Initialize permutation table with seed
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Shuffle using seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }

    // Extend to 512 for wraparound
    for (let i = 0; i < 512 * 256; i++) {
      this.perm[i] = this.p[i & 255 * 256];
      this.permMod12[i] = this.perm[i] % 12 * 256;
    }

    // Gradient vectors for 2D, 3D, 4D
    this.grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, 1, -1, 1, 0, -1, -1, 1, 0, -1,
      -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1, -1, -1, 0, -1,
      1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
    ]);

    // Simplex skewing constants for 2D, 3D, 4D noise
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;
    this.F3 = 1 / 3;
    this.G3 = 1 / 6;
    this.F4 = (Math.sqrt(5) - 1) / 4;
    this.G4 = (5 - Math.sqrt(5)) / 20;

    // Gradient vectors for 4D noise
    this.grad4 = new Float32Array([
      0, 1, 1, 1,  0, 1, 1, -1,  0, 1, -1, 1,  0, 1, -1, -1,
      0, -1, 1, 1,  0, -1, 1, -1,  0, -1, -1, 1,  0, -1, -1, -1,
      1, 0, 1, 1,  1, 0, 1, -1,  1, 0, -1, 1,  1, 0, -1, -1,
      -1, 0, 1, 1,  -1, 0, 1, -1,  -1, 0, -1, 1,  -1, 0, -1, -1,
      1, 1, 0, 1,  1, 1, 0, -1,  1, -1, 0, 1,  1, -1, 0, -1,
      -1, 1, 0, 1,  -1, 1, 0, -1,  -1, -1, 0, 1,  -1, -1, 0, -1,
      1, 1, 1, 0,  1, 1, -1, 0,  1, -1, 1, 0,  1, -1, -1, 0,
      -1, 1, 1, 0,  -1, 1, -1, 0,  -1, -1, 1, 0,  -1, -1, -1, 0
    ]);
  }

  noise2D(x, y) {
    const { perm, permMod12, grad3, F2, G2 } = this;
    let n0, n1, n2;
    let i1, j1;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj]] * 3;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  noise3D(x, y, z) {
    const { perm, permMod12, grad3, F3, G3 } = this;
    let n0, n1, n2, n3;
    let i1, j1, k1, i2, j2, k2;
    let t0, t1, t2, t3;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;

    t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
    }

    t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
    }

    t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
    }

    t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else {
      t3 *= t3;
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }

  noise4D(x, y, z, w) {
    const { perm, grad4, F4, G4 } = this;
    let n0, n1, n2, n3, n4;

    const s = (x + y + z + w) * F4;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const l = Math.floor(w + s);
    const t = (i + j + k + l) * G4;
    const X0 = i - t, Y0 = j - t, Z0 = k - t, W0 = l - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0, w0 = w - W0;

    let rankx = 0, ranky = 0, rankz = 0, rankw = 0;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;

    const i1 = rankx >= 3 ? 1 : 0, j1 = ranky >= 3 ? 1 : 0;
    const k1 = rankz >= 3 ? 1 : 0, l1 = rankw >= 3 ? 1 : 0;
    const i2 = rankx >= 2 ? 1 : 0, j2 = ranky >= 2 ? 1 : 0;
    const k2 = rankz >= 2 ? 1 : 0, l2 = rankw >= 2 ? 1 : 0;
    const i3 = rankx >= 1 ? 1 : 0, j3 = ranky >= 1 ? 1 : 0;
    const k3 = rankz >= 1 ? 1 : 0, l3 = rankw >= 1 ? 1 : 0;
    const i4 = rankx >= 0 ? 1 : 0, j4 = ranky >= 0 ? 1 : 0;
    const k4 = rankz >= 0 ? 1 : 0, l4 = rankw >= 0 ? 1 : 0;
    const i5 = rankx >= -1 ? 1 : 0, j5 = ranky >= -1 ? 1 : 0;
    const k5 = rankz >= -1 ? 1 : 0, l5 = rankw >= -1 ? 1 : 0;
    const i6 = rankx >= -2 ? 1 : 0, j6 = ranky >= -2 ? 1 : 0;
    const k6 = rankz >= -2 ? 1 : 0, l6 = rankw >= -2 ? 1 : 0;
    const i7 = rankx >= -3 ? 1 : 0, j7 = ranky >= -3 ? 1 : 0;
    const k7 = rankz >= -3 ? 1 : 0, l7 = rankw >= -3 ? 1 : 0;
    const i8 = rankx >= -4 ? 1 : 0, j8 = ranky >= -4 ? 1 : 0;
    const k8 = rankz >= -4 ? 1 : 0, l8 = rankw >= -4 ? 1 : 0;

    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2 * G4, y2 = y0 - j2 + 2 * G4, z2 = z0 - k2 + 2 * G4, w2 = w0 - l2 + 2 * G4;
    const x3 = x0 - i3 + 3 * G4, y3 = y0 - j3 + 3 * G4, z3 = z0 - k3 + 3 * G4, w3 = w0 - l3 + 3 * G4;
    const x4 = x0 - i4 + 4 * G4, y4 = y0 - j4 + 4 * G4, z4 = z0 - k4 + 4 * G4, w4 = w0 - l4 + 4 * G4;
    const x5 = x0 - i5 + 5 * G4, y5 = y0 - j5 + 5 * G4, z5 = z0 - k5 + 5 * G4, w5 = w0 - l5 + 5 * G4;
    const x6 = x0 - i6 + 6 * G4, y6 = y0 - j6 + 6 * G4, z6 = z0 - k6 + 6 * G4, w6 = w0 - l6 + 6 * G4;
    const x7 = x0 - i7 + 7 * G4, y7 = y0 - j7 + 7 * G4, z7 = z0 - k7 + 7 * G4, w7 = w0 - l7 + 7 * G4;
    const x8 = x0 - i8 + 8 * G4, y8 = y0 - j8 + 8 * G4, z8 = z0 - k8 + 8 * G4, w8 = w0 - l8 + 8 * G4;
    const x9 = x0 - 1 + 9 * G4, y9 = y0 - 1 + 9 * G4, z9 = z0 - 1 + 9 * G4, w9 = w0 - 1 + 9 * G4;

    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255;

    const dot4 = (gi, x, y, z, w) => grad4[gi] * x + grad4[gi + 1] * y + grad4[gi + 2] * z + grad4[gi + 3] * w;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
      n0 = t0 * t0 * dot4(gi0, x0, y0, z0, w0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
      n1 = t1 * t1 * dot4(gi1, x1, y1, z1, w1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
      n2 = t2 * t2 * dot4(gi2, x2, y2, z2, w2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
    if (t3 < 0) n3 = 0;
    else {
      t3 *= t3;
      const gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
      n3 = t3 * t3 * dot4(gi3, x3, y3, z3, w3);
    }

    let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
    if (t4 < 0) n4 = 0;
    else {
      t4 *= t4;
      const gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
      n4 = t4 * t4 * dot4(gi4, x4, y4, z4, w4);
    }

    return 27 * (n0 + n1 + n2 + n3 + n4);
  }
}

// Global simplex noise instance
const _simplex = new SimplexNoise();

// Convenience noise functions
export function noise2D(x, y) { return _simplex.noise2D(x, y); }
export function noise3D(x, y, z) { return _simplex.noise3D(x, y, z); }
export function noise4D(x, y, z, w) { return _simplex.noise4D(x, y, z, w); }

// Fractal Brownian Motion - layered noise for natural textures
export function fbm2D(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

export function fbm3D(x, y, z, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// ---------------------------------------------------------
// EASING FUNCTIONS: Smooth animation curves
// All functions take t in [0, 1] and return value in [0, 1]
// ---------------------------------------------------------
export const Easing = {
  // Linear
  linear: t => t,

  // Quadratic
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quartic
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // Quintic
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => 1 + (--t) * t * t * t * t,
  easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

  // Sinusoidal
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circular
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: t => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  // Elastic
  easeInElastic: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
  },
  easeOutElastic: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  easeInOutElastic: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2;
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1;
  },

  // Back (overshoot)
  easeInBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: t => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Bounce
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),
  easeInOutBounce: t => t < 0.5
    ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
    : (1 + Easing.easeOutBounce(2 * t - 1)) / 2
};

// ---------------------------------------------------------
// MOUSE TRACKER: Smooth mouse/touch position tracking
// ---------------------------------------------------------
export class MouseTracker {
  constructor(options = {}) {
    this.smoothing = options.smoothing ?? 0.1;
    this.element = options.element ?? (typeof window !== 'undefined' ? window : null);

    // Raw position (normalized 0-1)
    this.x = 0.5;
    this.y = 0.5;

    // Smoothed position
    this.smoothX = 0.5;
    this.smoothY = 0.5;

    // Centered position (-1 to 1)
    this.centeredX = 0;
    this.centeredY = 0;

    // Velocity
    this.velocityX = 0;
    this.velocityY = 0;

    // State
    this.isPressed = false;
    this.isInside = false;

    // Previous values for velocity
    this._prevX = 0.5;
    this._prevY = 0.5;
    this._lastTime = performance.now();

    // Bind handlers
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    if (typeof window !== 'undefined') {
      this._attachListeners();
    }
  }

  _attachListeners() {
    const el = this.element;
    el.addEventListener('mousemove', this._onMouseMove, { passive: true });
    el.addEventListener('mousedown', this._onMouseDown, { passive: true });
    el.addEventListener('mouseup', this._onMouseUp, { passive: true });
    el.addEventListener('mouseenter', this._onMouseEnter, { passive: true });
    el.addEventListener('mouseleave', this._onMouseLeave, { passive: true });
    el.addEventListener('touchstart', this._onTouchStart, { passive: true });
    el.addEventListener('touchmove', this._onTouchMove, { passive: true });
    el.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  _onMouseMove(e) {
    this.x = e.clientX / window.innerWidth;
    this.y = e.clientY / window.innerHeight;
  }

  _onMouseDown() { this.isPressed = true; }
  _onMouseUp() { this.isPressed = false; }
  _onMouseEnter() { this.isInside = true; }
  _onMouseLeave() { this.isInside = false; }

  _onTouchStart(e) {
    this.isPressed = true;
    if (e.touches.length > 0) {
      this.x = e.touches[0].clientX / window.innerWidth;
      this.y = e.touches[0].clientY / window.innerHeight;
    }
  }

  _onTouchMove(e) {
    if (e.touches.length > 0) {
      this.x = e.touches[0].clientX / window.innerWidth;
      this.y = e.touches[0].clientY / window.innerHeight;
    }
  }

  _onTouchEnd() { this.isPressed = false; }

  update(dt) {
    const now = performance.now();
    const elapsed = (now - this._lastTime) / 1000;
    this._lastTime = now;

    // Smooth interpolation
    const factor = 1 - Math.pow(1 - this.smoothing, elapsed * 60);
    this.smoothX += (this.x - this.smoothX) * factor;
    this.smoothY += (this.y - this.smoothY) * factor;

    // Centered coordinates
    this.centeredX = this.smoothX * 2 - 1;
    this.centeredY = this.smoothY * 2 - 1;

    // Velocity calculation
    if (elapsed > 0) {
      this.velocityX = (this.x - this._prevX) / elapsed;
      this.velocityY = (this.y - this._prevY) / elapsed;
    }

    this._prevX = this.x;
    this._prevY = this.y;
  }

  destroy() {
    if (typeof window === 'undefined') return;
    const el = this.element;
    el.removeEventListener('mousemove', this._onMouseMove);
    el.removeEventListener('mousedown', this._onMouseDown);
    el.removeEventListener('mouseup', this._onMouseUp);
    el.removeEventListener('mouseenter', this._onMouseEnter);
    el.removeEventListener('mouseleave', this._onMouseLeave);
    el.removeEventListener('touchstart', this._onTouchStart);
    el.removeEventListener('touchmove', this._onTouchMove);
    el.removeEventListener('touchend', this._onTouchEnd);
  }
}

// Global mouse tracker instance
export const mouse = new MouseTracker();

// ---------------------------------------------------------
// COLOR PALETTES: Curated color themes
// ---------------------------------------------------------
export const ColorPalettes = {
  jazer: ['#00f5ff', '#ff2aff', '#b37cff', '#ffd86b'],
  cyberpunk: ['#ff0055', '#00ffff', '#ff00ff', '#ffff00'],
  ocean: ['#0077be', '#00a8e8', '#00d4ff', '#89cff0'],
  sunset: ['#ff6b35', '#f7c59f', '#efa0cd', '#7d5ba6'],
  matrix: ['#00ff00', '#00cc00', '#009900', '#006600'],
  vapor: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
  fire: ['#ff0000', '#ff5500', '#ff9900', '#ffcc00'],
  ice: ['#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4'],
  galaxy: ['#4c1d95', '#7c3aed', '#a78bfa', '#f472b6'],
  neon: ['#39ff14', '#ff073a', '#ff61d8', '#00f0ff'],
  midnight: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
  gold: ['#ffd700', '#daa520', '#b8860b', '#cd7f32'],
  aurora: ['#00ff87', '#60efff', '#ff00ff', '#ffff00'],
  blood: ['#8b0000', '#dc143c', '#ff4500', '#ff6347'],
  forest: ['#228b22', '#32cd32', '#90ee90', '#006400'],
  synthwave: ['#ff00ff', '#00ffff', '#ff6ec7', '#9d00ff'],
  // New enhanced palettes
  cosmic: ['#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff', '#f72585'],
  plasma: ['#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
  ethereal: ['#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#00b4d8'],
  inferno: ['#ff4800', '#ff5400', '#ff6000', '#ff6d00', '#ff7900'],
  nebula: ['#3a0ca3', '#4361ee', '#4895ef', '#4cc9f0', '#7b2cbf'],
  sacred: ['#ffd700', '#ffffff', '#00f5ff', '#ff2aff', '#b37cff'],
  quantum: ['#00f5ff', '#00d4ff', '#00b4d8', '#0096c7', '#0077b6'],
  void: ['#10002b', '#240046', '#3c096c', '#5a189a', '#7b2cbf']
};

// Get random palette
export function getRandomPalette() {
  const keys = Object.keys(ColorPalettes);
  return ColorPalettes[keys[Math.floor(Math.random() * keys.length)]];
}

// Get color from palette by index (wraps around)
export function getPaletteColor(paletteName, index) {
  const palette = ColorPalettes[paletteName] || ColorPalettes.jazer;
  return palette[index % palette.length];
}

// Color conversion utilities
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

export function lerpColor(color1, color2, t) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

// Cycle through palette colors over time
export function cycleColor(palette, time, speed = 1) {
  const colors = typeof palette === 'string' ? ColorPalettes[palette] : palette;
  const len = colors.length;
  const t = (time * speed) % len;
  const i = Math.floor(t);
  const f = t - i;
  return lerpColor(colors[i % len], colors[(i + 1) % len], f);
}

// ---------------------------------------------------------
// MATH UTILITIES: Extended helper functions
// ---------------------------------------------------------
export function map(value, inMin, inMax, outMin, outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function fract(x) {
  return x - Math.floor(x);
}

export function mod(x, y) {
  return x - y * Math.floor(x / y);
}

export function mix(a, b, t) {
  return a + (b - a) * t;
}

export function step(edge, x) {
  return x < edge ? 0 : 1;
}

export function pulse(a, b, x) {
  return step(a, x) - step(b, x);
}

export function inverseLerp(a, b, value) {
  return (value - a) / (b - a);
}

export function remap(value, inMin, inMax, outMin, outMax) {
  return mix(outMin, outMax, inverseLerp(inMin, inMax, value));
}

export function wrap(value, min, max) {
  const range = max - min;
  return min + mod(value - min, range);
}

export function pingPong(t, length) {
  const l2 = length * 2;
  const m = mod(t, l2);
  return m <= length ? m : l2 - m;
}

export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

export function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function normalize2D(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

export function normalize3D(x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

export function dot2D(x1, y1, x2, y2) {
  return x1 * x2 + y1 * y2;
}

export function dot3D(x1, y1, z1, x2, y2, z2) {
  return x1 * x2 + y1 * y2 + z1 * z2;
}

// ---------------------------------------------------------
// MOTION TRAIL BUFFER: Temporal accumulation for motion blur
// ---------------------------------------------------------
export class MotionTrailBuffer {
  constructor(width, height, options = {}) {
    this.fadeAmount = options.fadeAmount ?? 0.08;
    this.blendMode = options.blendMode ?? 'source-over';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.setSize(width, height);
  }

  setSize(width, height) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  fade(dtMs = 16.67) {
    this.ctx.globalCompositeOperation = 'source-over';
    const dt = dtMs / 16.67; // 1 = baseline 60fps frame
    const fade = 1 - Math.pow(1 - this.fadeAmount, dt);
    // keep same "feel" at 30 / 144 Hz

    this.ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  draw(sourceCanvas) {
    this.ctx.globalCompositeOperation = this.blendMode;
    this.ctx.drawImage(sourceCanvas, 0, 0);
  }

  composite(targetCtx, x = 0, y = 0) {
    targetCtx.drawImage(this.canvas, x, y);
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

// ---------------------------------------------------------
// PROCEDURAL BLOOM: Multi-pass glow for Canvas 2D
// ---------------------------------------------------------
export class ProceduralBloom {
  constructor(width, height, options = {}) {
    this.intensity = options.intensity ?? 0.8;
    this.radius = options.radius ?? 8;
    this.passes = options.passes ?? 3;
    this.threshold = options.threshold ?? 0.3;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');

    this.setSize(width, height);
  }

  setSize(width, height) {
    // Use lower resolution for bloom (performance)
    this.width = Math.max(1, Math.floor(width / 2));
    this.height = Math.max(1, Math.floor(height / 2));
    this.fullWidth = width;
    this.fullHeight = height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.tempCanvas.width = this.width;
    this.tempCanvas.height = this.height;
  }

  apply(sourceCanvas, targetCtx) {
    // Downscale source to bloom buffer
    this.ctx.drawImage(sourceCanvas, 0, 0, this.width, this.height);

    // Apply multiple blur passes
    for (let i = 0; i < this.passes; i++) {
      const blurAmount = this.radius * (1 + i * 0.5);

      // Horizontal blur
      this.tempCtx.filter = `blur(${blurAmount}px)`;
      this.tempCtx.drawImage(this.canvas, 0, 0);

      // Vertical blur (copy back)
      this.ctx.filter = `blur(${blurAmount}px)`;
      this.ctx.drawImage(this.tempCanvas, 0, 0);
      this.ctx.filter = 'none';
      this.tempCtx.filter = 'none';
    }

    // Composite bloom onto target
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = this.intensity;
    targetCtx.drawImage(this.canvas, 0, 0, this.fullWidth, this.fullHeight);
    targetCtx.restore();
  }

  updateConfig(options) {
    if (options.intensity !== undefined) this.intensity = options.intensity;
    if (options.radius !== undefined) this.radius = options.radius;
    if (options.passes !== undefined) this.passes = options.passes;
  }
}

// ---------------------------------------------------------
// SACRED GEOMETRY: Procedural geometry drawing utilities
// ---------------------------------------------------------
export const SacredGeometry = {
  // Draw Flower of Life pattern
  flowerOfLife(ctx, cx, cy, radius, rings = 3, options = {}) {
    const color = options.color ?? '#00f5ff';
    const lineWidth = options.lineWidth ?? 1.5;
    const alpha = options.alpha ?? 0.6;
    const rotation = options.rotation ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;

    const r = radius / rings;
    const points = [];

    // Generate center points spiral
    for (let ring = 0; ring <= rings; ring++) {
      const ringRadius = ring * r;
      const circumference = 2 * Math.PI * ringRadius;
      const numCircles = ring === 0 ? 1 : Math.max(6, Math.round(circumference / r));

      for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        points.push({ x, y });
      }
    }

    // Draw circles at each point
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
  },

  // Draw Metatron's Cube
  metatronsCube(ctx, cx, cy, radius, options = {}) {
    const color = options.color ?? '#ff2aff';
    const lineWidth = options.lineWidth ?? 1;
    const alpha = options.alpha ?? 0.5;
    const rotation = options.rotation ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;

    // 13 circles of Metatron's Cube
    const innerR = radius * 0.2;
    const outerR = radius * 0.6;

    // Center
    const points = [{ x: 0, y: 0 }];

    // Inner hexagon
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * innerR,
        y: Math.sin(angle) * innerR
      });
    }

    // Outer hexagon
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * outerR,
        y: Math.sin(angle) * outerR
      });
    }

    // Draw circles
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, innerR, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Connect all points
    ctx.globalAlpha = alpha * 0.5;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }

    ctx.restore();
  },

  // Draw Sri Yantra (simplified)
  sriYantra(ctx, cx, cy, radius, options = {}) {
    const color = options.color ?? '#ffd86b';
    const lineWidth = options.lineWidth ?? 1;
    const alpha = options.alpha ?? 0.6;
    const rotation = options.rotation ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;

    // Draw interlocking triangles
    const drawTriangle = (r, up) => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + (up ? -Math.PI / 2 : Math.PI / 2);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    // Multiple nested triangles
    for (let i = 0; i < 5; i++) {
      const r = radius * (1 - i * 0.15);
      drawTriangle(r, i % 2 === 0);
    }

    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  },

  // Draw Golden Spiral
  goldenSpiral(ctx, cx, cy, radius, turns = 4, options = {}) {
    const color = options.color ?? '#b37cff';
    const lineWidth = options.lineWidth ?? 2;
    const alpha = options.alpha ?? 0.7;
    const rotation = options.rotation ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;

    const phi = 1.618033988749895; // Golden ratio
    const points = 200 * turns;

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * turns * Math.PI * 2;
      const r = radius * Math.pow(phi, angle / (Math.PI * 2)) / Math.pow(phi, turns);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  },

  // Draw Torus pattern (2D representation)
  torusKnot(ctx, cx, cy, radius, p = 2, q = 3, options = {}) {
    const color = options.color ?? '#00f5ff';
    const lineWidth = options.lineWidth ?? 1.5;
    const alpha = options.alpha ?? 0.6;
    const rotation = options.rotation ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;

    const points = 500;
    ctx.beginPath();

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 2 * q;
      const r = radius * (0.5 + 0.3 * Math.cos(p * t));
      const x = r * Math.cos(t);
      const y = r * Math.sin(t);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.restore();
  }
};

// ---------------------------------------------------------
// HDR COLOR PROCESSING: Enhanced color manipulation
// ---------------------------------------------------------
export function applyHDR(r, g, b, options = {}) {
  const exposure = options.exposure ?? 1.2;
  const saturation = options.saturation ?? 1.3;
  const contrast = options.contrast ?? 1.1;
  const gamma = options.gamma ?? 0.95;

  // Apply exposure
  r *= exposure;
  g *= exposure;
  b *= exposure;

  // Convert to HSL for saturation adjustment
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    // Boost saturation
    const newS = Math.min(1, s * saturation);
    const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS;
    const p = 2 * l - q;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let h;
    switch (max) {
      case r / 255: h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6; break;
      case g / 255: h = ((b - r) / 255 / d + 2) / 6; break;
      case b / 255: h = ((r - g) / 255 / d + 4) / 6; break;
    }

    r = hue2rgb(p, q, h + 1 / 3) * 255;
    g = hue2rgb(p, q, h) * 255;
    b = hue2rgb(p, q, h - 1 / 3) * 255;
  }

  // Apply contrast
  r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
  g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
  b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

  // Apply gamma correction
  r = Math.pow(Math.max(0, r / 255), gamma) * 255;
  g = Math.pow(Math.max(0, g / 255), gamma) * 255;
  b = Math.pow(Math.max(0, b / 255), gamma) * 255;

  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255))
  };
}

// Domain warping for organic distortion
export function domainWarp(x, y, time, scale = 1, strength = 0.5) {
  const warpX = fbm2D(x * scale, y * scale + time * 0.1, 4) * strength;
  const warpY = fbm2D(x * scale + 100, y * scale + time * 0.1, 4) * strength;
  return {
    x: x + warpX,
    y: y + warpY
  };
}

// ---------------------------------------------------------
// Internal utility: Neon palette + helpers (using new system)
// ---------------------------------------------------------
const JAZER_COLORS = ColorPalettes.jazer;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

// ---------------------------------------------------------
// CanvasNeonTunnelAgent: Enhanced 2D neon vortex with multi-layer effects
// ---------------------------------------------------------
class CanvasNeonTunnelAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;

    // Particle layers
    this.primaryParticles = [];
    this.detailParticles = [];
    this.glowParticles = [];

    this.time = 0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;
    this.currentMaxEntities = config.qualityLevels.high.maxEntities;

    // Enhanced effects
    this.trailBuffer = null;
    this.bloom = null;
    this.geometryRotation = 0;
    this.colorPhase = 0;
    this.palette = ColorPalettes.jazer;

    // Offscreen canvas for compositing
    this.offscreen = document.createElement('canvas');
    this.offCtx = this.offscreen.getContext('2d');

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
    this._initParticles();
    this._initEffects();
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale;

    const width = rect.width * this.pixelRatio * this.resolutionScale;
    const height = rect.height * this.pixelRatio * this.resolutionScale;

    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));
    this.offscreen.width = this.canvas.width;
    this.offscreen.height = this.canvas.height;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);
    this.offCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.offCtx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);

    // Resize effects
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.trailBuffer) this.trailBuffer.setSize(w, h);
    if (this.bloom) this.bloom.setSize(w, h);
  }

  _initEffects() {
    const w = this.canvas.width || 1920;
    const h = this.canvas.height || 1080;

    this.trailBuffer = new MotionTrailBuffer(w, h, {
      fadeAmount: 0.04,
      blendMode: 'lighter'
    });

    this.bloom = new ProceduralBloom(w, h, {
      intensity: 0.6,
      radius: 12,
      passes: 3
    });
  }

  _initParticles() {
    const settings = this.quality.getSettings();
    this.currentMaxEntities = settings.maxEntities;

    this.primaryParticles = [];
    this.detailParticles = [];
    this.glowParticles = [];

    // Primary particles - main visual elements
    const primaryCount = Math.floor(this.currentMaxEntities * 0.4);
    for (let i = 0; i < primaryCount; i++) {
      this.primaryParticles.push(this._createPrimaryParticle(i / primaryCount));
    }

    // Detail particles - smaller, faster
    const detailCount = Math.floor(this.currentMaxEntities * 0.5);
    for (let i = 0; i < detailCount; i++) {
      this.detailParticles.push(this._createDetailParticle(i / detailCount));
    }

    // Glow particles - large, soft, atmospheric
    const glowCount = Math.floor(this.currentMaxEntities * 0.1);
    for (let i = 0; i < glowCount; i++) {
      this.glowParticles.push(this._createGlowParticle(i / glowCount));
    }
  }

  _createPrimaryParticle(seed) {
    return {
      type: 'primary',
      baseRadius: lerp(0.15, 0.65, Math.pow(Math.random(), 0.5)),
      radialOffset: rand(-0.1, 0.1),
      angle: rand(0, Math.PI * 2),
      speed: lerp(0.08, 0.35, Math.random()),
      radialDrift: lerp(-0.08, 0.08, Math.random()),
      size: lerp(3, 8, Math.random()),
      color: pick(this.palette),
      noiseOffset: seed * 1000,
      trailLength: lerp(0.1, 0.25, Math.random()),
      pulsePhase: rand(0, Math.PI * 2),
      pulseSpeed: lerp(0.5, 2, Math.random())
    };
  }

  _createDetailParticle(seed) {
    return {
      type: 'detail',
      baseRadius: lerp(0.1, 0.8, Math.random()),
      radialOffset: rand(-0.05, 0.05),
      angle: rand(0, Math.PI * 2),
      speed: lerp(0.15, 0.6, Math.random()),
      radialDrift: lerp(-0.15, 0.15, Math.random()),
      size: lerp(1, 3, Math.random()),
      color: pick(this.palette),
      noiseOffset: seed * 500 + 500,
      twinkle: Math.random() > 0.7,
      twinkleSpeed: lerp(2, 8, Math.random())
    };
  }

  _createGlowParticle(seed) {
    return {
      type: 'glow',
      baseRadius: lerp(0.2, 0.5, Math.random()),
      radialOffset: rand(-0.15, 0.15),
      angle: rand(0, Math.PI * 2),
      speed: lerp(0.02, 0.08, Math.random()),
      size: lerp(30, 80, Math.random()),
      color: pick(this.palette),
      noiseOffset: seed * 2000,
      alpha: lerp(0.03, 0.08, Math.random())
    };
  }

  _syncWithQuality() {
    const settings = this.quality.getSettings();
    const desired = settings.maxEntities;

    if (desired === this.currentMaxEntities) return;

    this._initParticles();
    this._onResize();
  }

  _drawBackground() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    // Deep space background with subtle gradient
    const bgGradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    bgGradient.addColorStop(0, 'rgba(8, 10, 20, 0.15)');
    bgGradient.addColorStop(0.5, 'rgba(5, 6, 15, 0.2)');
    bgGradient.addColorStop(1, 'rgba(2, 3, 8, 0.25)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Animated color gradient overlay
    const hueShift = (this.time * 0.00005) % 1;
    const colors = this.palette;
    const gradient = ctx.createLinearGradient(
      w * 0.5 + Math.cos(this.time * 0.0001) * w * 0.3,
      0,
      w * 0.5 + Math.sin(this.time * 0.00015) * w * 0.3,
      h
    );
    gradient.addColorStop(0.0, hexToRgba(colors[0], 0.08));
    gradient.addColorStop(0.33, hexToRgba(colors[1], 0.1));
    gradient.addColorStop(0.66, hexToRgba(colors[2], 0.08));
    gradient.addColorStop(1.0, hexToRgba(colors[3] || colors[0], 0.06));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid with wave distortion
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
    ctx.lineWidth = 0.5;

    const spacing = 60;
    const waveAmp = 3;
    const waveFreq = 0.02;

    ctx.beginPath();
    for (let x = 0; x < w + spacing; x += spacing) {
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 10) {
        const waveX = x + Math.sin(y * waveFreq + this.time * 0.001) * waveAmp;
        ctx.lineTo(waveX, y);
      }
    }
    for (let y = 0; y < h + spacing; y += spacing) {
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 10) {
        const waveY = y + Math.sin(x * waveFreq + this.time * 0.0008) * waveAmp;
        ctx.lineTo(x, waveY);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawGlowParticles() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;

    for (const p of this.glowParticles) {
      // Update position
      p.angle += p.speed * 0.12;
      const noiseVal = noise2D(p.noiseOffset + this.time * 0.0001, p.angle);
      const radius = (p.baseRadius + p.radialOffset * noiseVal) * Math.min(w, h) * 0.5;

      const x = cx + Math.cos(p.angle) * radius;
      const y = cy + Math.sin(p.angle) * radius;

      // Draw soft glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
      gradient.addColorStop(0, hexToRgba(p.color, p.alpha));
      gradient.addColorStop(0.5, hexToRgba(p.color, p.alpha * 0.3));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPrimaryParticles() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;

    for (const p of this.primaryParticles) {
      // Update
      p.angle += p.speed * 0.12;
      p.baseRadius += p.radialDrift * 0.015;
      if (p.baseRadius > 1.0) p.baseRadius = 0.15;
      if (p.baseRadius < 0.1) p.baseRadius = 0.85;

      const pulse = Math.sin(this.time * 0.002 * p.pulseSpeed + p.pulsePhase) * 0.5 + 0.5;
      const noiseVal = noise2D(p.noiseOffset, this.time * 0.0003);
      const radius = (p.baseRadius + p.radialOffset * noiseVal) * Math.min(w, h) * 0.5;

      const x = cx + Math.cos(p.angle) * radius;
      const y = cy + Math.sin(p.angle) * radius;

      // Trail
      const trailLen = radius * p.trailLength;
      const trailAngle = p.angle - p.speed * 0.5;
      const tx = cx + Math.cos(trailAngle) * radius;
      const ty = cy + Math.sin(trailAngle) * radius;

      // Trail gradient
      const trailGrad = ctx.createLinearGradient(tx, ty, x, y);
      trailGrad.addColorStop(0, 'rgba(0,0,0,0)');
      trailGrad.addColorStop(0.2, hexToRgba(p.color, 0.3));
      trailGrad.addColorStop(0.6, hexToRgba(p.color, 0.7));
      trailGrad.addColorStop(1, p.color);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = p.size * (0.8 + pulse * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      // Core glow
      const coreSize = p.size * (0.6 + pulse * 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bright center
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.4 + pulse * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, coreSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawDetailParticles() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;

    for (const p of this.detailParticles) {
      // Update
      p.angle += p.speed * 0.12;
      p.baseRadius += p.radialDrift * 0.018;
      if (p.baseRadius > 1.1) p.baseRadius = 0.1;
      if (p.baseRadius < 0.05) p.baseRadius = 0.95;

      const noiseVal = noise2D(p.noiseOffset, this.time * 0.0005);
      const radius = (p.baseRadius + p.radialOffset * noiseVal) * Math.min(w, h) * 0.5;

      const x = cx + Math.cos(p.angle) * radius;
      const y = cy + Math.sin(p.angle) * radius;

      // Twinkle effect
      let alpha = 1;
      if (p.twinkle) {
        alpha = 0.3 + Math.sin(this.time * 0.003 * p.twinkleSpeed) * 0.7;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawSacredGeometry() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);

    // Slowly rotating sacred geometry overlay
    this.geometryRotation += 0.0003;

    // Flower of Life - outer
    SacredGeometry.flowerOfLife(ctx, cx, cy, minDim * 0.4, 2, {
      color: this.palette[0],
      lineWidth: 1,
      alpha: 0.12,
      rotation: this.geometryRotation
    });

    // Metatron's Cube - center
    SacredGeometry.metatronsCube(ctx, cx, cy, minDim * 0.25, {
      color: this.palette[1],
      lineWidth: 0.8,
      alpha: 0.08,
      rotation: -this.geometryRotation * 0.7
    });

    // Golden Spiral - subtle
    SacredGeometry.goldenSpiral(ctx, cx, cy, minDim * 0.3, 3, {
      color: this.palette[2],
      lineWidth: 1.5,
      alpha: 0.06,
      rotation: this.geometryRotation * 0.5
    });
  }

  _drawVignette() {
    const { offCtx: ctx, offscreen: canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    const vignette = ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.2,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.65)');

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt * 16.67; // Convert to ms-like units

    this._syncWithQuality();

    // Slowly cycle through palettes
    this.colorPhase += dt * 0.001;
    const paletteKeys = Object.keys(ColorPalettes);
    const paletteIndex = Math.floor(this.colorPhase) % paletteKeys.length;
    // Keep jazer as default, occasionally shift
    if (Math.random() > 0.9999) {
      this.palette = ColorPalettes[paletteKeys[paletteIndex]] || ColorPalettes.jazer;
    }

    // Clear offscreen
    this.offCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.offCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
    this.offCtx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);

    // Draw layers
    this._drawBackground();
    this._drawSacredGeometry();
    this._drawGlowParticles();
    this._drawPrimaryParticles();
    this._drawDetailParticles();
    this._drawVignette();

    // Apply trail buffer for motion blur
    this.trailBuffer.fade();
    this.trailBuffer.draw(this.offscreen);

    // Composite to main canvas
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw trail buffer first (motion blur)
    this.ctx.globalAlpha = 0.4;
    this.trailBuffer.composite(this.ctx, 0, 0);

    // Draw current frame
    this.ctx.globalAlpha = 1;
    this.ctx.drawImage(this.offscreen, 0, 0);

    // Apply bloom
    this.bloom.apply(this.canvas, this.ctx);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.trailBuffer = null;
    this.bloom = null;
  }
}

// Helper function for hex to rgba
function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// ---------------------------------------------------------
// WebGLThreeTunnelAgent: 3D neon tunnel using Three.js
// ---------------------------------------------------------
class WebGLThreeTunnelAgent {
  constructor(canvas, config, qualityController) {
    if (typeof window === 'undefined' || !window.THREE) {
      throw new Error('[JaZeR] THREE not found on window. Include three.js before using webglTunnel.');
    }

    this.canvas = canvas;
    this.config = config;
    this.quality = qualityController;
    this.THREE = window.THREE;

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;

    this.renderer = new this.THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });

    this.scene = new this.THREE.Scene();
    this.camera = new this.THREE.PerspectiveCamera(70, 1, 0.1, 100);
    this.camera.position.z = 3.5;

    this.clock = new this.THREE.Clock();
    this.time = 0;

    this.tunnelGroup = new this.THREE.Group();
    this.scene.add(this.tunnelGroup);

    this.ringCount = 0;
    this.currentQualityLevel = null;

    this._setupScene();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
    this._rebuildTunnel();
  }

  _setupScene() {
    const { THREE } = this;

    this.scene.background = new THREE.Color(0x02030a);
    this.scene.fog = new THREE.FogExp2(0x02030a, 0.25);

    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    const colors = [0x00f5ff, 0xff2aff, 0xb37cff, 0xffd86b];
    this.rimLights = [];

    colors.forEach((c, i) => {
      const light = new THREE.PointLight(c, 2.6, 15, 1.4);
      const angle = (i / colors.length) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 1.5);
      this.scene.add(light);
      this.rimLights.push(light);
    });
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale;

    const width = rect.width || window.innerWidth || 1920;
    const height = rect.height || window.innerHeight || 1080;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(this.pixelRatio * this.resolutionScale);
    this.renderer.setSize(width, height, false);
  }

  _desiredRingCount() {
    const settings = this.quality.getSettings();
    const base = 16;
    const extra = Math.round((settings.maxEntities / 220) * 24); // up to ~40 rings
    return base + extra;
  }

  _rebuildTunnel() {
    const { THREE } = this;

    while (this.tunnelGroup.children.length > 0) {
      const child = this.tunnelGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const rings = this._desiredRingCount();
    this.ringCount = rings;

    const innerRadius = 1.4;
    const thickness = 0.24;
    const depthStep = 0.8;

    const tubularSegments = 80;
    const radialSegments = 12;

    for (let i = 0; i < rings; i++) {
      const t = i / rings;
      const color = new THREE.Color(pick(JAZER_COLORS));

      const geom = new THREE.TorusGeometry(
        innerRadius,
        thickness * (0.7 + 0.6 * Math.sin(t * Math.PI)),
        radialSegments,
        tubularSegments
      );

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(1.5),
        roughness: 0.2,
        metalness: 0.7,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = -i * depthStep;
      mesh.rotation.x = Math.PI / 2;
      this.tunnelGroup.add(mesh);
    }
  }

  _syncTunnelWithQuality() {
    const settings = this.quality.getSettings();
    const newLevel = settings.level;
    if (newLevel === this.currentQualityLevel) return;

    this.currentQualityLevel = newLevel;
    this._rebuildTunnel();
    this._onResize();
  }

  updateAndRender() {
    const dt = this.clock.getDelta();
    this.time += dt;

    this._syncTunnelWithQuality();

    const spinSpeed = 0.25;
    this.tunnelGroup.rotation.z += spinSpeed * dt;

    const depthSpeed = 6.0;
    const offset = (this.time * depthSpeed) % 0.8;

    const rings = this.tunnelGroup.children;
    for (let i = 0; i < rings.length; i++) {
      const mesh = rings[i];
      const baseIndex = i;
      mesh.position.z = -baseIndex * 0.8 + offset;
      if (mesh.position.z > 1.5) {
        const minZ = -this.ringCount * 0.8;
        mesh.position.z = minZ;
      }
    }

    const wobble = 0.24;
    this.camera.position.x = Math.sin(this.time * 0.4) * wobble;
    this.camera.position.y = Math.cos(this.time * 0.3) * wobble * 0.8;
    this.camera.lookAt(0, 0, -5);

    this.rimLights.forEach((light, i) => {
      const phase = this.time * (0.6 + i * 0.2);
      light.intensity = 1.8 + Math.sin(phase) * 0.8;
    });

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose && m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
  }
}

// ---------------------------------------------------------
// PlasmaFluidAgent: Organic flowing plasma effect (Canvas 2D)
// ---------------------------------------------------------
class PlasmaFluidAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;

    this.time = 0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;
    this.palette = ColorPalettes.plasma;

    // Plasma parameters
    this.scale = 0.008;
    this.speed = 0.0004;
    this.warpStrength = 0.3;

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
    this._initImageData();
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale * 0.5; // Lower res for performance

    const width = rect.width * this.pixelRatio * this.resolutionScale;
    const height = rect.height * this.pixelRatio * this.resolutionScale;

    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));

    this._initImageData();
  }

  _initImageData() {
    this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    this.data = this.imageData.data;
  }

  _getColor(t) {
    // Map t (0-1) to palette color with smooth interpolation
    t = ((t % 1) + 1) % 1;
    const len = this.palette.length;
    const scaled = t * len;
    const i = Math.floor(scaled);
    const f = scaled - i;

    const c1 = hexToRgb(this.palette[i % len]);
    const c2 = hexToRgb(this.palette[(i + 1) % len]);

    return {
      r: c1.r + (c2.r - c1.r) * f,
      g: c1.g + (c2.g - c1.g) * f,
      b: c1.b + (c2.b - c1.b) * f
    };
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt * 16.67;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.time * this.speed;
    const scale = this.scale;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Domain warping for organic flow
        const wx = x + fbm2D(x * scale * 0.5, y * scale * 0.5 + t, 3) * this.warpStrength * 100;
        const wy = y + fbm2D(x * scale * 0.5 + 100, y * scale * 0.5 + t, 3) * this.warpStrength * 100;

        // Multi-layer plasma
        let v = 0;
        v += Math.sin(wx * scale + t * 2);
        v += Math.sin((wy * scale + t) * 0.5);
        v += Math.sin((wx * scale + wy * scale + t * 1.5) * 0.5);
        v += fbm2D(wx * scale * 2, wy * scale * 2 + t * 0.5, 4);

        // Normalize to 0-1
        v = (v + 4) / 8;

        const color = this._getColor(v + t * 0.1);

        const i = (y * w + x) * 4;
        this.data[i] = color.r;
        this.data[i + 1] = color.g;
        this.data[i + 2] = color.b;
        this.data[i + 3] = 255;
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);

    // Add bloom-like glow overlay
    this.ctx.save();
    this.ctx.filter = 'blur(20px)';
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = 0.3;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }
}

// ---------------------------------------------------------
// FractalTunnelAgent: Infinite fractal zoom effect (Canvas 2D)
// ---------------------------------------------------------
class FractalTunnelAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;

    this.time = 0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;
    this.palette = ColorPalettes.cosmic;

    this.zoom = 1;
    this.rotation = 0;
    this.layers = 8;

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale;

    const width = rect.width * this.pixelRatio * this.resolutionScale;
    const height = rect.height * this.pixelRatio * this.resolutionScale;

    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);
  }

  _drawFractalLayer(depth, scale, rotation, alpha) {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);

    const color = this.palette[depth % this.palette.length];
    const sides = 6 + (depth % 3); // Vary polygon sides
    const size = minDim * scale * 0.4;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / scale;

    // Draw polygon
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner lines to center
    ctx.globalAlpha = alpha * 0.5;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
      ctx.stroke();
    }

    ctx.restore();
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt * 16.67;

    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    // Semi-transparent background for trails
    ctx.fillStyle = 'rgba(5, 2, 15, 0.08)';
    ctx.fillRect(0, 0, w, h);

    // Animate zoom (infinite tunnel effect)
    this.zoom = 1 + (this.time * 0.0003) % 2;
    this.rotation += 0.002;

    // Draw multiple fractal layers
    for (let i = 0; i < this.layers; i++) {
      const layerZoom = this.zoom * Math.pow(1.3, i);
      const normalizedZoom = (layerZoom % 2) + 0.5;
      const layerAlpha = 0.8 - (i / this.layers) * 0.6;
      const layerRotation = this.rotation * (1 + i * 0.1);

      this._drawFractalLayer(i, normalizedZoom, layerRotation, layerAlpha);
    }

    // Central glow
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.3);
    gradient.addColorStop(0, hexToRgba(this.palette[0], 0.3));
    gradient.addColorStop(0.5, hexToRgba(this.palette[1], 0.1));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    const vignetteColor1 = hexToRgba(this.palette[0], 0.1);
    const vignetteColor2 = hexToRgba(this.palette[1], 0.1);
    const vignetteColor3 = hexToRgba(this.palette[2], 0.1);

    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.5, vignetteColor1);
    vignette.addColorStop(1, vignetteColor2);
    ctx.fillStyle = vignette;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this._fractalTunnelAgent._onResize);
    this._fractalTunnelAgent.destroy();
    this._fractalTunnelAgent = null;
    this.qualityAutoTuner.destroy();
    this.qualityAutoTuner = null;
    this.qualitySettings = null;
    this.quality = null;
    this.canvas = null;
    this.ctx = null;
    this.pixelRatio = null;
    this.resolutionScale = null;
    this.time = null;
    this.zoom = null;
    this.rotation = null;
    this.layers = null;
    this.palette = null;
    this._visible = null;
    this._onResize = null;
    this._onVisibilityChange = null;
  }
}

// ---------------------------------------------------------
// NebulaGalaxyAgent: Cosmic nebula effect (Canvas 2D with particles)
// ---------------------------------------------------------
class NebulaGalaxyAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;

    this.time = 0;
    this.rotation = 0;
    this.palette = ColorPalettes.galaxy || ColorPalettes.jazer || getRandomPalette();
    this.stars = [];
    this.nebulaLayers = [];

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
    this._initStars();
    this._initNebula();
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale || this.config.baseResolutionScale;

    const width = rect.width * this.pixelRatio * this.resolutionScale;
    const height = rect.height * this.pixelRatio * this.resolutionScale;

    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);
  }

  _initStars() {
    const settings = this.quality.getSettings();
    const count = Math.floor((settings.maxEntities || 100) * 1.5);
    this.stars = [];

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.pow(Math.random(), 2) * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.8 ? this.palette[Math.floor(Math.random() * this.palette.length)] : '#ffffff'
      });
    }
  }

  _initNebula() {
    this.nebulaLayers = [];
    for (let i = 0; i < 5; i++) {
      this.nebulaLayers.push({
        offsetX: (Math.random() - 0.5) * 0.4,
        offsetY: (Math.random() - 0.5) * 0.4,
        scale: 0.3 + Math.random() * 0.3,
        color: this.palette[i % this.palette.length],
        alpha: 0.05 + Math.random() * 0.1,
        rotationSpeed: (Math.random() - 0.5) * 0.0002
      });
    }
  }

  _drawNebula() {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;

    for (const layer of this.nebulaLayers) {
      const lx = cx + layer.offsetX * w;
      const ly = cy + layer.offsetY * h;
      const size = Math.min(w, h) * layer.scale;

      // Animated nebula clouds using noise
      const warp = noise2D(this.time * 0.00005, layer.offsetX) * 50;

      const gradient = ctx.createRadialGradient(
        lx + warp, ly + warp, 0,
        lx, ly, size
      );
      gradient.addColorStop(0, hexToRgba(layer.color, layer.alpha * 1.5));
      gradient.addColorStop(0.3, hexToRgba(layer.color, layer.alpha));
      gradient.addColorStop(0.7, hexToRgba(layer.color, layer.alpha * 0.3));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(lx, ly, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawStars() {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    for (const star of this.stars) {
      const twinkle = 0.5 + Math.sin(this.time * 0.003 * star.twinkleSpeed + star.twinklePhase) * 0.5;
      const alpha = star.brightness * twinkle;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.shadowColor = star.color;
      ctx.shadowBlur = star.size * 3;
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt * 16.67;
    this.rotation += 0.00003;

    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    // Deep space background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    bgGrad.addColorStop(0, '#0a0518');
    bgGrad.addColorStop(0.5, '#050210');
    bgGrad.addColorStop(1, '#010105');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Slowly rotate star field
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.rotation);
    ctx.translate(-w / 2, -h / 2);

    this._drawStars();
    this._drawNebula();

    ctx.restore();

    // Central galaxy core glow
    const coreGlow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.15);
    coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    coreGlow.addColorStop(0.3, hexToRgba(this.palette[0], 0.3));
    coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }
}


// ---------------------------------------------------------
// SacredGeometryAgent: Animated sacred geometry patterns (Canvas 2D)
// ---------------------------------------------------------
class SacredGeometryAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;

    this.time = 0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;
    this.palette = ColorPalettes.sacred || ColorPalettes.jazer || getRandomPalette();

    this.trailBuffer = null;
    this.bloom = null;

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
    this._initEffects();
  }

  _onVisibilityChange() {
    this._visible = document.visibilityState !== 'hidden';
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    const settings = this.quality.getSettings();
    this.resolutionScale = settings.resolutionScale;

    const width = rect.width * this.pixelRatio * this.resolutionScale;
    const height = rect.height * this.pixelRatio * this.resolutionScale;

    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.pixelRatio * this.resolutionScale, this.pixelRatio * this.resolutionScale);

    if (this.trailBuffer) this.trailBuffer.setSize(this.canvas.width, this.canvas.height);
    if (this.bloom) this.bloom.setSize(this.canvas.width, this.canvas.height);
  }

  _initEffects() {
    const w = this.canvas.width || 1920;
    const h = this.canvas.height || 1080;

    this.trailBuffer = new MotionTrailBuffer(w, h, {
      fadeAmount: 0.03,
      blendMode: 'lighter'
    });

    this.bloom = new ProceduralBloom(w, h, {
      intensity: 0.5,
      radius: 15,
      passes: 2
    });
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt * 16.67;

    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);

    // Background fade
    ctx.fillStyle = 'rgba(2, 3, 8, 0.05)';
    ctx.fillRect(0, 0, w, h);

    const t = this.time * 0.0003;
    const pulse = Math.sin(t * 2) * 0.5 + 0.5;

    // Flower of Life - breathing
    const flowerSize = minDim * (0.35 + pulse * 0.1);
    SacredGeometry.flowerOfLife(ctx, cx, cy, flowerSize, 3, {
      color: this.palette[0],
      lineWidth: 1.5,
      alpha: 0.4 + pulse * 0.2,
      rotation: t * 0.5
    });

    // Metatron's Cube - counter-rotating
    SacredGeometry.metatronsCube(ctx, cx, cy, minDim * 0.3, {
      color: this.palette[2],
      lineWidth: 1,
      alpha: 0.3,
      rotation: -t * 0.3
    });

    // Sri Yantra - slow pulse
    SacredGeometry.sriYantra(ctx, cx, cy, minDim * 0.25, {
      color: this.palette[1],
      lineWidth: 1.2,
      alpha: 0.25 + pulse * 0.15,
      rotation: t * 0.2
    });

    // Golden Spirals - twin spirals
    SacredGeometry.goldenSpiral(ctx, cx, cy, minDim * 0.35, 4, {
      color: this.palette[3] || this.palette[0],
      lineWidth: 2,
      alpha: 0.2,
      rotation: t
    });
    SacredGeometry.goldenSpiral(ctx, cx, cy, minDim * 0.35, 4, {
      color: this.palette[4] || this.palette[1],
      lineWidth: 2,
      alpha: 0.2,
      rotation: -t + Math.PI
    });

    // Torus knot overlay
    SacredGeometry.torusKnot(ctx, cx, cy, minDim * 0.28, 3, 5, {
      color: this.palette[2],
      lineWidth: 0.8,
      alpha: 0.15,
      rotation: t * 0.7
    });

    // Central glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.2);
    glow.addColorStop(0, hexToRgba(this.palette[0], 0.3));
    glow.addColorStop(0.5, hexToRgba(this.palette[1], 0.1));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(cx, cy, minDim * 0.3, cx, cy, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Apply trail for ethereal effect
    this.trailBuffer.fade();
    this.trailBuffer.ctx.drawImage(canvas, 0, 0);

    // Apply bloom
    this.bloom.apply(canvas, ctx);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.trailBuffer = null;
    this.bloom = null;
  }
}

// ---------------------------------------------------------
// Multi-Agent Registry

// ---------------------------------------------------------

function supportsCanvas() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!canvas.getContext && !!canvas.getContext('2d');
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(
    canvas.getContext &&
    (canvas.getContext('webgl') || canvas.getContext('webgl2'))
  );
}

function supportsCanvas2D() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}

const AgentRegistry = {
  // Raw agent descriptors
  agents: {
    canvasNeonTunnel: {
      id: 'canvas-neon-tunnel',
      label: 'Canvas Neon Tunnel (Enhanced)',
      description: 'Multi-layer neon vortex with sacred geometry overlays',
      create(canvas, config, qualityController) {
        return new CanvasNeonTunnelAgent(canvas, config, qualityController);
      },
      supports() {
        return supportsCanvas2D();
      }
    },
    webglTunnel: {
      id: 'webgl-tunnel',
      label: 'WebGL Three.js Neon Tunnel',
      description: '3D infinite tunnel with dynamic lighting',
      create(canvas, config, qualityController) {
        return new WebGLThreeTunnelAgent(canvas, config, qualityController);
      },
      supports() {
        return supportsWebGL() &&
          typeof window !== 'undefined' &&
          !!window.THREE;
      }
    },
    plasmaFluid: {
      id: 'plasma-fluid',
      label: 'Plasma Fluid',
      description: 'Organic flowing plasma with domain warping',
      create(canvas, config, qualityController) {
        return new PlasmaFluidAgent(canvas, config, qualityController);
      },
      supports() {
        return supportsCanvas2D();
      }
    },
    fractalTunnel: {
      id: 'fractal-tunnel',
      label: 'Fractal Tunnel',
      description: 'Infinite fractal zoom with geometric patterns',
      create(canvas, config, qualityController) {
        return new FractalTunnelAgent(canvas, config, qualityController);
      },
      supports() {
        return supportsCanvas2D();
      }
    },
    nebulaGalaxy: {
      id: 'nebula-galaxy',
      label: 'Nebula Galaxy',
      description: 'Cosmic nebula with twinkling stars',
      create(canvas, config, qualityController) {
        return new NebulaGalaxyAgent(canvas, config, qualityController);
      },
      supports() {
        return !!document.createElement('canvas').getContext('2d');
      }
    },
    sacredGeometry: {
      id: 'sacred-geometry',
      label: 'Sacred Geometry',
      description: 'Animated Flower of Life, Metatron\'s Cube, and more',
      create(canvas, config, qualityController) {
        return new SacredGeometryAgent(canvas, config, qualityController);
      },
      supports() {
        return supportsCanvas2D();
      }
    }
  },

  // Helper: get an agent by key (e.g. 'canvasNeonTunnel')
  get(key) {
    return this.agents[key] || null;
  },

  // Helper: list all agents as an array (good for UIs)
  list() {
    return Object.values(this.agents);
  },

  // Helper: find the first supported agent from a priority list
  resolve(preferredIds = ['webglTunnel', 'canvasNeonTunnel']) {
    for (const key of preferredIds) {
      const agent = this.agents[key];
      if (agent && agent.supports()) return agent;
    }
    // Fallback: any supported agent
    return this.list().find(a => a.supports()) || null;
  }
};

// ---------------------------------------------------------
// Public API: initJazerBackground
// ---------------------------------------------------------
export function initJazerBackground(options = {}) {
  const {
    canvas: providedCanvas,
    container = document.body,
    agentId = 'canvasNeonTunnel',
    config = CONFIG
  } = options;

  let canvas = providedCanvas;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'jazer-background-canvas';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      display: 'block',
      zIndex: '-1',
      pointerEvents: 'none'
    });
    container.appendChild(canvas);
  }

  // Use new registry API
  const agentEntry = AgentRegistry.get(agentId);
  if (!agentEntry) {
    throw new Error(`[JaZeR] Unknown agentId: ${agentId}. Available: ${AgentRegistry.list().map(a => a.id).join(', ')}`);
  }

  if (!agentEntry.supports()) {
    throw new Error(`[JaZeR] Agent ${agentId} is not supported on this device.`);
  }

  const quality = new QualityAutoTuner(config);
  const agent = agentEntry.create(canvas, config, quality);

  let lastTime = performance.now();
  let running = true;

  function loop(now) {
    if (!running) return;

    const dt = (now - lastTime) / 16.67; // ~frames at 60fps baseline
    lastTime = now;

    quality.beginFrame();
    agent.updateAndRender(dt);
    quality.endFrame();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  return {
    canvas,
    agentId,
    quality,
    destroy() {
      running = false;
      agent.destroy();
      if (!providedCanvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}

// ---------------------------------------------------------
// Optional: expose on window for non-module users
// ---------------------------------------------------------
(function attachJaZeRBackgroundGlobal() {
  if (typeof window === 'undefined') return;

  const existing = window.JaZeRBackground || {};

  const core = {
    initJazerBackground,
    CONFIG,
    QualityAutoTuner
  };

  const agents = {
    registry: AgentRegistry
    // future:
    // register(id, factory) {}
    // get(id) {}
    // list() {}
  };

  const fx = {
    MotionTrailBuffer,
    ProceduralBloom,
    SacredGeometry,
    applyHDR,
    domainWarp
  };

  const noise = {
    SimplexNoise,
    noise2D,
    noise3D,
    noise4D,
    fbm2D,
    fbm3D
  };

  const easing = Easing; // already an object

  const mouseApi = {
    MouseTracker,
    mouse
  };

  const color = {
    ColorPalettes,
    getRandomPalette,
    getPaletteColor,
    hexToRgb,
    rgbToHex,
    hslToRgb,
    rgbToHsl,
    lerpColor,
    cycleColor,
    hexToRgba,
    rgbToHex
  };

  const math = {
    map,
    clamp,
    smoothstep,
    smootherstep,
    fract,
    mod,
    mix,
    step,
    pulse,
    inverseLerp,
    remap,
    wrap,
    pingPong,
    degToRad,
    radToDeg,
    distance,
    distance3D,
    normalize2D,
    normalize3D,
    dot2D,
    dot3D
  };

  const api = {
    // meta
    version: existing.version || '0.1.0',

    // grouped namespaces
    core: Object.freeze(core),
    agents: Object.freeze(agents),
    fx: Object.freeze(fx),
    noise: Object.freeze(noise),
    easing: Object.freeze(easing),
    mouse: Object.freeze(mouseApi),
    color: Object.freeze(color),
    math: Object.freeze(math)
  };

  // Shallow-merge with any existing global to avoid breaking other bundles
  window.JaZeRBackground = Object.freeze({
    ...existing,
    ...api
  });
})();
