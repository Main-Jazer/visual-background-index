// jazer-math.js
// JaZeR Math Module
// Expert-level math utilities and procedural noise
// ============================================================================

// ---------------------------------------------------------
// SIMPLEX NOISE: Fast, high-quality procedural noise
// Based on Stefan Gustavson's simplex noise implementation
// ---------------------------------------------------------
export class SimplexNoise {
  constructor(seed = Math.random() * 65536 * 65536) {
    this.p = new Uint8Array(256 * 256);
    this.perm = new Uint8Array(512 * 256);
    this.permMod12 = new Uint8Array(512 * 256);

    // Initialize permutation table with seed
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }

    // Shuffle using seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }

    // Extend to 512 for wraparound
    for (let i = 0; i < 512 * 256; i++) {
      this.perm[i] = this.p[i & 255 * 256];
      this.permMod12[i] = this.perm[i] % 12 * 256;
    }

    // Gradient vectors for 2D, 3D, 4D
    this.grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 1, 0, -1, -1, 0, -1,
      1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, 1, -1, 1, 0, -1, -1, 1, 0, -1,
      -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1, -1, -1, 0, -1,
      1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, 1, 1, 0, -1, 1, 1, 0, -1, -1, 1, 0, -1,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1, 1, 0, -1, -1, 1, 0, -1, -1, -1, 0, -1,
    ]);

    // Simplex skewing constants for 2D, 3D, 4D noise
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;
    this.F3 = 1 / 3;
    this.G3 = 1 / 6;
    this.F4 = (Math.sqrt(5) - 1) / 4;
    this.G4 = (5 - Math.sqrt(5)) / 20;

    // Gradient vectors for 4D noise
    this.grad4 = new Float32Array([
      0, 1, 1, 1,  0, 1, 1, -1,  0, 1, -1, 1,  0, 1, -1, -1,
      0, -1, 1, 1,  0, -1, 1, -1,  0, -1, -1, 1,  0, -1, -1, -1,
      1, 0, 1, 1,  1, 0, 1, -1,  1, 0, -1, 1,  1, 0, -1, -1,
      -1, 0, 1, 1,  -1, 0, 1, -1,  -1, 0, -1, 1,  -1, 0, -1, -1,
      1, 1, 0, 1,  1, 1, 0, -1,  1, -1, 0, 1,  1, -1, 0, -1,
      -1, 1, 0, 1,  -1, 1, 0, -1,  -1, -1, 0, 1,  -1, -1, 0, -1,
      1, 1, 1, 0,  1, 1, -1, 0,  1, -1, 1, 0,  1, -1, -1, 0,
      -1, 1, 1, 0,  -1, 1, -1, 0,  -1, -1, 1, 0,  -1, -1, -1, 0
    ]);
  }

  noise2D(x, y) {
    const { perm, permMod12, grad3, F2, G2 } = this;
    let n0, n1, n2;
    let i1, j1;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj]] * 3;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  noise3D(x, y, z) {
    const { perm, permMod12, grad3, F3, G3 } = this;
    let n0, n1, n2, n3;
    let i1, j1, k1, i2, j2, k2;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

    // Determine which simplex we are in
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;

    // Calculate the contribution from the four corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else {
      t3 *= t3;
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
    }

    // Sum contributions and scale to [-1, 1]
    return 32 * (n0 + n1 + n2 + n3);
  }

  noise4D(x, y, z, w) {
    const { perm, grad4, F4, G4 } = this;
    let n0, n1, n2, n3, n4;

    const s = (x + y + z + w) * F4;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const l = Math.floor(w + s);
    const t = (i + j + k + l) * G4;
    const X0 = i - t, Y0 = j - t, Z0 = k - t, W0 = l - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0, w0 = w - W0;

    // For 4D, determine simplex - rank ordering for (x0,y0,z0,w0)
    let rankx = 0, ranky = 0, rankz = 0, rankw = 0;
    if (x0 > y0) rankx++; else ranky++;
    if (x0 > z0) rankx++; else rankz++;
    if (x0 > w0) rankx++; else rankw++;
    if (y0 > z0) ranky++; else rankz++;
    if (y0 > w0) ranky++; else rankw++;
    if (z0 > w0) rankz++; else rankw++;

    const i1 = rankx >= 3 ? 1 : 0;
    const j1 = ranky >= 3 ? 1 : 0;
    const k1 = rankz >= 3 ? 1 : 0;
    const l1 = rankw >= 3 ? 1 : 0;
    const i2 = rankx >= 2 ? 1 : 0;
    const j2 = ranky >= 2 ? 1 : 0;
    const k2 = rankz >= 2 ? 1 : 0;
    const l2 = rankw >= 2 ? 1 : 0;
    const i3 = rankx >= 1 ? 1 : 0;
    const j3 = ranky >= 1 ? 1 : 0;
    const k3 = rankz >= 1 ? 1 : 0;
    const l3 = rankw >= 1 ? 1 : 0;

    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2 * G4, y2 = y0 - j2 + 2 * G4, z2 = z0 - k2 + 2 * G4, w2 = w0 - l2 + 2 * G4;
    const x3 = x0 - i3 + 3 * G4, y3 = y0 - j3 + 3 * G4, z3 = z0 - k3 + 3 * G4, w3 = w0 - l3 + 3 * G4;
    const x4 = x0 - 1 + 4 * G4, y4 = y0 - 1 + 4 * G4, z4 = z0 - 1 + 4 * G4, w4 = w0 - 1 + 4 * G4;

    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255;

    // Calculate contributions from the five corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
      n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
      n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
      n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
    if (t3 < 0) n3 = 0;
    else {
      t3 *= t3;
      const gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
      n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
    }

    let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
    if (t4 < 0) n4 = 0;
    else {
      t4 *= t4;
      const gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
      n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
    }

    // Sum contributions and scale to [-1, 1]
    return 27 * (n0 + n1 + n2 + n3 + n4);
  }
}

