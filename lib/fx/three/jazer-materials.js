// jazer-materials.js
// JaZeR Advanced Materials Library
// Professional shader materials for high-end 3D effects
// ============================================================================

// ---------------------------------------------------------
// STANDARD PBR MATERIAL (Expert Wrapper)
// ---------------------------------------------------------

export function createStandardMaterial(THREE, options = {}) {
  // Enforce high-quality PBR defaults
  const defaults = {
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.5,
    envMapIntensity: 1.0,
    flatShading: false,
    side: THREE.FrontSide
  };

  const config = { ...defaults, ...options };

  const material = new THREE.MeshStandardMaterial(config);

  // Helper to auto-update environment map if scene has one
  material.onBeforeCompile = (shader) => {
    // Hook for custom shader chunks if needed later
  };

  return material;
}

// ---------------------------------------------------------
// HOLOGRAPHIC MATERIAL
// ---------------------------------------------------------

export function createHolographicMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0x00ffff);
  const fresnelPower = options.fresnelPower || 2.0;
  const scanlineSpeed = options.scanlineSpeed || 2.0;
  const scanlineScale = options.scanlineScale || 10.0;
  const glitchAmount = options.glitchAmount || 0.1;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uFresnelPower: { value: fresnelPower },
      uScanlineSpeed: { value: scanlineSpeed },
      uScanlineScale: { value: scanlineScale },
      uGlitchAmount: { value: glitchAmount }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      uniform float uTime;
      uniform float uGlitchAmount;

      // Hash for glitch
      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        vNormal = normalize(normalMatrix * normal);

        vec3 pos = position;

        // Glitch effect
        float glitch = hash(floor(uTime * 10.0) + position.y * 10.0);
        if (glitch > 0.95) {
          pos.x += (hash(uTime + position.y) - 0.5) * uGlitchAmount;
        }

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;

        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPosition = -mvPosition.xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uFresnelPower;
      uniform float uScanlineSpeed;
      uniform float uScanlineScale;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);

        // Fresnel effect
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);

        // Scanlines
        float scanline = sin(vWorldPosition.y * uScanlineScale + uTime * uScanlineSpeed) * 0.5 + 0.5;
        scanline = pow(scanline, 3.0);

        // Horizontal sweep
        float sweep = sin(vWorldPosition.y * 2.0 - uTime * 3.0) * 0.5 + 0.5;

        // Combine effects
        float intensity = fresnel * (0.5 + scanline * 0.3 + sweep * 0.2);
        vec3 color = uColor * intensity;

        // Add edge glow
        float edge = pow(fresnel, 4.0);
        color += uColor * edge * 2.0;

        gl_FragColor = vec4(color, intensity * 0.7 + edge * 0.3);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

// ---------------------------------------------------------
// ENERGY SHIELD MATERIAL
// ---------------------------------------------------------

