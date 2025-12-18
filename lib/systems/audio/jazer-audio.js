// jazer-audio.js
// JaZeR Audio Reactivity Module
// Real-time audio analysis for music-reactive visual effects
// ============================================================================

// ---------------------------------------------------------
// AUDIO ANALYZER
// ---------------------------------------------------------

export class AudioAnalyzer {
  constructor(options = {}) {
    this.fftSize = options.fftSize || 2048;
    this.smoothingTimeConstant = options.smoothing || 0.8;
    this.minDecibels = options.minDecibels || -90;
    this.maxDecibels = options.maxDecibels || -10;

    // Audio context
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.gainNode = null;

    // Data arrays
    this.frequencyData = null;
    this.timeDomainData = null;

    // Beat detection
    this.beatDetector = new BeatDetector();

    // Frequency bands
    this.bands = {
      sub: { min: 20, max: 60, value: 0 },       // Sub bass
      bass: { min: 60, max: 250, value: 0 },      // Bass
      lowMid: { min: 250, max: 500, value: 0 },   // Low mids
      mid: { min: 500, max: 2000, value: 0 },     // Mids
      highMid: { min: 2000, max: 4000, value: 0 }, // High mids
      presence: { min: 4000, max: 6000, value: 0 }, // Presence
      brilliance: { min: 6000, max: 20000, value: 0 } // Brilliance/highs
    };

    // Volume tracking
    this.volume = 0;
    this.volumeSmoothed = 0;
    this.volumeHistory = [];
    this.volumeHistorySize = 60;

    // State
    this.isPlaying = false;
    this.isInitialized = false;
  }

  /**
   * Initialize with audio element
   */
  async initWithElement(audioElement) {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      this.analyser.minDecibels = this.minDecibels;
      this.analyser.maxDecibels = this.maxDecibels;

      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.gainNode = this.audioContext.createGain();

      // Connect: source -> analyser -> gain -> destination
      this.source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Initialize data arrays
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);

      this.isInitialized = true;
      this.isPlaying = !audioElement.paused;

      console.log('[JaZeR Audio] Initialized with audio element');
      return true;
    } catch (error) {
      console.error('[JaZeR Audio] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize with microphone input
   */
  async initWithMicrophone() {
    if (this.isInitialized) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      this.analyser.minDecibels = this.minDecibels;
      this.analyser.maxDecibels = this.maxDecibels;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);

      this.isInitialized = true;
      this.isPlaying = true;

      console.log('[JaZeR Audio] Initialized with microphone');
      return true;
    } catch (error) {
      console.error('[JaZeR Audio] Microphone access failed:', error);
      return false;
    }
  }

  /**
   * Update analysis - call every frame
   */
  update() {
    if (!this.isInitialized || !this.analyser) return;

    // Get frequency and time domain data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    // Calculate overall volume
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    this.volume = sum / this.frequencyData.length / 255;

    // Smooth volume
    this.volumeSmoothed = this.volumeSmoothed * 0.9 + this.volume * 0.1;

    // Track volume history
    this.volumeHistory.push(this.volume);
    if (this.volumeHistory.length > this.volumeHistorySize) {
      this.volumeHistory.shift();
    }

    // Update frequency bands
    this._updateBands();

    // Update beat detection
    this.beatDetector.update(this.volume);
  }

  _updateBands() {
    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / this.analyser.frequencyBinCount;

    for (const [key, band] of Object.entries(this.bands)) {
      const minBin = Math.floor(band.min / binWidth);
      const maxBin = Math.ceil(band.max / binWidth);

      let sum = 0;
      let count = 0;

      for (let i = minBin; i < maxBin && i < this.frequencyData.length; i++) {
        sum += this.frequencyData[i];
        count++;
      }

      band.value = count > 0 ? sum / count / 255 : 0;
    }
  }

  /**
   * Get frequency data as normalized array (0-1)
   */
  getFrequencyArray() {
    if (!this.frequencyData) return [];
    return Array.from(this.frequencyData).map(v => v / 255);
  }

  /**
   * Get time domain data as normalized array (-1 to 1)
   */
  getWaveform() {
    if (!this.timeDomainData) return [];
    return Array.from(this.timeDomainData).map(v => (v - 128) / 128);
  }

  /**
   * Get specific frequency band value (0-1)
   */
  getBand(bandName) {
    return this.bands[bandName]?.value || 0;
  }

  /**
   * Get bass frequency (0-1)
   */
  getBass() {
    return (this.bands.sub.value + this.bands.bass.value) / 2;
  }

  /**
   * Get mid frequency (0-1)
   */
  getMids() {
    return (this.bands.lowMid.value + this.bands.mid.value + this.bands.highMid.value) / 3;
  }

  /**
   * Get high frequency (0-1)
   */
  getHighs() {
    return (this.bands.presence.value + this.bands.brilliance.value) / 2;
  }

  /**
   * Get volume (0-1)
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Get smoothed volume (0-1)
   */
  getVolumeSmooth() {
    return this.volumeSmoothed;
  }

  /**
   * Check if beat detected this frame
   */
  isBeat() {
    return this.beatDetector.isBeat;
  }

  /**
   * Check if kick detected
   */
  isKick() {
    return this.beatDetector.isKick;
  }

  /**
   * Check if snare detected
   */
  isSnare() {
    return this.beatDetector.isSnare;
  }

  /**
   * Get beat confidence (0-1)
   */
  getBeatStrength() {
    return this.beatDetector.strength;
  }

  /**
   * Set volume
   */
  setVolume(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// ---------------------------------------------------------
// BEAT DETECTOR
// ---------------------------------------------------------

class BeatDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 1.3;
    this.decay = options.decay || 0.98;
    this.minTimeBetweenBeats = options.minTimeBetweenBeats || 100; // ms

    this.energyHistory = [];
    this.historySize = 43; // ~1 second at 60fps
    this.localEnergy = 0;
    this.lastBeatTime = 0;

    this.isBeat = false;
    this.isKick = false;
    this.isSnare = false;
    this.strength = 0;
  }

  update(volume) {
    const now = performance.now();
    this.isBeat = false;
    this.isKick = false;
    this.isSnare = false;

    // Track energy history
    this.energyHistory.push(volume);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    // Current energy
    this.localEnergy = volume;

    // Beat detection: current energy > threshold * average
    if (this.localEnergy > avgEnergy * this.threshold) {
      // Check cooldown
      if (now - this.lastBeatTime > this.minTimeBetweenBeats) {
        this.isBeat = true;
        this.lastBeatTime = now;
        this.strength = Math.min((this.localEnergy / avgEnergy - this.threshold) / this.threshold, 1);

        // Simple kick/snare classification based on strength
        if (this.strength > 0.7) {
          this.isKick = true; // Strong beat = kick
        } else {
          this.isSnare = true; // Weaker beat = snare
        }
      }
    }

    // Decay strength
    this.strength *= this.decay;
  }
}

