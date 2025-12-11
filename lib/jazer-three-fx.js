// jazer-three-fx.js
// JaZeR Three.js Post-Processing Integration
// Professional EffectComposer-based pipeline for Three.js effects
// ============================================================================

import {
    FX_PRESETS,
    QUALITY_LEVELS,
    POST_FX_SHADERS,
    PostFXManager,
    getDefaultManager,
    clamp
} from './jazer-post-fx.js';

// ---------------------------------------------------------
// SHADER MATERIAL FACTORY
// ---------------------------------------------------------

function createShaderMaterial(THREE, vertexShader, fragmentShader, uniforms = {}) {
    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false
    });
}

// ---------------------------------------------------------
// CUSTOM SHADER PASSES
// ---------------------------------------------------------

/**
 * Base class for custom shader passes
 */
class ShaderPass {
    constructor(THREE, shader, textureID = 'tDiffuse') {
        this.textureID = textureID;
        this.uniforms = THREE.UniformsUtils ?
            THREE.UniformsUtils.clone(shader.uniforms) :
            JSON.parse(JSON.stringify(shader.uniforms));

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            depthTest: false,
            depthWrite: false
        });

        this.fsQuad = null; // Will be set up by composer
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        if (this.uniforms[this.textureID]) {
            this.uniforms[this.textureID].value = readBuffer.texture;
        }

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
            if (this.clear) renderer.clear();
        }

        this.fsQuad.render(renderer);
    }

    setSize(width, height) {
        // Override in subclasses if needed
    }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// BLOOM PASS (Multi-pass Kawase blur based)
// ---------------------------------------------------------

class JaZeRBloomPass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;

        this.intensity = options.intensity ?? 0.8;
        this.threshold = options.threshold ?? 0.4;
        this.radius = options.radius ?? 0.5;
        this.smoothing = options.smoothing ?? 0.05;
        this.passes = options.passes ?? 5;

        this.renderTargets = [];
        this.thresholdMaterial = null;
        this.blurMaterial = null;
        this.compositeMaterial = null;

        this._initMaterials();
    }

    _initMaterials() {
        const THREE = this.THREE;

        // Threshold material
        this.thresholdMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                threshold: { value: this.threshold },
                smoothing: { value: this.smoothing }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.bloomThreshold,
            depthTest: false,
            depthWrite: false
        });

        // Kawase blur material
        this.blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2() },
                offset: { value: 1.0 }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.kawaseBlur,
            depthTest: false,
            depthWrite: false
        });

        // Composite material
        this.compositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tBloom: { value: null },
                intensity: { value: this.intensity }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.bloomComposite,
            depthTest: false,
            depthWrite: false
        });
    }

    setSize(width, height) {
        const THREE = this.THREE;

        // Dispose old targets
        this.renderTargets.forEach(rt => rt.dispose());
        this.renderTargets = [];

        // Create mip chain
        let w = Math.floor(width / 2);
        let h = Math.floor(height / 2);

        for (let i = 0; i < this.passes; i++) {
            const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            });
            this.renderTargets.push(rt);
            w = Math.floor(w / 2);
            h = Math.floor(h / 2);
        }
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled || this.renderTargets.length === 0) return;

        const THREE = this.THREE;

        // 1. Extract bright areas
        this.thresholdMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        this.thresholdMaterial.uniforms.threshold.value = this.threshold;
        this.thresholdMaterial.uniforms.smoothing.value = this.smoothing;

        renderer.setRenderTarget(this.renderTargets[0]);
        fsQuad.material = this.thresholdMaterial;
        fsQuad.render(renderer);

        // 2. Progressive blur (downsample)
        for (let i = 1; i < this.renderTargets.length; i++) {
            const src = this.renderTargets[i - 1];
            const dst = this.renderTargets[i];

            this.blurMaterial.uniforms.tDiffuse.value = src.texture;
            this.blurMaterial.uniforms.resolution.value.set(dst.width, dst.height);
            this.blurMaterial.uniforms.offset.value = this.radius + i * 0.5;

            renderer.setRenderTarget(dst);
            fsQuad.material = this.blurMaterial;
            fsQuad.render(renderer);
        }

        // 3. Progressive blur (upsample and additive blend)
        for (let i = this.renderTargets.length - 2; i >= 0; i--) {
            const src = this.renderTargets[i + 1];
            const dst = this.renderTargets[i];

            this.blurMaterial.uniforms.tDiffuse.value = src.texture;
            this.blurMaterial.uniforms.resolution.value.set(dst.width, dst.height);
            this.blurMaterial.uniforms.offset.value = this.radius;

            renderer.setRenderTarget(dst);
            fsQuad.material = this.blurMaterial;
            fsQuad.render(renderer);
        }

        // 4. Composite bloom with original
        this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        this.compositeMaterial.uniforms.tBloom.value = this.renderTargets[0].texture;
        this.compositeMaterial.uniforms.intensity.value = this.intensity;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.compositeMaterial;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.intensity = config.intensity ?? this.intensity;
        this.threshold = config.threshold ?? this.threshold;
        this.radius = config.radius ?? this.radius;
        this.smoothing = config.smoothing ?? this.smoothing;
        this.enabled = config.enabled !== false;
    }

    dispose() {
        this.renderTargets.forEach(rt => rt.dispose());
        this.thresholdMaterial.dispose();
        this.blurMaterial.dispose();
        this.compositeMaterial.dispose();
    }
}

