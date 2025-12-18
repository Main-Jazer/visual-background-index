/**
 * SriYantra.js
 * Sacred geometry pattern: Sri Yantra with interlocking triangles
 */

import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb, smoothstep } from '../engine/jazer-background-engine.js';

export class SriYantra extends CanvasEffectBase {
  getName() {
    return 'Sri Yantra';
  }

  getCategory() {
    return 'sacred-geometry';
  }

  getDescription() {
    return 'Sacred geometry pattern featuring the Sri Yantra with interlocking triangles in a vortex';
  }

  getTags() {
    return ['2d', 'geometry', 'sacred', 'yantra', 'vortex'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      layerCount: 8
    };
  }

  async createEffect() {
    this.palette = ['#ff6b00', '#ff2a6d', '#d946ef', '#f97316', '#fbbf24'];
    this.layers = Array.from(
      { length: this.config.layerCount },
      (_, i) => new VortexLayer(i, this.palette)
    );
  }

  render(time, deltaTime) {
    const { width: W, height: H, centerX: cx, centerY: cy, ctx } = this;

    // Deep warm background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, '#150808');
    bgGrad.addColorStop(1, '#050002');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, W, H);

    const dt = deltaTime;

    // Sort and draw back to front
    this.layers.sort((a, b) => b.z - a.z);
    this.layers.forEach(layer => {
      layer.update(dt);
      layer.draw(ctx, cx, cy, time, this.palette);
    });

    // Central divine glow
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 250);
    centerGlow.addColorStop(0, 'rgba(255, 107, 0, 0.15)');
    centerGlow.addColorStop(0.5, 'rgba(255, 42, 109, 0.08)');
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
    this.z = index * 0.25;
    this.rotationDir = index % 2 === 0 ? 1 : -1;
    this.colorOffset = index * 0.6;
    this.palette = palette;
  }

  update(dt) {
    this.z += dt * 0.05; // Very slow and meditative
    if (this.z > 2) {
      this.z = 0;
      this.colorOffset = Math.random() * this.palette.length;
    }
  }

  draw(ctx, cx, cy, time, palette) {
    const scale = 1 / (1 + this.z * 1.8);
    const alpha = smoothstep(0, 0.5, this.z) * smoothstep(2, 1.2, this.z);

    if (alpha < 0.01) return;

    const radius = 150 * scale;
    const rotation = time * 0.05 * this.rotationDir + this.index * 0.4;

    const parallax = this.z * 0.35;
    const offsetX = mouse.centeredX * 60 * parallax;
    const offsetY = mouse.centeredY * 60 * parallax;

    drawSriYantra(ctx, cx + offsetX, cy + offsetY, radius, rotation, alpha, this.colorOffset, palette, time);
  }
}

// Draw interlocking triangles (simplified Sri Yantra)
function drawSriYantra(ctx, x, y, radius, rotation, alpha, colorOffset, palette, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalCompositeOperation = 'lighter';

  // Outer circle
  const rgb0 = hexToRgb(palette[Math.floor(colorOffset) % palette.length]);
  ctx.strokeStyle = `rgba(${rgb0.r}, ${rgb0.g}, ${rgb0.b}, ${alpha * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 9 interlocking triangles (4 upward, 5 downward - simplified)
  const triangleSizes = [0.95, 0.8, 0.65, 0.5, 0.35, 0.22, 0.12];

  triangleSizes.forEach((size, i) => {
    const r = radius * size;
    const isUpward = i % 2 === 0;
    const colorIdx = Math.floor((colorOffset + i * 0.7) % palette.length);
    const color = palette[colorIdx];
    const rgb = hexToRgb(color);

    const triAlpha = alpha * (0.9 - i * 0.08);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${triAlpha})`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let j = 0; j <= 3; j++) {
      const angle = (j / 3) * Math.PI * 2 + (isUpward ? -Math.PI / 2 : Math.PI / 2);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Glow fill
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${triAlpha * 0.1})`;
    ctx.fill();
  });

  // Central bindu (point)
  const binduColor = palette[Math.floor((colorOffset + time) % palette.length)];
  const binduRgb = hexToRgb(binduColor);

  const binduGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.15);
  binduGlow.addColorStop(0, `rgba(${binduRgb.r}, ${binduRgb.g}, ${binduRgb.b}, ${alpha})`);
  binduGlow.addColorStop(0.5, `rgba(${binduRgb.r}, ${binduRgb.g}, ${binduRgb.b}, ${alpha * 0.3})`);
  binduGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = binduGlow;
  ctx.fillRect(-radius * 0.15, -radius * 0.15, radius * 0.3, radius * 0.3);

  ctx.restore();
}
