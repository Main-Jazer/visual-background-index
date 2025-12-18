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
    this.isDisposed = false;
    this.animationFrameId = null;
    this.time = 0;
    this.lastFrameTime = 0;
    this.resizeObserver = null;
    
    // Bind methods for safety
    this._animate = this._animate.bind(this);
    this._handleResize = this._handleResize.bind(this);
    
    this._initResizeObserver();
  }

  _initResizeObserver() {
    if (this.canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this.canvas) {
            // Get physical pixels for better sharpness on high-DPI screens
            const width = entry.devicePixelContentBoxSize 
              ? entry.devicePixelContentBoxSize[0].inlineSize 
              : entry.contentRect.width * (window.devicePixelRatio || 1);
              
            const height = entry.devicePixelContentBoxSize 
              ? entry.devicePixelContentBoxSize[0].blockSize 
              : entry.contentRect.height * (window.devicePixelRatio || 1);
            
            this.resize(width, height);
          }
        }
      });
      this.resizeObserver.observe(this.canvas);
    } else {
      // Fallback for older environments
      window.addEventListener('resize', this._handleResize);
    }
  }
  
  _handleResize() {
     if (this.canvas) {
       this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
     }
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
    if (this.isDisposed) return;
    this.stop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    window.removeEventListener('resize', this._handleResize);
    
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
    this.isDisposed = true;
  }

  /**
   * Common functionality
   */
  
  // Start the animation loop
  start() {
    if (this.isRunning || this.isDisposed) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this._animate();
  }

  // Stop the animation loop
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Internal animation loop
  _animate() {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this._animate);

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1); // Cap dt to prevent huge jumps
    this.lastFrameTime = now;
    this.time += deltaTime;

    this.update(this.time, deltaTime);
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
