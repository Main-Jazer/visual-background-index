// jazer-timing.js
// JaZeR Timing Module
// Seamless loop discipline and cinematic timing utilities
// ============================================================================

/**
 * LoopClock - Deterministic time management for seamless loops
 * 
 * Guarantees that animation time wraps cleanly to create perfect loops
 * without drift, jumps, or accumulation errors.
 */
export class LoopClock {
    /**
     * @param {Object} options - Configuration options
     * @param {number} options.duration - Loop duration in seconds (default: 30)
     * @param {number} options.phase - Initial phase offset 0-1 (default: 0)
     */
    constructor(options = {}) {
        this.duration = options.duration ?? 30;
        this.phase = options.phase ?? 0;

        // Internal state
        this._elapsed = this.phase * this.duration;
        this._t = this.phase;
        this._prevT = this.phase;
        this._cycles = 0;
    }

    /**
     * Update the clock with delta time
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this._prevT = this._t;
        this._elapsed += dt;

        // Calculate normalized time [0, 1]
        const rawT = this._elapsed / this.duration;
        this._t = rawT - Math.floor(rawT);

        // Track cycle count for effects that need it
        const newCycles = Math.floor(rawT);
        if (newCycles > this._cycles) {
            this._cycles = newCycles;
        }
    }

    /**
     * Get normalized loop time [0, 1]
     * This value seamlessly wraps from 1 back to 0
     */
    get t() {
        return this._t;
    }

    /**
     * Get previous frame's normalized time
     * Useful for detecting loop boundaries
     */
    get prevT() {
        return this._prevT;
    }

    /**
     * Get absolute elapsed time in seconds
     */
    get elapsed() {
        return this._elapsed;
    }

    /**
     * Get number of completed loop cycles
     */
    get cycles() {
        return this._cycles;
    }

    /**
     * Check if we just crossed a loop boundary
     */
    get justLooped() {
        return this._t < this._prevT;
    }

    /**
     * Get time in radians (0 to 2π) for direct use in sin/cos
     */
    get radians() {
        return this._t * Math.PI * 2;
    }

    /**
     * Reset clock to initial state
     * @param {number} phase - Optional new phase offset
     */
    reset(phase = 0) {
        this.phase = phase;
        this._elapsed = phase * this.duration;
        this._t = phase;
        this._prevT = phase;
        this._cycles = 0;
    }

    /**
     * Set a new loop duration (preserves current position)
     * @param {number} duration - New duration in seconds
     */
    setDuration(duration) {
        // Convert current position to new duration
        const normalizedPos = this._t;
        this.duration = duration;
        this._elapsed = normalizedPos * duration;
    }
}


// ============================================================================
// TIMING HELPER FUNCTIONS
// ============================================================================

/**
 * Breathe - Creates organic breath-like timing curve
 * 
 * Perfect for ambient visual effects that need to feel "alive"
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {Object} options - Timing configuration
 * @param {number} options.inhale - Inhale phase duration (0-1)
 * @param {number} options.hold - Hold phase duration (0-1)
 * @param {number} options.exhale - Exhale phase duration (0-1)
 * @param {number} options.pause - Pause phase duration (0-1)
 * @returns {number} Value from 0 (rest) to 1 (full breath)
 */
export function breathe(t, options = {}) {
    const {
        inhale = 0.35,
        hold = 0.1,
        exhale = 0.4,
        pause = 0.15
    } = options;

    // Normalize phases to sum to 1
    const total = inhale + hold + exhale + pause;
    const inh = inhale / total;
    const hld = hold / total;
    const exh = exhale / total;
    // pause takes the remainder

    if (t < inh) {
        // Inhale: ease in
        const p = t / inh;
        return easeInOutSine(p);
    } else if (t < inh + hld) {
        // Hold at peak
        return 1;
    } else if (t < inh + hld + exh) {
        // Exhale: ease out
        const p = (t - inh - hld) / exh;
        return 1 - easeInOutSine(p);
    } else {
        // Pause at rest
        return 0;
    }
}

/**
 * Pulse - Creates rhythmic pulsing with natural decay
 * 
 * Good for music-reactive or heartbeat-like effects
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {Object} options - Configuration
 * @param {number} options.beats - Number of pulses per loop
 * @param {number} options.decay - Decay rate (0.1 = slow, 0.9 = fast)
 * @param {number} options.intensity - Peak intensity multiplier
 * @returns {number} Pulse intensity [0, intensity]
 */
export function pulse(t, options = {}) {
    const {
        beats = 4,
        decay = 0.5,
        intensity = 1
    } = options;

    // Calculate which beat we're on
    const beatPos = (t * beats) % 1;

    // Exponential decay from beat start
    const decayValue = Math.exp(-beatPos * (1 / (1 - decay) + 1));

    return decayValue * intensity;
}

