// jazer-cinematic-fx.js
// JaZeR Cinematic Post-Processing Effects
// Depth of Field (DOF), Motion Blur, and other cinematic effects
// ============================================================================

// ---------------------------------------------------------
// DEPTH OF FIELD SHADERS
// ---------------------------------------------------------

const DOF_VERT_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOF_BOKEH_FRAG_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uFocus;
uniform float uAperture;
uniform float uMaxBlur;
uniform float uNearBlur;
uniform float uFarBlur;

varying vec2 vUv;

// Hexagonal bokeh sampling pattern
const int RING_SAMPLES = 6;
const int RINGS = 5;

float getDepth(vec2 uv) {
  return texture2D(tDepth, uv).r;
}

float getBlurSize(float depth) {
  float diff = abs(depth - uFocus);

  if (depth < uFocus) {
    // Near blur
    return clamp(diff / uFocus * uNearBlur, 0.0, uMaxBlur);
  } else {
    // Far blur
    return clamp(diff / (1.0 - uFocus) * uFarBlur, 0.0, uMaxBlur);
  }
}

vec3 hexagonalBokeh(vec2 uv, float blur) {
  if (blur < 0.001) {
    return texture2D(tDiffuse, uv).rgb;
  }

  vec3 color = vec3(0.0);
  float total = 0.0;

  // Center sample
  color += texture2D(tDiffuse, uv).rgb;
  total += 1.0;

  // Hexagonal rings
  for (int ring = 1; ring <= RINGS; ring++) {
    if (ring > int(blur * float(RINGS))) break;

    float radius = float(ring) / float(RINGS) * blur * uAperture / uResolution.x;

    for (int sample = 0; sample < RING_SAMPLES; sample++) {
      float angle = float(sample) / float(RING_SAMPLES) * 6.28318 + float(ring) * 0.5;
      vec2 offset = vec2(cos(angle), sin(angle)) * radius;
      vec2 sampleUv = uv + offset;

      if (sampleUv.x >= 0.0 && sampleUv.x <= 1.0 && sampleUv.y >= 0.0 && sampleUv.y <= 1.0) {
        color += texture2D(tDiffuse, sampleUv).rgb;
        total += 1.0;
      }
    }
  }

  return color / total;
}

void main() {
  float depth = getDepth(vUv);
  float blur = getBlurSize(depth);

  vec3 color = hexagonalBokeh(vUv, blur);

  gl_FragColor = vec4(color, 1.0);
}
`;

// Faster DOF (Gaussian blur based on depth)
const DOF_GAUSSIAN_FRAG_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform vec2 uDirection;
uniform float uFocus;
uniform float uAperture;
uniform float uMaxBlur;

varying vec2 vUv;

float getDepth(vec2 uv) {
  return texture2D(tDepth, uv).r;
}

float getBlurSize(float depth) {
  return abs(depth - uFocus) * uAperture * uMaxBlur;
}

void main() {
  float depth = getDepth(vUv);
  float blur = getBlurSize(depth);

  if (blur < 0.001) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  vec4 color = vec4(0.0);
  float total = 0.0;

  // Gaussian kernel
  float offset = blur / uResolution.x * 0.5;

  for (float i = -4.0; i <= 4.0; i += 1.0) {
    vec2 sampleUv = vUv + uDirection * i * offset;
    float weight = exp(-0.5 * pow(i / 2.0, 2.0));

    color += texture2D(tDiffuse, sampleUv) * weight;
    total += weight;
  }

  gl_FragColor = color / total;
}
`;

// ---------------------------------------------------------
// MOTION BLUR SHADERS
// ---------------------------------------------------------

const MOTION_BLUR_FRAG_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tVelocity;
uniform vec2 uResolution;
uniform float uIntensity;
uniform int uSamples;
uniform float uMaxBlur;

varying vec2 vUv;

