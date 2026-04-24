/**
 * @description Background starfield effect.
 */

import { CANVAS_CONFIG, PERFORMACE_CONFIG } from '../core/constants.js';

// Star array (populated by physics engine)
let backgroundStars = [];

// Initialize the starfield
export function initBackgroundStars() {
    const STAR_COUNT = PERFORMACE_CONFIG.starCount;
    
    // Create stars with random positions and subtle movement
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

// Update all stars (called by physics engine)
export function updateBackgroundStars() {
    if (!isRunning()) return;
    
    for (let i = 0; i < backgroundStars.length; i++) {
        const star = backgroundStars[i];
        
        // Apply subtle movement
        star.x += star.speedX * CANVAS_CONFIG.defaultWidth;
        star.y += star.speedY * CANVAS_CONFIG.defaultHeight;
    }
}

// Check if any stars are still on screen
export function hasActiveBackground() {
    return backgroundStars.some(s => 
        s.x < CANVAS_CONFIG.defaultWidth && 
        s.y < CANVAS_CONFIG.defaultHeight
    );
}