// ---------------------------------------------------------
// CHROMATIC ABERRATION PASS
// ---------------------------------------------------------

class JaZeRChromaticPass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = true;
        this.needsSwap = true;
        this.renderToScreen = false;

        this.intensity = options.intensity ?? 0.004;
        this.radialFalloff = options.radialFalloff !== false;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: this.intensity },
                center: { value: new THREE.Vector2(0.5, 0.5) },
                radialFalloff: { value: this.radialFalloff }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.chromaticAberration,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled) return;

        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.intensity.value = this.intensity;
        this.material.uniforms.radialFalloff.value = this.radialFalloff;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.material;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.intensity = config.intensity ?? this.intensity;
        this.radialFalloff = config.radialFalloff !== false;
        this.enabled = config.enabled !== false;
    }

    setSize(width, height) { }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// VIGNETTE PASS
// ---------------------------------------------------------

class JaZeRVignettePass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = true;
        this.needsSwap = true;
        this.renderToScreen = false;

        this.intensity = options.intensity ?? 0.4;
        this.smoothness = options.smoothness ?? 0.35;
        this.roundness = options.roundness ?? 0.8;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: this.intensity },
                smoothness: { value: this.smoothness },
                roundness: { value: this.roundness }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.vignette,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled) return;

        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.intensity.value = this.intensity;
        this.material.uniforms.smoothness.value = this.smoothness;
        this.material.uniforms.roundness.value = this.roundness;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.material;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.intensity = config.intensity ?? this.intensity;
        this.smoothness = config.smoothness ?? this.smoothness;
        this.roundness = config.roundness ?? this.roundness;
        this.enabled = config.enabled !== false;
    }

    setSize(width, height) { }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// FILM GRAIN PASS
// ---------------------------------------------------------

class JaZeRGrainPass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = true;
        this.needsSwap = true;
        this.renderToScreen = false;

        this.intensity = options.intensity ?? 0.02;
        this.size = options.size ?? 1.0;
        this.time = 0;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                intensity: { value: this.intensity },
                size: { value: this.size }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.filmGrain,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled) return;

        this.time += deltaTime * 8.0;

        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.time.value = this.time;
        this.material.uniforms.intensity.value = this.intensity;
        this.material.uniforms.size.value = this.size;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.material;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.intensity = config.intensity ?? this.intensity;
        this.size = config.size ?? this.size;
        this.enabled = config.enabled !== false;
    }

    setSize(width, height) { }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// TONEMAPPING PASS
// ---------------------------------------------------------

class JaZeRTonemapPass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = true;
        this.needsSwap = true;
        this.renderToScreen = false;

        this.exposure = options.exposure ?? 1.0;
        this.gamma = options.gamma ?? 1.0;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                exposure: { value: this.exposure },
                gamma: { value: this.gamma }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.tonemapACES,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled) return;

        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.exposure.value = this.exposure;
        this.material.uniforms.gamma.value = this.gamma;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.material;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.exposure = config.exposure ?? this.exposure;
        this.gamma = config.gamma ?? this.gamma;
        this.enabled = config.enabled !== false;
    }

    setSize(width, height) { }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// SHARPEN PASS