// ---------------------------------------------------------
// AUDIO REACTIVE HELPERS
// ---------------------------------------------------------

/**
 * Map audio value to range
 */
export function mapAudio(value, outMin, outMax) {
  return outMin + value * (outMax - outMin);
}

/**
 * Apply easing to audio value for smoother response
 */
export function easeAudio(value, power = 2) {
  return Math.pow(value, power);
}

/**
 * Create audio-reactive scale
 */
export function audioScale(baseScale, audio, multiplier = 1) {
  return baseScale * (1 + audio * multiplier);
}

/**
 * Create audio-reactive color
 */
export function audioColorShift(baseHue, audio, range = 0.2) {
  return (baseHue + audio * range) % 1.0;
}

// ---------------------------------------------------------
// AUDIO VISUALIZER HELPER
// ---------------------------------------------------------

export class AudioVisualizer {
  constructor(analyzer, options = {}) {
    this.analyzer = analyzer;
    this.mode = options.mode || 'bars'; // bars, circle, waveform, spectrum

    // Visual parameters
    this.barCount = options.barCount || 64;
    this.smoothing = options.smoothing || 0.7;
    this.scale = options.scale || 1.0;

    // Smoothed values
    this.smoothedFrequencies = new Array(this.barCount).fill(0);
  }

  /**
   * Get visualization data
   */
  getData() {
    if (!this.analyzer.isInitialized) {
      return new Array(this.barCount).fill(0);
    }

    const freqArray = this.analyzer.getFrequencyArray();
    const binSize = Math.floor(freqArray.length / this.barCount);

    const data = [];

    for (let i = 0; i < this.barCount; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        const index = i * binSize + j;
        if (index < freqArray.length) {
          sum += freqArray[index];
        }
      }
      const avg = sum / binSize;

      // Smooth
      this.smoothedFrequencies[i] = this.smoothedFrequencies[i] * this.smoothing + avg * (1 - this.smoothing);

      data.push(this.smoothedFrequencies[i] * this.scale);
    }

    return data;
  }

  /**
   * Get circular visualization data (for radial visualizers)
   */
  getCircularData() {
    const data = this.getData();
    return data.map((value, i) => ({
      value,
      angle: (i / this.barCount) * Math.PI * 2,
      index: i
    }));
  }

  /**
   * Get waveform data
   */
  getWaveformData() {
    return this.analyzer.getWaveform();
  }
}

// ---------------------------------------------------------
// PRESETS
// ---------------------------------------------------------

export const AUDIO_PRESETS = {
  // Music with strong bass
  electronic: {
    fftSize: 2048,
    smoothing: 0.8,
    beatThreshold: 1.4
  },

  // Live music or acoustic
  live: {
    fftSize: 4096,
    smoothing: 0.85,
    beatThreshold: 1.3
  },

  // Microphone input
  microphone: {
    fftSize: 2048,
    smoothing: 0.75,
    beatThreshold: 1.5
  },

  // Sensitive to all frequencies
  balanced: {
    fftSize: 2048,
    smoothing: 0.8,
    beatThreshold: 1.3
  }
};

// ---------------------------------------------------------
// CONVENIENCE FUNCTIONS
// ---------------------------------------------------------

/**
 * Create audio analyzer with preset
 */
export function createAudioAnalyzer(preset = 'balanced') {
  const config = AUDIO_PRESETS[preset] || AUDIO_PRESETS.balanced;
  return new AudioAnalyzer(config);
}

/**
 * Quick setup with audio element
 */
export async function setupAudio(audioElement, preset = 'balanced') {
  const analyzer = createAudioAnalyzer(preset);
  await analyzer.initWithElement(audioElement);
  return analyzer;
}

/**
 * Quick setup with microphone
 */
export async function setupMicrophone(preset = 'microphone') {
  const analyzer = createAudioAnalyzer(preset);
  await analyzer.initWithMicrophone();
  return analyzer;
}

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

export default {
  AudioAnalyzer,
  AudioVisualizer,
  BeatDetector,
  createAudioAnalyzer,
  setupAudio,
  setupMicrophone,
  mapAudio,
  easeAudio,
  audioScale,
  audioColorShift,
  AUDIO_PRESETS
};
