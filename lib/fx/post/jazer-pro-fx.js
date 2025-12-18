// jazer-pro-fx.js
// JaZeR Pro FX Wrapper - One-Line Premium Post-Processing
// ============================================================================
// Usage: import { initProFX } from '../lib/fx/post/jazer-pro-fx.js';
//        initProFX(canvas);  // Instant pro effects!
// ============================================================================

import { FX_PRESETS, PostFXManager, getDefaultManager } from './jazer-post-fx.js';
import { CanvasPostFX, createCanvasPipeline } from '../canvas/jazer-canvas-fx.js';
import { JaZeRComposer, createJazerComposer } from '../three/jazer-three-fx.js';

// ---------------------------------------------------------
// PRO FX WRAPPER CLASS
// ---------------------------------------------------------

class ProFX {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.options = {
            preset: options.preset || 'neon',
            showHUD: options.showHUD ?? false,
            keyboardShortcuts: options.keyboardShortcuts ?? true,
            autoStart: options.autoStart ?? true,
            ...options
        };

        this.enabled = true;
        this.currentPresetIndex = 0;
        this.presetNames = Object.keys(FX_PRESETS);
        this.pipeline = null;
        this.hudElement = null;
        this.fpsHistory = [];
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;

        // Set initial preset index
        this.currentPresetIndex = this.presetNames.indexOf(this.options.preset);
        if (this.currentPresetIndex === -1) this.currentPresetIndex = 1; // Default to 'neon'

