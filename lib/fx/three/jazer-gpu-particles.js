// jazer-gpu-particles.js
// JaZeR GPU Particle System
// High-performance GPGPU-based particle simulation supporting 1M+ particles
// ============================================================================

// ---------------------------------------------------------
// SHADER SOURCES
// ---------------------------------------------------------

const PARTICLE_VERT_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform float uSize;
uniform float uTime;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec3 vColor;
varying float vAlpha;

// Simple hash for per-particle variation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // Fetch particle position and velocity from data textures
  vec4 posData = texture2D(tPosition, uv);
  vec4 velData = texture2D(tVelocity, uv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;
  float speed = length(vel);

  // Calculate color based on speed and life
  float hue = hash(uv) * 0.3 + speed * 0.5 + uTime * 0.1;
  float saturation = 0.8 + hash(uv + vec2(0.5)) * 0.2;
  float value = life;

  vColor = hsv2rgb(vec3(hue, saturation, value));
  vAlpha = life * (0.5 + hash(uv + vec2(1.0)) * 0.5);

  // Size variation based on life and speed
  float size = uSize * life * (1.0 + speed * 0.5);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const PARTICLE_FRAG_SHADER = `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular particle with soft edges
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);

  if (dist > 0.5) discard;

  float alpha = vAlpha * (1.0 - smoothstep(0.3, 0.5, dist));

  gl_FragColor = vec4(vColor, alpha);
}
`;

// Simulation shader - updates position
const SIMULATION_POSITION_SHADER = `
precision highp float;

uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform float uDeltaTime;
uniform float uTime;
uniform vec3 uGravity;
uniform vec3 uAttractor;
uniform float uAttractorStrength;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform bool uEnableBounds;

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

// Curl noise - creates turbulent, divergence-free flow
vec3 curlNoise(vec3 p) {
  float eps = 0.1;

  float n1 = snoise(vec3(p.x, p.y + eps, p.z));
  float n2 = snoise(vec3(p.x, p.y - eps, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + eps));
  float n4 = snoise(vec3(p.x, p.y, p.z - eps));
  float n5 = snoise(vec3(p.x + eps, p.y, p.z));
  float n6 = snoise(vec3(p.x - eps, p.y, p.z));

  float x = n1 - n2 - n3 + n4;
  float y = n3 - n4 - n5 + n6;
  float z = n5 - n6 - n1 + n2;

  return normalize(vec3(x, y, z));
}

void main() {
  vec4 posData = texture2D(tPosition, vUv);
  vec4 velData = texture2D(tVelocity, vUv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;

  // Skip dead particles
  if (life <= 0.0) {
    gl_FragColor = vec4(pos, 0.0);
    return;
  }

  // Update position with velocity
  pos += vel * uDeltaTime;

  // Apply bounds wrapping if enabled
  if (uEnableBounds) {
    if (pos.x < uBoundsMin.x) pos.x = uBoundsMax.x;
    if (pos.x > uBoundsMax.x) pos.x = uBoundsMin.x;
    if (pos.y < uBoundsMin.y) pos.y = uBoundsMax.y;
    if (pos.y > uBoundsMax.y) pos.y = uBoundsMin.y;
    if (pos.z < uBoundsMin.z) pos.z = uBoundsMax.z;
    if (pos.z > uBoundsMax.z) pos.z = uBoundsMin.z;
  }

  // Decay life
  life -= uDeltaTime * 0.5;

  gl_FragColor = vec4(pos, life);
}
`;

// Simulation shader - updates velocity
const SIMULATION_VELOCITY_SHADER = `
precision highp float;

uniform sampler2D tPosition;
uniform sampler2D tVelocity;
uniform float uDeltaTime;
uniform float uTime;
uniform vec3 uGravity;
uniform vec3 uAttractor;
uniform float uAttractorStrength;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uDamping;
uniform float uMaxSpeed;

varying vec2 vUv;

// Reuse simplex noise from position shader
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

vec3 curlNoise(vec3 p) {
  float eps = 0.1;
  float n1 = snoise(vec3(p.x, p.y + eps, p.z));
  float n2 = snoise(vec3(p.x, p.y - eps, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + eps));
  float n4 = snoise(vec3(p.x, p.y, p.z - eps));
  float n5 = snoise(vec3(p.x + eps, p.y, p.z));
  float n6 = snoise(vec3(p.x - eps, p.y, p.z));
  float x = n1 - n2 - n3 + n4;
  float y = n3 - n4 - n5 + n6;
  float z = n5 - n6 - n1 + n2;
  return normalize(vec3(x, y, z));
}

void main() {
  vec4 posData = texture2D(tPosition, vUv);
  vec4 velData = texture2D(tVelocity, vUv);

  vec3 pos = posData.xyz;
  float life = posData.w;
  vec3 vel = velData.xyz;

  // Skip dead particles
  if (life <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 acceleration = vec3(0.0);

  // Gravity
  acceleration += uGravity;

  // Attractor
  if (uAttractorStrength != 0.0) {
    vec3 toAttractor = uAttractor - pos;
    float dist = length(toAttractor);
    if (dist > 0.1) {
      acceleration += normalize(toAttractor) * uAttractorStrength / (dist * dist + 1.0);
    }
  }

  // Curl noise for turbulent flow
  if (uCurlStrength != 0.0) {
    vec3 noisePos = pos * uCurlScale + vec3(uTime * 0.1);
    vec3 curl = curlNoise(noisePos);
    acceleration += curl * uCurlStrength;
  }

  // Update velocity
  vel += acceleration * uDeltaTime;

  // Apply damping
  vel *= (1.0 - uDamping * uDeltaTime);

  // Clamp to max speed
  float speed = length(vel);
  if (speed > uMaxSpeed) {
    vel = normalize(vel) * uMaxSpeed;
  }

  gl_FragColor = vec4(vel, 0.0);
}
`;

// Fullscreen quad vertex shader
const QUAD_VERT_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// ---------------------------------------------------------
// GPU PARTICLE SYSTEM
// ---------------------------------------------------------

export class GPUParticleSystem {
  constructor(THREE, renderer, options = {}) {
    this.THREE = THREE;
    this.renderer = renderer;

    // Configuration
    this.particleCount = options.particleCount || 100000;
    this.particleSize = options.particleSize || 2.0;

    // Calculate texture size (power of 2)
    this.textureSize = Math.ceil(Math.sqrt(this.particleCount));
    this.actualParticleCount = this.textureSize * this.textureSize;

    // Simulation parameters
    this.gravity = new THREE.Vector3(0, 0, 0);
    this.attractor = new THREE.Vector3(0, 0, 0);
    this.attractorStrength = 0;
    this.curlScale = 0.5;
    this.curlStrength = 2.0;
    this.damping = 0.05;
    this.maxSpeed = 10.0;
    this.boundsMin = new THREE.Vector3(-50, -50, -50);
    this.boundsMax = new THREE.Vector3(50, 50, 50);
    this.enableBounds = true;

    // Time tracking
    this.time = 0;

    // Initialize
    this._initDataTextures();
    this._initSimulationMaterials();
    this._initRenderMaterial();
    this._initScene();

    console.log(`[JaZeR GPU Particles] Initialized ${this.actualParticleCount} particles (${this.textureSize}x${this.textureSize})`);
  }

  _initDataTextures() {
    const THREE = this.THREE;
    const size = this.textureSize;

    // Create initial position data
    const positionData = new Float32Array(size * size * 4);
    const velocityData = new Float32Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const i4 = i * 4;

      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = Math.random() * 20;

      positionData[i4 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positionData[i4 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positionData[i4 + 2] = r * Math.cos(phi);
      positionData[i4 + 3] = 1.0; // life

      // Random initial velocity
      velocityData[i4 + 0] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 1] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 2] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 3] = 0.0;
    }

    // Create data textures
    const options = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    };

    this.positionTexture1 = new THREE.DataTexture(positionData, size, size, THREE.RGBAFormat, THREE.FloatType);
    this.positionTexture1.needsUpdate = true;
    Object.assign(this.positionTexture1, options);

    this.positionTexture2 = this.positionTexture1.clone();

    this.velocityTexture1 = new THREE.DataTexture(velocityData, size, size, THREE.RGBAFormat, THREE.FloatType);
    this.velocityTexture1.needsUpdate = true;
    Object.assign(this.velocityTexture1, options);

    this.velocityTexture2 = this.velocityTexture1.clone();

    // Create render targets for ping-pong
    const rtOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    };

    this.positionRT1 = new THREE.WebGLRenderTarget(size, size, rtOptions);
    this.positionRT2 = new THREE.WebGLRenderTarget(size, size, rtOptions);
    this.velocityRT1 = new THREE.WebGLRenderTarget(size, size, rtOptions);
    this.velocityRT2 = new THREE.WebGLRenderTarget(size, size, rtOptions);

    // Initialize render targets with data
    this._copyTextureToRT(this.positionTexture1, this.positionRT1);
    this._copyTextureToRT(this.positionTexture1, this.positionRT2);
    this._copyTextureToRT(this.velocityTexture1, this.velocityRT1);
    this._copyTextureToRT(this.velocityTexture1, this.velocityRT2);
  }

  _copyTextureToRT(texture, renderTarget) {
    const THREE = this.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: texture } },
      vertexShader: QUAD_VERT_SHADER,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
  }

  _initSimulationMaterials() {
    const THREE = this.THREE;

    // Position update material
    this.positionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uDeltaTime: { value: 0 },
        uTime: { value: 0 },
        uGravity: { value: this.gravity },
        uAttractor: { value: this.attractor },
        uAttractorStrength: { value: this.attractorStrength },
        uCurlScale: { value: this.curlScale },
        uCurlStrength: { value: this.curlStrength },
        uBoundsMin: { value: this.boundsMin },
        uBoundsMax: { value: this.boundsMax },
        uEnableBounds: { value: this.enableBounds }
      },
      vertexShader: QUAD_VERT_SHADER,
      fragmentShader: SIMULATION_POSITION_SHADER
    });

    // Velocity update material
    this.velocityMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uDeltaTime: { value: 0 },
        uTime: { value: 0 },
        uGravity: { value: this.gravity },
        uAttractor: { value: this.attractor },
        uAttractorStrength: { value: this.attractorStrength },
        uCurlScale: { value: this.curlScale },
        uCurlStrength: { value: this.curlStrength },
        uDamping: { value: this.damping },
        uMaxSpeed: { value: this.maxSpeed }
      },
      vertexShader: QUAD_VERT_SHADER,
      fragmentShader: SIMULATION_VELOCITY_SHADER
    });
  }

  _initRenderMaterial() {
    const THREE = this.THREE;

    this.renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uSize: { value: this.particleSize },
        uTime: { value: 0 }
      },
      vertexShader: PARTICLE_VERT_SHADER,
      fragmentShader: PARTICLE_FRAG_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  _initScene() {
    const THREE = this.THREE;
    const size = this.textureSize;

    // Create particle geometry with UV coords
    const positions = new Float32Array(this.actualParticleCount * 3);
    const uvs = new Float32Array(this.actualParticleCount * 2);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = i * size + j;
        positions[index * 3 + 0] = 0;
        positions[index * 3 + 1] = 0;
        positions[index * 3 + 2] = 0;

        uvs[index * 2 + 0] = j / size;
        uvs[index * 2 + 1] = i / size;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Create particle system
    this.particles = new THREE.Points(geometry, this.renderMaterial);

    // Create simulation scene
    this.simulationScene = new THREE.Scene();
    this.simulationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simulationQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.simulationScene.add(this.simulationQuad);
  }

  update(deltaTime = 0.016) {
    const THREE = this.THREE;

    this.time += deltaTime;

    // Clamp delta time to prevent explosions
    deltaTime = Math.min(deltaTime, 0.033);

    // Update velocity
    this.velocityMaterial.uniforms.tPosition.value = this.positionRT1.texture;
    this.velocityMaterial.uniforms.tVelocity.value = this.velocityRT1.texture;
    this.velocityMaterial.uniforms.uDeltaTime.value = deltaTime;
    this.velocityMaterial.uniforms.uTime.value = this.time;
    this.velocityMaterial.uniforms.uGravity.value.copy(this.gravity);
    this.velocityMaterial.uniforms.uAttractor.value.copy(this.attractor);
    this.velocityMaterial.uniforms.uAttractorStrength.value = this.attractorStrength;
    this.velocityMaterial.uniforms.uCurlScale.value = this.curlScale;
    this.velocityMaterial.uniforms.uCurlStrength.value = this.curlStrength;
    this.velocityMaterial.uniforms.uDamping.value = this.damping;
    this.velocityMaterial.uniforms.uMaxSpeed.value = this.maxSpeed;

    this.simulationQuad.material = this.velocityMaterial;
    this.renderer.setRenderTarget(this.velocityRT2);
    this.renderer.render(this.simulationScene, this.simulationCamera);

    // Update position
    this.positionMaterial.uniforms.tPosition.value = this.positionRT1.texture;
    this.positionMaterial.uniforms.tVelocity.value = this.velocityRT2.texture;
    this.positionMaterial.uniforms.uDeltaTime.value = deltaTime;
    this.positionMaterial.uniforms.uTime.value = this.time;
    this.positionMaterial.uniforms.uBoundsMin.value.copy(this.boundsMin);
    this.positionMaterial.uniforms.uBoundsMax.value.copy(this.boundsMax);
    this.positionMaterial.uniforms.uEnableBounds.value = this.enableBounds;

    this.simulationQuad.material = this.positionMaterial;
    this.renderer.setRenderTarget(this.positionRT2);
    this.renderer.render(this.simulationScene, this.simulationCamera);

    // Reset render target
    this.renderer.setRenderTarget(null);

    // Swap buffers (ping-pong)
    let temp = this.positionRT1;
    this.positionRT1 = this.positionRT2;
    this.positionRT2 = temp;

    temp = this.velocityRT1;
    this.velocityRT1 = this.velocityRT2;
    this.velocityRT2 = temp;

    // Update render material
    this.renderMaterial.uniforms.tPosition.value = this.positionRT1.texture;
    this.renderMaterial.uniforms.tVelocity.value = this.velocityRT1.texture;
    this.renderMaterial.uniforms.uTime.value = this.time;
  }

  // Preset behaviors
  setGravity(x, y, z) {
    this.gravity.set(x, y, z);
  }

  setAttractor(x, y, z, strength = 5.0) {
    this.attractor.set(x, y, z);
    this.attractorStrength = strength;
  }

  setCurlNoise(scale = 0.5, strength = 2.0) {
    this.curlScale = scale;
    this.curlStrength = strength;
  }

  setBounds(minX, minY, minZ, maxX, maxY, maxZ, enabled = true) {
    this.boundsMin.set(minX, minY, minZ);
    this.boundsMax.set(maxX, maxY, maxZ);
    this.enableBounds = enabled;
  }

  reset(distribution = 'sphere') {
    const size = this.textureSize;
    const positionData = new Float32Array(size * size * 4);
    const velocityData = new Float32Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const i4 = i * 4;

      let x, y, z;

      if (distribution === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = Math.pow(Math.random(), 1/3) * 20;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (distribution === 'cube') {
        x = (Math.random() - 0.5) * 40;
        y = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 40;
      } else if (distribution === 'plane') {
        x = (Math.random() - 0.5) * 40;
        y = (Math.random() - 0.5) * 40;
        z = 0;
      }

      positionData[i4 + 0] = x;
      positionData[i4 + 1] = y;
      positionData[i4 + 2] = z;
      positionData[i4 + 3] = 1.0;

      velocityData[i4 + 0] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 1] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 2] = (Math.random() - 0.5) * 0.5;
      velocityData[i4 + 3] = 0.0;
    }

    const THREE = this.THREE;
    const posTexture = new THREE.DataTexture(positionData, size, size, THREE.RGBAFormat, THREE.FloatType);
    const velTexture = new THREE.DataTexture(velocityData, size, size, THREE.RGBAFormat, THREE.FloatType);
    posTexture.needsUpdate = true;
    velTexture.needsUpdate = true;

    this._copyTextureToRT(posTexture, this.positionRT1);
    this._copyTextureToRT(velTexture, this.velocityRT1);
  }

  dispose() {
    this.positionTexture1.dispose();
    this.positionTexture2.dispose();
    this.velocityTexture1.dispose();
    this.velocityTexture2.dispose();
    this.positionRT1.dispose();
    this.positionRT2.dispose();
    this.velocityRT1.dispose();
    this.velocityRT2.dispose();
    this.particles.geometry.dispose();
    this.renderMaterial.dispose();
    this.positionMaterial.dispose();
    this.velocityMaterial.dispose();
  }
}

