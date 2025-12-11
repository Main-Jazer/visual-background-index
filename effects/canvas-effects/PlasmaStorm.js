/**
 * PlasmaStorm.js
 * Dynamic plasma orbs with lightning connections
 */

import { CanvasEffectBase } from '../lib/CanvasEffectBase.js';
import { mouse, hexToRgb, smoothstep, noise2D } from '../../jazer-background-engine.js';

export class PlasmaStorm extends CanvasEffectBase {
  getName() {
    return 'Plasma Storm';
  }

  getCategory() {
    return 'plasma';
  }

  getDescription() {
    return 'Dynamic plasma energy orbs with electric lightning connections and particle effects';
  }

  getTags() {
    return ['2d', 'plasma', 'lightning', 'energy', 'particles'];
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      orbCount: 8
    };
  }

  async createEffect() {
    this.plasmaColors = ['#ff0055', '#ff2aff', '#00f5ff', '#39ff14', '#ffd700', '#ff6b00'];
    this.orbs = Array.from({ length: this.config.orbCount }, () => new PlasmaOrb(this.width, this.height, this.plasmaColors));
  }

  resize(width, height) {
    // Reinitialize orbs with new dimensions
    this.orbs = Array.from({ length: this.config.orbCount }, () => new PlasmaOrb(width, height, this.plasmaColors));
  }

  render(time, deltaTime) {
    const { width: W, height: H, centerX: cx, centerY: cy, ctx } = this;

    // Background gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H));
    bgGrad.addColorStop(0, '#100010');
    bgGrad.addColorStop(1, '#000005');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const dt = deltaTime;
    this.orbs.forEach(orb => {
      orb.update(dt, time, W, H);
      orb.draw(ctx);
    });

    // Draw lightning connections between nearby orbs
    for (let i = 0; i < this.orbs.length; i++) {
      for (let j = i + 1; j < this.orbs.length; j++) {
        const dx = this.orbs[j].x - this.orbs[i].x;
        const dy = this.orbs[j].y - this.orbs[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400 && Math.random() < 0.1) {
          const alpha = smoothstep(400, 100, dist);
          const color = this.plasmaColors[Math.floor(time * 2) % this.plasmaColors.length];
          drawLightning(ctx, this.orbs[i].x, this.orbs[i].y, this.orbs[j].x, this.orbs[j].y, 50, color, alpha * 0.6);
        }
      }
    }

    // Lightning to mouse
    const mx = mouse.x * W;
    const my = mouse.y * H;
    if (mx > 0 && Math.random() < 0.15) {
      const nearestOrb = this.orbs.reduce((nearest, orb) => {
        const d = Math.hypot(orb.x - mx, orb.y - my);
        return d < nearest.d ? { orb, d } : nearest;
      }, { orb: this.orbs[0], d: Infinity });
      if (nearestOrb.d < 400) {
        drawLightning(ctx, nearestOrb.orb.x, nearestOrb.orb.y, mx, my, 60, '#00f5ff', 0.7);
      }
    }

    ctx.restore();

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }
}

class PlasmaOrb {
  constructor(W, H, colors) {
    this.reset(W, H);
    this.colors = colors;
  }

  reset(W, H) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.size = 20 + Math.random() * 60;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.colorIndex = Math.floor(Math.random() * this.colors.length);
    this.pulseSpeed = 1 + Math.random() * 2;
    this.noiseOffset = Math.random() * 1000;
  }

  update(dt, time, W, H) {
    const mx = mouse.x * W;
    const my = mouse.y * H;
    const dx = mx - this.x;
    const dy = my - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Mouse attraction
    if (dist < 300 && dist > 10) {
      this.vx += (dx / dist) * 0.5;
      this.vy += (dy / dist) * 0.5;
    }

    // Noise-based movement
    this.vx += noise2D(this.x * 0.003, time * 0.5 + this.noiseOffset) * 0.3;
    this.vy += noise2D(this.y * 0.003, time * 0.5 + this.noiseOffset + 100) * 0.3;

    // Damping
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wrap around edges
    if (this.x < -100) this.x = W + 100;
    if (this.x > W + 100) this.x = -100;
    if (this.y < -100) this.y = H + 100;
    if (this.y > H + 100) this.y = -100;
  }

  draw(ctx) {
    if (!isFinite(this.x) || !isFinite(this.y)) {
      this.reset(ctx.canvas.width, ctx.canvas.height);
      return;
    }

    const pulse = Math.sin(performance.now() / 1000 * this.pulseSpeed) * 0.3 + 1;
    const size = this.size * pulse;
    const color = this.colors[this.colorIndex];
    const rgb = hexToRgb(color);

    // Draw glowing layers
    for (let i = 4; i >= 0; i--) {
      const layerSize = size * (1 + i * 0.5);
      const alpha = 0.15 / (i + 1);
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, layerSize);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, layerSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw tendrils
    const tendrilCount = 6;
    const time = performance.now() / 1000;
    for (let i = 0; i < tendrilCount; i++) {
      const angle = (i / tendrilCount) * Math.PI * 2 + time * 0.5;
      const len = size * (0.8 + noise2D(i + time, this.noiseOffset) * 0.5);
      const endX = this.x + Math.cos(angle) * len;
      const endY = this.y + Math.sin(angle) * len;
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.quadraticCurveTo(
        this.x + Math.cos(angle + 0.3) * len * 0.5,
        this.y + Math.sin(angle + 0.3) * len * 0.5,
        endX, endY
      );
      ctx.stroke();
    }
  }
}

function drawLightning(ctx, x1, y1, x2, y2, displacement, color, alpha) {
  const points = [{ x: x1, y: y1 }];
  
  function subdivide(start, end, disp) {
    if (disp < 2) return;
    const mid = {
      x: (start.x + end.x) / 2 + (Math.random() - 0.5) * disp,
      y: (start.y + end.y) / 2 + (Math.random() - 0.5) * disp
    };
    const startIdx = points.indexOf(start);
    const endIdx = points.indexOf(end);
    points.splice(endIdx, 0, mid);
    subdivide(start, mid, disp * 0.6);
    subdivide(mid, end, disp * 0.6);
  }
  
  points.push({ x: x2, y: y2 });
  subdivide(points[0], points[1], displacement);

  const rgb = hexToRgb(color);
  
  // Outer glow
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.3})`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Main bolt
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Core
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}