// ---------------------------------------------------------

class JaZeRSharpenPass {
    constructor(THREE, options = {}) {
        this.THREE = THREE;
        this.enabled = options.enabled ?? false;
        this.needsSwap = true;
        this.renderToScreen = false;

        this.intensity = options.intensity ?? 0.15;
        this.resolution = new THREE.Vector2();

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: this.resolution },
                intensity: { value: this.intensity }
            },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: POST_FX_SHADERS.sharpen,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
        if (!this.enabled) return;

        this.material.uniforms.tDiffuse.value = readBuffer.texture;
        this.material.uniforms.resolution.value.copy(this.resolution);
        this.material.uniforms.intensity.value = this.intensity;

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }

        fsQuad.material = this.material;
        fsQuad.render(renderer);
    }

    updateConfig(config) {
        this.intensity = config.intensity ?? this.intensity;
        this.enabled = config.enabled !== false;
    }

    setSize(width, height) {
        this.resolution.set(width, height);
    }

    dispose() {
        this.material.dispose();
    }
}

// ---------------------------------------------------------
// FULLSCREEN QUAD HELPER
// ---------------------------------------------------------

class FullScreenQuad {
    constructor(THREE, material) {
        this.THREE = THREE;
        this._mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            material
        );
    }

    get material() {
        return this._mesh.material;
    }

    set material(value) {
        this._mesh.material = value;
    }

    render(renderer) {
        const camera = new this.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        renderer.render(this._mesh, camera);
    }

    dispose() {
        this._mesh.geometry.dispose();
    }
}

// ---------------------------------------------------------
// JAZER EFFECT COMPOSER
// ---------------------------------------------------------

export class JaZeRComposer {
    constructor(THREE, renderer, options = {}) {
        this.THREE = THREE;
        this.renderer = renderer;
        this.manager = options.manager || getDefaultManager();

        this.width = 1;
        this.height = 1;
        this.pixelRatio = renderer.getPixelRatio();

        // Create render targets
        const params = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType // HDR support
        };

        this.renderTarget1 = new THREE.WebGLRenderTarget(1, 1, params);
        this.renderTarget2 = new THREE.WebGLRenderTarget(1, 1, params);
        this.writeBuffer = this.renderTarget1;
        this.readBuffer = this.renderTarget2;

        // Create fullscreen quad
        this.fsQuad = new FullScreenQuad(THREE, null);

        // Copy pass for initial render
        this.copyMaterial = new THREE.ShaderMaterial({
            uniforms: { tDiffuse: { value: null } },
            vertexShader: POST_FX_SHADERS.fullscreenVert,
            fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
            depthTest: false,
            depthWrite: false
        });

        // Create passes
        this.passes = {
            bloom: new JaZeRBloomPass(THREE, this.manager.getConfig().bloom),
            chromatic: new JaZeRChromaticPass(THREE, this.manager.getConfig().chromatic),
            vignette: new JaZeRVignettePass(THREE, this.manager.getConfig().vignette),
            grain: new JaZeRGrainPass(THREE, this.manager.getConfig().grain),
            tonemap: new JaZeRTonemapPass(THREE, this.manager.getConfig().tonemapping),
            sharpen: new JaZeRSharpenPass(THREE, this.manager.getConfig().sharpen)
        };

        // Pass order
        this.passOrder = ['bloom', 'chromatic', 'grain', 'tonemap', 'vignette', 'sharpen'];

