/**
 * QuantumFoam.js
 * Quantum physics visualization with particle foam effect
 */

import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { mouse } from '../../jazer-background-engine.js';

export class QuantumFoam extends ThreeEffectBase {
  getName() {
    return 'Quantum Foam';
  }

  getCategory() {
    return 'quantum';
  }

  getDescription() {
    return 'Abstract quantum physics visualization showing particle foam with fluctuating energy fields';
  }

  getTags() {
    return ['3d', 'quantum', 'particles', 'three.js', 'physics'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      particleCount: 8000,
      foamRadius: 10,
      cameraZ: 15
    };
  }

  async createScene() {
    const { particleCount, foamRadius } = this.config;

    // Create particle geometry
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Initialize particles in a spherical distribution
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random position within sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * foamRadius;
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Color based on position
      const hue = (0.7 + Math.sin(i * 0.1) * 0.1) % 1;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 0.05 + 0.02;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for quantum particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mousePos: { value: new THREE.Vector2(0, 0) },
        foamRadius: { value: foamRadius }
      },
      vertexShader: `
        uniform float time;
        uniform vec2 mousePos;
        uniform float foamRadius;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vDistance;

        void main() {
          vColor = color;
          
          vec3 pos = position;
          
          // Quantum fluctuation using simple sine waves
          float noiseAmp = 0.3;
          pos.x += sin(time * 0.5 + position.y * 0.1 + position.z * 0.1) * noiseAmp;
          pos.y += cos(time * 0.4 + position.x * 0.1 + position.z * 0.1) * noiseAmp;
          pos.z += sin(time * 0.3 + position.x * 0.1 + position.y * 0.1) * noiseAmp;
          
          // Mouse influence
          vec3 mouseVec = vec3(mousePos.x * 10.0, -mousePos.y * 10.0, 0.0);
          float mouseDist = distance(pos, mouseVec);
          if (mouseDist < 5.0) {
            pos += normalize(pos - mouseVec) * 0.1 * (5.0 - mouseDist);
          }
          
          // Keep particles within bounds
          float distFromCenter = length(pos);
          if (distFromCenter > foamRadius) {
            pos = normalize(pos) * foamRadius * 0.95;
          }
          
          vDistance = distFromCenter / foamRadius;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * 300.0 * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDistance;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - dist * 2.0;
          alpha = pow(alpha, 2.0);
          
          // Adjust brightness based on distance from center
          float brightness = 1.0 - vDistance * 0.3;
          
          gl_FragColor = vec4(vColor * brightness, alpha * brightness * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);

    // Energy field wireframe
    const fieldGeometry = new THREE.IcosahedronGeometry(foamRadius * 0.8, 4);
    const fieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x5533ff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending
    });
    
    this.energyField = new THREE.Mesh(fieldGeometry, fieldMaterial);
    this.scene.add(this.energyField);

    // Add lights
    const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
    pointLight2.position.set(-5, -5, -5);
    this.scene.add(pointLight2);
  }

  render(time, deltaTime) {
    // Update uniforms
    this.particles.material.uniforms.time.value = time;
    this.particles.material.uniforms.mousePos.value.set(mouse.centeredX, mouse.centeredY);

    // Rotate the foam slowly
    this.particles.rotation.x = time * 0.05;
    this.particles.rotation.y = time * 0.03;
    this.energyField.rotation.x = time * 0.02;
    this.energyField.rotation.y = time * 0.04;

    // Camera movement with mouse
    this.camera.position.x = Math.sin(time * 0.1) * 5 + mouse.centeredX * 2;
    this.camera.position.y = Math.cos(time * 0.15) * 2 + mouse.centeredY * 2;
    this.camera.position.z = 15 + Math.sin(time * 0.05) * 2;
    this.camera.lookAt(this.scene.position);

    super.render(time, deltaTime);
  }
}
