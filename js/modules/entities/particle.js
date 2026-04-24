/**
 * @description Particle effect entity definition.
 */

import { CANVAS_CONFIG } from '../core/constants.js';

// Default particle properties
export const PARTICLE_DEFAULTS = {
    maxSize: 3,
    minSize: 0.5,
    decayRate: 0.04
};

// Particle array (populated by physics engine)
let particles = [];

// Create a new particle at position
export function createParticle(x, y) {
    if (!isRunning()) return;
    
    const velocityX = (Math.random() - 0.5) * 8;
    const velocityY = (Math.random() - 0.5) * 8;
    
    particles.push({
        x: x,
        y: y,
        size: Math.random() * (PARTICLE_DEFAULTS.maxSize - PARTICLE_DEFAULTS.minSize) + PARTICLE_DEFAULTS.minSize,
        velocity: {
            x: velocityX,
            y: velocityY
        }
    });
}

// Update all particles (called by physics engine)
export function updateParticles() {
    if (!isRunning()) return;
    
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Apply velocity and friction
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        
        particle.velocity.x *= 0.985;
        particle.velocity.y *= 0.985;
    }
}

// Check if any particles are still active
export function hasActiveParticles() {
    return particles.some(p => p.size > PARTICLE_DEFAULTS.minSize);
}

// Get particle count
export function getParticleCount() {
    return particles.length;
}