// Global simplex noise instance
const _simplex = new SimplexNoise();

// Convenience noise functions
export function noise2D(x, y) { return _simplex.noise2D(x, y); }
export function noise3D(x, y, z) { return _simplex.noise3D(x, y, z); }
export function noise4D(x, y, z, w) { return _simplex.noise4D(x, y, z, w); }

// Fractal Brownian Motion
export function fbm2D(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

export function fbm3D(x, y, z, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// Math utils
export function map(value, inMin, inMax, outMin, outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
  return (value - a) / (b - a);
}

export function remap(value, inMin, inMax, outMin, outMax) {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

// ---------------------------------------------------------
// MATH 4D: Expert level hyper-geometry utilities
// ---------------------------------------------------------
export class Math4D {
  static project4D(point4D, camera4D) {
    const w = point4D.w;
    const scale = camera4D.fov / (camera4D.distance - w);
    return {
      x: point4D.x * scale,
      y: point4D.y * scale,
      z: point4D.z * scale
    };
  }
  
  static rotateXY(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x*c-p.y*s, y:p.x*s+p.y*c, z:p.z, w:p.w}; }
  static rotateXZ(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x*c-p.z*s, y:p.y, z:p.x*s+p.z*c, w:p.w}; }
  static rotateXW(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x*c-p.w*s, y:p.y, z:p.z, w:p.x*s+p.w*c}; }
  static rotateYZ(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x, y:p.y*c-p.z*s, z:p.y*s+p.z*c, w:p.w}; }
  static rotateYW(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x, y:p.y*c-p.w*s, z:p.z, w:p.y*s+p.w*c}; }
  static rotateZW(p, a) { const c=Math.cos(a),s=Math.sin(a); return {x:p.x, y:p.y, z:p.z*c-p.w*s, w:p.z*s+p.w*c}; }
}

export default {
    SimplexNoise,
    Math4D,
    noise2D, noise3D, noise4D,
    fbm2D, fbm3D,
    map, clamp, smoothstep, lerp, inverseLerp, remap
};