export function createEnergyShieldMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0x00aaff);
  const hexScale = options.hexScale || 20.0;
  const pulseSpeed = options.pulseSpeed || 2.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uHexScale: { value: hexScale },
      uPulseSpeed: { value: pulseSpeed },
      uImpactPoint: { value: new THREE.Vector3(999, 999, 999) },
      uImpactTime: { value: -999 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uHexScale;
      uniform float uPulseSpeed;
      uniform vec3 uImpactPoint;
      uniform float uImpactTime;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      // Hexagon distance function
      float hexDist(vec2 p) {
        p = abs(p);
        float c = dot(p, normalize(vec2(1.0, 1.73)));
        c = max(c, p.x);
        return c;
      }

      // Hexagonal grid pattern
      vec4 hexGrid(vec2 uv) {
        vec2 r = vec2(1.0, 1.73);
        vec2 h = r * 0.5;

        vec2 a = mod(uv, r) - h;
        vec2 b = mod(uv - h, r) - h;

        vec2 gv = length(a) < length(b) ? a : b;

        float dist = hexDist(gv);
        return vec4(gv, dist, 0.0);
      }

      void main() {
        // Hex grid on surface
        vec2 uv = vPosition.xy * uHexScale;
        vec4 hex = hexGrid(uv);

        // Hex edges
        float hexEdge = smoothstep(0.05, 0.02, abs(hex.z - 0.5));

        // Pulse animation
        float pulse = sin(uTime * uPulseSpeed + hex.z * 10.0) * 0.5 + 0.5;

        // Impact ripple
        float distToImpact = distance(vWorldPosition, uImpactPoint);
        float timeSinceImpact = uTime - uImpactTime;
        float ripple = 0.0;

        if (timeSinceImpact < 2.0 && timeSinceImpact > 0.0) {
          float rippleRadius = timeSinceImpact * 10.0;
          float rippleDist = abs(distToImpact - rippleRadius);
          ripple = smoothstep(1.0, 0.0, rippleDist) * (1.0 - timeSinceImpact * 0.5);
        }

        // Fresnel
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

        // Combine
        float intensity = hexEdge * 0.6 + pulse * 0.2 + fresnel * 0.4 + ripple;
        vec3 color = uColor * intensity;

        gl_FragColor = vec4(color, intensity * 0.5 + fresnel * 0.3);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

// ---------------------------------------------------------
// LIQUID FLOW MATERIAL
// ---------------------------------------------------------

export function createLiquidMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0x1a4d7a);
  const flowSpeed = options.flowSpeed || 0.5;
  const distortionScale = options.distortionScale || 2.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uFlowSpeed: { value: flowSpeed },
      uDistortionScale: { value: distortionScale }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uFlowSpeed;
      uniform float uDistortionScale;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      // 2D Simplex noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
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

      // FBM
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for(int i = 0; i < 4; i++) {
          value += amplitude * snoise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv * uDistortionScale;

        // Flow distortion
        float flow1 = fbm(uv + uTime * uFlowSpeed * vec2(1.0, 0.5));
        float flow2 = fbm(uv * 1.3 - uTime * uFlowSpeed * vec2(0.5, 1.0) + vec2(100.0));

        // Combine flows
        vec2 distortion = vec2(flow1, flow2) * 0.1;
        float pattern = fbm(uv + distortion);

        // Color variation
        float colorShift = pattern * 0.5 + 0.5;
        vec3 color1 = uColor;
        vec3 color2 = uColor * 1.5;
        vec3 color = mix(color1, color2, colorShift);

        // Add highlights
        float highlight = smoothstep(0.6, 1.0, pattern);
        color += vec3(0.3, 0.5, 0.7) * highlight;

        gl_FragColor = vec4(color, 0.95);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
}

// ---------------------------------------------------------
// CRYSTAL GEM MATERIAL
// ---------------------------------------------------------

export function createCrystalMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0xff00ff);
  const refractPower = options.refractPower || 1.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uRefractPower: { value: refractPower }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uRefractPower;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);

        // Fresnel for edge highlighting
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

        // Internal reflections simulation
        vec3 refractDir = refract(-viewDir, vNormal, 0.9);
        float refractAngle = dot(refractDir, vNormal);

        // Chromatic dispersion
        vec3 colorR = uColor * 1.2;
        vec3 colorG = uColor;
        vec3 colorB = uColor * 0.8;

        float dispersion = abs(refractAngle) * uRefractPower;
        vec3 color = mix(
          mix(colorR, colorG, dispersion),
          colorB,
          dispersion * 0.5
        );

        // Add sparkle
        float sparkle = pow(fresnel, 10.0);
        color += vec3(1.0) * sparkle;

        // Internal glow
        float glow = (1.0 - abs(dot(viewDir, vNormal))) * 0.5;
        color += uColor * glow;

        // Edge highlights
        color += vec3(1.0) * fresnel * 0.5;

        float alpha = 0.9 - fresnel * 0.3;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

// ---------------------------------------------------------
// NEON TUBING MATERIAL
// ---------------------------------------------------------

export function createNeonMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0x00ffff);
  const glowIntensity = options.glowIntensity || 2.0;
  const pulseSpeed = options.pulseSpeed || 2.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uGlowIntensity: { value: glowIntensity },
      uPulseSpeed: { value: pulseSpeed }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uGlowIntensity;
      uniform float uPulseSpeed;

      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);

        // Fresnel glow
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        float glow = pow(fresnel, 2.0);

        // Pulse
        float pulse = sin(uTime * uPulseSpeed) * 0.3 + 0.7;

        // Intense core
        vec3 color = uColor * (1.0 + glow * uGlowIntensity * pulse);

        // Outer glow layers
        float outerGlow = pow(fresnel, 0.5);
        color += uColor * outerGlow * 0.5;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

// ---------------------------------------------------------
// GLITCH MATERIAL
// ---------------------------------------------------------