void main() {
  // Get velocity from velocity buffer
  vec2 velocity = texture2D(tVelocity, vUv).rg;

  // Scale velocity
  velocity *= uIntensity * uMaxBlur;

  // Clamp velocity to prevent excessive blur
  float speed = length(velocity);
  if (speed > uMaxBlur) {
    velocity = normalize(velocity) * uMaxBlur;
  }

  // Sample along velocity vector
  vec4 color = vec4(0.0);
  float total = 0.0;

  for (int i = 0; i < 16; i++) {
    if (i >= uSamples) break;

    float t = float(i) / float(uSamples - 1) - 0.5;
    vec2 offset = velocity * t;
    vec2 sampleUv = vUv + offset / uResolution;

    color += texture2D(tDiffuse, sampleUv);
    total += 1.0;
  }

  gl_FragColor = color / total;
}
`;

// Camera motion blur (screen-space)
const CAMERA_MOTION_BLUR_FRAG_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform mat4 uPreviousViewProjectionMatrix;
uniform mat4 uCurrentViewProjectionMatrixInverse;
uniform float uIntensity;
uniform int uSamples;

varying vec2 vUv;

vec3 getWorldPosition(vec2 uv, float depth) {
  vec4 clipSpace = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 worldSpace = uCurrentViewProjectionMatrixInverse * clipSpace;
  return worldSpace.xyz / worldSpace.w;
}

void main() {
  float depth = texture2D(tDepth, vUv).r;

  // Reconstruct world position
  vec3 worldPos = getWorldPosition(vUv, depth);

  // Project to previous frame
  vec4 prevClip = uPreviousViewProjectionMatrix * vec4(worldPos, 1.0);
  vec2 prevUv = (prevClip.xy / prevClip.w) * 0.5 + 0.5;

  // Calculate velocity
  vec2 velocity = (vUv - prevUv) * uIntensity;

  // Sample along velocity
  vec4 color = vec4(0.0);

  for (int i = 0; i < 16; i++) {
    if (i >= uSamples) break;

    float t = float(i) / float(uSamples - 1);
    vec2 sampleUv = mix(prevUv, vUv, t);

    color += texture2D(tDiffuse, sampleUv);
  }

  gl_FragColor = color / float(uSamples);
}
`;

// ---------------------------------------------------------
// DEPTH OF FIELD PASS
// ---------------------------------------------------------

export class DepthOfFieldPass {
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.enabled = options.enabled !== false;
    this.needsSwap = true;
    this.renderToScreen = false;

    // DOF parameters
    this.focus = options.focus || 0.5; // 0 = near, 1 = far
    this.aperture = options.aperture || 0.025;
    this.maxBlur = options.maxBlur || 1.0;
    this.nearBlur = options.nearBlur || 1.0;
    this.farBlur = options.farBlur || 1.0;
    this.bokeh = options.bokeh !== false; // Use bokeh sampling

    if (this.bokeh) {
      // Bokeh DOF (slower, higher quality)
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tDepth: { value: null },
          uResolution: { value: new THREE.Vector2() },
          uFocus: { value: this.focus },
          uAperture: { value: this.aperture },
          uMaxBlur: { value: this.maxBlur },
          uNearBlur: { value: this.nearBlur },
          uFarBlur: { value: this.farBlur }
        },
        vertexShader: DOF_VERT_SHADER,
        fragmentShader: DOF_BOKEH_FRAG_SHADER
      });
    } else {
      // Gaussian DOF (faster, good quality)
      // Need two passes for separable blur
      this.materialH = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tDepth: { value: null },
          uResolution: { value: new THREE.Vector2() },
          uDirection: { value: new THREE.Vector2(1, 0) },
          uFocus: { value: this.focus },
          uAperture: { value: this.aperture },
          uMaxBlur: { value: this.maxBlur }
        },
        vertexShader: DOF_VERT_SHADER,
        fragmentShader: DOF_GAUSSIAN_FRAG_SHADER
      });

      this.materialV = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tDepth: { value: null },
          uResolution: { value: new THREE.Vector2() },
          uDirection: { value: new THREE.Vector2(0, 1) },
          uFocus: { value: this.focus },
          uAperture: { value: this.aperture },
          uMaxBlur: { value: this.maxBlur }
        },
        vertexShader: DOF_VERT_SHADER,
        fragmentShader: DOF_GAUSSIAN_FRAG_SHADER
      });

      // Intermediate render target for two-pass blur
      this.tempRT = new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
      });
    }
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad, depthTexture) {
    if (!this.enabled || !depthTexture) return;

    if (this.bokeh) {
      // Single-pass bokeh DOF
      this.material.uniforms.tDiffuse.value = readBuffer.texture;
      this.material.uniforms.tDepth.value = depthTexture;
      this.material.uniforms.uFocus.value = this.focus;
      this.material.uniforms.uAperture.value = this.aperture;
      this.material.uniforms.uMaxBlur.value = this.maxBlur;

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }

      fsQuad.material = this.material;
      fsQuad.render(renderer);
    } else {
      // Two-pass Gaussian DOF
      const depthTex = depthTexture;

      // Horizontal pass
      this.materialH.uniforms.tDiffuse.value = readBuffer.texture;
      this.materialH.uniforms.tDepth.value = depthTex;
      this.materialH.uniforms.uFocus.value = this.focus;

      renderer.setRenderTarget(this.tempRT);
      fsQuad.material = this.materialH;
      fsQuad.render(renderer);

      // Vertical pass
      this.materialV.uniforms.tDiffuse.value = this.tempRT.texture;
      this.materialV.uniforms.tDepth.value = depthTex;
      this.materialV.uniforms.uFocus.value = this.focus;

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }

      fsQuad.material = this.materialV;
      fsQuad.render(renderer);
    }
  }

  setSize(width, height) {
    if (this.bokeh) {
      this.material.uniforms.uResolution.value.set(width, height);
    } else {
      this.materialH.uniforms.uResolution.value.set(width, height);
      this.materialV.uniforms.uResolution.value.set(width, height);
      this.tempRT.setSize(width, height);
    }
  }

  setFocus(focus) {
    this.focus = focus;
  }

  autoFocus(depthTexture, uv = { x: 0.5, y: 0.5 }) {
    // Auto-focus on center or specified UV coordinate
    // This would need to read the depth texture at that point
    // Implementation depends on depth buffer access
  }

  dispose() {
    if (this.bokeh) {
      this.material.dispose();
    } else {
      this.materialH.dispose();
      this.materialV.dispose();
      this.tempRT.dispose();
    }
  }
}