// ---------------------------------------------------------
// CONVENIENCE FUNCTIONS
// ---------------------------------------------------------

/**
 * Create a GPU particle system with preset behavior
 */
export function createGPUParticles(THREE, renderer, preset = 'default', count = 100000) {
  const system = new GPUParticleSystem(THREE, renderer, {
    particleCount: count,
    particleSize: 2.0
  });

  // Apply preset
  switch (preset) {
    case 'tornado':
      system.setCurlNoise(0.3, 5.0);
      system.setGravity(0, -2, 0);
      system.damping = 0.02;
      break;

    case 'blackhole':
      system.setAttractor(0, 0, 0, 15.0);
      system.setCurlNoise(0.5, 1.0);
      system.damping = 0.01;
      break;

    case 'galaxy':
      system.setAttractor(0, 0, 0, 3.0);
      system.setCurlNoise(0.2, 3.0);
      system.damping = 0.05;
      break;

    case 'nebula':
      system.setCurlNoise(0.4, 4.0);
      system.damping = 0.1;
      break;

    case 'explosion':
      system.setGravity(0, -1, 0);
      system.damping = 0.03;
      system.maxSpeed = 20.0;
      break;

    default:
      system.setCurlNoise(0.5, 2.0);
      system.damping = 0.05;
  }

  return system;
}

export default {
  GPUParticleSystem,
  createGPUParticles
};
