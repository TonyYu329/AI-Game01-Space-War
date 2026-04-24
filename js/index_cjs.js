/**
 * @description Unified Game Entry Point (CommonJS Compatible)
 * @date 2026-04-24
 * 
 * This file consolidates all game logic into a single bootstrap entry.
 * Uses CommonJS-style requires for better browser compatibility.
 * 
 * Flow: main() → initAllModules() (idle) → user clicks "start" → startGame() (running)
 */

// ============================================================
// === GLOBAL VARIABLES =======================================
// ============================================================

// Game state
let gameState = {
    current: 'idle',  // idle, running, game_over
    score: 0,
    startTime: 0,
    lastTime: 0
};

// Canvas references
let canvas = null;
let ctx = null;

// Game entities
let plane = { x: 0, y: 0, width: 40, height: 30 };
let backgroundStars = [];
let meteors = [];
let bullets = [];
let particles = [];

// Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    BG_COLOR: '#000000',
    MAX_METEORS: 20,
    MAX_BULLETS: 50
};

// ============================================================
// === CORE FUNCTIONS ========================================
// ============================================================

/**
 * Initialize canvas element
 */
function initCanvas() {
    const existing = document.getElementById('gameCanvas');
    
    if (existing) {
        console.log('[CANVAS] Using existing canvas');
        canvas = existing;
        ctx = existing.getContext('2d');
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
        canvas.style.backgroundColor = CONFIG.BG_COLOR;
    } else {
        console.log('[CANVAS] Creating new canvas');
        canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
        canvas.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: ${CONFIG.BG_COLOR};
            pointer-events: auto;
            z-index: 1;
        `;
        ctx = canvas.getContext('2d');
        document.body.appendChild(canvas);
    }
}

/**
 * Initialize background stars for parallax effect
 */
function initBackgroundStars() {
    const STAR_COUNT = 150;
    backgroundStars = [];
    
    for (let i = 0; i < STAR_COUNT; i++) {
        backgroundStars.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
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
    
    function createOscillatorSound(freq, type, duration, vol) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime((vol || 1) * 0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }
    
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
    // Mouse controls - precise coordinate mapping
    canvas.addEventListener('mousemove', (e) => {
        if (gameState.current !== 'running') return;
        
        // Map screen coordinates to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
        const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
        
        // Center the plane on the mouse cursor
        plane.x = (e.clientX - rect.left) * scaleX - plane.width / 2;
        plane.y = (e.clientY - rect.top) * scaleY - plane.height / 2;
        
        // Keep plane within canvas bounds
        plane.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - plane.width, plane.x));
        plane.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - plane.height, plane.y));
    });
    
    // Mouse click - shoot bullets from plane position
    canvas.addEventListener('mousedown', (e) => {
        if (gameState.current !== 'running') return;
        
        // Bullet originates from the center-top of the plane
        const bulletX = plane.x + plane.width / 2;
        const bulletY = plane.y;
        
        if (e.button === 0) {
            // Left click - small bullet
            bullets.push({
                x: bulletX, y: bulletY,
                width: 4, height: 12,
                speed: 18, color: 'yellow', life: 60
            });
        } else if (e.button === 2) {
            // Right click - large cannonball
            bullets.push({
                x: bulletX, y: bulletY,
                width: 12, height: 30,
                speed: 12, color: 'orange', life: 80
            });
        }
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (gameState.current !== 'running') return;
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                for (let i = 0; i < 3; i++) {
                    bullets.push({
                        x: plane.x + 20, y: plane.y - 15,
                        width: 8, height: 24,
                        speed: 15, color: 'yellow', life: 60
                    });
                }
                break;
            case 'KeyR':
                plane.x = CONFIG.CANVAS_WIDTH / 2 - 20;
                plane.y = CONFIG.CANVAS_HEIGHT * 0.7;
                break;
        }
    });
    
    // Block right-click context menu on canvas
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// ============================================================
// === GAME LOOP ==============================================
// ============================================================

let animationFrameId = null;
let meteorSpawnTimer = 0;

/**
 * Start the main game loop (runs always, even in idle)
 */
function startGameLoop() {
    function render() {
        // Always clear canvas
        ctx.fillStyle = CONFIG.BG_COLOR;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Always draw stars (parallax background)
        backgroundStars.forEach(star => {
            star.x += star.speedX * 2;
            star.y += star.speedY * 2;
            if (star.x > CONFIG.CANVAS_WIDTH + star.size) star.x = -star.size;
            if (star.y > CONFIG.CANVAS_HEIGHT + star.size) star.y = -star.size;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        
        // Only draw game entities when running
        if (gameState.current !== 'running') return;
        
        // Draw player plane with glow
        const gradient = ctx.createLinearGradient(plane.x, plane.y, plane.x, plane.y - 30);
        gradient.addColorStop(0, '#4ff');
        gradient.addColorStop(1, '#0aa');
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.fillStyle = gradient;
        ctx.fillRect(plane.x, plane.y, 40, 30);
        ctx.shadowBlur = 0;
        
        // Draw meteors
        for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            const pulse = Math.sin(Date.now() / 200) * 10 + 15;
            ctx.shadowBlur = pulse;
            ctx.shadowColor = 'red';
            ctx.fillStyle = `rgba(255, 0, 0, ${0.8 + Math.random() * 0.2})`;
            ctx.fillRect(meteor.x, meteor.y, meteor.width || 40, meteor.height || 40);
            ctx.shadowBlur = 0;
        }
        
        // Draw bullets with neon trail
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            for (let j = 1; j <= 5; j++) {
                ctx.fillStyle = `rgba(0, 255, 255, ${(j / 5) * 0.3})`;
                ctx.fillRect(bullet.x - j, bullet.y - j, bullet.width + j*2, bullet.height + j*2);
            }
            const bGradient = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y - 30);
            bGradient.addColorStop(0, bullet.color);
            bGradient.addColorStop(1, '#0aa');
            ctx.shadowBlur = 15;
            ctx.shadowColor = bullet.color;
            ctx.fillStyle = bGradient;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            ctx.shadowBlur = 0;
        }
        
        // Draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.size / 2})`;
            ctx.fill();
        }
    }
    
    function update() {
        if (gameState.current !== 'running') return;
        
        // Spawn meteors periodically
        meteorSpawnTimer++;
        if (meteorSpawnTimer >= 60 && meteors.length < CONFIG.MAX_METEORS) {
            meteorSpawnTimer = 0;
            meteors.push({
                x: Math.random() * (CONFIG.CANVAS_WIDTH - 40),
                y: -40, width: 40, height: 40,
                speed: Math.random() * 3 + 2
            });
        }
        
        // Update meteors
        for (let i = meteors.length - 1; i >= 0; i--) {
            const meteor = meteors[i];
            if (meteor.y < CONFIG.CANVAS_HEIGHT + 50) {
                meteor.y += meteor.speed || 3;
            } else {
                meteors.splice(i, 1);
            }
        }
        
        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.y -= bullet.speed;
            if (bullet.y <= 0 || bullet.life <= 0) {
                bullets.splice(i, 1);
                continue;
            }
        }
        
        // Check bullet-meteor collisions
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const bullet = bullets[bIndex];
            for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                const meteor = meteors[mIndex];
                if (bullet.x < meteor.x + (meteor.width || 40) &&
                    bullet.x + bullet.width > meteor.x &&
                    bullet.y < meteor.y + (meteor.height || 40) &&
                    bullet.y + bullet.height > meteor.y) {
                    
                    for (let p = 0; p < 10; p++) {
                        particles.push({
                            x: meteor.x, y: meteor.y,
                            size: Math.random() * 3 + 1,
                            velocity: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }
                        });
                    }
                    meteors.splice(mIndex, 1);
                    bullets.splice(bIndex, 1);
                    gameState.score++;
                    break;
                }
            }
        }
        
        // Check plane-meteor collision
        for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
            const meteor = meteors[mIndex];
            if (plane.x < meteor.x + (meteor.width || 40) &&
                plane.x + plane.width > meteor.x &&
                plane.y < meteor.y + (meteor.height || 40) &&
                plane.y + plane.height > meteor.y) {
                
                // Create explosion particles at collision point
                for (let p = 0; p < 30; p++) {
                    particles.push({
                        x: meteor.x + (meteor.width || 40) / 2,
                        y: meteor.y + (meteor.height || 40) / 2,
                        size: Math.random() * 4 + 1,
                        velocity: {
                            x: (Math.random() - 0.5) * 15,
                            y: (Math.random() - 0.5) * 15
                        }
                    });
                }
                
                // Remove the meteor
                meteors.splice(mIndex, 1);
                
                // End the game
                gameOver();
                return;
            }
        }
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.velocity.x *= 0.985;
            p.velocity.y *= 0.985;
            if (p.size <= 0.1) {
                particles.splice(i, 1);
            }
        }
    }
    
    let lastTime = performance.now();
    
    function gameLoop(currentTime) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        update();
        updateHUD();
        render();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================
