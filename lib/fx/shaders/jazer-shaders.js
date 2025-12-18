// jazer-shaders.js
// JaZeR Shader Utilities
// GLSL shader snippets and post-processing effects for WebGL

// ---------------------------------------------------------
// GLSL SHADER SNIPPETS: Common code blocks for shaders
// ---------------------------------------------------------

// Common vertex shader for fullscreen quad
export const FULLSCREEN_VERT = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Common uniforms block
export const COMMON_UNIFORMS = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uMousePressed;
`;

// ---------------------------------------------------------
// NOISE SHADERS: GLSL noise implementations
// ---------------------------------------------------------

export const NOISE_FUNCTIONS = `
// Simplex 2D noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                         + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                          dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Simplex 3D noise
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

// Fractal Brownian Motion
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for(int i = 0; i < 8; i++) {
    if(i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for(int i = 0; i < 8; i++) {
    if(i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Worley/Cellular noise
float worley(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for(int j = -1; j <= 1; j++) {
    for(int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = fract(sin(vec2(dot(n + g, vec2(127.1, 311.7)),
                              dot(n + g, vec2(269.5, 183.3)))) * 43758.5453);
      vec2 r = g + o - f;
      float d = dot(r, r);
      minDist = min(minDist, d);
    }
  }
  return sqrt(minDist);
}

// Hash functions for random
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
vec3 hash3(vec3 p) {
  return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                        dot(p, vec3(269.5, 183.3, 246.1)),
                        dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}
`;

// ---------------------------------------------------------
// UTILITY FUNCTIONS: Common GLSL helpers
// ---------------------------------------------------------

export const UTILITY_FUNCTIONS = `
// Rotation matrix 2D
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

// Rotation matrix 3D around X axis
mat3 rotateX(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(1.0, 0.0, 0.0,
              0.0, c, -s,
              0.0, s, c);
}

// Rotation matrix 3D around Y axis
mat3 rotateY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, 0.0, s,
              0.0, 1.0, 0.0,
              -s, 0.0, c);
}

// Rotation matrix 3D around Z axis
mat3 rotateZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(c, -s, 0.0,
              s, c, 0.0,
              0.0, 0.0, 1.0);
}

// Smooth minimum (for blending SDFs)
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Smooth maximum
float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

// Remap value from one range to another
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

// Ping pong
float pingPong(float t, float length) {
  float l2 = length * 2.0;
  float m = mod(t, l2);
  return m <= length ? m : l2 - m;
}

// Palette function (from IQ)
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Classic rainbow palette
vec3 rainbow(float t) {
  return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
}

// Neon palette (JaZeR style)
vec3 neonPalette(float t) {
  return palette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5),
                 vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
`;

// ---------------------------------------------------------
// SDF PRIMITIVES: Signed Distance Functions
// ---------------------------------------------------------

export const SDF_PRIMITIVES = `
// 2D SDFs
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float sdStar(vec2 p, float r, int n, float m) {
  float an = 3.141593 / float(n);
  float en = 3.141593 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

// 3D SDFs
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// SDF operations
float opUnion(float d1, float d2) { return min(d1, d2); }
float opSubtract(float d1, float d2) { return max(-d1, d2); }
float opIntersect(float d1, float d2) { return max(d1, d2); }
float opSmoothUnion(float d1, float d2, float k) { return smin(d1, d2, k); },

// Repetition
vec3 opRep(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}

vec3 opRepLim(vec3 p, float c, vec3 l) {
  return p - c * clamp(round(p / c), -l, l);
}
`;

// ---------------------------------------------------------
// POST-PROCESSING EFFECTS
// ---------------------------------------------------------

export const BLOOM_SHADER = `
// Simple bloom/glow effect
vec3 bloom(sampler2D tex, vec2 uv, vec2 resolution, float intensity) {
  vec3 color = texture2D(tex, uv).rgb;
  vec3 bloom = vec3(0.0);
  float total = 0.0;
  
  for(float x = -4.0; x <= 4.0; x++) {
    for(float y = -4.0; y <= 4.0; y++) {
      vec2 offset = vec2(x, y) / resolution * 2.0;
      float weight = 1.0 / (1.0 + length(vec2(x, y)));
      bloom += texture2D(tex, uv + offset).rgb * weight;
      total += weight;
    }
  }
  bloom /= total;
  
  return color + bloom * intensity;
}
`;

export const CHROMATIC_ABERRATION_SHADER = `
// Chromatic aberration effect
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
  vec2 offset = (uv - 0.5) * amount;
  float r = texture2D(tex, uv + offset).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - offset).b;
  return vec3(r, g, b);
}
`;

export const VIGNETTE_SHADER = `
// Vignette effect
vec3 vignette(vec3 color, vec2 uv, float intensity, float smoothness) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  float vig = smoothstep(0.5, 0.5 - smoothness, dist * (1.0 + intensity));
  return color * vig;
}
`;

export const SCANLINES_SHADER = `
// CRT scanlines effect
vec3 scanlines(vec3 color, vec2 uv, float resolution, float intensity) {
  float scanline = sin(uv.y * resolution * 3.14159) * 0.5 + 0.5;
  return color * (1.0 - intensity + intensity * scanline);
}
`;

export const FILM_GRAIN_SHADER = `
// Film grain effect
vec3 filmGrain(vec3 color, vec2 uv, float time, float intensity) {
  float grain = fract(sin(dot(uv + time, vec2(12.9898, 78.233))) * 43758.5453);
  return color + (grain - 0.5) * intensity;
}
`;

// ---------------------------------------------------------
// RAYMARCHING UTILITIES
// ---------------------------------------------------------

export const RAYMARCHING_UTILS = `
// Ray from camera
vec3 getRayDirection(vec2 uv, vec3 camPos, vec3 lookAt, float zoom) {
  vec3 f = normalize(lookAt - camPos);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
  vec3 u = cross(f, r);
  vec3 c = camPos + f * zoom;
  vec3 i = c + uv.x * r + uv.y * u;
  return normalize(i - camPos);
}

