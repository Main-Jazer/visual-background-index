// jazer-palette.js
// JaZeR Palette Module
// Color discipline with accent awareness and gradient generation
// ============================================================================

/**
 * Base color palettes from the engine
 * Curated for high-end visual aesthetics
 */
export const PALETTES = {
    jazer: ['#00f5ff', '#ff2aff', '#b37cff', '#ffd86b'],
    cyberpunk: ['#ff0055', '#00ffff', '#ff00ff', '#ffff00'],
    ocean: ['#0077be', '#00a8e8', '#00d4ff', '#89cff0'],
    sunset: ['#ff6b35', '#f7c59f', '#efa0cd', '#7d5ba6'],
    matrix: ['#00ff00', '#00cc00', '#009900', '#006600'],
    vapor: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
    fire: ['#ff0000', '#ff5400', '#ff9900', '#ffcc00'],
    ice: ['#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4'],
    galaxy: ['#4c1d95', '#7c3aed', '#a78bfa', '#f472b6'],
    neon: ['#39ff14', '#ff073a', '#ff61d8', '#00f0ff'],
    midnight: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
    gold: ['#ffd700', '#daa520', '#b8860b', '#cd7f32'],
    aurora: ['#00ff87', '#60efff', '#ff00ff', '#ffff00'],
    blood: ['#8b0000', '#dc143c', '#ff4500', '#ff6347'],
    forest: ['#228b22', '#32cd32', '#90ee90', '#006400'],
    synthwave: ['#ff00ff', '#00ffff', '#ff6ec7', '#9d00ff'],
    cosmic: ['#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff', '#f72585'],
    plasma: ['#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8'],
    ethereal: ['#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#00b4d8'],
    inferno: ['#ff4800', '#ff5400', '#ff6000', '#ff6d00', '#ff7900'],
    nebula: ['#3a0ca3', '#4361ee', '#4895ef', '#4cc9f0', '#7b2cbf'],
    sacred: ['#ffd700', '#ffffff', '#00f5ff', '#ff2aff', '#b37cff'],
    quantum: ['#00f5ff', '#00d4ff', '#00b4d8', '#0096c7', '#0077b6'],
    void: ['#10002b', '#240046', '#3c096c', '#5a189a', '#7b2cbf']
};


/**
 * Palette - Wrapper for color palettes with accent awareness
 * 
 * Provides weighted color selection to maintain visual discipline:
 * - Primary colors are used most often
 * - Accent colors are rare, intentional highlights
 */
export class Palette {
    /**
     * Create a palette from a name or array
     * @param {string|Array} source - Palette name or color array
     * @param {Object} options - Configuration
     */
    constructor(source, options = {}) {
        // Resolve colors
        if (typeof source === 'string') {
            this.name = source;
            this.colors = [...(PALETTES[source] || PALETTES.jazer)];
        } else if (Array.isArray(source)) {
            this.name = 'custom';
            this.colors = [...source];
        } else {
            this.name = 'jazer';
            this.colors = [...PALETTES.jazer];
        }

        // Color roles
        this.primaryIndex = options.primary ?? 0;
        this.secondaryIndex = options.secondary ?? 1;
        this.accentIndex = options.accent ?? this.colors.length - 1;

        // Weights for random selection
        // Default: primary 40%, secondary 30%, others 25%, accent 5%
        this.accentWeight = options.accentWeight ?? 0.05;
        this.primaryWeight = options.primaryWeight ?? 0.40;
        this.secondaryWeight = options.secondaryWeight ?? 0.30;

        // Pre-calculate weights for random selection
        this._buildWeights();
    }

