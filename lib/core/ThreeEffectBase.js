/**
 * ThreeEffectBase.js
 * Specialized base class for Three.js effects
 * Extends EffectBase with Three.js-specific functionality
 */

import * as THREE from '../Three.js';
import { EffectBase } from './EffectBase.js';
import { mouse, AdaptiveResolution } from '../engine/jazer-background-engine.js';

export class ThreeEffectBase extends EffectBase {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this._resizeHandler = null;
    this._adaptiveResolution = this.config.autoQuality === false ? null : new AdaptiveResolution();
    this._qualityCheckFrame = 0;
    this._lastAppliedPixelRatio = null;
  }

  async init() {
    if (!this.canvas) {
      throw new Error('Canvas element is required');
    }

    this.initThreeJS();
    await this.createScene();
    this.setupEventListeners();
  }

  initThreeJS() {
    // Create scene
    this.scene = new THREE.Scene();

    // Create camera
    const config = this.config;
    this.camera = new THREE.PerspectiveCamera(
      config.fov || 75,
      window.innerWidth / window.innerHeight,
      config.near || 0.1,
      config.far || 2000
    );
    this.camera.position.z = config.cameraZ || 15;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: config.antialias !== false,
      alpha: config.alpha !== false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this._adaptiveResolution) {
      const { pixelRatio } = this._adaptiveResolution.getSettings();
      this.renderer.setPixelRatio(pixelRatio);
      this._lastAppliedPixelRatio = pixelRatio;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    if (config.clearColor !== undefined) {
      this.renderer.setClearColor(config.clearColor, config.clearAlpha || 0);
    }

    // Create clock for timing
    this.clock = new THREE.Clock();

    // Add basic lighting if configured
    if (config.ambientLight !== false) {
      const ambientLight = new THREE.AmbientLight(
        config.ambientColor || 0x222255,
        config.ambientIntensity || 0.3
      );
      this.scene.add(ambientLight);
    }
  }

  setupEventListeners() {
    this._resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    if (this._adaptiveResolution) {
      this._adaptiveResolution.applyToRenderer(this.renderer, window.innerWidth, window.innerHeight, true);
      this._lastAppliedPixelRatio = this._adaptiveResolution.getSettings().pixelRatio;
    } else {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    this.resize(window.innerWidth, window.innerHeight);
  }

  /**
   * Override this method to create the Three.js scene
   */
  async createScene() {
    // Override in subclass
  }

  /**
   * Update method - called each frame
   */
  update(time, deltaTime) {
    if (this._adaptiveResolution) {
      this._adaptiveResolution.beginFrame();
      this._qualityCheckFrame++;

      if ((this._qualityCheckFrame % (this.config.qualityUpdateIntervalFrames || 30)) === 0) {
        const { pixelRatio } = this._adaptiveResolution.getSettings();
        if (this._lastAppliedPixelRatio === null || Math.abs(pixelRatio - this._lastAppliedPixelRatio) > 0.01) {
          this._adaptiveResolution.applyToRenderer(this.renderer, window.innerWidth, window.innerHeight, true);
          this._lastAppliedPixelRatio = pixelRatio;
        }
      }
    }

    mouse.update(deltaTime);
    this.render(time, deltaTime);

    if (this._adaptiveResolution) {
      this._adaptiveResolution.endFrame();
    }
  }

  /**
   * Override this method to update scene and render
   */
  render(time, deltaTime) {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Clean up Three.js resources
   */
  dispose() {
    // 1. Stop loop and remove listeners
    super.dispose();

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    // 2. Recursive traversal for deep cleanup
    if (this.scene) {
      this._disposeNode(this.scene);
      this.scene.clear();
      this.scene = null;
    }

    // 3. Renderer cleanup
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    this.camera = null;
    this.clock = null;

    if (this._adaptiveResolution) {
      this._adaptiveResolution.destroy();
      this._adaptiveResolution = null;
    }
  }

  /**
   * Expert-level recursive disposal helper
   */
  _disposeNode(node) {
    if (!node) return;

    // Recurse first
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        this._disposeNode(node.children[i]);
      }
    }

    // Dispose Geometry
    if (node.geometry) {
      node.geometry.dispose();
    }

    // Dispose Material(s) & Textures
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      
      materials.forEach(mat => {
        // Dispose textures inside material
        for (const key of Object.keys(mat)) {
          const prop = mat[key];
          if (prop && typeof prop === 'object' && 'isTexture' in prop && prop.isTexture) {
            prop.dispose();
          }
        }
        // Dispose uniforms that are textures (ShaderMaterial)
        if (mat.uniforms) {
           for (const key of Object.keys(mat.uniforms)) {
             const uniform = mat.uniforms[key];
             if (uniform && uniform.value && typeof uniform.value === 'object' && 'isTexture' in uniform.value && uniform.value.isTexture) {
               uniform.value.dispose();
             }
           }
        }
        
        mat.dispose();
      });
    }
  }

  getDefaultConfig() {
    return {
      fov: 75,
      near: 0.1,
      far: 2000,
      cameraZ: 15,
      antialias: true,
      alpha: true,
      ambientLight: true,
      ambientColor: 0x222255,
      ambientIntensity: 0.3,
      autoQuality: true,
      qualityUpdateIntervalFrames: 30,
      ...super.getDefaultConfig()
    };
  }

  getQualitySettings() {
    return this._adaptiveResolution ? this._adaptiveResolution.getSettings() : { level: 'high', resolutionScale: 1, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) };
  }
}
