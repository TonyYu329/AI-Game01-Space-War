/**
 * @description Unified Game Entry Point (Merged from all legacy modules)
 * @date 2026-04-24
 * 
 * This file consolidates all game logic into a single bootstrap entry.
 * It imports and initializes all sub-modules in the correct order.
 */

// ============================================================
// === IMPORTS & CONSTANTS ====================================
// ============================================================

import { GAME_STATE, gameState } from './modules/core/state.js';
import { CANVAS_CONFIG, canvas, ctx } from './modules/core/canvas.js';
import { backgroundStars } from './modules/system/background.js';
import { meteors } from './modules/entities/asteroid.js';
import { bullets } from './modules/entities/bullet.js';
import { particles } from './modules/effects/particle.js';

// ============================================================
// === MODULE INITIALIZATION ==================================
// ============================================================

/**
 * Initialize all game modules in dependency order
 */
function initAllModules() {
    // 1. Core initialization
    console.log('[INIT] Starting core modules...');
    
    // Canvas setup
    if (canvas) {
        canvas.width = CANVAS_CONFIG.defaultWidth;
        canvas.height = CANVAS_CONFIG.defaultHeight;
    }
    
    // Background stars
    initBackgroundStars();
    
    // 2. Entity initialization
    console.log('[INIT] Setting up entities...');
    
    // Plane (player)
    const planeDefaults = {
        width: 40,
        height: 30,
        speed: 5,
        maxHealth: 100,
        health: 100,
        color: '#4ff',
        glowColor: '#0aa'
    };
    
    // 3. System initialization
    console.log('[INIT] Starting systems...');
    
    // Audio system
    initAudio();
    
    // Input handling
    initInput();
    
    // Visual effects (parallax, glow, etc.)
    initVisuals();
    
    // 4. Game loop setup
    console.log('[INIT] Setting up game loop...');
    
    // Start the main loop
    startGameLoop();
}

// ============================================================
// === CORE FUNCTIONS =========================================
// ============================================================

/**
 * Initialize background stars for parallax effect
 */
function initBackgroundStars() {
    const STAR_COUNT = 150;
    backgroundStars = [];
    
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
 * Initialize input handling
 */
function initInput() {
    const keys = {};
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                // Machine gun mode - rapid fire
                createBullet(true);
                break;
            case 'KeyR':
                resetPlane();
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Mouse controls
    canvas.addEventListener('mousemove', (event) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        const planeWidth = 40;
        plane.x = event.clientX - planeWidth / 2;
        plane.y = event.clientY;
    });
    
    canvas.addEventListener('mousedown', (event) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        const isMachineGun = event.button === 0; // Left click
        createBullet(isMachineGun);
    });
    
    // Touch controls for mobile
    let touchStartX = 0, touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        e.preventDefault();
        touchStartX = e.touches[0].clientX - plane.x;
        touchStartY = e.touches[0].clientY - plane.y;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        e.preventDefault();
        
        const planeWidth = 40, planeHeight = 30;
        const touchX = e.touches[0].clientX - touchStartX;
        const touchY = e.touches[0].clientY - touchStartY;
        
        // Keep within bounds
        plane.x = Math.max(0, Math.min(CANVAS_CONFIG.defaultWidth - planeWidth, touchX));
        plane.y = Math.max(0, Math.min(CANVAS_CONFIG.defaultHeight - planeHeight, touchY));
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        touchStartX = 0;
        touchStartY = 0;
    });
}

/**
 * Initialize visual effects (parallax, glow)
 */
function initVisuals() {
    // Parallax background stars are handled in the render loop
    // Glow effects are applied during rendering
    
    console.log('[VISUALS] Parallax and glow effects initialized');
}

// ============================================================
// === GAME LOOP ==============================================
// ============================================================

let animationFrameId = null;

/**
 * Main game loop
 */
