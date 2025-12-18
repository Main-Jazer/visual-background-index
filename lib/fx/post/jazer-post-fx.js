// jazer-post-fx.js
// JaZeR Post-Processing Core Module
// Unified configuration, presets, and utilities for professional visual effects
// ============================================================================

// ---------------------------------------------------------
// FX PRESETS: Visual intensity configurations
// ---------------------------------------------------------

export const FX_PRESETS = {
  // Clean, professional enhancement - minimal processing
  subtle: {
    name: 'subtle',
    bloom: {
      enabled: true,
      intensity: 0.3,
      threshold: 0.85,
      radius: 0.3,
      smoothing: 0.025
    },
    chromatic: {
      enabled: true,
      intensity: 0.0015,
      radialFalloff: true
    },
    vignette: {
      enabled: true,
      intensity: 0.25,
      smoothness: 0.5,
      roundness: 1.0
    },
    grain: {
      enabled: true,
      intensity: 0.025,
      size: 1.5,
      speed: 5.0
    },
    tonemapping: {
      enabled: true,
      type: 'aces', // 'aces', 'reinhard', 'filmic', 'linear'
      exposure: 1.0,
      gamma: 1.0
    },
    sharpen: {
      enabled: false,
      intensity: 0.0
    },
    glow: {
      enabled: false,
      intensity: 0.0
    }
  },

  // DEFAULT: Punchy, vibrant neon glow - JaZeR brand aesthetic
  neon: {
    name: 'neon',
    bloom: {
      enabled: true,
      intensity: 0.8,
      threshold: 0.4,
      radius: 0.5,
      smoothing: 0.05
    },
    chromatic: {
      enabled: true,
      intensity: 0.004,
      radialFalloff: true
    },
    vignette: {
      enabled: true,
      intensity: 0.4,
      smoothness: 0.35,
      roundness: 0.8
    },
    grain: {
      enabled: true,
      intensity: 0.02,
      size: 1.0,
      speed: 8.0
    },
    tonemapping: {
      enabled: true,
      type: 'aces',
      exposure: 1.1,
      gamma: 0.95
    },
    sharpen: {
      enabled: true,
      intensity: 0.15
    },
    glow: {
      enabled: true,
      intensity: 0.3,
      color: [0, 245, 255] // Cyan tint
    }
  },

  // Cinematic / theatrical - film-like quality
  cinematic: {
    name: 'cinematic',
    bloom: {
      enabled: true,
      intensity: 0.5,
      threshold: 0.6,
      radius: 0.45,
      smoothing: 0.04
    },
    chromatic: {
      enabled: true,
      intensity: 0.003,
      radialFalloff: true
    },
    vignette: {
      enabled: true,
      intensity: 0.55,
      smoothness: 0.5,
      roundness: 0.9
    },
    grain: {
      enabled: true,
      intensity: 0.05,
      size: 1.2,
      speed: 4.0
    },
    tonemapping: {
      enabled: true,
      type: 'filmic',
      exposure: 0.95,
      gamma: 1.05
    },
    sharpen: {
      enabled: true,
      intensity: 0.1
    },
    glow: {
      enabled: false,
      intensity: 0.0
    }
  },

  // Maximum impact - over-the-top effects
  extreme: {
    name: 'extreme',
    bloom: {
      enabled: true,
      intensity: 1.4,
      threshold: 0.25,
      radius: 0.7,
      smoothing: 0.08
    },
    chromatic: {
      enabled: true,
      intensity: 0.008,
      radialFalloff: true
    },
    vignette: {
      enabled: true,
      intensity: 0.35,
      smoothness: 0.25,
      roundness: 0.7
    },
    grain: {
      enabled: true,
      intensity: 0.015,
      size: 0.8,
      speed: 12.0
    },
    tonemapping: {
      enabled: true,
      type: 'aces',
      exposure: 1.25,
      gamma: 0.9
    },
    sharpen: {
      enabled: true,
      intensity: 0.25
    },
    glow: {
      enabled: true,
      intensity: 0.5,
      color: [255, 42, 255] // Magenta tint
    }
  }
};

// ---------------------------------------------------------
// QUALITY LEVELS: Performance tiers
// ---------------------------------------------------------