    /**
     * Build weighted selection array
     * @private
     */
    _buildWeights() {
        const n = this.colors.length;
        this.weights = new Array(n).fill(0);

        let remaining = 1 - this.primaryWeight - this.secondaryWeight - this.accentWeight;
        const otherWeight = remaining / Math.max(1, n - 3);

        for (let i = 0; i < n; i++) {
            if (i === this.primaryIndex) {
                this.weights[i] = this.primaryWeight;
            } else if (i === this.secondaryIndex) {
                this.weights[i] = this.secondaryWeight;
            } else if (i === this.accentIndex) {
                this.weights[i] = this.accentWeight;
            } else {
                this.weights[i] = otherWeight;
            }
        }

        // Build cumulative distribution for weighted random
        this._cumulative = [];
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += this.weights[i];
            this._cumulative.push(sum);
        }
    }

    /**
     * Get a color by index
     * @param {number} index - Color index (wraps)
     * @returns {string} Hex color
     */
    get(index) {
        return this.colors[index % this.colors.length];
    }

    /**
     * Get the primary color
     * @returns {string} Hex color
     */
    get primary() {
        return this.colors[this.primaryIndex];
    }

    /**
     * Get the secondary color
     * @returns {string} Hex color
     */
    get secondary() {
        return this.colors[this.secondaryIndex];
    }

    /**
     * Get the accent color (used sparingly!)
     * @returns {string} Hex color
     */
    get accent() {
        return this.colors[this.accentIndex];
    }

    /**
     * Get a weighted random color
     * Respects accent discipline (accent is rare)
     * @returns {string} Hex color
     */
    random() {
        const r = Math.random();
        for (let i = 0; i < this._cumulative.length; i++) {
            if (r <= this._cumulative[i]) {
                return this.colors[i];
            }
        }
        return this.colors[0];
    }

    /**
     * Get color that cycles through palette over time
     * @param {number} t - Time 0-1
     * @returns {string} Hex color (interpolated)
     */
    cycle(t) {
        const n = this.colors.length;
        const pos = t * n;
        const i = Math.floor(pos) % n;
        const f = pos - Math.floor(pos);

        return lerpColor(this.colors[i], this.colors[(i + 1) % n], f);
    }

    /**
     * Get colors for a gradient (primary to secondary to accent)
     * @param {number} steps - Number of gradient steps
     * @returns {Array<string>} Color array
     */
    gradientColors(steps = 5) {
        const result = [];

        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);

            if (t < 0.6) {
                // Primary to secondary
                result.push(lerpColor(this.primary, this.secondary, t / 0.6));
            } else {
                // Secondary toward accent (but subtle)
                const localT = (t - 0.6) / 0.4;
                result.push(lerpColor(this.secondary, this.accent, localT * 0.4));
            }
        }

        return result;
    }

    /**
     * Static factory method
     */
    static from(source, options = {}) {
        return new Palette(source, options);
    }

    /**
     * Get list of available palette names
     */
    static list() {
        return Object.keys(PALETTES);
    }

    /**
     * Get all palettes
     */
    static all() {
        return PALETTES;
    }
}


/**
 * Gradient - Builder for Canvas 2D gradients with palette awareness
 */
export class Gradient {
    /**
     * Create a radial gradient
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x0 - Inner circle x
     * @param {number} y0 - Inner circle y
     * @param {number} r0 - Inner radius
     * @param {number} x1 - Outer circle x
     * @param {number} y1 - Outer circle y
     * @param {number} r1 - Outer radius
     * @returns {Gradient}
     */
    static radial(ctx, x0, y0, r0, x1, y1, r1) {
        const grad = new Gradient();
        grad._gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        grad._stops = [];
        return grad;
    }

    /**
     * Create a linear gradient
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x0 - Start x
     * @param {number} y0 - Start y
     * @param {number} x1 - End x
     * @param {number} y1 - End y
     * @returns {Gradient}
     */
    static linear(ctx, x0, y0, x1, y1) {
        const grad = new Gradient();
        grad._gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        grad._stops = [];
        return grad;
    }

    /**
     * Add a color stop
     * @param {number} position - Position 0-1
     * @param {string} color - CSS color
     * @param {number} alpha - Optional alpha override
     * @returns {Gradient}
     */
    addStop(position, color, alpha = 1) {
        const rgba = hexToRgba(color, alpha);
        this._gradient.addColorStop(position, rgba);
        this._stops.push({ position, color, alpha });
        return this;
    }

    /**
     * Add multiple stops from a palette
     * @param {Palette} palette - Palette instance
     * @param {Array<number>} positions - Stop positions
     * @param {number} alpha - Base alpha
     * @returns {Gradient}
     */
    addStops(palette, positions, alpha = 1) {
        positions.forEach((pos, i) => {
            // Use weighted color selection
            let color;
            if (i === 0) {
                color = palette.primary;
            } else if (i === positions.length - 1) {
                color = palette.secondary;
            } else {
                color = palette.get(i);
            }
            this.addStop(pos, color, alpha);
        });
        return this;
    }

    /**
     * Add an accent pop at a specific position
     * @param {number} position - Where to add accent
     * @param {number} alpha - Accent alpha (should be lower for subtlety)
     * @param {Palette} palette - Palette to get accent from
     * @returns {Gradient}
     */
    addAccent(position, alpha, palette) {
        const accentColor = palette ? palette.accent : '#ffd700';
        this.addStop(position, accentColor, alpha);
        return this;
    }

    /**
     * Get the native CanvasGradient
     * @returns {CanvasGradient}
     */
    get gradient() {
        return this._gradient;
    }