        this._init();
    }

    _init() {
        // Create Canvas 2D pipeline
        this.pipeline = createCanvasPipeline(this.canvas, {
            preset: this.options.preset,
            quality: 'high'
        });

        // Setup keyboard shortcuts
        if (this.options.keyboardShortcuts) {
            this._setupKeyboard();
        }

        // Setup HUD
        if (this.options.showHUD) {
            this._createHUD();
        }

        console.log(`🎨 Pro FX initialized with preset: ${this.options.preset}`);
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === '[') {
                this.prevPreset();
            } else if (e.key === ']') {
                this.nextPreset();
            } else if (e.key.toLowerCase() === 'p') {
                this.toggle();
            } else if (e.key.toLowerCase() === 'h') {
                this.toggleHUD();
            }
        });
    }

    _createHUD() {
        this.hudElement = document.createElement('div');
        this.hudElement.id = 'pro-fx-hud';
        this.hudElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00f5ff;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid rgba(0, 245, 255, 0.3);
            z-index: 10000;
            pointer-events: none;
            backdrop-filter: blur(10px);
            min-width: 140px;
        `;
        document.body.appendChild(this.hudElement);
        this._updateHUD();
    }

    _updateHUD() {
        if (!this.hudElement) return;

        const preset = this.presetNames[this.currentPresetIndex];
        const status = this.enabled ? '✓ ON' : '✗ OFF';
        const statusColor = this.enabled ? '#39ff14' : '#ff0055';

        this.hudElement.innerHTML = `
            <div style="margin-bottom: 5px; color: #ff2aff; font-weight: bold;">🎬 PRO FX</div>
            <div>Preset: <span style="color: #ffd700">${preset}</span></div>
            <div>Status: <span style="color: ${statusColor}">${status}</span></div>
            <div>FPS: <span style="color: #00f5ff">${this.fps}</span></div>
            <div style="margin-top: 8px; font-size: 10px; color: rgba(255,255,255,0.5);">
                [ ] presets · P toggle · H hud
            </div>
        `;
    }

    _updateFPS() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFrameTime;

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFrameTime = now;
            this._updateHUD();
        }
    }

    // ---------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------

    /**
     * Render with post-processing
     * @param {Function} drawFn - Function that draws the scene: (ctx, width, height) => void
     * @param {number} deltaTime - Time since last frame in seconds
     */
    render(drawFn, deltaTime = 0.016) {
        this._updateFPS();

        if (this.enabled && this.pipeline) {
            this.pipeline.render(drawFn, deltaTime);
        } else {
            // Bypass - render directly
            const ctx = this.canvas.getContext('2d');
            drawFn(ctx, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Set preset by name
     */
    setPreset(name) {
        const index = this.presetNames.indexOf(name);
        if (index !== -1) {
            this.currentPresetIndex = index;
            if (this.pipeline) {
                this.pipeline.setPreset(name);
            }
            this._updateHUD();
            console.log(`🎨 Preset changed to: ${name}`);
        }
    }

    /**
     * Cycle to next preset
     */
    nextPreset() {
        this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presetNames.length;
        const name = this.presetNames[this.currentPresetIndex];
        this.setPreset(name);
    }

    /**
     * Cycle to previous preset
     */
    prevPreset() {
        this.currentPresetIndex = (this.currentPresetIndex - 1 + this.presetNames.length) % this.presetNames.length;
        const name = this.presetNames[this.currentPresetIndex];
        this.setPreset(name);
    }

    /**
     * Toggle post-processing on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        this._updateHUD();
        console.log(`🎨 Pro FX ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Toggle HUD visibility
     */
    toggleHUD() {
        if (this.hudElement) {
            this.hudElement.style.display = this.hudElement.style.display === 'none' ? 'block' : 'none';
        } else {
            this._createHUD();
        }
    }

    /**
     * Get current preset name
     */
    getPreset() {
        return this.presetNames[this.currentPresetIndex];
    }

    /**
     * Check if enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.pipeline && this.pipeline.dispose) {
            this.pipeline.dispose();
        }
        if (this.hudElement) {
            this.hudElement.remove();
        }
    }
}

// ---------------------------------------------------------
// QUICK INITIALIZATION FUNCTION
// ---------------------------------------------------------

/**
 * Initialize Pro FX on a canvas element
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Object} options - Configuration options
 * @returns {ProFX} The Pro FX instance
 * 
 * @example
 * // Minimal usage
 * const fx = initProFX(canvas);
 * 
 * // With options
 * const fx = initProFX(canvas, { 
 *   preset: 'cinematic', 
 *   showHUD: true 
 * });
 * 
 * // In your render loop
 * function animate() {
 *   fx.render((ctx, w, h) => {
 *     // Draw your scene here
 *     ctx.fillStyle = '#000';
 *     ctx.fillRect(0, 0, w, h);
 *   }, 0.016);
 *   requestAnimationFrame(animate);
 * }
 */
export function initProFX(canvas, options = {}) {
    return new ProFX(canvas, options);
}

/**
 * Wrap an existing render function with Pro FX
 * Use this when you have an existing effect and want to add post-processing
 * 
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Function} originalRenderFn - Original render function
 * @param {Object} options - Pro FX options
 * @returns {Function} New render function with FX applied
 * 
 * @example
 * // Original render loop
 * function render() {
 *   drawScene();
 *   requestAnimationFrame(render);
 * }
 * 
 * // Wrap with Pro FX
 * const wrappedRender = wrapWithProFX(canvas, drawScene, { preset: 'neon' });
 * function animate() {
 *   wrappedRender();
 *   requestAnimationFrame(animate);
 * }
 */
export function wrapWithProFX(canvas, originalRenderFn, options = {}) {
    const fx = new ProFX(canvas, options);

    return function wrappedRender(deltaTime = 0.016) {
        fx.render((ctx, w, h) => {
            originalRenderFn(ctx, w, h);
        }, deltaTime);
    };
}

// ---------------------------------------------------------
// THREE.JS PRO FX WRAPPER CLASS
// ---------------------------------------------------------

class ThreeProFX {
    constructor(THREE, renderer, scene, camera, options = {}) {
        this.THREE = THREE;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.options = {
            preset: options.preset || 'neon',
            showHUD: options.showHUD ?? false,
            keyboardShortcuts: options.keyboardShortcuts ?? true,
            ...options
        };

        this.enabled = true;
        this.currentPresetIndex = 0;
        this.presetNames = Object.keys(FX_PRESETS);
        this.composer = null;
        this.hudElement = null;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;

        // Set initial preset index
        this.currentPresetIndex = this.presetNames.indexOf(this.options.preset);
        if (this.currentPresetIndex === -1) this.currentPresetIndex = 1; // Default to 'neon'

        this._init();
    }

    _init() {
        // Create Three.js post-processing composer
        this.composer = createJazerComposer(this.THREE, this.renderer, {
            preset: this.options.preset,
            quality: 'high'
        });

        // Setup keyboard shortcuts
        if (this.options.keyboardShortcuts) {
            this._setupKeyboard();
        }

        // Setup HUD
        if (this.options.showHUD) {
            this._createHUD();
        }

        console.log(`🎬 Three.js Pro FX initialized with preset: ${this.options.preset}`);
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === '[') {
                this.prevPreset();
            } else if (e.key === ']') {
                this.nextPreset();
            } else if (e.key.toLowerCase() === 'p') {
                this.toggle();
            } else if (e.key.toLowerCase() === 'h') {
                this.toggleHUD();
            }
        });
    }

    _createHUD() {
        this.hudElement = document.createElement('div');
        this.hudElement.id = 'pro-fx-hud';
        this.hudElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00f5ff;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid rgba(0, 245, 255, 0.3);
            z-index: 10000;
            pointer-events: none;
            backdrop-filter: blur(10px);
            min-width: 140px;
        `;
        document.body.appendChild(this.hudElement);
        this._updateHUD();
    }

    _updateHUD() {
        if (!this.hudElement) return;

        const preset = this.presetNames[this.currentPresetIndex];
        const status = this.enabled ? '✓ ON' : '✗ OFF';
        const statusColor = this.enabled ? '#39ff14' : '#ff0055';

        this.hudElement.innerHTML = `
            <div style="margin-bottom: 5px; color: #ff2aff; font-weight: bold;">🎬 THREE PRO FX</div>
            <div>Preset: <span style="color: #ffd700">${preset}</span></div>
            <div>Status: <span style="color: ${statusColor}">${status}</span></div>
            <div>FPS: <span style="color: #00f5ff">${this.fps}</span></div>
            <div style="margin-top: 8px; font-size: 10px; color: rgba(255,255,255,0.5);">
                [ ] presets · P toggle · H hud
            </div>
        `;
    }

    _updateFPS() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFrameTime;

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFrameTime = now;
            this._updateHUD();
        }
    }

    // ---------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------

    /**
     * Render scene with post-processing
     * @param {number} deltaTime - Time since last frame in seconds
     */
    render(deltaTime = 0.016) {
        this._updateFPS();

        if (this.enabled && this.composer) {
            this.composer.render(this.scene, this.camera, deltaTime);
        } else {
            // Bypass - render directly
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Set preset by name
     */
    setPreset(name) {
        const index = this.presetNames.indexOf(name);
        if (index !== -1) {
            this.currentPresetIndex = index;
            if (this.composer) {
                this.composer.setPreset(name);
            }
            this._updateHUD();
            console.log(`🎬 Preset changed to: ${name}`);
        }
    }

    /**
     * Cycle to next preset
     */
    nextPreset() {
        this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presetNames.length;
        const name = this.presetNames[this.currentPresetIndex];
        this.setPreset(name);
    }

    /**
     * Cycle to previous preset
     */
    prevPreset() {
        this.currentPresetIndex = (this.currentPresetIndex - 1 + this.presetNames.length) % this.presetNames.length;
        const name = this.presetNames[this.currentPresetIndex];
        this.setPreset(name);
    }

    /**
     * Toggle post-processing on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        this._updateHUD();
        console.log(`🎬 Pro FX ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Toggle HUD visibility
     */
    toggleHUD() {
        if (this.hudElement) {
            this.hudElement.style.display = this.hudElement.style.display === 'none' ? 'block' : 'none';
        } else {
            this._createHUD();
        }
    }

    /**
     * Get current preset name
     */
    getPreset() {
        return this.presetNames[this.currentPresetIndex];
    }

    /**
     * Check if enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Handle window resize
     */
    setSize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.composer && this.composer.dispose) {
            this.composer.dispose();
        }
        if (this.hudElement) {
            this.hudElement.remove();
        }
    }
}

