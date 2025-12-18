/**
 * FlowerOfLife.js
 * Sacred geometry pattern: Flower of Life in a vortex tunnel
 */

import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb, smoothstep } from '../engine/jazer-background-engine.js';

export class FlowerOfLife extends CanvasEffectBase {
  getName() {
    return 'Flower of Life';
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return 'Sacred geometry pattern featuring the Flower of Life in a mesmerizing vortex tunnel effect';
  }

  getTags() {
    return ['2d', 'geometry', 'sacred', 'mandala', 'vortex'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      layerCount: 12,
      backgroundColor: '#0a0515'
    };
  }

  async createEffect() {
    this.palette = ['#ffd700', '#ff6b35', '#ff2aff', '#00f5ff', '#b37cff'];
    this.layers = Array.from(
      { length: this.config.layerCount },
      (_, i) => new VortexLayer(i, this.palette)
    );
  }

  render(time, deltaTime) {
    const { width: W, height: H, centerX: cx, centerY: cy, ctx } = this;

    // Dark background with subtle gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, this.config.backgroundColor);
    bgGrad.addColorStop(1, '#000005');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, W, H);

    const dt = deltaTime;

    // Sort and draw back to front
    this.layers.sort((a, b) => b.z - a.z);
    this.layers.forEach(layer => {
      layer.update(dt);
      layer.draw(ctx, cx, cy, time, this.palette);
    });

    // Central glow
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
    centerGlow.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    centerGlow.addColorStop(0.5, 'rgba(255, 42, 255, 0.05)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, W, H);

    // Vignette
    const vig = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

class VortexLayer {
  constructor(index, palette) {
    this.index = index;
    this.z = index * 0.15;
    this.rotationSpeed = 0.1 + (index % 2 === 0 ? 0.02 : -0.02);
    this.colorOffset = index * 0.7;
    this.palette = palette;
  }

  update(dt) {
    // Very slow movement toward viewer
    this.z += dt * 0.08;
    if (this.z > 1.8) {
      this.z = 0;
      this.colorOffset = Math.random() * this.palette.length;
    }
  }

  draw(ctx, cx, cy, time, palette) {
    const scale = 1 / (1 + this.z * 2);
    const alpha = smoothstep(0, 0.3, this.z) * smoothstep(1.8, 1.2, this.z);

    if (alpha < 0.01) return;

    const baseRadius = 60 * scale;
    const rotation = time * this.rotationSpeed + this.index * 0.3;

    // Mouse influence for parallax
    const parallax = this.z * 0.5;
    const offsetX = mouse.centeredX * 100 * parallax;
    const offsetY = mouse.centeredY * 100 * parallax;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawFlowerOfLife(ctx, cx + offsetX, cy + offsetY, baseRadius, rotation, alpha, this.colorOffset, palette);
    ctx.restore();
  }
}

// Draw Flower of Life pattern at position
function drawFlowerOfLife(ctx, x, y, baseRadius, rotation, alpha, colorOffset, palette) {
  const r = baseRadius;

  // Center circle
  const color1 = palette[Math.floor(colorOffset % palette.length)];
  drawCircle(ctx, x, y, r, alpha * 0.8, color1);

  // First ring - 6 circles
  for (let i = 0; i < 6; i++) {
    const angle = rotation + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    const color = palette[Math.floor((colorOffset + i * 0.5) % palette.length)];
    drawCircle(ctx, px, py, r, alpha * 0.6, color);
  }

  // Second ring - 12 circles
  for (let i = 0; i < 12; i++) {
    const angle = rotation + (i / 12) * Math.PI * 2;
    const dist = r * 1.732; // sqrt(3)
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const color = palette[Math.floor((colorOffset + i * 0.3) % palette.length)];
    drawCircle(ctx, px, py, r, alpha * 0.4, color);
  }
}

// Draw a single circle (seed of flower of life)
function drawCircle(ctx, x, y, radius, alpha, color) {
  const rgb = hexToRgb(color);
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}
