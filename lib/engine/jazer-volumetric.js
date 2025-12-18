// jazer-volumetric.js
// JaZeR Volumetric Lighting System
// God rays, volumetric fog, light scattering, atmospheric effects
// ============================================================================

// ---------------------------------------------------------
// SHADER SOURCES
// ---------------------------------------------------------

const VOLUMETRIC_LIGHT_VERT = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const VOLUMETRIC_LIGHT_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uExposure;
uniform float uDecay;
uniform float uDensity;
uniform float uWeight;
uniform int uSamples;
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;

varying vec2 vUv;

void main() {
  vec2 texCoord = vUv;

  // Transform light position to screen space
  vec4 lightScreenPos = projectionMatrix * viewMatrix * vec4(uLightPosition, 1.0);
  lightScreenPos.xyz /= lightScreenPos.w;
  vec2 lightPos = lightScreenPos.xy * 0.5 + 0.5;

  // Calculate ray direction
  vec2 deltaTexCoord = (texCoord - lightPos);
  deltaTexCoord *= 1.0 / float(uSamples) * uDensity;

  // Illumination decay factor
  float illuminationDecay = 1.0;
  vec3 color = vec3(0.0);

  // Sample along ray
  for(int i = 0; i < 100; i++) {
    if(i >= uSamples) break;

    texCoord -= deltaTexCoord;
    vec3 sample = texture2D(tDiffuse, texCoord).rgb;

    sample *= illuminationDecay * uWeight;
    color += sample;

    illuminationDecay *= uDecay;
  }

  color *= uExposure;
  vec3 original = texture2D(tDiffuse, vUv).rgb;

  gl_FragColor = vec4(original + color * uLightColor, 1.0);
}
`;

const VOLUMETRIC_FOG_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogDensity;
uniform float uTime;
uniform bool uAnimated;
uniform vec3 uCameraPosition;
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;

varying vec2 vUv;

// 3D Simplex noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
           i.z + vec4(0.0, i1.z, i2.z, 1.0))
         + i.y + vec4(0.0, i1.y, i2.y, 1.0))
         + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float getDepth(vec2 uv) {
  return texture2D(tDepth, uv).r;
}

vec3 getWorldPosition(vec2 uv, float depth) {
  vec4 clipSpace = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewSpace = uProjectionMatrixInverse * clipSpace;
  viewSpace /= viewSpace.w;
  vec4 worldSpace = uViewMatrixInverse * viewSpace;
  return worldSpace.xyz;
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float depth = getDepth(vUv);

  // Calculate world position
  vec3 worldPos = getWorldPosition(vUv, depth);
  float distance = length(worldPos - uCameraPosition);

  // Basic fog factor
  float fogFactor = smoothstep(uFogNear, uFogFar, distance);

  // Add noise for volumetric density variation
  if(uAnimated) {
    vec3 noisePos = worldPos * 0.05 + vec3(uTime * 0.1, uTime * 0.05, 0.0);
    float noise = snoise(noisePos) * 0.5 + 0.5;

    // Multi-octave noise for more detail
    noisePos *= 2.0;
    noise += (snoise(noisePos) * 0.5 + 0.5) * 0.5;
    noise /= 1.5;

    fogFactor *= noise;
  }

  fogFactor *= uFogDensity;
  fogFactor = clamp(fogFactor, 0.0, 1.0);

  // Apply fog
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
`;

// God rays (radial blur from light source)
const GOD_RAYS_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 uLightPosition;
uniform float uExposure;
uniform float uDecay;
uniform float uDensity;
uniform float uWeight;
uniform int uSamples;

varying vec2 vUv;

void main() {
  vec2 deltaTexCoord = (vUv - uLightPosition) * uDensity / float(uSamples);
  vec2 texCoord = vUv;

  float illuminationDecay = 1.0;
  vec4 color = vec4(0.0);

  for(int i = 0; i < 100; i++) {
    if(i >= uSamples) break;

    texCoord -= deltaTexCoord;
    vec4 sample = texture2D(tDiffuse, texCoord);

    sample *= illuminationDecay * uWeight;
    color += sample;

    illuminationDecay *= uDecay;
  }

  gl_FragColor = color * uExposure;
}
`;

// Light shaft occlusion mask
const LIGHT_SHAFT_MASK_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec3 uLightPosition;
uniform float uThreshold;

varying vec2 vUv;

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float depth = texture2D(tDepth, vUv).r;

  // Create mask for areas that can receive light shafts
  float brightness = dot(color, vec3(0.299, 0.587, 0.114));
  float mask = step(uThreshold, brightness);

  gl_FragColor = vec4(vec3(mask), 1.0);
}
`;