// === GAME CONTROL FUNCTIONS (exposed to window) =============
// ============================================================

/**
 * Start the game (called when user clicks "开始游戏")
 */
function startGame() {
    console.log('[GAME] Starting game...');

    // Reset all entities
    resetEntities();

    // Set state to running
    gameState.current = 'running';
    gameState.score = 0;
    gameState.startTime = Date.now();

    // Initialize HUD container and display elements
    const hudContainerId = 'hudContainer';
    let hudContainer = document.getElementById(hudContainerId);
    if (!hudContainer) {
        console.log(`[HUD] Creating ${hudContainerId} container.`);
        hudContainer = document.createElement('div');
        hudContainer.id = hudContainerId;
        // Basic styling for the HUD container itself (needs CSS support in game1.html or merged.css)
        hudContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 30, 60, 0.85);
            border: 2px solid #4ff;
            border-radius: 10px;
            padding: 15px 20px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 16px;
            z-index: 9999;
            box-shadow: 0 0 20px rgba(79, 255, 255, 0.5);
            pointer-events: none;
        `;
        document.body.appendChild(hudContainer);
    }

    // Create/Update Score Display
    let scoreRow = hudContainer.querySelector('.hud-row');
    if (!scoreRow) {
        scoreRow = document.createElement('div');
        scoreRow.className = 'hud-row';
        scoreRow.innerHTML = '<span class="hud-label">SCORE:</span><span class="hud-value" id="liveScore">0</span>';
        hudContainer.appendChild(scoreRow);
    }

    // Create/Update Time Display (Time is handled by a separate update function)
    let timeRow = hudContainer.querySelector('.hud-row:last-child');
    if (!timeRow) {
        timeRow = document.createElement('div');
        timeRow.className = 'hud-row';
        timeRow.innerHTML = '<span class="hud-label">TIME:</span><span class="hud-value" id="liveTime">00:00</span>';
        hudContainer.appendChild(timeRow);
    }

    // Hide start screen
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.style.display = 'none';

    // Hide game over screen
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';

    // Hide cursor during gameplay
    canvas.style.cursor = 'none';

    console.log('[GAME] Game started!');
}

/**
 * Update HUD display (called every frame in update function)
 */
function updateHUD() {
    if (gameState.current !== 'running') return;

    // Update score display
    const liveScore = document.getElementById('liveScore');
    if (liveScore) {
        liveScore.textContent = gameState.score;
    }

    // Update time display
    const liveTime = document.getElementById('liveTime');
    if (liveTime) {
        const elapsed = Date.now() - gameState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 10);
        liveTime.textContent = 
            (minutes < 10 ? '0' : '') + minutes + ':' +
            (seconds < 10 ? '0' : '') + seconds + '.' +
            (milliseconds < 10 ? '0' : '') + milliseconds;
    }
}

/**
 * Game over
 */
function gameOver() {
    console.log('[GAME] Game over!');
    gameState.current = 'game_over';
    
    // Restore cursor
    canvas.style.cursor = 'default';
    
    // Show game over screen
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    }
    
    // Update final score
    const finalScore = document.getElementById('finalScore');
    if (finalScore) {
        finalScore.textContent = gameState.score;
    }

    // Calculate and display total game time
    const totalGameTime = Date.now() - gameState.startTime;
    const minutes = Math.floor(totalGameTime / 60000);
    const seconds = Math.floor((totalGameTime % 60000) / 1000);
    
    // Update the game over screen to show total time
    const totalTimeElement = document.getElementById('totalGameTime');
    if (totalTimeElement) {
        totalTimeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}

/**
 * Reset game (called when user clicks "重新开始")
 */
function resetGame() {
    console.log('[GAME] Resetting game...');
    
    // Reset entities
    resetEntities();
    
    // Reset score
    gameState.score = 0;
    
    // Start again
    startGame();
}

/**
 * Reset all game entities
 */
function resetEntities() {
    meteors = [];
    bullets = [];
    particles = [];
    meteorSpawnTimer = 0;
    
    // Reset plane position
    plane.x = CONFIG.CANVAS_WIDTH / 2 - 20;
    plane.y = CONFIG.CANVAS_HEIGHT * 0.7;
}

// Expose functions to window for HTML button access
window.startGame = startGame;
window.gameOver = gameOver;
window.resetGame = resetGame;

// ============================================================
// === ENTRY POINT ===========================================
// ============================================================

/**
 * Initialize all modules (does NOT start the game - waits for button click)
 */
function initAllModules() {
    console.log('[INIT] Loading modules...');
    
    // 1. Canvas setup
    initCanvas();
    
    // 2. Background stars
    initBackgroundStars();
    
    // 3. Audio system
    initAudio();
    
    // 4. Input handling
    initInput();
    
    // 5. Start game loop (always runs, but only draws stars in idle)
    startGameLoop();
    
    console.log('[INIT] All modules loaded! Game is ready. Click "开始游戏" to play.');
}

/**
 * Main entry point
 */
function main() {
    console.log('=== Space War ===');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllModules);
    } else {
        initAllModules();
    }
}

// Start when script loads
main();
