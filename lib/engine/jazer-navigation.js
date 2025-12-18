/**
 * JaZeR Navigation Module
 * Provides navigation controls for effect pages
 * - Back to gallery button
 * - Previous/Next effect navigation
 * - Favorites toggle
 * - Keyboard shortcuts (Esc, Arrow keys, F)
 */

import favorites from './jazer-favorites.js';

// === EFFECT LIST (synced with index.html) ===
const EFFECTS = [
    // 🔥 INTENSE EFFECTS
    "jazer-plasma-storm.html",
    "jazer-plasma-vortex.html",
    "jazer-cyber-glitch.html",
    "jazer-singularity.html",
    "jazer-neon-city.html",
    "jazer-particle-galaxy.html",
    "jazer-digital-lattice-tunnel.html",
    "jazer-particle-warp.html",
    "jazer-plasma-storm-corridor.html",
    "jazer-plasma-storm-enhanced.html",
    "jazer-quantum-lattice.html",
    "jazer-cyber-glyph-rain.html",
    // 🌌 COSMIC & PORTALS
    "jazer-quantum-wormhole.html",
    "jazer-cosmic-nebula.html",
    "jazer-cosmic-nebula-enhanced.html",
    "jazer-aurora-borealis.html",
    "jazer-nebula-pulse.html",
    "jazer-cosmic-laser-beams.html",
    "jazer-galactic-highway.html",
    // ⚡ ADVANCED 3D TECH
    "jazer-laser-grid-sphere.html",
    "jazer-neural-network.html",
    "jazer-holographic-city-tunnel.html",
    "jazer-energy-reactor.html",
    "jazer-quantum-foam.html",
    "jazer-neon-ocean.html",
    "jazer-gridfall.html",
    "jazer-hologram-echoes.html",
    "jazer-infinite-city-grid.html",
    "jazer-neon-tunnel.html",
    "jazer-rainbow-wireframe-tunnel.html",
    "jazer-chromatic-wavefield.html",
    // 🔮 SACRED GEOMETRY
    "jazer-flower-of-life-mandala.html",
    "jazer-flower-of-life.html",
    "jazer-metatrons-cube.html",
    "jazer-sri-yantra.html",
    "jazer-torus-knot-tunnel.html",
    "jazer-seed-of-life.html",
    "jazer-sacred-tesseract.html",
    "jazer-crystal-lattice-network.html",
    "jazer-fractal-bloom.html",
    // ✨ JAZER SIGNATURE COLLECTION
    "jazer-aurora-veil.html",
    "jazer-glitch-fracture-grid.html",
    "jazer-starfall-conveyor.html",
    "jazer-void-bloom-portal.html",
    "jazer-hex-tunnel-cascade.html",
    "jazer-neon-circuit-maze.html",
    "jazer-gravity-well-spiral.html",
    "jazer-sonic-pulse-lines.html",
    "jazer-echoing-logo-orbits.html",
    "jazer-crystal-shard-tunnel.html",
    "jazer-vaporwave-horizon-ride.html",
    "jazer-infinite-logo-kaleidoscope.html",
    "jazer-hyperspace-streaks.html",
    "jazer-flux-ribbon-trails.html",
    "jazer-magnetic-particle-swirl.html",
    "jazer-laser-lattice-cage.html",
    "jazer-anamorphic-logo-waves.html",
    "jazer-binary-star-tunnel.html",
    "jazer-neon-smoke-vortex.html",
    "jazer-quantum-logo-particles.html",
    "jazer-warp-grid-twister.html",
    "jazer-eclipse-ring-halo.html",
    "jazer-supernova-shockwave.html",
    "jazer-infinite-mirror-corridor.html",
    "jazer-logo-constellation-field.html",
    "jazer-digital-sandstorm.html",
    "jazer-chromatic-glitch-tunnel.html",
    "jazer-floating-monoliths.html",
    "jazer-zero-gravity-logo-cloud.html",
    "jazer-synthwave-sun-grid.html",
    "jazer-laser-fountain-columns.html",
    "jazer-suspended-light-orbs.html",
    "jazer-singularity-swirl.html",
    "jazer-electric-vein-network.html",
    "jazer-neon-vine-growth.html",
    "jazer-radiant-pulse-rings.html",
    "jazer-holographic-logo-shards.html",
    "jazer-parallax-starfield-drift.html",
    "jazer-oscillating-wave-tunnel.html",
    "jazer-celestial-logo-haloes.html",
    "jazer-hypercube-drift.html",
    "jazer-liquid-neon-ripple.html",
    "jazer-orbit-rings.html",
    "jazer-prism-shard-swarm.html",
    "jazer-time-ripple-rings.html",
    "jazer-vortex-spiral.html",
    // 🎨 CLASSIC EFFECTS
    "jazer-hyperspace-tunnel.html",
    "jazer-hexagon-tunnel.html",
    "jazer-cosmic-stardust.html",
    "jazer-synthwave-grid.html",
    "jazer-dna-helix.html",
    "jazer-crystal-cave.html",
    "jazer-matrix-rain.html",
    "jazer-mobius-infinity.html",
    "jazer-fractal-cubes.html"
];

// === NAVIGATION STATE ===
let currentIndex = -1;
let navElement = null;

// === INITIALIZATION ===
function init() {
    // Get current file name
    const currentFile = window.location.pathname.split('/').pop();
    currentIndex = EFFECTS.indexOf(currentFile);

    if (currentIndex === -1) {
        console.warn('[JaZeR Nav] Current effect not found in navigation list');
        return;
    }

    createNavUI();
    setupKeyboardShortcuts();
}

