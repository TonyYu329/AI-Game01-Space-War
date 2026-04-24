/**
 * @description Main game entry point and bootstrap.
 */

import { CANVAS_CONFIG } from './core/constants.js';
import { initCanvas, resizeCanvas, getContext } from './core/canvas.js';
import { initInput, updateKeyboardInput, checkGameOverInput } from './input/controller.js';
import { initAudio, playSound, SFX } from './audio/sound.js';
import { initBackgroundStars, hasActiveBackground } from './entities/background.js';
import { initPlane, PLANE_DEFAULTS } from './entities/plane.js';
import { createMeteor } from './entities/meteor.js';
import { updateMeteors } from './entities/meteor.js';
import { createBullet } from './entities/bullet.js';
import { updateBullets } from './entities/bullet.js';
import { createParticle, hasActiveParticles } from './entities/particle.js';
import { updateParticles } from './entities/particle.js';
import { updateBackgroundStars } from './entities/background.js';
import { updatePhysics } from './system/physics.js';
import { gameLoop, update, render } from './system/loop.js';

// Global game state
let canvas = null;
let ctx = null;
let isRunning = false;

// Initialize the entire game
export function initGame() {
    // Create canvas
    resizeCanvas(CANVAS_CONFIG.defaultWidth, CANVAS_CONFIG.defaultHeight);
    
    // Initialize all subsystems
    initInput();
    initAudio();
    initBackgroundStars();
    initPlane();
}

// Main entry point - starts the game loop
export function startGame() {
    if (isRunning) return;
    
    isRunning = true;
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    
    // Set up fullscreen overlay
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    
    document.body.appendChild(canvas);
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Update all game systems
export function updateGame() {
    if (!isRunning) return;
    
    updateKeyboardInput();
    updateMeteors();
    updateBullets();
    updateParticles();
    updateBackgroundStars();
    updatePhysics();
}

// Render the current frame
export function renderGame() {
    if (!isRunning) return;
    
    // Clear canvas
    ctx.fillStyle = CANVAS_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_CONFIG.defaultWidth, CANVAS_CONFIG.defaultHeight);
    
    // Draw all entities
    updateMeteors();
    updateBullets();
    updateParticles();
    updateBackgroundStars();
    updatePhysics();
}

// Check if game is running
export function isGameRunning() {
    return isRunning;
}
