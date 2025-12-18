/**
 * FlowerOfLife.js
 * Sacred geometry pattern: Flower of Life in a 3D Vortex Tunnel
 * UPGRADED: From 2D Canvas to Volumetric 3D
 */

import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../core/ThreeEffectBase.js';
import { 
  ColorPalettes, 
  SacredGeometry3D, 
  TemporalField, 
  CinematicCamera, 
  Shot,
  LoopClock,
  createInstancedMesh
} from '../engine/jazer-background-engine.js';

export class FlowerOfLife extends ThreeEffectBase {
  getName() {
    return 'Flower of Life (Volumetric)';
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return 'Sacred geometry pattern featuring the Flower of Life in a mesmerizing 3D vortex tunnel';
  }

  getTags() {
    return ['3d', 'geometry', 'sacred', 'mandala', 'vortex', 'tunnel'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      layerCount: 20,
      depthSpacing: 4,
      backgroundColor: 0x0a0515
    };
  }

  async createScene() {
    const palette = ColorPalettes.sacredGeometry || [0xffd700, 0xff6b35, 0xff2aff];
    this.palette = palette;

    // 1. Setup Timing
    this.loopClock = new LoopClock({ duration: 30 });
    this.timeField = new TemporalField({
      type: 'planar', // Wave moves down the tunnel
      direction: new THREE.Vector3(0, 0, 1),
      speed: 2.0,
      density: 0.2
    });

    // 2. Setup Camera
    this.cinematic = new CinematicCamera(this.camera);
    // Continuous forward flight through the tunnel
    this.cinematic.setShots([
      Shot.dollyGlide({ from: [0, 0, 5], to: [0, 0, -40], duration: 1.0 })
    ]);
    this.camera.fov = 90; // Wide angle for speed
    this.camera.updateProjectionMatrix();

    // 3. Environment
    this.scene.fog = new THREE.FogExp2(this.config.backgroundColor, 0.04);
    this.renderer.setClearColor(this.config.backgroundColor);

    // 4. Create The Flower Tunnel
    this.createFlowerTunnel(palette);
  }

  createFlowerTunnel(palette) {
    this.tunnelGroup = new THREE.Group();
    
    // Generate points for multiple layers
    const layers = this.config.layerCount;
    const spacing = this.config.depthSpacing;
    const tunnelLength = layers * spacing;
    
    // We'll use one InstancedMesh for the entire tunnel
    // Each layer is a FlowerOfLife pattern
    const pointsPerLayer = SacredGeometry3D.FlowerOfLifePoints(3, 1.5, 0).length;
    const totalCount = pointsPerLayer * layers;
    
    // Geometry: Torus for the circles
    const geometry = new THREE.TorusGeometry(1.5, 0.03, 8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.instances = createInstancedMesh(THREE, geometry, material, totalCount, {
      useColors: true
    });
    
    let index = 0;
    for (let i = 0; i < layers; i++) {
      // Offset each layer in Z
      // We repeat the layers to create infinite illusion
      const zBase = -i * spacing;
      
      const layerPoints = SacredGeometry3D.FlowerOfLifePoints(3, 1.5, zBase);
      const layerColor = palette[i % palette.length];
      
      layerPoints.forEach(pt => {
        this.instances.setPosition(index, pt.x, pt.y, pt.z);
        this.instances.setColorFromHex(index, layerColor);
        // Store original Z for infinite looping logic
        this.instances.setUserData(index, { baseZ: pt.z });
        index++;
      });
    }
    
    this.instances.update();
    this.tunnelGroup.add(this.instances.mesh);
    this.scene.add(this.tunnelGroup);
  }

  render(time, deltaTime) {
    this.loopClock.update(deltaTime);
    const t = this.loopClock.t;
    const globalTime = this.loopClock.elapsed;

    // 1. Move Camera? No, move tunnel to simulate infinite flight
    // This avoids floating point errors with infinite forward camera
    const tunnelSpeed = 5.0;
    const tunnelLength = this.config.layerCount * this.config.depthSpacing;
    const zOffset = (globalTime * tunnelSpeed) % tunnelLength;
    
    // 2. Animate Instances
    this.instances.updateWithField(this.timeField, globalTime, (i, dummy, phase) => {
      const userData = this.instances.getUserData(i);
      
      // Infinite Tunnel Logic:
      // Move Z towards camera, wrap around when passed
      let z = userData.baseZ + zOffset;
      if (z > 5) z -= tunnelLength; // Wrap to back
      
      dummy.position.z = z;
      
      // Rotation - Spin the tunnel layers
      // Outer layers spin faster?
      const dist = Math.sqrt(dummy.position.x*dummy.position.x + dummy.position.y*dummy.position.y);
      const rot = globalTime * 0.2 + dist * 0.1;
      
      // Apply rotation manually since we have x,y
      // Actually, easier to rotate the whole group? No, we want differential rotation.
      // Let's just rotate the circle itself for now
      dummy.rotation.z = rot;
      
      // Breathing scale
      const breath = 1.0 + Math.sin(phase * 3.0) * 0.1;
      dummy.scale.setScalar(breath);
      
      // Fade out in distance (manual fog for additive blending)
      const distZ = -z;
      let alpha = 1.0 - (distZ / 50.0);
      alpha = Math.max(0, Math.min(1, alpha));
      // Note: InstancedMesh doesn't support per-instance alpha easily without custom shader
      // We scale to 0 to simulate fade out
      dummy.scale.multiplyScalar(alpha);
    });

    // 3. Subtle Camera Drift
    const driftX = Math.sin(globalTime * 0.5) * 1.0;
    const driftY = Math.cos(globalTime * 0.3) * 1.0;
    this.camera.position.set(driftX, driftY, 5);
    this.camera.lookAt(driftX * 0.5, driftY * 0.5, -20);
    
    super.render(time, deltaTime);
  }
}
