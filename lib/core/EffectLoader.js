/**
 * EffectLoader.js
 * Lazy loading system with proper resource management
 * Handles loading, unloading, and switching between effects
 */

export class EffectLoader {
  constructor(registry) {
    this.registry = registry;
    this.currentEffect = null;
    this.canvas = null;
  }

  /**
   * Load and start an effect
   * @param {string} effectName - The name of the effect to load
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {object} config - Optional configuration for the effect
   * @returns {Promise<EffectBase>} The loaded effect instance
   */
  async loadEffect(effectName, canvas, config = {}) {
    // Cleanup previous effect
    if (this.currentEffect) {
      this.currentEffect.stop();
      this.currentEffect.dispose();
      this.currentEffect = null;
    }

    // Get effect class from registry
    const EffectClass = this.registry.get(effectName);
    if (!EffectClass) {
      throw new Error(`Effect "${effectName}" not found in registry`);
    }

    // Validate canvas
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Valid canvas element is required');
    }

    this.canvas = canvas;

    // Create and initialize effect
    try {
      this.currentEffect = new EffectClass(canvas, config);
      await this.currentEffect.init();
      this.currentEffect.start();
      
      return this.currentEffect;
    } catch (error) {
      // Clean up on error
      if (this.currentEffect) {
        this.currentEffect.dispose();
        this.currentEffect = null;
      }
      throw new Error(`Failed to load effect "${effectName}": ${error.message}`);
    }
  }

  /**
   * Unload the current effect and clean up resources
   */
  unload() {
    if (this.currentEffect) {
      this.currentEffect.stop();
      this.currentEffect.dispose();
      this.currentEffect = null;
    }
  }

  /**
   * Get the currently loaded effect
   * @returns {EffectBase|null} The current effect or null
   */
  getCurrentEffect() {
    return this.currentEffect;
  }

  /**
   * Check if an effect is currently loaded
   * @returns {boolean} True if an effect is loaded
   */
  isEffectLoaded() {
    return this.currentEffect !== null;
  }

  /**
   * Pause the current effect (stop animation loop)
   */
  pause() {
    if (this.currentEffect && this.currentEffect.isRunning) {
      this.currentEffect.stop();
    }
  }

  /**
   * Resume the current effect (start animation loop)
   */
  resume() {
    if (this.currentEffect && !this.currentEffect.isRunning) {
      this.currentEffect.start();
    }
  }

  /**
   * Reload the current effect with new configuration
   * @param {object} config - New configuration
   */
  async reloadWithConfig(config) {
    if (!this.currentEffect) {
      throw new Error('No effect is currently loaded');
    }

    const effectName = this.currentEffect.getName();
    await this.loadEffect(effectName, this.canvas, config);
  }
}
