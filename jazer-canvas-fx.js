// jazer-canvas-fx.js
// JaZeR Canvas 2D Post-Processing Pipeline
// Multi-pass effects using offscreen canvas for 2D context effects
// ============================================================================

import {
    FX_PRESETS,
    QUALITY_LEVELS,
    PostFXManager,
    getDefaultManager,
    clamp,
    lerp,
    smoothstep
} from './jazer-post-fx.js';

// ---------------------------------------------------------
// CANVAS POST-PROCESSING PIPELINE
// ---------------------------------------------------------

export class CanvasPostFX {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.manager = options.manager || getDefaultManager();

        // Create offscreen canvases for multi-pass processing
        this.offscreenMain = document.createElement('canvas');
        this.offscreenBloom = document.createElement('canvas');
        this.offscreenTemp = document.createElement('canvas');

        this.ctxMain = this.offscreenMain.getContext('2d');
        this.ctxBloom = this.offscreenBloom.getContext('2d');
        this.ctxTemp = this.offscreenTemp.getContext('2d');

        // Timing
        this.time = 0;
        this.lastGrainSeed = 0;

        // Cache for performance
        this._vignetteGradient = null;
        this._grainImageData = null;

        // Resize handling
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
        this._onResize();
    }

    _onResize() {
        const rect = this.canvas.getBoundingClientRect();
        const quality = this.manager.getQuality();
        const scale = quality.resolutionScale;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const w = Math.floor(rect.width * dpr * scale);
        const h = Math.floor(rect.height * dpr * scale);

        // Resize offscreen canvases
        this.offscreenMain.width = w;
        this.offscreenMain.height = h;
        this.offscreenBloom.width = Math.floor(w / 2); // Half res for bloom
        this.offscreenBloom.height = Math.floor(h / 2);
        this.offscreenTemp.width = Math.floor(w / 2);
        this.offscreenTemp.height = Math.floor(h / 2);

        // Invalidate caches
        this._vignetteGradient = null;
        this._grainImageData = null;
    }

    /**
     * Main render function - wraps scene drawing with post-processing
     * 
     * @param {Function} drawSceneFn - Function that draws the scene to a canvas context
     * @param {number} deltaTime - Time since last frame in seconds
     */
    render(drawSceneFn, deltaTime = 0.016) {
        this.time += deltaTime;
        this.manager.update(deltaTime);

        const config = this.manager.getEffectiveConfig();

        if (!this.manager.isEnabled()) {
            // Direct render without post-processing
            drawSceneFn(this.ctx, this.canvas.width, this.canvas.height);
            return;
        }

        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;
        const ctx = this.ctxMain;

        // 1. Draw scene to offscreen canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        drawSceneFn(ctx, w, h);
        ctx.restore();

        // 2. Apply bloom (if enabled)
        if (config.bloom.enabled) {
            this._applyBloom(config.bloom);
        }

        // 3. Apply chromatic aberration (if enabled)
        if (config.chromatic.enabled) {
            this._applyChromaticAberration(config.chromatic);
        }

        // 4. Apply tonemapping (if enabled)
        if (config.tonemapping.enabled) {
            this._applyTonemapping(config.tonemapping);
        }

        // 5. Apply vignette (if enabled)
        if (config.vignette.enabled) {
            this._applyVignette(config.vignette);
        }

        // 6. Apply film grain (if enabled)
        if (config.grain.enabled) {
            this._applyGrain(config.grain);
        }

        // 7. Copy result to main canvas
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.offscreenMain, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    // ---------------------------------------------------------
    // BLOOM PASS
    // ---------------------------------------------------------

    _applyBloom(config) {
        const { intensity, threshold, radius } = config;
        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;
        const bw = this.offscreenBloom.width;
        const bh = this.offscreenBloom.height;

        // 1. Downsample to bloom buffer
        this.ctxBloom.clearRect(0, 0, bw, bh);
        this.ctxBloom.drawImage(this.offscreenMain, 0, 0, bw, bh);

        // 2. Extract bright areas (threshold)
        const imageData = this.ctxBloom.getImageData(0, 0, bw, bh);
        const data = imageData.data;
        const thresholdValue = threshold * 255;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

            if (brightness < thresholdValue) {
                // Soft threshold falloff
                const factor = smoothstep(thresholdValue * 0.7, thresholdValue, brightness);
                data[i] *= factor;
                data[i + 1] *= factor;
                data[i + 2] *= factor;
            }
        }
        this.ctxBloom.putImageData(imageData, 0, 0);

        // 3. Apply blur (using CSS filter for performance)
        const blurRadius = Math.floor(radius * Math.min(bw, bh) * 0.1);
        this.ctxTemp.clearRect(0, 0, bw, bh);
        this.ctxTemp.filter = `blur(${blurRadius}px)`;
        this.ctxTemp.drawImage(this.offscreenBloom, 0, 0);
        this.ctxTemp.filter = 'none';

        // Second blur pass for smoother result
        this.ctxBloom.clearRect(0, 0, bw, bh);
        this.ctxBloom.filter = `blur(${blurRadius}px)`;
        this.ctxBloom.drawImage(this.offscreenTemp, 0, 0);
        this.ctxBloom.filter = 'none';

        // 4. Composite bloom with additive blending
        this.ctxMain.save();
        this.ctxMain.globalCompositeOperation = 'lighter';
        this.ctxMain.globalAlpha = intensity;
        this.ctxMain.drawImage(this.offscreenBloom, 0, 0, w, h);
        this.ctxMain.restore();
    }

    // ---------------------------------------------------------
    // CHROMATIC ABERRATION PASS
    // ---------------------------------------------------------

    _applyChromaticAberration(config) {
        const { intensity, radialFalloff } = config;
        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;

        // Get image data
        const imageData = this.ctxMain.getImageData(0, 0, w, h);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);

        const cx = w / 2;
        const cy = h / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;

                // Calculate offset based on distance from center
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const normalizedDist = dist / maxDist;

                // Offset amount (stronger at edges if radialFalloff)
                const offset = radialFalloff ?
                    intensity * normalizedDist * Math.max(w, h) * 0.5 :
                    intensity * Math.max(w, h) * 0.5;

                // Calculate offset direction (away from center)
                const dirX = dist > 0 ? dx / dist : 0;
                const dirY = dist > 0 ? dy / dist : 0;

                // Red channel - offset outward
                const rx = Math.round(x + dirX * offset);
                const ry = Math.round(y + dirY * offset);
                if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
                    const rIdx = (ry * w + rx) * 4;
                    data[idx] = copy[rIdx];
                }

                // Blue channel - offset inward
                const bx = Math.round(x - dirX * offset);
                const by = Math.round(y - dirY * offset);
                if (bx >= 0 && bx < w && by >= 0 && by < h) {
                    const bIdx = (by * w + bx) * 4;
                    data[idx + 2] = copy[bIdx + 2];
                }

                // Green stays in place
            }
        }

        this.ctxMain.putImageData(imageData, 0, 0);
    }

    // ---------------------------------------------------------
    // TONEMAPPING PASS (Simple ACES approximation)
    // ---------------------------------------------------------

    _applyTonemapping(config) {
        const { exposure, gamma } = config;
        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;

        const imageData = this.ctxMain.getImageData(0, 0, w, h);
        const data = imageData.data;

        // ACES approximation coefficients
        const a = 2.51;
        const b = 0.03;
        const c = 2.43;
        const d = 0.59;
        const e = 0.14;

        const invGamma = 1.0 / gamma;

        for (let i = 0; i < data.length; i += 4) {
            // Normalize and apply exposure
            let r = (data[i] / 255) * exposure;
            let g = (data[i + 1] / 255) * exposure;
            let b_val = (data[i + 2] / 255) * exposure;

            // ACES filmic tonemapping
            r = clamp((r * (a * r + b)) / (r * (c * r + d) + e), 0, 1);
            g = clamp((g * (a * g + b)) / (g * (c * g + d) + e), 0, 1);
            b_val = clamp((b_val * (a * b_val + b)) / (b_val * (c * b_val + d) + e), 0, 1);

            // Gamma correction
            r = Math.pow(r, invGamma);
            g = Math.pow(g, invGamma);
            b_val = Math.pow(b_val, invGamma);

            data[i] = Math.round(r * 255);
            data[i + 1] = Math.round(g * 255);
            data[i + 2] = Math.round(b_val * 255);
        }

        this.ctxMain.putImageData(imageData, 0, 0);
    }

    // ---------------------------------------------------------
    // VIGNETTE PASS
    // ---------------------------------------------------------

    _applyVignette(config) {
        const { intensity, smoothness, roundness } = config;
        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;
        const ctx = this.ctxMain;

        const cx = w / 2;
        const cy = h / 2;
        const maxRadius = Math.max(w, h) * (0.5 + smoothness * 0.3);
        const innerRadius = maxRadius * (1 - intensity - smoothness * 0.5);

        // Create radial gradient for vignette
        const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, maxRadius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, `rgba(0, 0, 0, ${intensity * 0.3})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.8})`);

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;

        // Apply roundness by scaling
        if (roundness !== 1) {
            ctx.translate(cx, cy);
            ctx.scale(1, roundness);
            ctx.translate(-cx, -cy / roundness);
        }

        ctx.fillRect(0, 0, w, h / (roundness || 1));
        ctx.restore();
    }

    // ---------------------------------------------------------
    // FILM GRAIN PASS
    // ---------------------------------------------------------

    _applyGrain(config) {
        const { intensity, size, speed } = config;
        const w = this.offscreenMain.width;
        const h = this.offscreenMain.height;

        // Get or create grain image data
        const grainW = Math.floor(w / (size || 1));
        const grainH = Math.floor(h / (size || 1));

        // Generate new grain pattern periodically
        const grainSeed = Math.floor(this.time * speed);
        if (grainSeed !== this.lastGrainSeed || !this._grainImageData ||
            this._grainImageData.width !== grainW || this._grainImageData.height !== grainH) {
            this._grainImageData = this._generateGrain(grainW, grainH);
            this.lastGrainSeed = grainSeed;
        }

        // Create temporary canvas for grain
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = grainW;
        grainCanvas.height = grainH;
        const grainCtx = grainCanvas.getContext('2d');
        grainCtx.putImageData(this._grainImageData, 0, 0);

        // Apply grain with overlay blending
        this.ctxMain.save();
        this.ctxMain.globalCompositeOperation = 'overlay';
        this.ctxMain.globalAlpha = intensity * 2; // Scale up for visibility
        this.ctxMain.drawImage(grainCanvas, 0, 0, w, h);
        this.ctxMain.restore();
    }

    _generateGrain(w, h) {
        const imageData = new ImageData(w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 128 + 64; // 64-192 range for overlay blend
            data[i] = noise;
            data[i + 1] = noise;
            data[i + 2] = noise;
            data[i + 3] = 255;
        }

        return imageData;
    }

    // ---------------------------------------------------------
    // UTILITY METHODS
    // ---------------------------------------------------------

    /**
     * Set preset
     */
    setPreset(name) {
        this.manager.setPreset(name);
    }

    /**
     * Set quality level
     */
    setQuality(level) {
        this.manager.setQuality(level);
        this._onResize();
    }

    /**
     * Toggle all post-processing
     */
    toggle() {
        return this.manager.toggle();
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return this.manager.getDebugInfo();
    }

    /**
     * Cleanup
     */
    dispose() {
        window.removeEventListener('resize', this._onResize);
    }
}