/**
 * Drift - Creates smooth, non-repetitive wandering motion
 * 
 * Uses layered sine waves with irrational frequency ratios
 * to avoid obvious patterns while remaining seamless
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {Object} options - Configuration
 * @param {number} options.speed - Overall speed multiplier
 * @param {number} options.complexity - Number of wave layers (1-5)
 * @param {number} options.amplitude - Output range (-amplitude to +amplitude)
 * @returns {number} Drift value [-amplitude, amplitude]
 */
export function drift(t, options = {}) {
    const {
        speed = 1,
        complexity = 3,
        amplitude = 1
    } = options;

    // Irrational frequency ratios for non-repetitive feel
    const freqRatios = [1.0, 1.618, 2.236, 3.14159, 4.669];
    const amplitudeRatios = [1.0, 0.5, 0.25, 0.125, 0.0625];

    let value = 0;
    let totalAmp = 0;

    const layers = Math.min(5, Math.max(1, Math.floor(complexity)));

    for (let i = 0; i < layers; i++) {
        const freq = freqRatios[i] * speed;
        const amp = amplitudeRatios[i];
        value += Math.sin(t * Math.PI * 2 * freq) * amp;
        totalAmp += amp;
    }

    // Normalize and scale
    return (value / totalAmp) * amplitude;
}

/**
 * Wave - Simple seamless wave with configurable shape
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {Object} options - Configuration
 * @param {number} options.frequency - Waves per loop
 * @param {number} options.phase - Phase offset in radians
 * @param {'sine'|'triangle'|'square'|'sawtooth'} options.shape - Wave shape
 * @returns {number} Wave value [-1, 1]
 */
export function wave(t, options = {}) {
    const {
        frequency = 1,
        phase = 0,
        shape = 'sine'
    } = options;

    const angle = t * Math.PI * 2 * frequency + phase;

    switch (shape) {
        case 'sine':
            return Math.sin(angle);

        case 'triangle':
            const tri = (t * frequency + phase / (Math.PI * 2)) % 1;
            return 4 * Math.abs(tri - 0.5) - 1;

        case 'square':
            return Math.sin(angle) >= 0 ? 1 : -1;

        case 'sawtooth':
            const saw = (t * frequency + phase / (Math.PI * 2)) % 1;
            return 2 * saw - 1;

        default:
            return Math.sin(angle);
    }
}

/**
 * Stagger - Creates staggered timing for multiple elements
 * 
 * Perfect for sequential animations across an array of items
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {number} index - Element index
 * @param {number} total - Total number of elements
 * @param {Object} options - Configuration
 * @param {number} options.overlap - How much elements overlap (0-1)
 * @param {boolean} options.loop - Whether to seamlessly loop
 * @returns {number} Element-specific time [0, 1]
 */
export function stagger(t, index, total, options = {}) {
    const {
        overlap = 0.5,
        loop = true
    } = options;

    // Calculate stagger offset
    const staggerAmount = 1 - overlap;
    const duration = 1 - staggerAmount * (total - 1) / total;
    const offset = (index / total) * staggerAmount;

    if (loop) {
        // Wrap time for seamless looping
        const adjustedT = (t + 1 - offset) % 1;
        return Math.min(1, Math.max(0, adjustedT / duration));
    } else {
        return Math.min(1, Math.max(0, (t - offset) / duration));
    }
}

/**
 * Periodic - Creates a value that hits specific keyframes at specific times
 * 
 * Good for tightly choreographed visual moments
 * 
 * @param {number} t - Normalized time [0, 1]
 * @param {Array} keyframes - Array of {time: 0-1, value: any}
 * @param {string} interpolation - 'linear', 'smooth', 'step'
 * @returns {number} Interpolated value
 */
export function periodic(t, keyframes, interpolation = 'smooth') {
    if (keyframes.length === 0) return 0;
    if (keyframes.length === 1) return keyframes[0].value;

    // Sort keyframes by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    // Find surrounding keyframes
    let kf1 = sorted[sorted.length - 1];
    let kf2 = sorted[0];

    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].time > t) {
            kf2 = sorted[i];
            kf1 = sorted[(i - 1 + sorted.length) % sorted.length];
            break;
        }
    }

    // Calculate local t
    let localT;
    if (kf2.time > kf1.time) {
        localT = (t - kf1.time) / (kf2.time - kf1.time);
    } else {
        // Wrapping case
        const range = 1 - kf1.time + kf2.time;
        if (t >= kf1.time) {
            localT = (t - kf1.time) / range;
        } else {
            localT = (t + 1 - kf1.time) / range;
        }
    }

    // Interpolate
    switch (interpolation) {
        case 'step':
            return kf1.value;
        case 'linear':
            return kf1.value + (kf2.value - kf1.value) * localT;
        case 'smooth':
        default:
            const smoothT = easeInOutCubic(localT);
            return kf1.value + (kf2.value - kf1.value) * smoothT;
    }
}


// ============================================================================
// INTERNAL EASING HELPERS
// ============================================================================

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


// ============================================================================
// EXPORTS
// ============================================================================

export default {
    LoopClock,
    breathe,
    pulse,
    drift,
    wave,
    stagger,
    periodic
};
