// jazer-easing.js
// JaZeR Easing Module
// Curated easing functions for smooth, cinematic motion
// ============================================================================

export const Easing = {
  linear(t) { return t; },

  easeInQuad(t) { return t * t; },
  easeOutQuad(t) { return 1 - (1 - t) * (1 - t); },
  easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },

  easeInCubic(t) { return t * t * t; },
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },

  easeInQuart(t) { return t * t * t * t; },
  easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); },
  easeInOutQuart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; },

  easeInQuint(t) { return t * t * t * t * t; },
  easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); },
  easeInOutQuint(t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2; },

  easeInSine(t) { return 1 - Math.cos((t * Math.PI) / 2); },
  easeOutSine(t) { return Math.sin((t * Math.PI) / 2); },
  easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },

  easeInExpo(t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
  easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  easeInOutExpo(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  easeInCirc(t) { return 1 - Math.sqrt(1 - Math.pow(t, 2)); },
  easeOutCirc(t) { return Math.sqrt(1 - Math.pow(t - 1, 2)); },
  easeInOutCirc(t) {
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  },

  easeInBack(t, s = 1.70158) { return (s + 1) * t * t * t - s * t * t; },
  easeOutBack(t, s = 1.70158) { return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  easeInOutBack(t, s = 1.70158) {
    const c1 = s;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  },
  easeInBounce(t) { return 1 - Easing.easeOutBounce(1 - t); },
  easeInOutBounce(t) {
    return t < 0.5
      ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easing.easeOutBounce(2 * t - 1)) / 2;
  },

  easeInElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic(t) {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }
};

export default Easing;

