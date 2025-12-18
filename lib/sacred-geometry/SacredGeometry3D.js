/**
 * SacredGeometry3D.js
 * JaZeR Sacred Geometry Mathematics Engine (3D)
 * 
 * Generates raw vertex data (centers, lines, faces) for sacred geometry forms
 * in 3D space. Does NOT render anything; provides data for Three.js meshes.
 * 
 * Philosophy:
 * Sacred Geometry is structural. It defines where things ARE, not just what they look like.
 * Use these structures to place lights, particles, or instances.
 */

import * as THREE from '../Three.js';

export class SacredGeometry3D {

    // ========================================================================
    // FLOWER OF LIFE
    // ========================================================================

    /**
     * Generates a 3D Flower of Life (Hexagonal Planar Lattice)
     * @param {number} rings - Number of rings around center (1 = 7 circles, 2 = 19, etc.)
     * @param {number} radius - Radius of each circle
     * @param {number} layerZ - Z-position offset
     */
    static FlowerOfLifePoints(rings = 2, radius = 1, layerZ = 0) {
        const centers = [];
        const uniqueKeys = new Set(); // To avoid duplicates if we get fancy later

        // Hexagonal grid basis vectors
        // x-axis spacing: sqrt(3) * radius
        // y-axis spacing: 1.5 * radius (vertical) or similar depending on orientation
        // Standard hexagonal packing:
        // Distance between centers = radius * sqrt(3) (if touching)
        // Actually for Flower of Life, centers are spaced by `radius`? 
        // No, in Flower of Life, circle edge passes through neighbor center.
        // So distance between centers is equal to RADIUS.
        
        const centerDist = radius; 
        const xStep = centerDist * Math.sqrt(3) / 2;
        const yStep = centerDist * 1.5; // Hex row offset logic

        // Axial coordinates (q, r)
        for (let q = -rings; q <= rings; q++) {
            const r1 = Math.max(-rings, -q - rings);
            const r2 = Math.min(rings, -q + rings);

            for (let r = r1; r <= r2; r++) {
                // Convert axial to cartesian
                // x = size * sqrt(3) * (q + r/2)
                // y = size * 3/2 * r
                
                const x = centerDist * Math.sqrt(3) * (q + r/2);
                const y = -centerDist * 1.5 * r; // Negative to match screen coords usually

                centers.push(new THREE.Vector3(x, y, layerZ));
            }
        }

        return centers;
    }

    /**
     * Generates a "Tunnel" of Flower of Life layers
     * @param {number} layers - Number of Z-layers
     * @param {number} depthSpacing - Distance between layers
     * @param {number} ringsPerLayer - Size of each layer
     */
    static FlowerOfLifeTunnel(layers = 5, depthSpacing = 5, ringsPerLayer = 2) {
        const allPoints = [];
        for(let i = 0; i < layers; i++) {
            const z = -i * depthSpacing;
            const points = this.FlowerOfLifePoints(ringsPerLayer, 1, z);
            allPoints.push(...points);
        }
        return allPoints;
    }

    // ========================================================================
    // METATRON'S CUBE
    // ========================================================================

    /**
     * Generates the 13 centers of Metatron's Cube (Fruit of Life)
     * 1 center + 6 inner ring + 6 outer ring
     */
    static MetatronsCubeCenters(scale = 10) {
        // Metatron's cube is based on 13 circles (Fruit of Life configuration)
        // It's effectively FlowerOfLife(2) but specific points.
        
        // Actually, Fruit of Life is just 2 rings of hex grid.
        // Center (1) + Ring 1 (6) + Ring 2 (12)? 
        // No, Fruit of Life is 13 circles total. Center + 6 + 6? No.
        // Standard Fruit of Life is Center + 6 around it + 6 around those in star shape.
        // It forms a snowflake shape.
        
        const centers = [];
        centers.push(new THREE.Vector3(0, 0, 0)); // Center

        // Inner 6
        for(let i=0; i<6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            centers.push(new THREE.Vector3(
                Math.cos(angle) * scale * 2, // Distance is 2 radii usually
                Math.sin(angle) * scale * 2,
                0
            ));
        }

        // Outer 6 (Fruit of Life tips)
        for(let i=0; i<6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            centers.push(new THREE.Vector3(
                Math.cos(angle) * scale * 4,
                Math.sin(angle) * scale * 4,
                0
            ));
        }

        return centers;
    }

    /**
     * Generates all connection lines for Metatron's Cube
     * Connects every center to every other center
     */
    static MetatronsCubeLines(centers) {
        const lines = [];
        for(let i=0; i<centers.length; i++) {
            for(let j=i+1; j<centers.length; j++) {
                lines.push(centers[i].clone());
                lines.push(centers[j].clone());
            }
        }
        return lines;
    }

    // ========================================================================
    // MERKABA (Star Tetrahedron)
    // ========================================================================

    /**
     * Generates vertices for a Merkaba
     * Two intersecting tetrahedrons
     */
    static MerkabaVertices(radius = 10) {
        // Tetrahedron 1 (Point up)
        const t1 = [
            new THREE.Vector3(0, radius, 0),
            new THREE.Vector3(radius * 0.94, -radius * 0.33, 0).applyAxisAngle(new THREE.Vector3(0,1,0), 0),
            new THREE.Vector3(radius * 0.94, -radius * 0.33, 0).applyAxisAngle(new THREE.Vector3(0,1,0), 2*Math.PI/3),
            new THREE.Vector3(radius * 0.94, -radius * 0.33, 0).applyAxisAngle(new THREE.Vector3(0,1,0), 4*Math.PI/3)
        ];

        // Tetrahedron 2 (Point down) - Inverted T1
        const t2 = t1.map(v => v.clone().multiplyScalar(-1));

        return [...t1, ...t2];
    }
}

export default SacredGeometry3D;
