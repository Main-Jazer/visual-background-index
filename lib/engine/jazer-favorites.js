/**
 * JaZeR Favorites Module
 * Manages favorite effects with localStorage persistence
 */

const STORAGE_KEY = 'jazer-favorites';

// === FAVORITES STATE ===
class FavoritesManager {
    constructor() {
        this.favorites = this.load();
        this.listeners = [];
    }

    // Load favorites from localStorage
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('[JaZeR Favorites] Failed to load favorites:', e);
            return [];
        }
    }

    // Save favorites to localStorage
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites));
            this.notifyListeners();
        } catch (e) {
            console.error('[JaZeR Favorites] Failed to save favorites:', e);
        }
    }

    // Add a favorite
    add(filename) {
        if (!this.favorites.includes(filename)) {
            this.favorites.push(filename);
            this.save();
            return true;
        }
        return false;
    }

    // Remove a favorite
    remove(filename) {
        const index = this.favorites.indexOf(filename);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }

    // Toggle a favorite
    toggle(filename) {
        if (this.isFavorite(filename)) {
            this.remove(filename);
            return false;
        } else {
            this.add(filename);
            return true;
        }
    }

    // Check if a file is favorited
    isFavorite(filename) {
        return this.favorites.includes(filename);
    }

    // Get all favorites
    getAll() {
        return [...this.favorites];
    }

    // Get count
    count() {
        return this.favorites.length;
    }

    // Clear all favorites
    clear() {
        this.favorites = [];
        this.save();
    }

    // Listen for changes
    onChange(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    // Notify listeners
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.favorites);
            } catch (e) {
                console.error('[JaZeR Favorites] Listener error:', e);
            }
        });
    }

    // Export favorites
    export() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            favorites: this.favorites
        };
        return JSON.stringify(data, null, 2);
    }

    // Import favorites
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data.favorites)) {
                this.favorites = data.favorites;
                this.save();
                return true;
            }
        } catch (e) {
            console.error('[JaZeR Favorites] Import failed:', e);
        }
        return false;
    }
}

// === SINGLETON INSTANCE ===
const favorites = new FavoritesManager();

// === EXPORTS ===
export default favorites;
export { FavoritesManager };
