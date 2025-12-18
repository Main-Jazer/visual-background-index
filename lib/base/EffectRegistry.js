/**
 * EffectRegistry.js
 * Auto-discovery and registration system for effects
 * Provides categorization, search, and retrieval functionality
 */

export class EffectRegistry {
  constructor() {
    this.effects = new Map();
    this.categories = new Map();
    this.tags = new Map();
  }

  /**
   * Register an effect class
   * @param {class} EffectClass - The effect class to register
   */
  register(EffectClass) {
    // Create a temporary instance to get metadata (without canvas)
    const instance = new EffectClass(null);
    const name = instance.getName();
    const category = instance.getCategory();
    const effectTags = instance.getTags();

    // Store the class
    this.effects.set(name, {
      class: EffectClass,
      name: name,
      category: category,
      description: instance.getDescription(),
      tags: effectTags
    });

    // Update category index
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(name);

    // Update tag index
    effectTags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, []);
      }
      this.tags.get(tag).push(name);
    });
  }

  /**
   * Get effect class by name
   * @param {string} name - The effect name
   * @returns {class|null} The effect class or null if not found
   */
  get(name) {
    const entry = this.effects.get(name);
    return entry ? entry.class : null;
  }

  /**
   * Get effect metadata by name
   * @param {string} name - The effect name
   * @returns {object|null} The effect metadata or null if not found
   */
  getMetadata(name) {
    return this.effects.get(name) || null;
  }

  /**
   * Get all registered effect names
   * @returns {Array<string>} Array of effect names
   */
  getAllEffects() {
    return Array.from(this.effects.keys());
  }

  /**
   * Get all effects with their metadata
   * @returns {Array<object>} Array of effect metadata objects
   */
  getAllEffectsWithMetadata() {
    return Array.from(this.effects.values());
  }

  /**
   * Get effect names by category
   * @param {string} category - The category name
   * @returns {Array<string>} Array of effect names in the category
   */
  getByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all category names
   * @returns {Array<string>} Array of category names
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Get effect names by tag
   * @param {string} tag - The tag name
   * @returns {Array<string>} Array of effect names with the tag
   */
  getByTag(tag) {
    return this.tags.get(tag) || [];
  }

  /**
   * Get all tag names
   * @returns {Array<string>} Array of tag names
   */
  getTags() {
    return Array.from(this.tags.keys());
  }

  /**
   * Search effects by query string
   * Searches in name, description, category, and tags
   * @param {string} query - The search query
   * @returns {Array<object>} Array of matching effect metadata
   */
  search(query) {
    if (!query || query.trim() === '') {
      return this.getAllEffectsWithMetadata();
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const [name, metadata] of this.effects) {
      const searchText = [
        metadata.name,
        metadata.description,
        metadata.category,
        ...metadata.tags
      ].join(' ').toLowerCase();

      if (searchText.includes(lowerQuery)) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Filter effects by category and/or tags
   * @param {object} filters - Filter options
   * @param {string} filters.category - Category to filter by
   * @param {Array<string>} filters.tags - Tags to filter by (AND logic)
   * @returns {Array<object>} Array of matching effect metadata
   */
  filter({ category = null, tags = [] } = {}) {
    let results = this.getAllEffectsWithMetadata();

    if (category) {
      results = results.filter(effect => effect.category === category);
    }

    if (tags && tags.length > 0) {
      results = results.filter(effect => {
        return tags.every(tag => effect.tags.includes(tag));
      });
    }

    return results;
  }

  /**
   * Get count of registered effects
   * @returns {number} Number of registered effects
   */
  getCount() {
    return this.effects.size;
  }

  /**
   * Check if an effect is registered
   * @param {string} name - The effect name
   * @returns {boolean} True if registered, false otherwise
   */
  has(name) {
    return this.effects.has(name);
  }
}

// Global registry instance
export const registry = new EffectRegistry();
