// jazer-motion.js
// JaZeR Motion Module
// Cinematic camera primitives and motion language helpers
// ============================================================================

import { LoopClock, drift } from '../timing/jazer-timing.js';

// ---------------------------------------------------------
// MOUSE TRACKER: Smooth mouse/touch position tracking
// ---------------------------------------------------------
export class MouseTracker {
  constructor(options = {}) {
    this.smoothing = options.smoothing ?? 0.1;
    this.element = options.element ?? (typeof window !== 'undefined' ? window : null);

    // Raw position (normalized 0-1)
    this.x = 0.5;
    this.y = 0.5;

    // Smoothed position
    this.smoothX = 0.5;
    this.smoothY = 0.5;

    // Centered position (-1 to 1)
    this.centeredX = 0;
    this.centeredY = 0;

    // Velocity
    this.velocityX = 0;
    this.velocityY = 0;

    // State
    this.isPressed = false;
    this.isInside = false;

    // Previous values for velocity
    this._prevX = 0.5;
    this._prevY = 0.5;
    this._lastTime = performance.now();

    // Bind handlers
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    if (typeof window !== 'undefined') {
      this._attachListeners();
    }
  }

  _attachListeners() {
    const el = this.element;
    if (!el) return;
    el.addEventListener('mousemove', this._onMouseMove, { passive: true });
    el.addEventListener('mousedown', this._onMouseDown, { passive: true });
    el.addEventListener('mouseup', this._onMouseUp, { passive: true });
    el.addEventListener('mouseenter', this._onMouseEnter, { passive: true });
    el.addEventListener('mouseleave', this._onMouseLeave, { passive: true });
    el.addEventListener('touchstart', this._onTouchStart, { passive: true });
    el.addEventListener('touchmove', this._onTouchMove, { passive: true });
    el.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  _onMouseMove(e) {
    this.x = e.clientX / window.innerWidth;
    this.y = e.clientY / window.innerHeight;
  }

  _onMouseDown() { this.isPressed = true; }
  _onMouseUp() { this.isPressed = false; }
  _onMouseEnter() { this.isInside = true; }
  _onMouseLeave() { this.isInside = false; }

  _onTouchStart(e) {
    this.isPressed = true;
    if (e.touches.length > 0) {
      this.x = e.touches[0].clientX / window.innerWidth;
      this.y = e.touches[0].clientY / window.innerHeight;
    }
  }

  _onTouchMove(e) {
    if (e.touches.length > 0) {
      this.x = e.touches[0].clientX / window.innerWidth;
      this.y = e.touches[0].clientY / window.innerHeight;
    }
  }

  _onTouchEnd() { this.isPressed = false; }

  update(dt = 0.016) {
    // Use provided dt (seconds) or calculate real elapsed
    const now = performance.now();
    if (dt === undefined || dt === null) {
      dt = (now - this._lastTime) / 1000;
    }
    this._lastTime = now;
    dt = Math.min(Math.max(dt, 0), 0.1);
    
    // Smooth interpolation
    const factor = 1 - Math.pow(1 - this.smoothing, dt * 60);
    this.smoothX += (this.x - this.smoothX) * factor;
    this.smoothY += (this.y - this.smoothY) * factor;

    // Centered coordinates
    this.centeredX = this.smoothX * 2 - 1;
    this.centeredY = this.smoothY * 2 - 1;

    // Velocity calculation
    if (dt > 0) {
      this.velocityX = (this.x - this._prevX) / dt;
      this.velocityY = (this.y - this._prevY) / dt;
    }

    this._prevX = this.x;
    this._prevY = this.y;
  }

  destroy() {
    if (typeof window === 'undefined') return;
    const el = this.element;
    if (!el) return;
    el.removeEventListener('mousemove', this._onMouseMove);
    el.removeEventListener('mousedown', this._onMouseDown);
    el.removeEventListener('mouseup', this._onMouseUp);
    el.removeEventListener('mouseenter', this._onMouseEnter);
    el.removeEventListener('mouseleave', this._onMouseLeave);
    el.removeEventListener('touchstart', this._onTouchStart);
    el.removeEventListener('touchmove', this._onTouchMove);
    el.removeEventListener('touchend', this._onTouchEnd);
  }
}

// Global mouse tracker instance
export const mouse = new MouseTracker();

/**
 * CinematicCamera - Wrapper for Three.js camera with cinematic motion
 * 
 * Replaces default orbit/spin patterns with sophisticated, 
 * operated-feeling camera movements.
 */
export class CinematicCamera {
    /**
     * @param {THREE.Camera} camera - Three.js camera to control
     * @param {Object} options - Configuration
     */
    constructor(camera, options = {}) {
        this.camera = camera;
        this.THREE = options.THREE || window.THREE;

        // Shot configuration
        this.shots = options.shots || [];
        this.currentShotIndex = 0;
        this.shotT = 0;

        // Micro-motion settings
        this.enableDrift = options.enableDrift !== false;
        this.driftAmount = options.driftAmount ?? 0.015;
        this.driftSpeed = options.driftSpeed ?? 0.7;

        // Roll constraint (cinematic cameras have minimal roll)
        this.maxRoll = options.maxRoll ?? 0.02;  // ~1 degree

        // Transition settings
        this.transitionDuration = options.transitionDuration ?? 2.0;
        this.transitionProgress = 1.0;  // Start fully transitioned

        // Cached vectors for performance
        this._position = new this.THREE.Vector3();
        this._lookAt = new this.THREE.Vector3();
        this._up = new this.THREE.Vector3(0, 1, 0);
        this._prevPosition = new this.THREE.Vector3();
        this._prevLookAt = new this.THREE.Vector3();

        // Time tracking
        this._elapsed = 0;

        // Initialize from camera's current position
        this._prevPosition.copy(camera.position);
        this._prevLookAt.set(0, 0, 0);
    }

