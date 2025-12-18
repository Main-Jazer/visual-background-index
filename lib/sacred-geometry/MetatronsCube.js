/**
 * MetatronsCube.js
 * Sacred geometry pattern: Metatron's Cube with Platonic Solids in 3D
 */

import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { ColorPalettes } from '../engine/jazer-background-engine.js';

export class MetatronsCube extends ThreeEffectBase {
  getName() {
    return "Metatron's Cube";
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return "Sacred geometry pattern featuring Metatron's Cube with the five Platonic Solids in 3D space";
  }

  getTags() {
    return ['3d', 'geometry', 'sacred', 'three.js', 'platonic'];
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

    // Add fog
    this.scene.fog = new THREE.FogExp2(0x000204, 0.08);

    // Add lights
    const pointLights = [
      new THREE.PointLight(palette[0], 3, 40, 2),
      new THREE.PointLight(palette[1], 3, 40, 2),
      new THREE.PointLight(palette[2], 2, 40, 2),
    ];
    pointLights.forEach(light => this.scene.add(light));
    this.pointLights = pointLights;

    // Create Metatron's Cube geometry
    this.createMetatronsCube();

    // Create Platonic Solids
    this.createPlatonicSolids(palette);

    // Create particles
    this.createParticles();
  }

  createMetatronsCube() {
    this.metatronGroup = new THREE.Group();
    const fruitOfLifeRadius = 5;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });

    // Create Fruit of Life centers (13 circles)
    const centers = [new THREE.Vector3(0, 0, 0)];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      centers.push(new THREE.Vector3(
        Math.cos(angle) * fruitOfLifeRadius,
        Math.sin(angle) * fruitOfLifeRadius,
        0
      ));
      centers.push(new THREE.Vector3(
        Math.cos(angle) * fruitOfLifeRadius * 2,
        Math.sin(angle) * fruitOfLifeRadius * 2,
        0
      ));
    }

    // Connect all centers to form Metatron's Cube lines
    const lines = [];
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        lines.push(centers[i], centers[j]);
      }
    }
    const metatronGeometry = new THREE.BufferGeometry().setFromPoints(lines);
    const metatronLines = new THREE.LineSegments(metatronGeometry, lineMaterial);
    this.metatronGroup.add(metatronLines);

    // Add circles for Fruit of Life
    const circleGeom = new THREE.TorusGeometry(fruitOfLifeRadius, 0.05, 16, 100);
    centers.forEach(center => {
      const circle = new THREE.Mesh(circleGeom, lineMaterial);
      circle.position.copy(center);
      this.metatronGroup.add(circle);
    });

    this.scene.add(this.metatronGroup);
  }

  createPlatonicSolids(palette) {
    this.solids = new THREE.Group();
    const solidMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });

    const solidGeometries = [
      { geom: new THREE.TetrahedronGeometry(2), name: 'fire' },
      { geom: new THREE.BoxGeometry(3, 3, 3), name: 'earth' },
      { geom: new THREE.OctahedronGeometry(2.5), name: 'air' },
      { geom: new THREE.IcosahedronGeometry(3), name: 'water' },
      { geom: new THREE.DodecahedronGeometry(3.5), name: 'ether' },
    ];

    this.solidMeshes = solidGeometries.map((item, i) => {
      const material = solidMaterial.clone();
      material.color = new THREE.Color(palette[i % palette.length]);
      material.emissive = material.color.clone().multiplyScalar(0.4);
      const mesh = new THREE.Mesh(item.geom, material);

      const angle = (i / solidGeometries.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 12, Math.sin(angle) * 12, 0);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      this.solids.add(mesh);
      return mesh;
    });

    this.scene.add(this.solids);
  }

  createParticles() {
    const particleCount = 2000;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 100;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }

  render(time, deltaTime) {
    // Animate camera
    this.camera.position.z = 25 + Math.sin(time * 0.1) * 10;
    this.camera.position.x = Math.cos(time * 0.2) * 5;
    this.camera.lookAt(this.scene.position);

    // Animate lights
    this.pointLights[0].position.set(
      Math.cos(time * 0.5) * 15,
      Math.sin(time * 0.3) * 15,
      Math.sin(time * 0.4) * 10
    );
    this.pointLights[1].position.set(
      Math.sin(time * 0.3) * -15,
      Math.cos(time * 0.5) * 15,
      Math.cos(time * 0.2) * -10
    );
    this.pointLights[2].position.set(
      Math.cos(time * 0.2) * 10,
      Math.sin(time * 0.4) * -10,
      Math.sin(time * 0.5) * 15
    );

    // Animate Metatron's Cube
    this.metatronGroup.rotation.z = time * 0.05;
    this.metatronGroup.rotation.x = time * 0.03;
    this.metatronGroup.rotation.y = time * 0.02;

    // Animate Platonic Solids
    this.solidMeshes.forEach((mesh, i) => {
      mesh.rotation.x += mesh.userData.rotationSpeed.x * deltaTime;
      mesh.rotation.y += mesh.userData.rotationSpeed.y * deltaTime;
      mesh.rotation.z += mesh.userData.rotationSpeed.z * deltaTime;

      const pulse = Math.sin(time * 2 + i) * 0.5 + 0.5;
      mesh.material.emissiveIntensity = pulse * 1.5;

      const t = time * 0.5 + i * 2;
      mesh.position.x = mesh.userData.basePosition.x + Math.sin(t) * 3;
      mesh.position.y = mesh.userData.basePosition.y + Math.cos(t) * 3;
    });

    // Animate particles
    this.particles.rotation.y = time * 0.02;

    super.render(time, deltaTime);
  }
}
