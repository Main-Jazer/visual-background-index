/**
 * ThreeEffectBase.js
 * Specialized base class for Three.js effects
 * Extends EffectBase with Three.js-specific functionality
 */

import * as THREE from '../../Three.js';
import { EffectBase } from './EffectBase.js';
import { mouse } from '../engine/jazer-background-engine.js';

export class ThreeEffectBase extends EffectBase {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this._resizeHandler = null;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
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
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
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
    mouse.update();
    this.render(time, deltaTime);
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
    super.dispose();

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    // Dispose of Three.js objects
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.clock = null;
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
      ...super.getDefaultConfig()
    };
  }
}