export const QUALITY_LEVELS = {
  low: {
    name: 'low',
    resolutionScale: 0.5,
    bloomPasses: 3,
    bloomSamples: 5,
    grainEnabled: false,
    sharpenEnabled: false,
    maxFPS: 60
  },
  medium: {
    name: 'medium',
    resolutionScale: 0.75,
    bloomPasses: 4,
    bloomSamples: 9,
    grainEnabled: true,
    sharpenEnabled: false,
    maxFPS: 90
  },
  high: {
    name: 'high',
    resolutionScale: 1.0,
    bloomPasses: 5,
    bloomSamples: 13,
    grainEnabled: true,
    sharpenEnabled: true,
    maxFPS: 144
  },
  ultra: {
    name: 'ultra',
    resolutionScale: 1.0,
    bloomPasses: 6,
    bloomSamples: 17,
    grainEnabled: true,
    sharpenEnabled: true,
    maxFPS: 240
  }
};

// ---------------------------------------------------------
// REFRESH RATE DETECTION & TIMING
// ---------------------------------------------------------

const FRAME_TIMES = {
  60: 16.667,
  90: 11.111,
  120: 8.333,
  144: 6.944,
  165: 6.061,
  240: 4.167
};

export class RefreshRateDetector {
  constructor() {
    this.samples = [];
    this.maxSamples = 60;
    this.detectedRate = 60;
    this.lastTime = performance.now();
    this.isDetecting = true;
  }

  sample() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    if (delta > 0 && delta < 50) { // Ignore outliers
      this.samples.push(delta);
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }

    if (this.samples.length >= this.maxSamples && this.isDetecting) {
      this._detectRate();
      this.isDetecting = false;
    }
  }

  _detectRate() {
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;

    // Find closest standard refresh rate
    let closest = 60;
    let minDiff = Infinity;

    for (const rate of Object.keys(FRAME_TIMES)) {
      const diff = Math.abs(FRAME_TIMES[rate] - avg);
      if (diff < minDiff) {
        minDiff = diff;
        closest = parseInt(rate);
      }
    }

    this.detectedRate = closest;
    console.log(`[JaZeR PostFX] Detected refresh rate: ${closest}Hz (avg frame: ${avg.toFixed(2)}ms)`);
  }

  getRate() {
    return this.detectedRate;
  }

  getTargetFrameTime() {
    return FRAME_TIMES[this.detectedRate] || 16.667;
  }
}

// ---------------------------------------------------------
// ADAPTIVE QUALITY CONTROLLER
// ---------------------------------------------------------

export class AdaptiveQualityController {
  constructor(options = {}) {
    this.currentLevel = options.initialLevel || 'high';
    this.frameTimes = [];
    this.maxSamples = options.sampleCount || 30;
    this.upgradeThreshold = options.upgradeThreshold || 0.7; // 70% of target
    this.downgradeThreshold = options.downgradeThreshold || 1.3; // 130% of target
    this.targetFrameTime = options.targetFrameTime || 8.333; // 120Hz default
    this.cooldownFrames = 0;
    this.cooldownDuration = 60; // frames before another adjustment
    this.onQualityChange = options.onQualityChange || null;

    this.qualityOrder = ['low', 'medium', 'high', 'ultra'];
  }

  setTargetFrameTime(ms) {
    this.targetFrameTime = ms;
  }

  onFrameTimeUpdate(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    if (this.cooldownFrames > 0) {
      this.cooldownFrames--;
      return;
    }

    if (this.frameTimes.length >= this.maxSamples) {
      this._maybeAdjustQuality();
    }
  }

  _maybeAdjustQuality() {
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const ratio = avg / this.targetFrameTime;
    const currentIndex = this.qualityOrder.indexOf(this.currentLevel);

    if (ratio > this.downgradeThreshold && currentIndex > 0) {
      // Downgrade
      const newLevel = this.qualityOrder[currentIndex - 1];
      console.log(`[JaZeR PostFX] Downgrading quality: ${this.currentLevel} → ${newLevel} (avg: ${avg.toFixed(2)}ms)`);
      this.currentLevel = newLevel;
      this.cooldownFrames = this.cooldownDuration;
      this.frameTimes = [];
      if (this.onQualityChange) this.onQualityChange(newLevel);
    } else if (ratio < this.upgradeThreshold && currentIndex < this.qualityOrder.length - 1) {
      // Upgrade
      const newLevel = this.qualityOrder[currentIndex + 1];
      console.log(`[JaZeR PostFX] Upgrading quality: ${this.currentLevel} → ${newLevel} (avg: ${avg.toFixed(2)}ms)`);
      this.currentLevel = newLevel;
      this.cooldownFrames = this.cooldownDuration;
      this.frameTimes = [];
      if (this.onQualityChange) this.onQualityChange(newLevel);
    }
  }

