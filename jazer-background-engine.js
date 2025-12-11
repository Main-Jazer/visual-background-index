// jazer-background-engine.js
// JaZeR Background Engine
// Canvas + WebGL neon tunnel backgrounds with adaptive quality


// ---------------------------------------------------------
// CONFIG: Global quality + performance settings
// ---------------------------------------------------------
export const CONFIG = {
  targetFPS: 90,
  minFPS: 45,
  maxPixelRatio: 2.0,
  baseResolutionScale: 1.0,
  qualityLevels: {
    low: { resolutionScale: 0.6, maxEntities: 80 },
    medium: { resolutionScale: 0.85, maxEntities: 140 },
    high: { resolutionScale: 1.0, maxEntities: 220 }
  },
  adjustIntervalFrames: 90,
  upgradeFPSThreshold: 110,
  downgradeFPSThreshold: 50
};

// ---------------------------------------------------------
// QualityAutoTuner: Reusable adaptive quality controller
// ---------------------------------------------------------
export class QualityAutoTuner {
  constructor(config = CONFIG) {
    this.config = config;
    this.currentLevel = 'high';
    this.frameCount = 0;
    this.fpsSamples = [];
    this.maxSamples = 120;
    this.lastFrameStart = 0;
  }

  beginFrame() {
    this.lastFrameStart = performance.now();
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
  }

  _averageFPS() {
    if (this.fpsSamples.length === 0) return this.config.targetFPS;
    const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
    return sum / this.fpsSamples.length;
  }

  _evaluateQuality() {
    const avgFPS = this._averageFPS();
    const { upgradeFPSThreshold, downgradeFPSThreshold } = this.config;

    const order = ['low', 'medium', 'high'];
    const index = order.indexOf(this.currentLevel);

    if (avgFPS < downgradeFPSThreshold && index > 0) {
      this.currentLevel = order[index - 1];
    } else if (avgFPS > upgradeFPSThreshold && index < order.length - 1) {
      this.currentLevel = order[index + 1];
    }
  }

  getSettings() {
    const levelConfig = this.config.qualityLevels[this.currentLevel];
    return {
      level: this.currentLevel,
      ...levelConfig
    };
  }
}

