// jazer-instancing.js
// JaZeR Instancing System
// High-performance GPU instancing for rendering 100K+ objects
// ============================================================================

// ---------------------------------------------------------
// INSTANCED MESH MANAGER
// ---------------------------------------------------------

export class InstancedMeshManager {
  constructor(THREE, geometry, material, count, options = {}) {
    this.THREE = THREE;
    this.count = count;
    this.options = options;

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.castShadow = options.castShadow !== false;
    this.mesh.receiveShadow = options.receiveShadow !== false;

    // Instance data
    this.positions = new Float32Array(count * 3);
    this.scales = new Float32Array(count * 3);
    this.rotations = new Float32Array(count * 4); // Quaternions
    this.colors = options.useColors ? new Float32Array(count * 3) : null;
    this.velocities = options.useVelocities ? new Float32Array(count * 3) : null;
    this.userData = options.useUserData ? new Array(count) : null;

    // Temporary objects for transformations
    this.dummy = new THREE.Object3D();
    this.tempMatrix = new THREE.Matrix4();
    this.tempColor = new THREE.Color();
    this.tempQuaternion = new THREE.Quaternion();

    // Set up color attribute if needed
    if (this.colors) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    }

    // Initialize with identity transforms
    for (let i = 0; i < count; i++) {
      this.setPosition(i, 0, 0, 0);
      this.setScale(i, 1, 1, 1);
      this.setRotation(i, 0, 0, 0, 1);
      if (this.colors) {
        this.setColor(i, 1, 1, 1);
      }
    }

