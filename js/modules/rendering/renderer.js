/**
 * @description Unified renderer with visual effects.
 */

import { CANVAS_CONFIG } from '../core/constants.js';
import { isRunning } from '../core/state.js';
import { getPlaneBounds, PLANE_DEFAULTS } from '../entities/plane.js';
import { hasActiveMeteors, METEOR_DEFAULTS } from '../entities/meteor.js';
import { hasActiveBullets, BULLET_DEFAULTS } from '../entities/bullet.js';
import { hasActiveParticles, PARTICLE_DEFAULTS } from '../entities/particle.js';
import { updateBackgroundStars, backgroundStars } from '../entities/background.js';

// Render all game entities
export function renderEntities() {
    if (!isRunning()) return;
    
    const ctx = getContext();
    
    // Draw background stars
    drawBackgroundStars(ctx);
    
    // Draw meteors
    drawMeteors(ctx);
    
    // Draw bullets
    drawBullets(ctx);
    
    // Draw particles
    drawParticles(ctx);
    
    // Draw player plane
    drawPlane(ctx);
}

// Draw background stars
function drawBackgroundStars(ctx) {
    if (!hasActiveBackground()) return;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < backgroundStars.length; i++) {
        const star = backgroundStars[i];
        if (star.x < CANVAS_CONFIG.defaultWidth && star.y < CANVAS_CONFIG.defaultHeight) {
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
    }
}

// Draw meteors
function drawMeteors(ctx) {
    if (!hasActiveMeteors()) return;
    
    ctx.fillStyle = 'orange';
    for (let i = 0; i < meteors.length; i++) {
        const meteor = meteors[i];
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'orange';
        ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);
        ctx.shadowBlur = 0;
    }
}

// Draw bullets
function drawBullets(ctx) {
    if (!hasActiveBullets()) return;
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        
        ctx.fillStyle = bullet.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    }
}

// Draw particles
function drawParticles(ctx) {
    if (!hasActiveParticles()) return;
    
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        ctx.fillStyle = `rgba(255, 100, 100, ${particle.size / PARTICLE_DEFAULTS.maxSize})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'red';
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.shadowBlur = 0;
    }
}

// Draw player plane
function drawPlane(ctx) {
    const bounds = getPlaneBounds();
    
    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = PLANE_DEFAULTS.glowColor;
    ctx.fillStyle = PLANE_DEFAULTS.color;
    ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    ctx.shadowBlur = 0;
}

// Get canvas context reference
export function getContext() {
    return window.gameCanvas ? window.gameCanvas.getContext('2d') : null;
}