  getQuality() {
    return QUALITY_LEVELS[this.currentLevel];
  }

  getLevel() {
    return this.currentLevel;
  }

  setLevel(level) {
    if (QUALITY_LEVELS[level]) {
      this.currentLevel = level;
      this.frameTimes = [];
      if (this.onQualityChange) this.onQualityChange(level);
    }
  }
}

// ---------------------------------------------------------
// POST-FX STATE MANAGER
// ---------------------------------------------------------

export class PostFXManager {
  constructor(options = {}) {
    this.currentPreset = options.preset || 'neon';
    this.config = { ...FX_PRESETS[this.currentPreset] };
    this.qualityController = new AdaptiveQualityController({
      initialLevel: options.quality || 'high',
      onQualityChange: (level) => this._onQualityChange(level)
    });
    this.refreshDetector = new RefreshRateDetector();
    this.enabled = options.enabled !== false;
    this.passOverrides = {};
    this.time = 0;

    // Callbacks
    this.onPresetChange = options.onPresetChange || null;
  }

  // Update timing and adaptive quality
  update(dt) {
    this.time += dt;
    this.refreshDetector.sample();
    this.qualityController.setTargetFrameTime(this.refreshDetector.getTargetFrameTime());
    this.qualityController.onFrameTimeUpdate(dt * 1000); // convert to ms
  }

  // Preset management
  setPreset(name) {
    if (FX_PRESETS[name]) {
      this.currentPreset = name;
      this.config = { ...FX_PRESETS[name] };
      // Re-apply any overrides
      for (const [pass, settings] of Object.entries(this.passOverrides)) {
        if (this.config[pass]) {
          Object.assign(this.config[pass], settings);
        }
      }
      console.log(`[JaZeR PostFX] Preset changed to: ${name}`);
      if (this.onPresetChange) this.onPresetChange(name, this.config);
    }
  }

  getPreset() {
    return this.currentPreset;
  }

  getConfig() {
    return this.config;
  }

  // Quality management
  setQuality(level) {
    this.qualityController.setLevel(level);
  }

  getQuality() {
    return this.qualityController.getQuality();
  }

  // Pass control
  setPassEnabled(passName, enabled) {
    if (this.config[passName]) {
      this.config[passName].enabled = enabled;
      this.passOverrides[passName] = { ...this.passOverrides[passName], enabled };
    }
  }

