/**
 * MetatronsCube.js
 * Sacred geometry pattern: Metatron's Cube with Platonic Solids in 3D
 * UPGRADED: Now uses Volumetric Sacred Geometry and 4D Time Fields
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
  createInstancedMesh,
  Volumetric
} from '../engine/jazer-background-engine.js';

export class MetatronsCube extends ThreeEffectBase {
  getName() {
    return "Metatron's Cube (Volumetric)";
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return "Sacred geometry pattern featuring Metatron's Cube with 4D phased animation and cinematic depth";
  }

  getTags() {
    return ['3d', 'geometry', 'sacred', 'three.js', 'platonic', 'cinematic'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      clearColor: 0x000204,
      palette: ColorPalettes.cyberpunk
    };
  }

  async createScene() {
    const palette = this.config.palette;

    // 1. Setup Cinematic Timing
    this.loopClock = new LoopClock({ duration: 24 }); // 24s perfect loop
    this.timeField = new TemporalField({
      type: 'radial',
      speed: 1.0,
      density: 0.15,
      falloff: 20
    });

    // 2. Setup Camera Motion
    this.cinematic = new CinematicCamera(this.camera);
    this.cinematic.setShots([
      Shot.lockedHero({ position: [0, 0, 40], lookAt: [0, 0, 0], duration: 0.3 }),
      Shot.orbitSubtle({ center: [0, 0, 0], radius: 35, startAngle: 0, arcSpan: 0.5, duration: 0.4 }),
      Shot.dollyGlide({ from: [0, 10, 30], to: [0, 0, 20], duration: 0.3 })
    ]);

    // 3. Environment
    this.scene.fog = new THREE.FogExp2(0x000204, 0.03);
    
    // Volumetric Fog (Subtle)
    this.volumetricFog = Volumetric.createVolumetricFog(
      THREE, 
      new THREE.Vector3(0.05, 0.05, 0.1), 
      10, 60, 0.3
    );
    // Note: Volumetric passes are usually post-process, but we can simulate simple fog here.
    // For this effect, we stick to standard fog for performance stability in this refactor.

    // 4. Create Metatron's Geometry
    this.createSacredStructure(palette);

    // 5. Create Floating Platonic Solids
    this.createPlatonicSolids(palette);

    // 6. Create Ambient Particles
    this.createParticles();
  }

  createSacredStructure(palette) {
    this.structureGroup = new THREE.Group();
    const scale = 8;
    
    // Get mathematically correct centers
    const centers = SacredGeometry3D.MetatronsCubeCenters(scale);
    
    // A. The Nodes (Spheres) - Instanced
    const sphereGeom = new THREE.SphereGeometry(1.2, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: palette[1],
      roughness: 0.2,
      metalness: 0.8,
      emissive: palette[1],
      emissiveIntensity: 0.2
    });
    
    this.nodes = createInstancedMesh(THREE, sphereGeom, sphereMat, centers.length, {
      useColors: true
    });
    
    centers.forEach((pos, i) => {
      this.nodes.setPosition(i, pos.x, pos.y, pos.z);
      this.nodes.setColorFromHex(i, i === 0 ? palette[3] : palette[1]); // Center is different
    });
    this.nodes.update();
    this.structureGroup.add(this.nodes.mesh);

    // B. The Lines (Connection Network)
    const linePoints = SacredGeometry3D.MetatronsCubeLines(centers);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: palette[0],
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    this.lines = new THREE.LineSegments(lineGeom, lineMat);
    this.structureGroup.add(this.lines);

    // C. The Rings (Fruit of Life)
    centers.forEach(center => {
      // Don't put a ring on the center
      if (center.lengthSq() < 0.1) return;
      
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(scale * 1.5, 0.1, 8, 64),
        new THREE.MeshBasicMaterial({ color: palette[2], transparent: true, opacity: 0.4 })
      );
      ring.position.copy(center);
      ring.lookAt(0, 0, 0); // Face center
      this.structureGroup.add(ring);
    });

    this.scene.add(this.structureGroup);
  }

  createPlatonicSolids(palette) {
    this.solids = new THREE.Group();
    const material = new THREE.MeshPhysicalMaterial({
      color: palette[4],
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const geoms = [
      new THREE.TetrahedronGeometry(2),
      new THREE.BoxGeometry(2.5, 2.5, 2.5),
      new THREE.OctahedronGeometry(2),
      new THREE.IcosahedronGeometry(2.2),
      new THREE.DodecahedronGeometry(2.2)
    ];

    this.solidMeshes = geoms.map((geom, i) => {
      const mesh = new THREE.Mesh(geom, material.clone());
      const angle = (i / 5) * Math.PI * 2;
      const radius = 25;
      
      mesh.userData = {
        basePos: new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
        rotSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.5)
      };
      
      mesh.material.color.setHex(palette[i % palette.length]);
      this.solids.add(mesh);
      return mesh;
    });

    this.scene.add(this.solids);
  }

  createParticles() {
    // Background dust using InstancedMesh for performance
    const count = 1000;
    const geom = new THREE.TetrahedronGeometry(0.2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    
    this.dust = createInstancedMesh(THREE, geom, mat, count);
    
    for(let i=0; i<count; i++) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      this.dust.setPosition(i, 
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      this.dust.setScale(i, Math.random() * 0.5 + 0.5);
    }
    this.dust.update();
    this.scene.add(this.dust.mesh);
  }

  render(time, deltaTime) {
    // 1. Update Timing
    this.loopClock.update(deltaTime);
    const t = this.loopClock.t;
    const globalTime = this.loopClock.elapsed;

    // 2. Update Camera (Cinematic)
    this.cinematic.update(t, deltaTime);

    // 3. Animate Sacred Structure (4D Wave)
    this.structureGroup.rotation.z = t * Math.PI * 2 * 0.1;
    
    // Use the 4D field to animate the nodes
    this.nodes.updateWithField(this.timeField, globalTime, (i, dummy, phase) => {
      // Scale pulse based on phase
      const scale = 1.0 + Math.sin(phase * Math.PI * 2) * 0.3;
      dummy.scale.setScalar(scale);
    });

    // 4. Animate Solids
    this.solidMeshes.forEach((mesh, i) => {
      // Rotate
      mesh.rotation.x += mesh.userData.rotSpeed.x * deltaTime;
      mesh.rotation.y += mesh.userData.rotSpeed.y * deltaTime;
      
      // Orbit
      const orbitSpeed = 0.2;
      const angle = (i / 5) * Math.PI * 2 + globalTime * orbitSpeed;
      const radius = 25 + Math.sin(globalTime * 0.5 + i) * 5;
      
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(globalTime + i * 2) * 5 // Vertical bob
      );
    });

    // 5. Render
    super.render(time, deltaTime);
  }
}