    /**
     * Shorthand to get native gradient (for ctx.fillStyle = grad.value)
     */
    get value() {
        return this._gradient;
    }
}


// ============================================================================
// COLOR UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex to RGB object
 * @param {string} hex - Hex color string
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert hex to RGBA string
 * @param {string} hex - Hex color
 * @param {number} alpha - Alpha value 0-1
 * @returns {string} RGBA CSS string
 */
export function hexToRgba(hex, alpha = 1) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Convert RGB to hex
 * @param {number} r - Red 0-255
 * @param {number} g - Green 0-255
 * @param {number} b - Blue 0-255
 * @returns {string} Hex color string
 */
export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Linearly interpolate between two hex colors
 * @param {string} color1 - Start color
 * @param {string} color2 - End color
 * @param {number} t - Interpolation factor 0-1
 * @returns {string} Interpolated hex color
 */
export function lerpColor(color1, color2, t) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    return rgbToHex(
        c1.r + (c2.r - c1.r) * t,
        c1.g + (c2.g - c1.g) * t,
        c1.b + (c2.b - c1.b) * t
    );
}

/**
 * HSL to RGB conversion
 * @param {number} h - Hue 0-360
 * @param {number} s - Saturation 0-1
 * @param {number} l - Lightness 0-1
 * @returns {{r: number, g: number, b: number}}
 */
export function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red 0-255
 * @param {number} g - Green 0-255
 * @param {number} b - Blue 0-255
 * @returns {{h: number, s: number, l: number}} h in degrees 0-360, s/l 0-1
 */
export function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));

        switch (max) {
            case rn:
                h = ((gn - bn) / delta) % 6;
                break;
            case gn:
                h = (bn - rn) / delta + 2;
                break;
            default:
                h = (rn - gn) / delta + 4;
                break;
        }

        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s, l };
}

/**
 * Cycle smoothly through palette colors
 * @param {string|Array<string>|Palette} palette - Palette name, color array, or Palette instance
 * @param {number} t - Time (any number; fractional part controls cycle position)
 * @param {number} intensity - Brightness multiplier (0-1 recommended)
 * @returns {string} Hex color
 */
export function cycleColor(palette, t, intensity = 1) {
    let colors;

    if (typeof palette === 'string') {
        colors = PALETTES[palette] || PALETTES.jazer;
    } else if (palette && Array.isArray(palette.colors)) {
        colors = palette.colors;
    } else if (Array.isArray(palette)) {
        colors = palette;
    } else {
        colors = PALETTES.jazer;
    }

    if (!colors || colors.length === 0) return '#ffffff';

    const tt = ((t % 1) + 1) % 1;
    const scaled = tt * colors.length;
    const index0 = Math.floor(scaled) % colors.length;
    const index1 = (index0 + 1) % colors.length;
    const localT = scaled - Math.floor(scaled);

    const color = lerpColor(colors[index0], colors[index1], localT);
    if (intensity === 1) return color;

    const rgb = hexToRgb(color);
    return rgbToHex(rgb.r * intensity, rgb.g * intensity, rgb.b * intensity);
}

/**
 * Create a color from HSL
 * @param {number} h - Hue 0-360
 * @param {number} s - Saturation 0-1
 * @param {number} l - Lightness 0-1
 * @returns {string} Hex color
 */
export function fromHsl(h, s, l) {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Adjust color brightness
 * @param {string} hex - Hex color
 * @param {number} amount - Brightness adjustment (-1 to 1)
 * @returns {string} Adjusted hex color
 */
export function adjustBrightness(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
        rgb.r + (amount > 0 ? (255 - rgb.r) * amount : rgb.r * amount),
        rgb.g + (amount > 0 ? (255 - rgb.g) * amount : rgb.g * amount),
        rgb.b + (amount > 0 ? (255 - rgb.b) * amount : rgb.b * amount)
    );
}

/**
 * Create a glow color (brightened and slightly desaturated)
 * @param {string} hex - Base color
 * @param {number} intensity - Glow intensity 0-1
 * @returns {string} Glow color
 */
export function glowColor(hex, intensity = 0.5) {
    const rgb = hexToRgb(hex);

    // Brighten toward white
    const brighten = (v) => v + (255 - v) * intensity;

    return rgbToHex(
        brighten(rgb.r),
        brighten(rgb.g),
        brighten(rgb.b)
    );
}


// ============================================================================
// EXPORTS
// ============================================================================

export default {
    PALETTES,
    Palette,
    Gradient,
    hexToRgb,
    hexToRgba,
    rgbToHex,
    lerpColor,
    hslToRgb,
    rgbToHsl,
    cycleColor,
    fromHsl,
    adjustBrightness,
    glowColor
};