// ---------------------------------------------------------
// THREE.JS QUICK INITIALIZATION FUNCTION
// ---------------------------------------------------------

/**
 * Initialize Pro FX for Three.js scenes
 * @param {THREE} THREE - Three.js module
 * @param {WebGLRenderer} renderer - Three.js renderer
 * @param {Scene} scene - Three.js scene
 * @param {Camera} camera - Three.js camera
 * @param {Object} options - Configuration options
 * @returns {ThreeProFX} The Pro FX instance
 * 
 * @example
 * import { initThreeProFX } from '../lib/fx/post/jazer-pro-fx.js';
 *
 * const fx = initThreeProFX(THREE, renderer, scene, camera, {
 *   preset: 'neon',
 *   showHUD: true
 * });
 * 
 * // In your animate loop (replaces renderer.render):
 * function animate() {
 *   requestAnimationFrame(animate);
 *   fx.render(deltaTime);
 * }
 */
export function initThreeProFX(THREE, renderer, scene, camera, options = {}) {
    return new ThreeProFX(THREE, renderer, scene, camera, options);
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export { ProFX, ThreeProFX, FX_PRESETS };

export default {
    initProFX,
    initThreeProFX,
    wrapWithProFX,
    ProFX,
    ThreeProFX,
    FX_PRESETS
};