// === UI CREATION ===
function createNavUI() {
    // Create container
    navElement = document.createElement('div');
    navElement.id = 'jazer-nav';
    navElement.innerHTML = `
        <style>
            #jazer-nav {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                gap: 10px;
                font-family: system-ui, -apple-system, sans-serif;
            }

            .jazer-nav-btn {
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid rgba(0, 245, 255, 0.5);
                color: #00f5ff;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .jazer-nav-btn:hover {
                background: rgba(0, 245, 255, 0.2);
                border-color: #00f5ff;
                box-shadow: 0 0 20px rgba(0, 245, 255, 0.4);
                transform: translateY(-2px);
            }

            .jazer-nav-btn:active {
                transform: translateY(0);
            }

            .jazer-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                pointer-events: none;
            }

            .jazer-nav-icon {
                font-size: 16px;
            }

            .jazer-nav-btn.favorite {
                border-color: rgba(255, 215, 0, 0.5);
                color: #ffd700;
            }

            .jazer-nav-btn.favorite.active {
                background: rgba(255, 215, 0, 0.2);
                border-color: #ffd700;
                color: #ffd700;
            }

            .jazer-nav-btn.favorite:hover {
                border-color: #ffd700;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
            }

            .jazer-nav-shortcut {
                font-size: 11px;
                opacity: 0.6;
                margin-left: 4px;
            }

            @media (max-width: 768px) {
                #jazer-nav {
                    top: 10px;
                    right: 10px;
                    flex-wrap: wrap;
                    max-width: calc(100vw - 20px);
                }

                .jazer-nav-btn {
                    padding: 8px 12px;
                    font-size: 12px;
                }

                .jazer-nav-shortcut {
                    display: none;
                }
            }

            @media (max-width: 480px) {
                #jazer-nav {
                    bottom: 10px;
                    top: auto;
                    left: 10px;
                    right: 10px;
                    justify-content: center;
                }

                .jazer-nav-btn {
                    flex: 1;
                    justify-content: center;
                }
            }
        </style>

        <button class="jazer-nav-btn" id="nav-prev" title="Previous Effect (Left Arrow)">
            <span class="jazer-nav-icon">←</span>
            <span class="jazer-nav-label">Prev</span>
            <span class="jazer-nav-shortcut">←</span>
        </button>

        <a href="../index.html" class="jazer-nav-btn" id="nav-home" title="Back to Gallery (Esc)">
            <span class="jazer-nav-icon">⌂</span>
            <span class="jazer-nav-label">Gallery</span>
            <span class="jazer-nav-shortcut">Esc</span>
        </a>

        <button class="jazer-nav-btn favorite" id="nav-favorite" title="Toggle Favorite (F)">
            <span class="jazer-nav-icon">☆</span>
            <span class="jazer-nav-shortcut">F</span>
        </button>

        <button class="jazer-nav-btn" id="nav-next" title="Next Effect (Right Arrow)">
            <span class="jazer-nav-label">Next</span>
            <span class="jazer-nav-icon">→</span>
            <span class="jazer-nav-shortcut">→</span>
        </button>
    `;

    document.body.appendChild(navElement);

    // Set up button states and event listeners
    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');
    const favoriteBtn = document.getElementById('nav-favorite');

    if (currentIndex <= 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.addEventListener('click', navigatePrevious);
    }

    if (currentIndex >= EFFECTS.length - 1) {
        nextBtn.disabled = true;
    } else {
        nextBtn.addEventListener('click', navigateNext);
    }

    // Set up favorite button
    const currentFile = EFFECTS[currentIndex];
    updateFavoriteButton(favoriteBtn, currentFile);
    favoriteBtn.addEventListener('click', () => toggleFavorite(favoriteBtn, currentFile));
}

// === FAVORITES FUNCTIONS ===
function updateFavoriteButton(btn, filename) {
    const isFav = favorites.isFavorite(filename);
    const icon = btn.querySelector('.jazer-nav-icon');

    if (isFav) {
        btn.classList.add('active');
        icon.textContent = '★';
        btn.title = 'Remove from Favorites (F)';
    } else {
        btn.classList.remove('active');
        icon.textContent = '☆';
        btn.title = 'Add to Favorites (F)';
    }
}

function toggleFavorite(btn, filename) {
    favorites.toggle(filename);
    updateFavoriteButton(btn, filename);
}

// === NAVIGATION FUNCTIONS ===
function navigatePrevious() {
    if (currentIndex > 0) {
        window.location.href = EFFECTS[currentIndex - 1];
    }
}

function navigateNext() {
    if (currentIndex < EFFECTS.length - 1) {
        window.location.href = EFFECTS[currentIndex + 1];
    }
}

function navigateHome() {
    window.location.href = '../index.html';
}

// === KEYBOARD SHORTCUTS ===
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.key) {
            case 'Escape':
                navigateHome();
                break;
            case 'ArrowLeft':
                if (currentIndex > 0) {
                    navigatePrevious();
                }
                break;
            case 'ArrowRight':
                if (currentIndex < EFFECTS.length - 1) {
                    navigateNext();
                }
                break;
            case 'f':
            case 'F':
                const favoriteBtn = document.getElementById('nav-favorite');
                const currentFile = EFFECTS[currentIndex];
                if (favoriteBtn && currentFile) {
                    toggleFavorite(favoriteBtn, currentFile);
                }
                break;
        }
    });
}

// === AUTO-INITIALIZE ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// === EXPORTS ===
export { init, navigatePrevious, navigateNext, navigateHome };
