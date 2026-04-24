/**
 * @description Meteor/asteroid entity definition.
 */

import { CANVAS_CONFIG } from '../core/constants.js';

// Default meteor properties
export const METEOR_DEFAULTS = {
    width: 50,
    height: 50,
    minSpeed: 2,
    maxSpeed: 5
};

// Meteor array (populated by physics engine)
let meteors = [];

// Create a new meteor
export function createMeteor() {
    if (!isRunning()) return;
    
    const x = Math.random() * (CANVAS_CONFIG.defaultWidth - METEOR_DEFAULTS.width);
    meteors.push({
        x: x,
        y: -METEOR_DEFAULTS.height,
        width: METEOR_DEFAULTS.width,
        height: METEOR_DEFAULTS.height,
        speed: Math.random() * (METEOR_DEFAULTS.maxSpeed - METEOR_DEFAULTS.minSpeed) + METEOR_DEFAULTS.minSpeed
    });
}

// Update all meteors
export function updateMeteors() {
    if (!isRunning()) return;
    
    for (let i = 0; i < meteors.length; i++) {
        const meteor = meteors[i];
        meteor.y += meteor.speed;
    }
}

// Check if any meteors are still on screen
export function hasActiveMeteors() {
    return meteors.some(m => m.y < CANVAS_CONFIG.defaultHeight + 50);
}

// Get meteor count
export function getMeteorCount() {
    return meteors.length;
}