export function createGlitchMaterial(THREE, options = {}) {
  const color = options.color || new THREE.Color(0xff00ff);
  const glitchIntensity = options.glitchIntensity || 1.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uGlitchIntensity: { value: glitchIntensity }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uGlitchIntensity;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        vUv = uv;
        vPosition = position;

        vec3 pos = position;

        // Random glitches
        float glitchTime = floor(uTime * 10.0);
        float glitch = hash(glitchTime + position.y * 5.0);

        if (glitch > 0.9) {
          // Horizontal displacement
          pos.x += (hash(glitchTime + position.y) - 0.5) * uGlitchIntensity;
          pos.y += (hash(glitchTime + position.x) - 0.5) * uGlitchIntensity * 0.5;
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uGlitchIntensity;

      varying vec2 vUv;
      varying vec3 vPosition;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 uv = vUv;

        float glitchTime = floor(uTime * 10.0);
        float glitch = hash(vec2(glitchTime, floor(uv.y * 20.0)));

        // Color separation
        vec3 color = uColor;

        if (glitch > 0.9) {
          // Chromatic aberration
          float offset = (hash(vec2(glitchTime)) - 0.5) * 0.1 * uGlitchIntensity;
          color.r = uColor.r * (1.0 + offset);
          color.b = uColor.b * (1.0 - offset);
        }

        // Scanlines
        float scanline = sin(uv.y * 100.0 + uTime * 5.0) * 0.1 + 0.9;
        color *= scanline;

        // Random pixel corruption
        float corruption = hash(vec2(floor(uv.x * 100.0), floor(uTime * 20.0)));
        if (corruption > 0.98) {
          color = vec3(hash(uv), hash(uv + vec2(1.0)), hash(uv + vec2(2.0)));
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide
  });
}

// ---------------------------------------------------------
// PORTAL VORTEX MATERIAL
// ---------------------------------------------------------

export function createPortalMaterial(THREE, options = {}) {
  const color1 = options.color1 || new THREE.Color(0xff0055);
  const color2 = options.color2 || new THREE.Color(0x00f5ff);
  const rotationSpeed = options.rotationSpeed || 1.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: color1 },
      uColor2: { value: color2 },
      uRotationSpeed: { value: rotationSpeed }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uRotationSpeed;

      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vec2 center = vec2(0.5);
        vec2 pos = vUv - center;

        // Polar coordinates
        float dist = length(pos);
        float angle = atan(pos.y, pos.x);

        // Spiral
        float spiral = angle + dist * 10.0 - uTime * uRotationSpeed;
        float spiralPattern = sin(spiral * 5.0) * 0.5 + 0.5;

        // Radial waves
        float waves = sin(dist * 20.0 - uTime * 3.0) * 0.5 + 0.5;

        // Vortex pull
        float vortex = 1.0 - smoothstep(0.0, 1.0, dist);

        // Color
        vec3 color = mix(uColor1, uColor2, spiralPattern);
        color = mix(color, uColor1 * 2.0, waves * 0.3);
        color *= vortex;

        // Center glow
        float centerGlow = 1.0 - smoothstep(0.0, 0.3, dist);
        color += vec3(1.0) * centerGlow * 0.5;

        float alpha = vortex * 0.8 + centerGlow * 0.2;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
}

// ---------------------------------------------------------
// PLASMA MATERIAL
// ---------------------------------------------------------

export function createPlasmaMaterial(THREE, options = {}) {
  const speed = options.speed || 1.0;
  const scale = options.scale || 2.0;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;

      varying vec2 vUv;
      varying vec3 vPosition;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 p = vUv * uScale;
        float t = uTime * uSpeed;

        // Multi-layer plasma
        float v = 0.0;
        v += sin(p.x * 2.0 + t);
        v += sin(p.y * 3.0 + t * 1.5);
        v += sin((p.x + p.y) * 1.5 + t * 0.5);
        v += sin(length(p - vec2(sin(t), cos(t * 0.7))) * 5.0);
        v /= 4.0;

        // Map to colors
        float hue = v * 0.5 + uTime * 0.1;
        vec3 color = hsv2rgb(vec3(hue, 0.8, 1.0));

        // Add brightness variation
        color *= (0.7 + v * 0.3);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide
  });
}

// ---------------------------------------------------------
// MATERIAL UPDATE HELPER
// ---------------------------------------------------------

export function updateMaterialUniforms(material, deltaTime) {
  if (material.uniforms && material.uniforms.uTime) {
    material.uniforms.uTime.value += deltaTime;
  }
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  createStandardMaterial,
  createHolographicMaterial,
  createEnergyShieldMaterial,
  createLiquidMaterial,
  createCrystalMaterial,
  createNeonMaterial,
  createGlitchMaterial,
  createPortalMaterial,
  createPlasmaMaterial,
  updateMaterialUniforms
};
