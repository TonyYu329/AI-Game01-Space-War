/**
 * @description Simplified Bootstrapper: Module Initialization Helper (CommonJS)
 * @date 2026-04-24
 */

// ============================================================
// === GLOBAL VARIABLES ======================================
// ============================================================

let canvas, ctx;
let gameOverOverlay, restartButton;

// ============================================================
// === UTILITY FUNCTIONS =====================================
// ============================================================

/**
 * Initialize background stars on canvas
 * @param {HTMLCanvasElement} canvas - The game canvas element
 */
function initBackgroundStars(canvas) {
    const STAR_COUNT = 150;
    
    // Generate random star positions
    for (let i = 0; i < STAR_COUNT; i++) {
        backgroundStars.push({
            x: Math.random() * CANVAS_CONFIG.defaultWidth,
            y: Math.random() * CANVAS_CONFIG.defaultHeight,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.sin(i * 0.1) * 0.0005 + 0.0001),
            speedY: (Math.cos(i * 0.1) * 0.0005 + 0.0001)
        });
    }
}

/**
 * Initialize audio system
 */
function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    
    // Simple oscillator-based sound effects
    function createOscillatorSound(freq, type, duration, vol = 1) {
        if (!audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(vol * 0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }
    
    // Sound effect functions
    function playShootSound() {
        if (!audioCtx) return;
        createOscillatorSound(600, 'square', 0.1, 0.3);
    }
    
    function playExplosionSound() {
        if (!audioCtx) return;
        
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        noise.start();
    }
    
    // Initialize AudioContext on first user interaction
    document.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, { once: true });
}

/**
 * Setup event listeners for game controls
 */
function setupEventListeners() {
    // Mouse movement - ship control
    window.addEventListener('mousemove', (e) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        const planeWidth = 40;
        plane.x = e.clientX - planeWidth / 2;
        plane.y = e.clientY;
    });
    
    // Mouse click - shooting
    document.addEventListener('mousedown', (e) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        const isMachineGun = e.button === 0; // Left click
        createBullet(isMachineGun);
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        handleResize();
    });
    
    // Game over restart button
    if (restartButton) {
        restartButton.addEventListener('click', resetGame);
    }
}

// ============================================================
// === MAIN ENTRY POINT ======================================
// ============================================================

/**
 * Main initialization function
 */
function main() {
    console.log("=== Space War v6.0 Bootstrapper (CommonJS) ===");
    
    // Get DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    gameOverOverlay = document.getElementById('gameOverOverlay');
    restartButton = document.getElementById('restartButton');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial resize and game initialization
    resizeCanvas();
    handleResize();
    initializeGame();
}

// Auto-start when script loads
if (typeof window !== 'undefined') {
    window.onload = () => main();
}