// ---------------------------------------------------------
// MOTION BLUR PASS
// ---------------------------------------------------------

export class MotionBlurPass {
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.enabled = options.enabled !== false;
    this.needsSwap = true;
    this.renderToScreen = false;

    // Motion blur parameters
    this.intensity = options.intensity || 1.0;
    this.samples = options.samples || 8;
    this.maxBlur = options.maxBlur || 0.05;
    this.cameraBlur = options.cameraBlur !== false;

    if (this.cameraBlur) {
      // Camera-based motion blur
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tDepth: { value: null },
          uResolution: { value: new THREE.Vector2() },
          uPreviousViewProjectionMatrix: { value: new THREE.Matrix4() },
          uCurrentViewProjectionMatrixInverse: { value: new THREE.Matrix4() },
          uIntensity: { value: this.intensity },
          uSamples: { value: this.samples }
        },
        vertexShader: DOF_VERT_SHADER,
        fragmentShader: CAMERA_MOTION_BLUR_FRAG_SHADER
      });

      this.previousViewProjectionMatrix = new THREE.Matrix4();
    } else {
      // Velocity buffer-based motion blur
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tVelocity: { value: null },
          uResolution: { value: new THREE.Vector2() },
          uIntensity: { value: this.intensity },
          uSamples: { value: this.samples },
          uMaxBlur: { value: this.maxBlur }
        },
        vertexShader: DOF_VERT_SHADER,
        fragmentShader: MOTION_BLUR_FRAG_SHADER
      });
    }
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad, camera, depthTexture) {
    if (!this.enabled) return;

    this.material.uniforms.tDiffuse.value = readBuffer.texture;

    if (this.cameraBlur && camera) {
      // Update camera matrices
      const currentVP = new this.THREE.Matrix4();
      currentVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      const currentVPInverse = new this.THREE.Matrix4();
      currentVPInverse.copy(currentVP).invert();

      this.material.uniforms.tDepth.value = depthTexture;
      this.material.uniforms.uPreviousViewProjectionMatrix.value.copy(this.previousViewProjectionMatrix);
      this.material.uniforms.uCurrentViewProjectionMatrixInverse.value.copy(currentVPInverse);
      this.material.uniforms.uIntensity.value = this.intensity;

      // Store current matrix for next frame
      this.previousViewProjectionMatrix.copy(currentVP);
    }

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    fsQuad.material = this.material;
    fsQuad.render(renderer);
  }

  setSize(width, height) {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  reset() {
    // Reset previous matrix to prevent large motion blur on camera cuts
    this.previousViewProjectionMatrix.identity();
  }

  dispose() {
    this.material.dispose();
  }
}

// ---------------------------------------------------------
// DEPTH RENDER TARGET HELPER
// ---------------------------------------------------------

export class DepthRenderTarget {
  constructor(THREE, width, height) {
    this.THREE = THREE;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: true,
      stencilBuffer: false
    });

    // Depth material for rendering depth
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking
    });
  }

  render(renderer, scene, camera) {
    // Save original materials
    const originalMaterials = new Map();
    scene.traverse((object) => {
      if (object.isMesh) {
        originalMaterials.set(object, object.material);
        object.material = this.depthMaterial;
      }
    });

    // Render depth
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);

    // Restore materials
    originalMaterials.forEach((material, object) => {
      object.material = material;
    });

    renderer.setRenderTarget(null);
  }

  get texture() {
    return this.renderTarget.texture;
  }

  setSize(width, height) {
    this.renderTarget.setSize(width, height);
  }

  dispose() {
    this.renderTarget.dispose();
    this.depthMaterial.dispose();
  }
}

// ---------------------------------------------------------
// CONVENIENCE FUNCTIONS
// ---------------------------------------------------------

export function createDepthOfField(THREE, options = {}) {
  return new DepthOfFieldPass(THREE, options);
}

export function createMotionBlur(THREE, options = {}) {
  return new MotionBlurPass(THREE, options);
}

export function createDepthBuffer(THREE, width, height) {
  return new DepthRenderTarget(THREE, width, height);
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  DepthOfFieldPass,
  MotionBlurPass,
  DepthRenderTarget,
  createDepthOfField,
  createMotionBlur,
  createDepthBuffer
};