    /**
     * Add a shot to the queue
     * @param {Shot} shot - Shot configuration object
     */
    addShot(shot) {
        this.shots.push(shot);
        return this;
    }

    /**
     * Set multiple shots at once
     * @param {Array<Shot>} shots - Array of shot configurations
     */
    setShots(shots) {
        this.shots = shots;
        this.currentShotIndex = 0;
        this.shotT = 0;
        return this;
    }

    /**
     * Update camera position and orientation
     * @param {number} t - Normalized loop time [0, 1] from LoopClock
     * @param {number} dt - Delta time in seconds (optional, for smoother motion)
     */
    update(t, dt = 1 / 60) {
        this._elapsed += dt;

        if (this.shots.length === 0) {
            this._applyDrift(dt);
            return;
        }

        // Calculate which shot we're on based on loop time
        const totalDuration = this.shots.reduce((sum, s) => sum + (s.duration || 1), 0);
        const normalizedTime = t * totalDuration;

        let accumulated = 0;
        let shotIndex = 0;
        let shotLocalT = 0;

        for (let i = 0; i < this.shots.length; i++) {
            const shotDuration = this.shots[i].duration || 1;
            if (accumulated + shotDuration > normalizedTime) {
                shotIndex = i;
                shotLocalT = (normalizedTime - accumulated) / shotDuration;
                break;
            }
            accumulated += shotDuration;
        }

        // Handle shot transition
        if (shotIndex !== this.currentShotIndex) {
            this._prevPosition.copy(this.camera.position);
            this._prevLookAt.copy(this._lookAt);
            this.currentShotIndex = shotIndex;
            this.transitionProgress = 0;
        }

        // Update transition
        if (this.transitionProgress < 1) {
            this.transitionProgress += dt / this.transitionDuration;
            this.transitionProgress = Math.min(1, this.transitionProgress);
        }

        // Get shot transform
        const shot = this.shots[shotIndex];
        const { position, lookAt } = this._evaluateShot(shot, shotLocalT);

        // Apply eased transition
        const transitionT = this._easeInOutCubic(this.transitionProgress);

        this._position.lerpVectors(this._prevPosition, position, transitionT);
        this._lookAt.lerpVectors(this._prevLookAt, lookAt, transitionT);

        // Apply micro-drift
        if (this.enableDrift) {
            this._applyDrift(dt);
        }

        // Apply to camera
        this.camera.position.copy(this._position);
        this.camera.lookAt(this._lookAt);

        // Constrain roll
        this._constrainRoll();
    }

