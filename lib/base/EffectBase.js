/**
 * EffectBase.js
 * Base class that all effects extend
 * Provides common lifecycle methods and functionality
 */

export class EffectBase {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.config = { ...this.getDefaultConfig(), ...config };
    this.isRunning = false;
    this.animationFrameId = null;
    this.time = 0;
    this.lastFrameTime = 0;
  }

  /**
   * Lifecycle methods (to be overridden by subclasses)
   */
  
  // Initialize the effect (load resources, setup scene, etc.)
  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  // Update effect state each frame
  update(time, deltaTime) {
    // Override in subclass
  }

  // Handle window resize
  resize(width, height) {
    // Override in subclass
  }

  // Clean up resources
  dispose() {
    this.stop();
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /**
   * Common functionality
   */
  
  // Start the animation loop
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this._animate();
  }

  // Stop the animation loop
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Internal animation loop
  _animate() {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.time += deltaTime;

    this.update(this.time, deltaTime);

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * Metadata methods (to be overridden by subclasses)
   */
  
  // Get effect name
  getName() {
    return 'Base Effect';
  }

  // Get effect category
  getCategory() {
    return 'uncategorized';
  }

  // Get effect description
  getDescription() {
    return 'Base effect class';
  }

  // Get effect tags
  getTags() {
    return [];
  }

  // Get default configuration
  getDefaultConfig() {
    return {};
  }
}