// ---------------------------------------------------------
// VOLUMETRIC LIGHT PASS
// ---------------------------------------------------------

export class VolumetricLightPass {
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.enabled = options.enabled !== false;
    this.needsSwap = true;
    this.renderToScreen = false;

    // Light parameters
    this.lightPosition = options.lightPosition || new THREE.Vector3(0, 10, 0);
    this.lightColor = options.lightColor || new THREE.Vector3(1, 0.9, 0.7);
    this.exposure = options.exposure || 0.3;
    this.decay = options.decay || 0.95;
    this.density = options.density || 0.5;
    this.weight = options.weight || 0.4;
    this.samples = options.samples || 50;

    // Create material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2() },
        uLightPosition: { value: this.lightPosition },
        uLightColor: { value: this.lightColor },
        uExposure: { value: this.exposure },
        uDecay: { value: this.decay },
        uDensity: { value: this.density },
        uWeight: { value: this.weight },
        uSamples: { value: this.samples },
        uProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uViewMatrixInverse: { value: new THREE.Matrix4() }
      },
      vertexShader: VOLUMETRIC_LIGHT_VERT,
      fragmentShader: VOLUMETRIC_LIGHT_FRAG
    });
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad, camera) {
    if (!this.enabled) return;

    // Update uniforms
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.uLightPosition.value.copy(this.lightPosition);
    this.material.uniforms.uLightColor.value.copy(this.lightColor);

    if (camera) {
      this.material.uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
      this.material.uniforms.uViewMatrixInverse.value.copy(camera.matrixWorld);
    }

    // Render
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

  dispose() {
    this.material.dispose();
  }
}

// ---------------------------------------------------------
// VOLUMETRIC FOG PASS
// ---------------------------------------------------------

export class VolumetricFogPass {
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.enabled = options.enabled !== false;
    this.needsSwap = true;
    this.renderToScreen = false;

    // Fog parameters
    this.fogColor = options.fogColor || new THREE.Vector3(0.5, 0.6, 0.7);
    this.fogNear = options.fogNear || 10;
    this.fogFar = options.fogFar || 100;
    this.fogDensity = options.fogDensity || 0.5;
    this.animated = options.animated !== false;
    this.time = 0;

    // Create material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2() },
        uFogColor: { value: this.fogColor },
        uFogNear: { value: this.fogNear },
        uFogFar: { value: this.fogFar },
        uFogDensity: { value: this.fogDensity },
        uTime: { value: 0 },
        uAnimated: { value: this.animated },
        uCameraPosition: { value: new THREE.Vector3() },
        uProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uViewMatrixInverse: { value: new THREE.Matrix4() }
      },
      vertexShader: VOLUMETRIC_LIGHT_VERT,
      fragmentShader: VOLUMETRIC_FOG_FRAG
    });
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad, camera) {
    if (!this.enabled) return;

    this.time += deltaTime;

    // Update uniforms
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uFogColor.value.copy(this.fogColor);
    this.material.uniforms.uFogNear.value = this.fogNear;
    this.material.uniforms.uFogFar.value = this.fogFar;
    this.material.uniforms.uFogDensity.value = this.fogDensity;

    if (camera) {
      this.material.uniforms.uCameraPosition.value.copy(camera.position);
      this.material.uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
      this.material.uniforms.uViewMatrixInverse.value.copy(camera.matrixWorld);
    }

    // Render
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

  dispose() {
    this.material.dispose();
  }
}

// ---------------------------------------------------------
// GOD RAYS PASS
// ---------------------------------------------------------

export class GodRaysPass {
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.enabled = options.enabled !== false;
    this.needsSwap = true;
    this.renderToScreen = false;

    // God rays parameters
    this.lightPosition = options.lightPosition || new THREE.Vector2(0.5, 0.5);
    this.exposure = options.exposure || 0.5;
    this.decay = options.decay || 0.95;
    this.density = options.density || 0.8;
    this.weight = options.weight || 0.4;
    this.samples = options.samples || 80;