    /**
     * Evaluate a shot at a given local time
     * @private
     */
    _evaluateShot(shot, t) {
        const position = new this.THREE.Vector3();
        const lookAt = new this.THREE.Vector3();

        switch (shot.type) {
            case 'dollyGlide':
                return this._dollyGlide(shot, t);

            case 'arcPush':
                return this._arcPush(shot, t);

            case 'parallaxWeave':
                return this._parallaxWeave(shot, t);

            case 'lockedHero':
                return this._lockedHero(shot, t);

            case 'orbitSubtle':
                return this._orbitSubtle(shot, t);

            default:
                return this._lockedHero(shot, t);
        }
    }

    /**
     * Dolly Glide - Smooth forward motion
     * @private
     */
    _dollyGlide(shot, t) {
        const position = new this.THREE.Vector3();
        const lookAt = new this.THREE.Vector3();

        const from = new this.THREE.Vector3(...(shot.from || [0, 0, 10]));
        const to = new this.THREE.Vector3(...(shot.to || [0, 0, 2]));
        const target = new this.THREE.Vector3(...(shot.lookAt || [0, 0, 0]));

        // Ease the motion
        const easedT = this._easeInOutSine(t);

        position.lerpVectors(from, to, easedT);
        lookAt.copy(target);

        return { position, lookAt };
    }

    /**
     * Arc Push - Curved dolly with subtle arc
     * @private
     */
    _arcPush(shot, t) {
        const position = new this.THREE.Vector3();
        const lookAt = new this.THREE.Vector3();

        const center = new this.THREE.Vector3(...(shot.center || [0, 0, 0]));
        const radius = shot.radius || 8;
        const startAngle = shot.startAngle || 0;
        const arcLength = shot.arc || Math.PI / 4;  // 45 degrees
        const height = shot.height || 2;
        const heightVariation = shot.heightVariation || 0.3;

        const easedT = this._easeInOutSine(t);
        const angle = startAngle + arcLength * easedT;

        // Position on arc
        position.set(
            center.x + Math.sin(angle) * radius,
            center.y + height + Math.sin(t * Math.PI) * heightVariation,
            center.z + Math.cos(angle) * radius
        );

        // Always look at center
        lookAt.copy(center);

        return { position, lookAt };
    }

    /**
     * Parallax Weave - Slow lateral drift
     * @private
     */
    _parallaxWeave(shot, t) {
        const position = new this.THREE.Vector3();
        const lookAt = new this.THREE.Vector3();

        const basePosition = new this.THREE.Vector3(...(shot.position || [0, 0, 8]));
        const target = new this.THREE.Vector3(...(shot.lookAt || [0, 0, 0]));
        const weaveAmount = shot.weaveAmount || 1.5;

        // Smooth sinusoidal weave
        const weaveX = Math.sin(t * Math.PI * 2) * weaveAmount;
        const weaveY = Math.sin(t * Math.PI * 2 * 0.7) * weaveAmount * 0.3;

        position.copy(basePosition);
        position.x += weaveX;
        position.y += weaveY;

        lookAt.copy(target);

        return { position, lookAt };
    }

    /**
     * Locked Hero - Static camera with subtle breathing
     * @private
     */
    _lockedHero(shot, t) {
        const position = new this.THREE.Vector3(...(shot.position || [0, 0, 8]));
        const lookAt = new this.THREE.Vector3(...(shot.lookAt || [0, 0, 0]));

        // Very subtle breath motion
        const breathAmount = shot.breathAmount || 0.1;
        const breath = Math.sin(t * Math.PI * 2) * breathAmount;
        position.z += breath;

        return { position, lookAt };
    }

