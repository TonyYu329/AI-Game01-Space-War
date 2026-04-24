/**
 * @description Core physics engine and collision detection.
 */

import { CANVAS_CONFIG, PHYSICS_CONFIG } from '../core/constants.js';
import { createParticle } from '../entities/particle.js';
import { updateMeteors } from '../entities/meteor.js';
import { updateBullets } from '../entities/bullet.js';
import { isRunning } from '../core/state.js';

// Check all collisions and return true if game over
export function checkCollisions() {
    if (!isRunning()) return false;
    
    // Bullet vs Meteor collision
    for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
        const bullet = bullets[bIndex];
        
        for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
            const meteor = meteors[mIndex];
            
            if (bullet.x < meteor.x + meteor.width &&
                bullet.x + bullet.width > meteor.x &&
                bullet.y < meteor.y + meteor.height &&
                bullet.y + bullet.height > meteor.y) {
                
                createParticle(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2);
                meteors.splice(mIndex, 1);
                bullets.splice(bIndex, 1);
                break;
            }
        }
    }
    
    // Plane vs Meteor collision
    for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
        const meteor = meteors[mIndex];
        
        if (Math.abs(plane.x - meteor.x) < (plane.width / 2 + meteor.width / 2) &&
            Math.abs(plane.y - meteor.y) < (plane.height / 2 + meteor.height / 2)) {
            
            createParticle(plane.x, plane.y);
            meteors.splice(mIndex, 1);
            return true; // Signal collision for game over
        }
    }
    
    return false;
}

// Update all physics (called by game loop)
export function updatePhysics() {
    if (!isRunning()) return;
    
    updateMeteors();
    updateBullets();
}