function startGameLoop() {
    function render() {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_CONFIG.defaultWidth, CANVAS_CONFIG.defaultHeight);
        
        // Draw background stars (parallax effect)
        drawBackground();
        
        // Draw player plane
        drawPlane();
        
        // Update and draw meteors
        updateAndDrawMeteors();
        
        // Update and draw bullets
        updateAndDrawBullets();
        
        // Update and draw particles
        updateAndDrawParticles();
    }
    
    function update() {
        if (!gameState || gameState !== GAME_STATE.RUNNING) return;
        
        // Update meteors
        updateMeteors();
        
        // Check collisions
        checkCollisions();
    }
    
    /**
     * Render background stars with parallax effect
     */
    function drawBackground() {
        backgroundStars.forEach(star => {
            star.x += star.speedX * 2;
            star.y += star.speedY * 2;
            
            if (star.x > CANVAS_CONFIG.defaultWidth + star.size) star.x = -star.size;
            if (star.y > CANVAS_CONFIG.defaultHeight + star.size) star.y = -star.size;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }
    
    /**
     * Draw player plane with glow effect
     */
    function drawPlane() {
        const gradient = ctx.createLinearGradient(plane.x, plane.y, plane.x, plane.y - 30);
        gradient.addColorStop(0, '#4ff');
        gradient.addColorStop(1, '#0aa');
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.fillStyle = gradient;
        ctx.fillRect(plane.x, plane.y, 40, 30);
        ctx.shadowBlur = 0;
    }
    
    /**
     * Update and draw meteors
     */
    function updateMeteors() {
        const canvasHeight = CANVAS_CONFIG.defaultHeight;
        
        for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            
            // Update position
            if (meteor.y < canvasHeight + 50) {
                meteor.y += meteor.speed;
                
                // Pulsing red glow effect
                const pulse = Math.sin(Date.now() / 200) * 10 + 15;
                ctx.shadowBlur = pulse;
                ctx.shadowColor = 'red';
                ctx.fillStyle = `rgba(255, 0, 0, ${0.8 + Math.random() * 0.2})`;
                ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);
                ctx.shadowBlur = 0;
            } else {
                meteors.splice(i, 1);
            }
        }
    }
    
    /**
     * Update and draw bullets
     */
    function updateAndDrawBullets() {
        const canvasHeight = CANVAS_CONFIG.defaultHeight;
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Update position
            bullet.y -= bullet.speed;
            
            // Neon trail effect
            const trailLength = 5;
            for (let j = 1; j <= trailLength; j++) {
                ctx.fillStyle = `rgba(0, ${bullet.color === 'yellow' ? '255' : '200'}, ${bullet.color === 'yellow' ? '255' : '255'}, ${(j / trailLength) * 0.3})`;
                ctx.fillRect(bullet.x - j, bullet.y - j, bullet.width + j*2, bullet.height + j*2);
            }
            
            // Main bullet with glow
            const gradient = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y - 30);
            gradient.addColorStop(0, bullet.color);
            gradient.addColorStop(1, '#0aa');
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = bullet.color;
            ctx.fillStyle = gradient;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            ctx.shadowBlur = 0;
            
            // Remove if off-screen
            if (bullet.y <= 0) {
                bullets.splice(i, 1);
            }
        }
    }
    
    /**
     * Update and draw particles
     */
    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // Update position
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            
            particle.velocity.x *= 0.985;
            particle.velocity.y *= 0.985;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.size / 2})`;
            ctx.fill();
            
            // Remove if too small
            if (particle.size <= 0.1) {
                particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Check collisions between bullets and meteors
     */
    function checkCollisions() {
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const bullet = bullets[bIndex];
            
            for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                const meteor = meteors[mIndex];
                
                if (bullet.x < meteor.x + meteor.width &&
                    bullet.x + bullet.width > meteor.x &&
                    bullet.y < meteor.y + meteor.height &&
                    bullet.y + bullet.height > meteor.y) {
                    
                    // Create explosion particles
                    for (let p = 0; p < 10; p++) {
                        createParticle(meteor.x, meteor.y);
                    }
                    
                    meteors.splice(mIndex, 1);
                    bullets.splice(bIndex, 1);
                    break;
                }
            }
        }
    }
    
    /**
     * Create explosion particles
     */
    function createParticle(x, y) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 3 + 1,
                velocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10
                }
            });
        }
    }
    
    /**
     * Reset plane to starting position
     */
    function resetPlane() {
        const canvasWidth = CANVAS_CONFIG.defaultWidth;
        const canvasHeight = CANVAS_CONFIG.defaultHeight;
        
        plane.x = canvasWidth / 2 - 20;
        plane.y = canvasHeight * 0.7;
    }
    
    // Main loop with delta time calculation
    let lastTime = performance.now();
    
    function gameLoop(currentTime) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        update();
        render();
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // Start the loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================
// === ENTRY POINT ===========================================
// ============================================================

/**
 * Initialize and start the game
 */
function main() {
    console.log('=== Game Starting ===');
    console.log('[INIT] Loading modules...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllModules);
    } else {
        initAllModules();
    }
}

// Start the game when this module is loaded
main();