    /**
     * Orbit Subtle - Very slow, barely perceptible orbit
     * Much slower than typical "screensaver" orbits
     * @private
     */
    _orbitSubtle(shot, t) {
        const position = new this.THREE.Vector3();
        const lookAt = new this.THREE.Vector3();

        const center = new this.THREE.Vector3(...(shot.center || [0, 0, 0]));
        const radius = shot.radius || 8;
        const height = shot.height || 0;
        const arcSpan = shot.arcSpan || Math.PI / 8;  // Very small arc

        const angle = shot.startAngle || 0 + arcSpan * (t - 0.5);

        position.set(
            center.x + Math.sin(angle) * radius,
            center.y + height,
            center.z + Math.cos(angle) * radius
        );

        lookAt.copy(center);

        return { position, lookAt };
    }

    /**
     * Apply micro-drift for organic feel
     * @private
     */
    _applyDrift(dt) {
        const driftTime = this._elapsed * this.driftSpeed;

        const driftX = drift(driftTime % 1, { complexity: 3, amplitude: this.driftAmount });
        const driftY = drift((driftTime * 0.7) % 1, { complexity: 2, amplitude: this.driftAmount * 0.5 });

        this._position.x += driftX;
        this._position.y += driftY;
    }

    /**
     * Constrain camera roll to near-zero
     * @private
     */
    _constrainRoll() {
        // Extract current up vector
        const up = new this.THREE.Vector3(0, 1, 0);

        // Get camera's right vector
        const right = new this.THREE.Vector3();
        right.crossVectors(
            new this.THREE.Vector3().subVectors(this._lookAt, this.camera.position).normalize(),
            up
        );

        // Constrain up to be mostly vertical
        const correctedUp = new this.THREE.Vector3();
        correctedUp.crossVectors(right,
            new this.THREE.Vector3().subVectors(this._lookAt, this.camera.position).normalize()
        );

        // Blend toward vertical up
        correctedUp.lerp(up, 1 - this.maxRoll);

        this.camera.up.copy(correctedUp.normalize());
    }

