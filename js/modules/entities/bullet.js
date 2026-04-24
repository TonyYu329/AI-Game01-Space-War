/**
 * @description Bullet projectile entity definition.
 */

import { CANVAS_CONFIG } from '../core/constants.js';

// Default bullet properties
export const BULLET_DEFAULTS = {
    machineGunSize: 5,
    normalSize: 15,
    machineGunSpeed: 20,
    normalSpeed: 15
};

// Bullet array (populated by physics engine)
let bullets = [];

// Create a new bullet
export function createBullet(isMachineGun) {
    if (!isRunning()) return;
    
    const x = plane.x + plane.width / 2 - BULLET_DEFAULTS.normalSize / 2;
    const y = plane.y - 10;
    const size = isMachineGun ? BULLET_DEFAULTS.machineGunSize : BULLET_DEFAULTS.normalSize;
    const speed = isMachineGun ? BULLET_DEFAULTS.machineGunSpeed : BULLET_DEFAULTS.normalSpeed;
    
    bullets.push({
        x: x,
        y: y,
        width: size,
        height: size,
        color: isMachineGun ? 'yellow' : 'aqua',
        speed: speed
    });
}

// Update all bullets (called by physics engine)
export function updateBullets() {
    if (!isRunning()) return;
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
    }
}

// Check if any bullets are still on screen
export function hasActiveBullets() {
    return bullets.some(b => b.y > 0);
}

// Get bullet count
export function getBulletCount() {
    return bullets.length;
}