  setPassOption(passName, option, value) {
    if (this.config[passName]) {
      this.config[passName][option] = value;
      if (!this.passOverrides[passName]) this.passOverrides[passName] = {};
      this.passOverrides[passName][option] = value;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Get merged config with quality adjustments
  getEffectiveConfig() {
    const quality = this.qualityController.getQuality();
    const config = { ...this.config };

    // Apply quality-based adjustments
    if (!quality.grainEnabled && config.grain) {
      config.grain = { ...config.grain, enabled: false };
    }
    if (!quality.sharpenEnabled && config.sharpen) {
      config.sharpen = { ...config.sharpen, enabled: false };
    }

    return {
      ...config,
      quality,
      resolutionScale: quality.resolutionScale,
      time: this.time
    };
  }

  _onQualityChange(level) {
    console.log(`[JaZeR PostFX] Quality now: ${level}`);
  }

  // Debugging
  getDebugInfo() {
    return {
      preset: this.currentPreset,
      quality: this.qualityController.getLevel(),
      refreshRate: this.refreshDetector.getRate(),
      enabled: this.enabled,
      time: this.time.toFixed(2)
    };
  }
}

// ---------------------------------------------------------
// SHADER SNIPPETS: GLSL post-processing fragments
// ---------------------------------------------------------

export const POST_FX_SHADERS = {
  // Vertex shader for fullscreen quad (compatible with Three.js PlaneGeometry)
  fullscreenVert: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  // Bloom threshold extraction
  bloomThreshold: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float threshold;
    uniform float smoothing;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      float contribution = smoothstep(threshold - smoothing, threshold + smoothing, brightness);
      gl_FragColor = vec4(color.rgb * contribution, color.a);
    }
  `,

  // Kawase blur (efficient multi-pass blur)
  kawaseBlur: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float offset;
    varying vec2 vUv;
    
    void main() {
      vec2 texelSize = 1.0 / resolution;
      vec4 color = vec4(0.0);
      
      color += texture2D(tDiffuse, vUv + vec2(-offset, -offset) * texelSize);
      color += texture2D(tDiffuse, vUv + vec2( offset, -offset) * texelSize);
      color += texture2D(tDiffuse, vUv + vec2(-offset,  offset) * texelSize);
      color += texture2D(tDiffuse, vUv + vec2( offset,  offset) * texelSize);
      
      gl_FragColor = color * 0.25;
    }
  `,

  // Bloom composite
  bloomComposite: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float intensity;
    varying vec2 vUv;
    
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 bloom = texture2D(tBloom, vUv);
      gl_FragColor = base + bloom * intensity;
    }
  `,

  // Chromatic aberration
  chromaticAberration: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform vec2 center;
    uniform bool radialFalloff;
    varying vec2 vUv;
    
    void main() {
      vec2 direction = vUv - center;
      float dist = length(direction);
      float amount = radialFalloff ? intensity * dist : intensity;
      
      vec2 offset = direction * amount;
      
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;
      
      gl_FragColor = vec4(r, g, b, a);
    }
  `,

  // Vignette
  vignette: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float smoothness;
    uniform float roundness;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      center.x *= roundness;
      float dist = length(center) * 2.0;
      float vig = 1.0 - smoothstep(1.0 - smoothness, 1.0, dist * (1.0 + intensity));
      gl_FragColor = vec4(color.rgb * vig, color.a);
    }
  `,

  // Film grain
  filmGrain: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float size;
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 grainUv = vUv * size + time;
      float grain = hash(grainUv) - 0.5;
      color.rgb += grain * intensity;
      gl_FragColor = color;
    }
  `,

  // ACES Filmic Tonemapping
  tonemapACES: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float exposure;
    uniform float gamma;
    varying vec2 vUv;
    
    vec3 ACESFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb *= exposure;
      color.rgb = ACESFilm(color.rgb);
      color.rgb = pow(color.rgb, vec3(1.0 / gamma));
      gl_FragColor = color;
    }
  `,

  // Sharpen
  sharpen: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float intensity;
    varying vec2 vUv;
    
    void main() {
      vec2 texelSize = 1.0 / resolution;
      
      vec4 center = texture2D(tDiffuse, vUv);
      vec4 top = texture2D(tDiffuse, vUv + vec2(0.0, -texelSize.y));
      vec4 bottom = texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y));
      vec4 left = texture2D(tDiffuse, vUv + vec2(-texelSize.x, 0.0));
      vec4 right = texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0));
      
      vec4 sharpened = center * (1.0 + 4.0 * intensity) 
                     - (top + bottom + left + right) * intensity;
      
      gl_FragColor = sharpened;
    }
  `,

  // Neon glow enhancement
  neonGlow: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform vec3 tintColor;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 glow = mix(color.rgb, tintColor / 255.0, intensity * luminance);
      gl_FragColor = vec4(glow, color.a);
    }
  `
};

// ---------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Default manager instance
let _defaultManager = null;

export function getDefaultManager() {
  if (!_defaultManager) {
    _defaultManager = new PostFXManager({ preset: 'neon', quality: 'high' });
  }
  return _defaultManager;
}

export function setDefaultManager(manager) {
  _defaultManager = manager;
}

// Convenience exports
export function setFXPreset(name) {
  getDefaultManager().setPreset(name);
}

export function setQuality(level) {
  getDefaultManager().setQuality(level);
}

export function toggleFX() {
  return getDefaultManager().toggle();
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  FX_PRESETS,
  QUALITY_LEVELS,
  POST_FX_SHADERS,
  PostFXManager,
  AdaptiveQualityController,
  RefreshRateDetector,
  getDefaultManager,
  setDefaultManager,
  setFXPreset,
  setQuality,
  toggleFX
};
