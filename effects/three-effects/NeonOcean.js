/**
 * NeonOcean.js
 * Neon wireframe ocean with animated waves
 */

import * as THREE from '../../Three.js';
import { ThreeEffectBase } from '../lib/ThreeEffectBase.js';
import { noise2D, mouse } from '../../jazer-background-engine.js';

export class NeonOcean extends ThreeEffectBase {
  getName() {
    return 'Neon Ocean';
  }

  getCategory() {
    return 'cyber';
  }

  getDescription() {
    return 'Neon wireframe ocean with procedurally animated waves in a cyberpunk aesthetic';
  }

  getTags() {
    return ['3d', 'ocean', 'wireframe', 'three.js', 'cyber', 'neon'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      oceanWidth: 200,
      oceanDepth: 200,
      oceanResolution: 100,
      cameraZ: 15
    };
  }

  async createScene() {
    const { oceanWidth, oceanDepth, oceanResolution } = this.config;

    // Add fog
    this.scene.fog = new THREE.Fog(0x000510, 10, 100);

    // Position camera
    this.camera.position.set(0, 8, 15);
    this.camera.rotation.x = -0.3;

    // Create ocean wave mesh
    this.oceanGeometry = new THREE.PlaneGeometry(
      oceanWidth,
      oceanDepth,
      oceanResolution,
      oceanResolution
    );

    // Store original positions
    const oceanPositions = this.oceanGeometry.attributes.position.array;
    this.originalPositions = new Float32Array(oceanPositions.length);
    for (let i = 0; i < oceanPositions.length; i++) {
      this.originalPositions[i] = oceanPositions[i];
    }

    // Create shader material
    const oceanMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x00f5ff) },
        color2: { value: new THREE.Color(0xff2aff) }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying float vElevation;
        uniform float time;

        void main() {
          vPosition = position;
          vElevation = position.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec3 vPosition;
        varying float vElevation;

        void main() {
          vec3 color = mix(color1, color2, vElevation * 0.2 + 0.5);
          float intensity = vElevation * 0.3 + 0.7;
          gl_FragColor = vec4(color * intensity, 0.9);
        }
      `,
      wireframe: true,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.ocean = new THREE.Mesh(this.oceanGeometry, oceanMaterial);
    this.ocean.rotation.x = -Math.PI / 2;
    this.scene.add(this.ocean);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x112244, 0.3);
    this.scene.add(ambientLight);

    // Add point lights
    this.pointLights = [
      new THREE.PointLight(0x00f5ff, 2, 50),
      new THREE.PointLight(0xff2aff, 2, 50),
      new THREE.PointLight(0x39ff14, 1.5, 40)
    ];
    
    this.pointLights.forEach(light => this.scene.add(light));
  }

  render(time, deltaTime) {
    // Update ocean waves
    const positions = this.oceanGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = this.originalPositions[i];
      const y = this.originalPositions[i + 1];
      
      // Multiple layers of noise for realistic waves
      const wave1 = noise2D(x * 0.02 + time * 0.3, y * 0.02) * 2;
      const wave2 = noise2D(x * 0.05 - time * 0.2, y * 0.05) * 1;
      const wave3 = noise2D(x * 0.1 + time * 0.4, y * 0.1) * 0.5;
      
      positions[i + 2] = wave1 + wave2 + wave3;
    }
    this.oceanGeometry.attributes.position.needsUpdate = true;
    this.oceanGeometry.computeVertexNormals();

    // Update shader uniforms
    this.ocean.material.uniforms.time.value = time;

    // Animate lights
    this.pointLights[0].position.set(
      Math.cos(time * 0.5) * 20,
      10,
      Math.sin(time * 0.5) * 20
    );
    this.pointLights[1].position.set(
      Math.sin(time * 0.3) * -20,
      12,
      Math.cos(time * 0.3) * 20
    );
    this.pointLights[2].position.set(
      Math.cos(time * 0.4) * 15,
      8,
      Math.sin(time * 0.4) * -15
    );

    // Camera movement
    this.camera.position.x = Math.sin(time * 0.1) * 3 + mouse.centeredX * 5;
    this.camera.position.y = 8 + mouse.centeredY * 3;
    this.camera.lookAt(0, 0, 0);

    super.render(time, deltaTime);
  }
}