    this.needsUpdate = true;
  }

  /**
   * Set position of instance
   */
  setPosition(index, x, y, z) {
    const i3 = index * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;
    this.needsUpdate = true;
  }

  /**
   * Get position of instance
   */
  getPosition(index, target = new this.THREE.Vector3()) {
    const i3 = index * 3;
    target.set(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
    return target;
  }

  /**
   * Set scale of instance
   */
  setScale(index, x, y, z) {
    const i3 = index * 3;
    this.scales[i3] = x;
    this.scales[i3 + 1] = y === undefined ? x : y;
    this.scales[i3 + 2] = z === undefined ? x : z;
    this.needsUpdate = true;
  }

  /**
   * Set rotation of instance (quaternion)
   */
  setRotation(index, x, y, z, w) {
    const i4 = index * 4;
    this.rotations[i4] = x;
    this.rotations[i4 + 1] = y;
    this.rotations[i4 + 2] = z;
    this.rotations[i4 + 3] = w;
    this.needsUpdate = true;
  }

  /**
   * Set rotation from Euler angles
   */
  setRotationFromEuler(index, x, y, z) {
    this.tempQuaternion.setFromEuler(new this.THREE.Euler(x, y, z));
    this.setRotation(index, this.tempQuaternion.x, this.tempQuaternion.y, this.tempQuaternion.z, this.tempQuaternion.w);
  }

  /**
   * Set color of instance
   */
  setColor(index, r, g, b) {
    if (!this.colors) return;

    const i3 = index * 3;
    this.colors[i3] = r;
    this.colors[i3 + 1] = g;
    this.colors[i3 + 2] = b;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Set color from Three.js Color
   */
  setColorFromHex(index, color) {
    if (!this.colors) return;

    this.tempColor.set(color);
    this.setColor(index, this.tempColor.r, this.tempColor.g, this.tempColor.b);
  }

  /**
   * Set color from HSL
   */
  setColorFromHSL(index, h, s, l) {
    if (!this.colors) return;

    this.tempColor.setHSL(h, s, l);
    this.setColor(index, this.tempColor.r, this.tempColor.g, this.tempColor.b);
  }

  /**
   * Set velocity of instance
   */
  setVelocity(index, x, y, z) {
    if (!this.velocities) return;

    const i3 = index * 3;
    this.velocities[i3] = x;
    this.velocities[i3 + 1] = y;
    this.velocities[i3 + 2] = z;
  }

  /**
   * Get velocity of instance
   */
  getVelocity(index, target = new this.THREE.Vector3()) {
    if (!this.velocities) return target;

    const i3 = index * 3;
    target.set(this.velocities[i3], this.velocities[i3 + 1], this.velocities[i3 + 2]);
    return target;
  }

  /**
   * Set user data for instance
   */
  setUserData(index, data) {
    if (!this.userData) return;
    this.userData[index] = data;
  }

  /**
   * Get user data for instance
   */
  getUserData(index) {
    if (!this.userData) return null;
    return this.userData[index];
  }

  /**
   * Update all instance matrices
   */
  update() {
    if (!this.needsUpdate) return;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      // Set transform
      this.dummy.position.set(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
      this.dummy.scale.set(this.scales[i3], this.scales[i3 + 1], this.scales[i3 + 2]);
      this.dummy.quaternion.set(this.rotations[i4], this.rotations[i4 + 1], this.rotations[i4 + 2], this.rotations[i4 + 3]);

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.needsUpdate = false;
  }

  /**
   * EXPERT: Update instances using a 4D Temporal Field
   * Allows waves/phases to propagate through the instances automatically
   * 
   * @param {TemporalField} field - The time field to sample
   * @param {number} globalTime - Current global time
   * @param {Function} transformFn - (index, dummy, localPhase) => void
   */
  updateWithField(field, globalTime, transformFn) {
    const pos = new this.THREE.Vector3();
    
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      // Get base position
      pos.set(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
      
      // Calculate local 4D time phase
      const phase = field.getPhase(pos, globalTime);

      // Setup dummy with base state
      this.dummy.position.copy(pos);
      this.dummy.scale.set(this.scales[i3], this.scales[i3 + 1], this.scales[i3 + 2]);
      this.dummy.quaternion.set(this.rotations[i4], this.rotations[i4 + 1], this.rotations[i4 + 2], this.rotations[i4 + 3]);

      // Apply user transform based on phase
      // User can modify dummy.position, dummy.scale, etc. here
      transformFn(i, this.dummy, phase);

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update physics (apply velocities)
   */
  updatePhysics(deltaTime) {
    if (!this.velocities) return;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      this.positions[i3] += this.velocities[i3] * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;
    }

    this.needsUpdate = true;
  }

  /**
   * Apply function to all instances
   */
  forEach(callback) {
    for (let i = 0; i < this.count; i++) {
      callback(i, this);
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.mesh.dispose();
  }
}

// ---------------------------------------------------------
// INSTANCED PARTICLE SYSTEM
// ---------------------------------------------------------

export class InstancedParticleSystem {
  constructor(THREE, count, options = {}) {
    this.THREE = THREE;
    this.count = count;

    // Particle geometry
    const geometry = options.geometry || new THREE.SphereGeometry(0.1, 8, 8);

    // Particle material
    const material = options.material || new THREE.MeshBasicMaterial({
      vertexColors: true
    });

    // Create manager
    this.manager = new InstancedMeshManager(THREE, geometry, material, count, {
      castShadow: false,
      receiveShadow: false,
      useColors: true,
      useVelocities: true,
      useUserData: true
    });

    // Physics settings
    this.gravity = new THREE.Vector3(0, -9.8, 0);
    this.damping = 0.99;
    this.bounds = options.bounds || null;
    this.bounceOnBounds = options.bounceOnBounds || false;

    // Emitter settings
    this.emitRate = options.emitRate || 100; // particles per second
    this.lifetime = options.lifetime || 3.0; // seconds
    this.emitterPosition = options.emitterPosition || new THREE.Vector3(0, 0, 0);
    this.emitterVelocity = options.emitterVelocity || new THREE.Vector3(0, 5, 0);
    this.emitterSpread = options.emitterSpread || new THREE.Vector3(1, 1, 1);

    // Internal state
    this.activeParticles = 0;
    this.timeSinceLastEmit = 0;
  }

  /**
   * Emit a particle
   */
  emit() {
    if (this.activeParticles >= this.count) return;

    const index = this.activeParticles;

    // Set position
    this.manager.setPosition(
      index,
      this.emitterPosition.x + (Math.random() - 0.5) * this.emitterSpread.x,
      this.emitterPosition.y + (Math.random() - 0.5) * this.emitterSpread.y,
      this.emitterPosition.z + (Math.random() - 0.5) * this.emitterSpread.z
    );

    // Set velocity
    this.manager.setVelocity(
      index,
      this.emitterVelocity.x + (Math.random() - 0.5) * 2,
      this.emitterVelocity.y + (Math.random() - 0.5) * 2,
      this.emitterVelocity.z + (Math.random() - 0.5) * 2
    );

    // Set scale
    this.manager.setScale(index, 1, 1, 1);

    // Set color
    this.manager.setColorFromHSL(index, Math.random(), 0.8, 0.6);

    // Set lifetime
    this.manager.setUserData(index, { life: this.lifetime });

    this.activeParticles++;
  }

  /**
   * Update particles
   */
  update(deltaTime) {
    // Emit particles
    this.timeSinceLastEmit += deltaTime;
    const emitInterval = 1.0 / this.emitRate;

    while (this.timeSinceLastEmit >= emitInterval) {
      this.emit();
      this.timeSinceLastEmit -= emitInterval;
    }

    // Update active particles
    const THREE = this.THREE;
    const pos = new THREE.Vector3();
    const vel = new THREE.Vector3();

    for (let i = 0; i < this.activeParticles; i++) {
      const userData = this.manager.getUserData(i);
      if (!userData) continue;

      // Update lifetime
      userData.life -= deltaTime;

      if (userData.life <= 0) {
        // Particle died, swap with last active
        this.swapParticles(i, this.activeParticles - 1);
        this.activeParticles--;
        i--;
        continue;
      }

      // Apply gravity
      this.manager.getVelocity(i, vel);
      vel.add(this.gravity.clone().multiplyScalar(deltaTime));
      this.manager.setVelocity(i, vel.x, vel.y, vel.z);

      // Apply damping
      vel.multiplyScalar(this.damping);
      this.manager.setVelocity(i, vel.x, vel.y, vel.z);

      // Update position
      this.manager.getPosition(i, pos);
      pos.add(vel.clone().multiplyScalar(deltaTime));

      // Bounds checking
      if (this.bounds) {
        if (this.bounceOnBounds) {
          // Bounce
          if (pos.x < this.bounds.min.x || pos.x > this.bounds.max.x) vel.x *= -1;
          if (pos.y < this.bounds.min.y || pos.y > this.bounds.max.y) vel.y *= -1;
          if (pos.z < this.bounds.min.z || pos.z > this.bounds.max.z) vel.z *= -1;

          pos.clamp(this.bounds.min, this.bounds.max);
          this.manager.setVelocity(i, vel.x, vel.y, vel.z);
        } else {
          // Wrap
          if (pos.x < this.bounds.min.x) pos.x = this.bounds.max.x;
          if (pos.x > this.bounds.max.x) pos.x = this.bounds.min.x;
          if (pos.y < this.bounds.min.y) pos.y = this.bounds.max.y;
          if (pos.y > this.bounds.max.y) pos.y = this.bounds.min.y;
          if (pos.z < this.bounds.min.z) pos.z = this.bounds.max.z;
          if (pos.z > this.bounds.max.z) pos.z = this.bounds.min.z;
        }
      }

      this.manager.setPosition(i, pos.x, pos.y, pos.z);

      // Fade out based on lifetime
      const lifeFactor = userData.life / this.lifetime;
      this.manager.setScale(i, lifeFactor, lifeFactor, lifeFactor);
    }

    this.manager.update();
  }

  /**
   * Swap two particles
   */
  swapParticles(i, j) {
    const i3 = i * 3;
    const j3 = j * 3;
    const i4 = i * 4;
    const j4 = j * 4;

    // Swap positions
    [this.manager.positions[i3], this.manager.positions[j3]] = [this.manager.positions[j3], this.manager.positions[i3]];
    [this.manager.positions[i3 + 1], this.manager.positions[j3 + 1]] = [this.manager.positions[j3 + 1], this.manager.positions[i3 + 1]];
    [this.manager.positions[i3 + 2], this.manager.positions[j3 + 2]] = [this.manager.positions[j3 + 2], this.manager.positions[i3 + 2]];

    // Swap scales
    [this.manager.scales[i3], this.manager.scales[j3]] = [this.manager.scales[j3], this.manager.scales[i3]];
    [this.manager.scales[i3 + 1], this.manager.scales[j3 + 1]] = [this.manager.scales[j3 + 1], this.manager.scales[i3 + 1]];
    [this.manager.scales[i3 + 2], this.manager.scales[j3 + 2]] = [this.manager.scales[j3 + 2], this.manager.scales[i3 + 2]];

    // Swap rotations
    [this.manager.rotations[i4], this.manager.rotations[j4]] = [this.manager.rotations[j4], this.manager.rotations[i4]];
    [this.manager.rotations[i4 + 1], this.manager.rotations[j4 + 1]] = [this.manager.rotations[j4 + 1], this.manager.rotations[i4 + 1]];
    [this.manager.rotations[i4 + 2], this.manager.rotations[j4 + 2]] = [this.manager.rotations[j4 + 2], this.manager.rotations[i4 + 2]];
    [this.manager.rotations[i4 + 3], this.manager.rotations[j4 + 3]] = [this.manager.rotations[j4 + 3], this.manager.rotations[i4 + 3]];

    // Swap colors
    if (this.manager.colors) {
      [this.manager.colors[i3], this.manager.colors[j3]] = [this.manager.colors[j3], this.manager.colors[i3]];
      [this.manager.colors[i3 + 1], this.manager.colors[j3 + 1]] = [this.manager.colors[j3 + 1], this.manager.colors[i3 + 1]];
      [this.manager.colors[i3 + 2], this.manager.colors[j3 + 2]] = [this.manager.colors[j3 + 2], this.manager.colors[i3 + 2]];
    }

    // Swap velocities
    if (this.manager.velocities) {
      [this.manager.velocities[i3], this.manager.velocities[j3]] = [this.manager.velocities[j3], this.manager.velocities[i3]];
      [this.manager.velocities[i3 + 1], this.manager.velocities[j3 + 1]] = [this.manager.velocities[j3 + 1], this.manager.velocities[i3 + 1]];
      [this.manager.velocities[i3 + 2], this.manager.velocities[j3 + 2]] = [this.manager.velocities[j3 + 2], this.manager.velocities[i3 + 2]];
    }

    // Swap user data
    if (this.manager.userData) {
      [this.manager.userData[i], this.manager.userData[j]] = [this.manager.userData[j], this.manager.userData[i]];
    }
  }

  get mesh() {
    return this.manager.mesh;
  }

  dispose() {
    this.manager.dispose();
  }
}

// ---------------------------------------------------------
// CONVENIENCE FUNCTIONS
// ---------------------------------------------------------

/**
 * Create instanced mesh from geometry and material
 */
export function createInstancedMesh(THREE, geometry, material, count, options = {}) {
  return new InstancedMeshManager(THREE, geometry, material, count, options);
}

/**
 * Create instanced particle system
 */
export function createInstancedParticles(THREE, count, options = {}) {
  return new InstancedParticleSystem(THREE, count, options);
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  InstancedMeshManager,
  InstancedParticleSystem,
  createInstancedMesh,
  createInstancedParticles
};