// ---------------------------------------------------------
// SIMPLEX NOISE: Fast, high-quality procedural noise
// Based on Stefan Gustavson's simplex noise implementation
// ---------------------------------------------------------
export class SimplexNoise {
  constructor(seed = Math.random() * 65536) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

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
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }

    // Gradient vectors for 2D, 3D, 4D
    this.grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
    ]);

    this.grad4 = new Float32Array([
      0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
      0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
      1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
      -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
      1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
      -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0
    ]);

    // Skewing factors
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;
    this.F3 = 1 / 3;
    this.G3 = 1 / 6;
    this.F4 = (Math.sqrt(5) - 1) / 4;
    this.G4 = (5 - Math.sqrt(5)) / 20;
  }

  noise2D(x, y) {
    const { perm, permMod12, grad3, F2, G2 } = this;
    let n0, n1, n2;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
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

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

    let i1, j1, k1, i2, j2, k2;
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

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
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

    const i1 = rankx >= 3 ? 1 : 0, j1 = ranky >= 3 ? 1 : 0;
    const k1 = rankz >= 3 ? 1 : 0, l1 = rankw >= 3 ? 1 : 0;
    const i2 = rankx >= 2 ? 1 : 0, j2 = ranky >= 2 ? 1 : 0;
    const k2 = rankz >= 2 ? 1 : 0, l2 = rankw >= 2 ? 1 : 0;
    const i3 = rankx >= 1 ? 1 : 0, j3 = ranky >= 1 ? 1 : 0;
    const k3 = rankz >= 1 ? 1 : 0, l3 = rankw >= 1 ? 1 : 0;

    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2 * G4, y2 = y0 - j2 + 2 * G4, z2 = z0 - k2 + 2 * G4, w2 = w0 - l2 + 2 * G4;
    const x3 = x0 - i3 + 3 * G4, y3 = y0 - j3 + 3 * G4, z3 = z0 - k3 + 3 * G4, w3 = w0 - l3 + 3 * G4;
    const x4 = x0 - 1 + 4 * G4, y4 = y0 - 1 + 4 * G4, z4 = z0 - 1 + 4 * G4, w4 = w0 - 1 + 4 * G4;

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
  synthwave: ['#ff00ff', '#00ffff', '#ff6ec7', '#9d00ff']
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
// CanvasNeonTunnelAgent: 2D neon vortex background
// ---------------------------------------------------------
class CanvasNeonTunnelAgent {
  constructor(canvas, config, qualityController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.quality = qualityController;

    this.entities = [];
    this.time = 0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
    this.resolutionScale = config.baseResolutionScale;
    this.currentMaxEntities = config.qualityLevels.high.maxEntities;

    this._visible = true;
    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
    this._initEntities();
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

  _initEntities() {
    const settings = this.quality.getSettings();
    this.currentMaxEntities = settings.maxEntities;
    this.entities = [];

    for (let i = 0; i < this.currentMaxEntities; i++) {
      this.entities.push(this._createEntity(i / this.currentMaxEntities));
    }
  }

  _syncEntitiesWithQuality() {
    const settings = this.quality.getSettings();
    const desired = settings.maxEntities;

    if (desired === this.currentMaxEntities) return;

    if (desired > this.currentMaxEntities) {
      const diff = desired - this.currentMaxEntities;
      for (let i = 0; i < diff; i++) {
        this.entities.push(this._createEntity(Math.random()));
      }
    } else {
      this.entities.length = desired;
    }
    this.currentMaxEntities = desired;
    this._onResize();
  }

  _createEntity(seed) {
    const angle = rand(0, Math.PI * 2);
    const radius = lerp(0.1, 0.7, Math.pow(Math.random(), 0.6));
    const speed = lerp(0.1, 0.45, Math.random());
    const radialDrift = lerp(-0.12, 0.12, Math.random());
    const size = lerp(1.5, 4.5, Math.random());

    return {
      baseRadius: radius,
      radialOffset: rand(-0.08, 0.08),
      angle,
      speed,
      size,
      radialDrift,
      color: pick(JAZER_COLORS),
      noiseOffset: seed * 1000
    };
  }

  _drawBackgroundGlow() {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    ctx.fillStyle = 'rgba(3, 4, 12, 0.22)';
    ctx.fillRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0.0, 'rgba(0, 245, 255, 0.10)');
    gradient.addColorStop(0.5, 'rgba(255, 42, 255, 0.16)');
    gradient.addColorStop(1.0, 'rgba(179, 124, 255, 0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.5)';
    ctx.lineWidth = 0.5;

    const spacing = 48;
    ctx.beginPath();
    for (let x = 0; x < w; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawEntity(e) {
    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    const cx = w * 0.5;
    const cy = h * 0.5;

    const dt = 1; // already normalized in engine loop

    e.angle += e.speed * dt * 0.12;
    e.baseRadius += e.radialDrift * dt * 0.02;

    if (e.baseRadius > 1.1) e.baseRadius = 0.1;
    if (e.baseRadius < 0.05) e.baseRadius = 0.9;

    const t = Math.sin(this.time * 0.0005 + e.noiseOffset) * 0.5 + 0.5;
    const radius = (e.baseRadius + e.radialOffset * t) * Math.min(w, h) * 0.5;

    const x = cx + Math.cos(e.angle) * radius;
    const y = cy + Math.sin(e.angle) * radius;

    const trailLength = radius * 0.08;
    const trailAngle = e.angle + Math.PI * 0.5;
    const tx = x - Math.cos(trailAngle) * trailLength;
    const ty = y - Math.sin(trailAngle) * trailLength;

    const gradient = ctx.createLinearGradient(tx, ty, x, y);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.3, e.color + '88');
    gradient.addColorStop(1, e.color);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = gradient;
    ctx.lineWidth = e.size;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, e.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  updateAndRender(dt) {
    if (!this._visible) return;
    this.time += dt;

    this._syncEntitiesWithQuality();
    this._drawBackgroundGlow();

    for (let i = 0; i < this.entities.length; i++) {
      this._drawEntity(this.entities[i]);
    }

    const { ctx, canvas } = this;
    const w = canvas.width / (this.pixelRatio * this.resolutionScale);
    const h = canvas.height / (this.pixelRatio * this.resolutionScale);

    const vignette = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.25,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }
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
// Multi-Agent Registry
// ---------------------------------------------------------
const AgentRegistry = {
  canvasNeonTunnel: {
    id: 'canvas-neon-tunnel',
    label: 'Canvas Neon Tunnel',
    create(canvas, config, qualityController) {
      return new CanvasNeonTunnelAgent(canvas, config, qualityController);
    },
    supports() {
      return !!document.createElement('canvas').getContext('2d');
    }
  },
  webglTunnel: {
    id: 'webgl-tunnel',
    label: 'WebGL Three.js Neon Tunnel',
    create(canvas, config, qualityController) {
      return new WebGLThreeTunnelAgent(canvas, config, qualityController);
    },
    supports() {
      const hasCanvas = !!document.createElement('canvas').getContext('webgl')
        || !!document.createElement('canvas').getContext('webgl2');
      const hasThree = typeof window !== 'undefined' && !!window.THREE;
      return hasCanvas && hasThree;
    }
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

  const agentEntry = AgentRegistry[agentId];
  if (!agentEntry) {
    throw new Error(`[JaZeR] Unknown agentId: ${agentId}`);
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

// Optional: expose on window for non-module users
if (typeof window !== 'undefined') {
  window.JaZeRBackground = {
    // Core
    initJazerBackground,
    CONFIG,
    QualityAutoTuner,

    // Noise
    SimplexNoise,
    noise2D,
    noise3D,
    noise4D,
    fbm2D,
    fbm3D,

    // Easing
    Easing,

    // Mouse
    MouseTracker,
    mouse,

    // Colors
    ColorPalettes,
    getRandomPalette,
    getPaletteColor,
    hexToRgb,
    rgbToHex,
    hslToRgb,
    rgbToHsl,
    lerpColor,
    cycleColor,

    // Math utilities
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
}
