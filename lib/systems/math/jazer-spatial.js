/**
 * jazer-spatial.js
 * JaZeR Spatial & Temporal Organization Module
 * 
 * Provides tools for:
 * 1. Spatial Distribution (Grids, Spheres, Phyllotaxis)
 * 2. Temporal Fields (Phasing time across space for "4D" waves)
 * 3. Dimensional Scaling (Mapping 1D arrays to 3D structures)
 */

import * as THREE from '../../Three.js';

// ============================================================================
// TEMPORAL FIELDS (The "4D" Engine)
// ============================================================================

/**
 * TemporalField - Calculates local time for a point in space
 * 
 * Allows animation to propagate through space like a wave, creating
 * a perceived 4th dimension of causal movement.
 */
export class TemporalField {
    /**
     * @param {Object} options
     * @param {string} options.type - 'planar', 'radial', 'spherical', 'noise'
     * @param {THREE.Vector3} options.direction - Wave direction (for planar)
     * @param {THREE.Vector3} options.origin - Wave center (for radial/spherical)
     * @param {number} options.speed - Wave speed (units per second)
     * @param {number} options.density - Wave density (cycles per unit distance)
     * @param {number} options.falloff - Influence falloff distance (0 = infinite)
     */
    constructor(options = {}) {
        this.type = options.type || 'planar';
        this.direction = options.direction ? options.direction.clone().normalize() : new THREE.Vector3(0, 0, 1);
        this.origin = options.origin ? options.origin.clone() : new THREE.Vector3(0, 0, 0);
        this.speed = options.speed !== undefined ? options.speed : 1.0;
        this.density = options.density !== undefined ? options.density : 0.1;
        this.falloff = options.falloff || 0;
    }

    /**
     * Get the local time phase [0-1] for a specific point in space
     * @param {THREE.Vector3} position - The point to sample
     * @param {number} globalTime - The master clock time
     * @returns {number} Localized time phase (0-1)
     */
    getPhase(position, globalTime) {
        let distance = 0;

        switch (this.type) {
            case 'planar':
                // Project position onto direction vector
                distance = position.dot(this.direction);
                break;
            case 'radial':
                // Distance from origin on XZ plane (cylinder)
                const dx = position.x - this.origin.x;
                const dz = position.z - this.origin.z;
                distance = Math.sqrt(dx * dx + dz * dz);
                break;
            case 'spherical':
                // True 3D distance from origin
                distance = position.distanceTo(this.origin);
                break;
            case 'gyroid':
                // Approximation of a gyroid surface distance
                distance = Math.sin(position.x * this.density) * Math.cos(position.y * this.density) +
                           Math.sin(position.y * this.density) * Math.cos(position.z * this.density) +
                           Math.sin(position.z * this.density) * Math.cos(position.x * this.density);
                distance *= 5; // Scale up for usability
                break;
        }

        // Calculate phase shift based on distance
        // wave = time - distance * density
        const phaseShift = distance * this.density;
        
        // Return (time - shift)
        // We subtract shift so waves move AWAY from origin (or along direction)
        return (globalTime * this.speed - phaseShift);
    }

    /**
     * Get a normalized 0-1 value for the field at this point/time
     * Useful for opacity, scale, or intensity modulation
     */
    getValue(position, globalTime) {
        const phase = this.getPhase(position, globalTime);
        return 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    }
}


// ============================================================================
// SPATIAL DISTRIBUTIONS (Geometry Generators)
// ============================================================================

export const SpatialDistribution = {
    /**
     * Generate points on a Sphere using Fibonacci Lattice
     * Extremely even distribution, ideal for starfields or particle shells
     */
    fibonacciSphere(count, radius = 10) {
        const points = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

        for (let i = 0; i < count; i++) {
            const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
            const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
            const theta = phi * i;

            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;

            points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
        }
        return points;
    },

    /**
     * Generate points in a 3D Grid (Cube)
     */
    grid3D(size, spacing) {
        const points = [];
        const offset = ((size - 1) * spacing) / 2;

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    points.push(new THREE.Vector3(
                        x * spacing - offset,
                        y * spacing - offset,
                        z * spacing - offset
                    ));
                }
            }
        }
        return points;
    },

    /**
     * Generate points on a Torus surface
     */
    torus(count, majorRadius = 10, minorRadius = 3) {
        const points = [];
        for (let i = 0; i < count; i++) {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;

            const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
            const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
            const z = minorRadius * Math.sin(v);

            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    },

    /**
     * Generate points in a Spiral Galaxy formation
     */
    galaxySpiral(count, radius = 20, arms = 3, tightness = 0.5) {
        const points = [];
        for (let i = 0; i < count; i++) {
            // Random distance from center (biased toward center)
            const r = Math.pow(Math.random(), 2) * radius;
            
            // Base angle based on distance (spiral)
            const spiralAngle = r * tightness;
            
            // Arm offset
            const armIndex = Math.floor(Math.random() * arms);
            const armAngle = (armIndex / arms) * Math.PI * 2;

            // Random scatter
            const scatter = (Math.random() - 0.5) * (r * 0.2);
            
            const theta = spiralAngle + armAngle + scatter;
            
            // Thickness (vertical scatter)
            const y = (Math.random() - 0.5) * (radius * 0.1) * (1 - r/radius);

            points.push(new THREE.Vector3(
                Math.cos(theta) * r,
                y,
                Math.sin(theta) * r
            ));
        }
        return points;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    TemporalField,
    SpatialDistribution
};
