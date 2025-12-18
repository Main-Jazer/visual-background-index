// jazer-engine-runtime.js
// JaZeR Engine Runtime
// Shared runtime loop + adaptive resolution helpers (Canvas + Three.js)
// ============================================================================

import { QualityAutoTuner, CONFIG } from './jazer-background-engine.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowMs() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

/**
 * AdaptiveResolution
 * Applies QualityAutoTuner output to Canvas2D or Three.js renderer resolution.
 */
export class AdaptiveResolution {
  constructor({
    config = CONFIG,
    tuner = null,
    maxPixelRatio = config.maxPixelRatio ?? 2,
    baseResolutionScale = config.baseResolutionScale ?? 1,
    minResolutionScale = config.minResolutionScale ?? 0.6,
    maxResolutionScale = config.maxResolutionScale ?? 1
  } = {}) {
    this.config = config;
    this.tuner = tuner || new QualityAutoTuner(config);
    this.maxPixelRatio = maxPixelRatio;
    this.baseResolutionScale = baseResolutionScale;
    this.minResolutionScale = minResolutionScale;
    this.maxResolutionScale = maxResolutionScale;
  }

  beginFrame() {
    this.tuner.beginFrame();
  }

  endFrame() {
    this.tuner.endFrame();
  }

  getSettings() {
    const settings = this.tuner.getSettings();
    const resolutionScale = clamp(
      (settings.resolutionScale ?? 1) * this.baseResolutionScale,
      this.minResolutionScale,
      this.maxResolutionScale
    );

    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
    const pixelRatio = clamp(dpr * resolutionScale, 1 * resolutionScale, this.maxPixelRatio);

    return {
      ...settings,
      resolutionScale,
      pixelRatio,
      devicePixelRatio: dpr
    };
  }

  /**
   * Apply adaptive resolution to a Canvas2D canvas.
   * Returns the applied { width, height, pixelWidth, pixelHeight, pixelRatio }.
   */
  applyToCanvas(canvas, width, height, ctx = null) {
    const { pixelRatio } = this.getSettings();
    const pixelWidth = Math.max(1, Math.floor(width * pixelRatio));
    const pixelHeight = Math.max(1, Math.floor(height * pixelRatio));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    if (ctx) {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    return { width, height, pixelWidth, pixelHeight, pixelRatio };
  }

  /**
   * Apply adaptive resolution to a Three.js WebGLRenderer.
   * Uses renderer.setPixelRatio() to scale internal resolution.
   */
  applyToRenderer(renderer, width, height, updateStyle = true) {
    const { pixelRatio } = this.getSettings();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, updateStyle);
    return { width, height, pixelRatio };
  }

  destroy() {
    this.tuner.destroy();
  }
}

/**
 * EngineRuntime
 * A thin requestAnimationFrame scheduler with dt smoothing and visibility pausing.
 */
export class EngineRuntime {
  constructor({
    onFrame,
    maxDelta = 1 / 20,
    dtSmoothing = 0.1,
    autoPauseOnHidden = true
  } = {}) {
    this.onFrame = typeof onFrame === 'function' ? onFrame : null;
    this.maxDelta = maxDelta;
    this.dtSmoothing = dtSmoothing;
    this.autoPauseOnHidden = autoPauseOnHidden;

    this.isRunning = false;
    this._rafId = null;
    this._lastMs = 0;
    this._smoothedDt = 1 / 60;
    this._visibilityHandler = this._visibilityHandler.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._lastMs = nowMs();

    if (this.autoPauseOnHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    this._tick();
  }

  stop() {
    this.isRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this.autoPauseOnHidden && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  _visibilityHandler() {
    if (!this.isRunning) return;
    if (document.visibilityState === 'hidden') {
      this._lastMs = nowMs();
    }
  }

  _tick() {
    if (!this.isRunning) return;
    this._rafId = requestAnimationFrame(() => this._tick());

    const ms = nowMs();
    let dt = (ms - this._lastMs) / 1000;
    this._lastMs = ms;
    dt = clamp(dt, 0, this.maxDelta);

    const alpha = clamp(this.dtSmoothing, 0, 1);
    this._smoothedDt = this._smoothedDt * (1 - alpha) + dt * alpha;

    if (this.onFrame) {
      this.onFrame({
        timeMs: ms,
        dt,
        dtSmoothed: this._smoothedDt
      });
    }
  }
}

export default {
  EngineRuntime,
  AdaptiveResolution
};