    /**
     * Easing functions
     * @private
     */
    _easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}


// ============================================================================
// SHOT FACTORY
// ============================================================================

/**
 * Shot - Factory for creating camera shot configurations
 */
export const Shot = {
    /**
     * Dolly Glide - Smooth forward motion
     * @param {Object} options
     * @param {Array<number>} options.from - Start position [x, y, z]
     * @param {Array<number>} options.to - End position [x, y, z]
     * @param {Array<number>} options.lookAt - Target point [x, y, z]
     * @param {number} options.duration - Shot duration relative to others
     */
    dollyGlide(options = {}) {
        return {
            type: 'dollyGlide',
            from: options.from || [0, 0, 15],
            to: options.to || [0, 0, 5],
            lookAt: options.lookAt || [0, 0, 0],
            duration: options.duration || 1
        };
    },

    /**
     * Arc Push - Curved dolly with arc motion
     * @param {Object} options
     * @param {Array<number>} options.center - Arc center point
     * @param {number} options.radius - Distance from center
     * @param {number} options.startAngle - Starting angle in radians
     * @param {number} options.arc - Total arc length in radians
     * @param {number} options.height - Camera height
     * @param {number} options.duration - Shot duration
     */
    arcPush(options = {}) {
        return {
            type: 'arcPush',
            center: options.center || [0, 0, 0],
            radius: options.radius || 8,
            startAngle: options.startAngle || 0,
            arc: options.arc || Math.PI / 4,
            height: options.height || 2,
            heightVariation: options.heightVariation || 0.3,
            duration: options.duration || 1.5
        };
    },

    /**
     * Parallax Weave - Slow lateral drift
     * @param {Object} options
     * @param {Array<number>} options.position - Base camera position
     * @param {Array<number>} options.lookAt - Target point
     * @param {number} options.weaveAmount - Lateral motion amplitude
     * @param {number} options.duration - Shot duration
     */
    parallaxWeave(options = {}) {
        return {
            type: 'parallaxWeave',
            position: options.position || [0, 0, 10],
            lookAt: options.lookAt || [0, 0, 0],
            weaveAmount: options.weaveAmount || 1.5,
            duration: options.duration || 2
        };
    },

    /**
     * Locked Hero - Static camera with subtle breathing
     * @param {Object} options
     * @param {Array<number>} options.position - Camera position
     * @param {Array<number>} options.lookAt - Target point
     * @param {number} options.breathAmount - Subtle z-motion amplitude
     * @param {number} options.duration - Shot duration
     */
    lockedHero(options = {}) {
        return {
            type: 'lockedHero',
            position: options.position || [0, 2, 8],
            lookAt: options.lookAt || [0, 0, 0],
            breathAmount: options.breathAmount || 0.1,
            duration: options.duration || 2
        };
    },

    /**
     * Orbit Subtle - Very slow, minimal orbit
     * Different from "screensaver" orbit - barely perceptible
     * @param {Object} options
     * @param {Array<number>} options.center - Orbit center
     * @param {number} options.radius - Orbit radius
     * @param {number} options.height - Camera height
     * @param {number} options.startAngle - Starting angle
     * @param {number} options.arcSpan - Total arc (should be small!)
     * @param {number} options.duration - Shot duration
     */
    orbitSubtle(options = {}) {
        return {
            type: 'orbitSubtle',
            center: options.center || [0, 0, 0],
            radius: options.radius || 10,
            height: options.height || 3,
            startAngle: options.startAngle || 0,
            arcSpan: options.arcSpan || Math.PI / 8,  // Only 22.5 degrees!
            duration: options.duration || 3
        };
    }
};


// ============================================================================
// MOTION HELPERS
// ============================================================================

/**
 * Create a smooth path between points using Catmull-Rom interpolation
 * 
 * @param {Array<Array<number>>} points - Array of [x, y, z] positions
 * @param {number} t - Time 0-1
 * @returns {Array<number>} Interpolated [x, y, z]
 */
export function catmullRom(points, t) {
    if (points.length < 2) return points[0] || [0, 0, 0];
    if (points.length === 2) {
        return [
            points[0][0] + (points[1][0] - points[0][0]) * t,
            points[0][1] + (points[1][1] - points[0][1]) * t,
            points[0][2] + (points[1][2] - points[0][2]) * t
        ];
    }

    const n = points.length;
    const p = t * (n - 1);
    const i = Math.floor(p);
    const f = p - i;

    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(n - 1, i + 1)];
    const p3 = points[Math.min(n - 1, i + 2)];

    return [
        catmullRomInterpolate(p0[0], p1[0], p2[0], p3[0], f),
        catmullRomInterpolate(p0[1], p1[1], p2[1], p3[1], f),
        catmullRomInterpolate(p0[2], p1[2], p2[2], p3[2], f)
    ];
}

function catmullRomInterpolate(a, b, c, d, t) {
    return 0.5 * (
        (2 * b) +
        (-a + c) * t +
        (2 * a - 5 * b + 4 * c - d) * t * t +
        (-a + 3 * b - 3 * c + d) * t * t * t
    );
}

/**
 * Calculate a loopable camera path that returns to start
 * 
 * @param {Array<Array<number>>} waypoints - Control points
 * @param {number} t - Time 0-1 (loops seamlessly)
 * @returns {Array<number>} Position [x, y, z]
 */
export function loopPath(waypoints, t) {
    // Duplicate first point at end for seamless loop
    const extendedPoints = [...waypoints, waypoints[0]];
    return catmullRom(extendedPoints, t);
}


// ============================================================================
// EXPORTS
// ============================================================================

export default {
    MouseTracker,
    mouse,
    CinematicCamera,
    Shot,
    catmullRom,
    loopPath
};