    // Create material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uLightPosition: { value: this.lightPosition },
        uExposure: { value: this.exposure },
        uDecay: { value: this.decay },
        uDensity: { value: this.density },
        uWeight: { value: this.weight },
        uSamples: { value: this.samples }
      },
      vertexShader: VOLUMETRIC_LIGHT_VERT,
      fragmentShader: GOD_RAYS_FRAG,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive, fsQuad) {
    if (!this.enabled) return;

    // Update uniforms
    this.material.uniforms.tDiffuse.value = readBuffer.texture;

    // Render
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    fsQuad.material = this.material;
    fsQuad.render(renderer);
  }

  setSize(width, height) {
    // No size-dependent uniforms
  }

  updateLightPosition(camera, lightWorldPosition) {
    const THREE = this.THREE;

    // Project light position to screen space
    const lightPos = lightWorldPosition.clone();
    lightPos.project(camera);

    // Convert to UV coordinates (0-1)
    this.lightPosition.set(
      (lightPos.x + 1) / 2,
      (lightPos.y + 1) / 2
    );

    this.material.uniforms.uLightPosition.value.copy(this.lightPosition);
  }

  dispose() {
    this.material.dispose();
  }
}

// ---------------------------------------------------------
// VOLUMETRIC SPOTLIGHT
// ---------------------------------------------------------

export class VolumetricSpotlight {
  constructor(THREE, options = {}) {
    this.THREE = THREE;

    this.position = options.position || new THREE.Vector3(0, 10, 0);
    this.target = options.target || new THREE.Vector3(0, 0, 0);
    this.color = options.color || new THREE.Color(0xffffff);
    this.intensity = options.intensity || 1.0;
    this.angle = options.angle || Math.PI / 6;
    this.penumbra = options.penumbra || 0.1;
    this.decay = options.decay || 2;
    this.distance = options.distance || 100;

    // Create Three.js spotlight
    this.light = new THREE.SpotLight(
      this.color,
      this.intensity,
      this.distance,
      this.angle,
      this.penumbra,
      this.decay
    );
    this.light.position.copy(this.position);
    this.light.target.position.copy(this.target);
    this.light.castShadow = options.castShadow || false;

    // Create volumetric cone visualization
    this._createVolumeMesh();
  }

  _createVolumeMesh() {
    const THREE = this.THREE;

    // Create cone geometry for volumetric effect
    const height = this.distance;
    const radius = Math.tan(this.angle) * height;

    const geometry = new THREE.CylinderGeometry(0.1, radius, height, 32, 20, true);
    geometry.translate(0, -height / 2, 0);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3(this.color.r, this.color.g, this.color.b) },
        uIntensity: { value: this.intensity },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;

        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          // Fade based on distance from center
          float dist = length(vPosition.xz) / length(vPosition);
          float fade = 1.0 - smoothstep(0.0, 1.0, dist);

          // Fade along length
          float lengthFade = 1.0 - smoothstep(0.0, 1.0, -vPosition.z / 50.0);

          // Fresnel for edge glow
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

          float alpha = fade * lengthFade * fresnel * uIntensity * 0.3;

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.volumeMesh = new THREE.Mesh(geometry, material);
    this.volumeMesh.position.copy(this.position);
    this.volumeMesh.lookAt(this.target);
  }

  addToScene(scene) {
    scene.add(this.light);
    scene.add(this.light.target);
    scene.add(this.volumeMesh);
  }

  update(deltaTime) {
    this.volumeMesh.material.uniforms.uTime.value += deltaTime;
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.light.position.copy(this.position);
    this.volumeMesh.position.copy(this.position);
  }

  setTarget(x, y, z) {
    this.target.set(x, y, z);
    this.light.target.position.copy(this.target);
    this.volumeMesh.lookAt(this.target);
  }

  dispose() {
    this.volumeMesh.geometry.dispose();
    this.volumeMesh.material.dispose();
  }
}

// ---------------------------------------------------------
// CONVENIENCE FUNCTIONS
// ---------------------------------------------------------

export function createVolumetricLight(THREE, position, color, options = {}) {
  return new VolumetricLightPass(THREE, {
    lightPosition: position,
    lightColor: color,
    ...options
  });
}

export function createVolumetricFog(THREE, color, near, far, density) {
  return new VolumetricFogPass(THREE, {
    fogColor: color,
    fogNear: near,
    fogFar: far,
    fogDensity: density
  });
}

export function createGodRays(THREE, lightPosition, options = {}) {
  return new GodRaysPass(THREE, {
    lightPosition,
    ...options
  });
}

export function createVolumetricSpotlight(THREE, position, target, color, options = {}) {
  return new VolumetricSpotlight(THREE, {
    position,
    target,
    color,
    ...options
  });
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  VolumetricLightPass,
  VolumetricFogPass,
  GodRaysPass,
  VolumetricSpotlight,
  createVolumetricLight,
  createVolumetricFog,
  createGodRays,
  createVolumetricSpotlight
};