// Basic raymarching loop
float raymarch(vec3 ro, vec3 rd, float maxDist, int maxSteps) {
  float t = 0.0;
  for(int i = 0; i < 256; i++) {
    if(i >= maxSteps) break;
    vec3 p = ro + rd * t;
    float d = map(p); // map() must be defined by user
    if(d < 0.001 || t > maxDist) break;
    t += d;
  }
  return t;
}

// Normal calculation
vec3 calcNormal(vec3 p) {
  const float h = 0.0001;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * map(p + k.xyy * h) +
    k.yyx * map(p + k.yyx * h) +
    k.yxy * map(p + k.yxy * h) +
    k.xxx * map(p + k.xxx * h)
  );
}

// Soft shadows
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for(int i = 0; i < 64; i++) {
    float h = map(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.10);
    if(res < 0.001 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for(int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = map(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}
`;

// ---------------------------------------------------------
// COMPLETE SHADER TEMPLATES
// ---------------------------------------------------------

export const BASIC_FRAGMENT_TEMPLATE = `
precision highp float;

${COMMON_UNIFORMS}
${NOISE_FUNCTIONS}
${UTILITY_FUNCTIONS}

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;
  
  // Your effect code here
  vec3 color = vec3(0.0);
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const RAYMARCHING_TEMPLATE = `
precision highp float;

${COMMON_UNIFORMS}
${NOISE_FUNCTIONS}
${UTILITY_FUNCTIONS}
${SDF_PRIMITIVES}

varying vec2 vUv;

// Define your scene SDF here
float map(vec3 p) {
  // Example: sphere
  return sdSphere(p, 1.0);
}

${RAYMARCHING_UTILS}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;
  
  // Camera setup
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = getRayDirection(p, ro, vec3(0.0), 1.5);
  
  // Raymarch
  float t = raymarch(ro, rd, 100.0, 128);
  
  vec3 color = vec3(0.0);
  if(t < 100.0) {
    vec3 pos = ro + rd * t;
    vec3 nor = calcNormal(pos);
    color = nor * 0.5 + 0.5;
  }
  
  gl_FragColor = vec4(color, 1.0);
}
`;

// ---------------------------------------------------------
// HELPER FUNCTIONS: Create WebGL programs
// ---------------------------------------------------------

/**
 * Creates a WebGL shader from source
 */
export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Creates a WebGL program from vertex and fragment sources
 */
export function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

/**
 * Creates a fullscreen quad buffer
 */
export function createFullscreenQuad(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    return buffer;
}

/**
 * Sets up common uniforms for a shader
 */
export function setupUniforms(gl, program, time, resolution, mouse, mousePressed) {
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uMousePressed = gl.getUniformLocation(program, 'uMousePressed');

    if (uTime) gl.uniform1f(uTime, time);
    if (uResolution) gl.uniform2f(uResolution, resolution[0], resolution[1]);
    if (uMouse) gl.uniform2f(uMouse, mouse[0], mouse[1]);
    if (uMousePressed) gl.uniform1f(uMousePressed, mousePressed ? 1.0 : 0.0);
}

/**
 * Easy shader effect setup
 */
export function createShaderEffect(canvas, fragmentShader) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return null;
    }

    const program = createProgram(gl, FULLSCREEN_VERT, fragmentShader);
    if (!program) return null;

    const quadBuffer = createFullscreenQuad(gl);
    const positionLoc = gl.getAttribLocation(program, 'position');

    let startTime = performance.now();
    let mouseX = 0.5, mouseY = 0.5, mousePressed = false;

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width;
        mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
    });
    canvas.addEventListener('mousedown', () => mousePressed = true);
    canvas.addEventListener('mouseup', () => mousePressed = false);

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render() {
        resize();

        const time = (performance.now() - startTime) / 1000;

        gl.useProgram(program);
        setupUniforms(gl, program, time, [canvas.width, canvas.height], [mouseX, mouseY], mousePressed);

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    return { gl, program };
}

// Expose on window for non-module users
if (typeof window !== 'undefined') {
    window.JaZeRShaders = {
        // Shader snippets
        FULLSCREEN_VERT,
        COMMON_UNIFORMS,
        NOISE_FUNCTIONS,
        UTILITY_FUNCTIONS,
        SDF_PRIMITIVES,
        BLOOM_SHADER,
        CHROMATIC_ABERRATION_SHADER,
        VIGNETTE_SHADER,
        SCANLINES_SHADER,
        FILM_GRAIN_SHADER,
        RAYMARCHING_UTILS,
        BASIC_FRAGMENT_TEMPLATE,
        RAYMARCHING_TEMPLATE,

        // Helper functions
        createShader,
        createProgram,
        createFullscreenQuad,
        setupUniforms,
        createShaderEffect
    };
}