// ---------------------------------------------------------
// SIMPLIFIED PIPELINE FOR QUICK INTEGRATION
// ---------------------------------------------------------

/**
 * Create a canvas post-processing pipeline
 * 
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Object} options - Configuration options
 * @returns {CanvasPostFX} Pipeline instance
 * 
 * @example
 * import { createCanvasPipeline } from './jazer-canvas-fx.js';
 * 
 * const canvas = document.getElementById('c');
 * const pipeline = createCanvasPipeline(canvas, {
 *   preset: 'neon',
 *   quality: 'high'
 * });
 * 
 * function animate() {
 *   requestAnimationFrame(animate);
 *   
 *   pipeline.render((ctx, w, h) => {
 *     // Draw your scene here
 *     ctx.fillStyle = '#000';
 *     ctx.fillRect(0, 0, w, h);
 *     // ... more drawing
 *   }, 0.016);
 * }
 */
export function createCanvasPipeline(canvas, options = {}) {
    const manager = new PostFXManager({
        preset: options.preset || 'neon',
        quality: options.quality || 'high',
        enabled: options.enabled !== false
    });

    return new CanvasPostFX(canvas, {
        ...options,
        manager
    });
}

/**
 * Quick render wrapper for existing effects
 * Wraps an existing render function with post-processing
 * 
 * @param {CanvasPostFX} pipeline - Pipeline instance
 * @param {Function} drawFn - Original draw function
 * @param {number} deltaTime - Frame delta time
 */
export function renderWithFX(pipeline, drawFn, deltaTime = 0.016) {
    pipeline.render(drawFn, deltaTime);
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
    CanvasPostFX,
    createCanvasPipeline,
    renderWithFX
};
