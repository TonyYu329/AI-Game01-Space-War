/**
 * @description Main game loop and timing management.
 */

import { CANVAS_CONFIG } from '../core/constants.js';
import { isRunning, stateManager } from '../core/state.js';
import { updatePlanePosition } from '../entities/plane.js';
import { createMeteor } from '../entities/meteor.js';
import { checkCollisions } from './physics.js';

// Game loop variables
let lastTime = 0;
let accumulator = 0;
const FIXED_TIME_STEP = 16.67; // ~60 FPS

// Main game loop
export function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    accumulator += deltaTime;
    
    while (accumulator >= FIXED_TIME_STEP) {
        update();
        accumulator -= FIXED_TIME_STEP;
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
export function update() {
    if (!isRunning()) return;
    
    // Check for collisions
    const gameOver = checkCollisions();
    
    // Create new meteors periodically
    if (Math.random() < 0.02 && !hasActiveMeteors()) {
        createMeteor();
    }
}

// Render game state
export function render() {
    if (!isRunning()) return;
    
    const ctx = getContext();
    
    // Clear canvas
    ctx.fillStyle = CANVAS_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_CONFIG.defaultWidth, CANVAS_CONFIG.defaultHeight);
}

// Get current frame rate
export function getFPS() {
    return Math.round(1000 / FIXED_TIME_STEP);
}
