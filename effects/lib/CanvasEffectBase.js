/**
 * CanvasEffectBase.js
 * Specialized base class for 2D canvas effects
 * Extends EffectBase with canvas-specific functionality
 */

import { EffectBase } from './EffectBase.js';
import { mouse } from '../../jazer-background-engine.js';

export class CanvasEffectBase extends EffectBase {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.ctx = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;
    this.centerX = 0;
    this.centerY = 0;
    this._resizeHandler = null;
  }

  async init() {
    if (!this.canvas) {
      throw new Error('Canvas element is required');
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    this.setupCanvas();
    this.setupEventListeners();
    await this.createEffect();
  }

  setupCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setupEventListeners() {
    this._resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  handleResize() {
    this.setupCanvas();
    this.resize(this.width, this.height);
  }

  /**
   * Override this method to create the effect
   */
  async createEffect() {
    // Override in subclass
  }

  /**
   * Update method - called each frame
   * Automatically updates mouse before calling render
   */
  update(time, deltaTime) {
    mouse.update();
    this.render(time, deltaTime);
  }

  /**
   * Override this method to render each frame
   */
  render(time, deltaTime) {
    // Override in subclass
  }

  /**
   * Clean up resources
   */
  dispose() {
    super.dispose();
    
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Helper method to clear canvas with a color
   */
  clear(color = 'rgba(0, 0, 0, 1)') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  getDefaultConfig() {
    return {
      backgroundColor: '#000000',
      ...super.getDefaultConfig()
    };
  }
}
