/**
 * @description Player aircraft entity definition.
 */

import { CANVAS_CONFIG } from '../core/constants.js';

// Default plane properties
export const PLANE_DEFAULTS = {
    width: 40,
    height: 30,
    speed: 5,
    maxHealth: 100,
    health: 100,
    color: '#4ff',
    glowColor: '#0aa'
};

// Plane state
let plane = {
    x: CANVAS_CONFIG.defaultWidth / 2 - PLANE_DEFAULTS.width / 2,
    y: CANVAS_CONFIG.defaultHeight * 0.7,
    width: PLANE_DEFAULTS.width,
    height: PLANE_DEFAULTS.height,
    speed: PLANE_DEFAULTS.speed,
    health: PLANE_DEFAULTS.maxHealth,
    maxHealth: PLANE_DEFAULTS.maxHealth,
    color: PLANE_DEFAULTS.color,
    glowColor: PLANE_DEFAULTS.glowColor
};

// Reset plane to defaults
export function resetPlane() {
    plane.x = CANVAS_CONFIG.defaultWidth / 2 - PLANE_DEFAULTS.width / 2;
    plane.y = CANVAS_CONFIG.defaultHeight * 0.7;
    plane.health = PLANE_DEFAULTS.maxHealth;
}

// Update plane position (called by input handler)
export function updatePlanePosition(x, y) {
    plane.x = x;
    plane.y = y;
    
    // Keep within bounds
    const halfWidth = plane.width / 2;
    const halfHeight = plane.height / 2;
    
    if (plane.x < -halfWidth) plane.x = -halfWidth;
    if (plane.x > CANVAS_CONFIG.defaultWidth - halfWidth) {
        plane.x = CANVAS_CONFIG.defaultWidth - halfWidth;
    }
}

// Get plane bounding box for collision detection
export function getPlaneBounds() {
    return {
        left: plane.x - halfWidth,
        right: plane.x + halfWidth,
        top: plane.y - halfHeight,
        bottom: plane.y + halfHeight
    };
}

// Check if plane is alive
export function isPlaneAlive() {
    return plane.health > 0;
}