        // Auto-resize
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
        this._onResize();
    }

    _onResize() {
        const size = this.renderer.getSize(new this.THREE.Vector2());
        this.setSize(size.x, size.y);
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;

        const quality = this.manager.getQuality();
        const scale = quality.resolutionScale;
        const w = Math.floor(width * scale);
        const h = Math.floor(height * scale);

        this.renderTarget1.setSize(w, h);
        this.renderTarget2.setSize(w, h);

        for (const pass of Object.values(this.passes)) {
            pass.setSize(w, h);
        }
    }

    /**
     * Render scene with post-processing
     */
    render(scene, camera, deltaTime = 0.016) {
        const config = this.manager.getEffectiveConfig();

        // Update manager timing
        this.manager.update(deltaTime);

        if (!this.manager.isEnabled()) {
            // Direct render without post-processing
            this.renderer.setRenderTarget(null);
            this.renderer.render(scene, camera);
            return;
        }

        // Update pass configs
        this.passes.bloom.updateConfig(config.bloom);
        this.passes.chromatic.updateConfig(config.chromatic);
        this.passes.vignette.updateConfig(config.vignette);
        this.passes.grain.updateConfig(config.grain);
        this.passes.tonemap.updateConfig(config.tonemapping);
        this.passes.sharpen.updateConfig(config.sharpen);

        // 1. Render scene to buffer
        this.renderer.setRenderTarget(this.readBuffer);
        this.renderer.clear();
        this.renderer.render(scene, camera);

        // 2. Apply passes in order
        let swapped = false;
        for (const passName of this.passOrder) {
            const pass = this.passes[passName];
            if (!pass.enabled) continue;

            // Swap buffers
            const temp = this.readBuffer;
            this.readBuffer = this.writeBuffer;
            this.writeBuffer = temp;

            pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, false, this.fsQuad);
            swapped = true;
        }

        // 3. Final output to screen
        const finalBuffer = swapped ? this.writeBuffer : this.readBuffer;
        this.copyMaterial.uniforms.tDiffuse.value = finalBuffer.texture;
        this.renderer.setRenderTarget(null);
        this.fsQuad.material = this.copyMaterial;
        this.fsQuad.render(this.renderer);
    }

    /**
     * Enable/disable specific pass
     */
    setPassEnabled(passName, enabled) {
        if (this.passes[passName]) {
            this.passes[passName].enabled = enabled;
        }
    }

    /**
     * Get pass by name
     */
    getPass(passName) {
        return this.passes[passName];
    }

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
        this._onResize(); // Re-apply resolution scaling
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

        this.renderTarget1.dispose();
        this.renderTarget2.dispose();
        this.fsQuad.dispose();
        this.copyMaterial.dispose();

        for (const pass of Object.values(this.passes)) {
            pass.dispose();
        }
    }
}

// ---------------------------------------------------------
// CONVENIENCE FUNCTION
// ---------------------------------------------------------

/**
 * Create a JaZeR post-processing composer
 * 
 * @param {THREE} THREE - Three.js module
 * @param {WebGLRenderer} renderer - Three.js renderer
 * @param {Object} options - Configuration options
 * @returns {JaZeRComposer} Composer instance
 * 
 * @example
 * import * as THREE from 'three';
 * import { createJazerComposer } from './jazer-three-fx.js';
 * 
 * const composer = createJazerComposer(THREE, renderer, {
 *   preset: 'neon',
 *   quality: 'high'
 * });
 * 
 * // In animation loop:
 * function animate() {
 *   requestAnimationFrame(animate);
 *   composer.render(scene, camera, deltaTime);
 * }
 */
export function createJazerComposer(THREE, renderer, options = {}) {
    const manager = new PostFXManager({
        preset: options.preset || 'neon',
        quality: options.quality || 'high',
        enabled: options.enabled !== false
    });

    return new JaZeRComposer(THREE, renderer, {
        ...options,
        manager
    });
}

/**
 * Update composer (call from animation loop)
 */
export function updateJazerComposer(composer, deltaTime) {
    composer.manager.update(deltaTime);
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export {
    JaZeRBloomPass,
    JaZeRChromaticPass,
    JaZeRVignettePass,
    JaZeRGrainPass,
    JaZeRTonemapPass,
    JaZeRSharpenPass,
    FullScreenQuad
};

export default {
    JaZeRComposer,
    createJazerComposer,
    updateJazerComposer,
    JaZeRBloomPass,
    JaZeRChromaticPass,
    JaZeRVignettePass,
    JaZeRGrainPass,
    JaZeRTonemapPass,
    JaZeRSharpenPass
};
