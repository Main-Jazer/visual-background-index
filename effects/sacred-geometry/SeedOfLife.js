/**
 * SeedOfLife.js
 * Sacred geometry pattern: Seed of Life portal
 */

import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb, smoothstep } from '../../jazer-background-engine.js';

export class SeedOfLife extends CanvasEffectBase {
  getName() {
    return 'Seed of Life';
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return 'Sacred geometry pattern featuring the Seed of Life in a hypnotic portal effect';
  }

  getTags() {
    return ['2d', 'geometry', 'sacred', 'mandala', 'portal'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      layerCount: 15
    };
  }

  async createEffect() {
    this.palette = ['#00d4ff', '#00ff88', '#b37cff', '#00f5ff', '#7c3aed'];
    this.layers = Array.from(
      { length: this.config.layerCount },
      (_, i) => new PortalLayer(i, this.palette)
    );
  }

  render(time, deltaTime) {
    const { width: W, height: H, centerX: cx, centerY: cy, ctx } = this;

    // Background gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, '#0a0020');
    bgGrad.addColorStop(1, '#000510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, W, H);

    const dt = deltaTime;

    // Sort and draw back to front
    this.layers.sort((a, b) => b.z - a.z);
    this.layers.forEach(layer => {
      layer.update(dt);
      layer.draw(ctx, cx, cy, time, this.palette);
    });

    // Central energy glow
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
    centerGlow.addColorStop(0, 'rgba(0, 212, 255, 0.1)');
    centerGlow.addColorStop(0.5, 'rgba(124, 58, 237, 0.05)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, W, H);

    // Vignette
    const vig = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.2, cx, cy, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

class PortalLayer {
  constructor(index, palette) {
    this.index = index;
    this.z = index * 0.15;
    this.rotationDir = index % 3 === 0 ? 1 : index % 3 === 1 ? -0.5 : 0.3;
    this.colorOffset = index * 0.5;
    this.pulseOffset = index * 0.3;
    this.palette = palette;
  }

  update(dt) {
    this.z += dt * 0.04; // Very slow, meditative
    if (this.z > 2.2) {
      this.z = 0;
      this.colorOffset = Math.random() * this.palette.length;
    }
  }

  draw(ctx, cx, cy, time, palette) {
    const scale = 1 / (1 + this.z * 2);
    const alpha = smoothstep(0, 0.4, this.z) * smoothstep(2.2, 1.4, this.z);

    if (alpha < 0.01) return;

    const pulse = Math.sin(time * 0.8 + this.pulseOffset) * 0.1 + 1;
    const radius = 70 * scale * pulse;
    const rotation = time * 0.03 * this.rotationDir + this.index * 0.2;

    // Parallax from mouse
    const parallax = this.z * 0.3;
    const offsetX = mouse.centeredX * 80 * parallax;
    const offsetY = mouse.centeredY * 80 * parallax;

    drawSeedOfLife(ctx, cx + offsetX, cy + offsetY, radius, rotation, alpha, this.colorOffset, palette);
  }
}

// Seed of Life: 7 overlapping circles
function drawSeedOfLife(ctx, x, y, radius, rotation, alpha, colorOffset, palette) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalCompositeOperation = 'lighter';

  const r = radius;

  // Center circle
  drawGlowCircle(ctx, 0, 0, r, alpha, palette[Math.floor(colorOffset) % palette.length]);

  // 6 surrounding circles
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    const color = palette[Math.floor((colorOffset + i * 0.5) % palette.length)];
    drawGlowCircle(ctx, px, py, r, alpha * 0.8, color);
  }

  // Vesica piscis highlights (intersections)
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const angle1 = (i / 6) * Math.PI * 2;
    const angle2 = ((i + 1) / 6) * Math.PI * 2;
    const midAngle = (angle1 + angle2) / 2;
    const px = Math.cos(midAngle) * r * 0.5;
    const py = Math.sin(midAngle) * r * 0.5;

    ctx.beginPath();
    ctx.arc(px, py, r * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlowCircle(ctx, x, y, radius, alpha, color) {
  const rgb = hexToRgb(color);

  // Outer glow
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.3})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner line
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.8})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}
