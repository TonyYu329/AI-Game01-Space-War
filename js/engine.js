/**
 * @description Core game loop and physics engine.
 */
import { 
    gameState, 
    plane, 
    meteors, 
    bullets, 
    particles, 
    backgroundStars 
} from './entities.js';

// We need a local constant for GAME_STATE if it's not in entities.js
const GAME_STATE = {
    RUNNING: 'running',
    GAMEOVER: 'gameover'
};

import { playShootSound, playExplosionSound } from './audio.js';

export function initBackgroundStars(canvas) {
    const STAR_COUNT = 150;
    backgroundStars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        backgroundStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: Math.sin(i * 0.1) * 0.0005 + 0.0001,
            speedY: Math.cos(i * 0.1) * 0.0005 + 0.0001
        });
    }
}

export function createMeteor(canvas) {
    if (gameState !== GAME_STATE.RUNNING) return;
    
    const size = Math.random() * 30 + 30; // Random base size
    const points = [];
    const numPoints = 8 + Math.floor(Math.random() * 5); // 8-12 vertices
    const centerX = Math.random() * (canvas.width - size) + size/2;
    const centerY = -size;

    // Generate irregular polygon vertices once at creation
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = (size / 2) * (0.7 + Math.random() * 0.6); // Randomize radius for jagged look
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }

    meteors.push({
        x: centerX,
        y: centerY,
        width: size,
        height: size,
        speed: Math.random() * 3 + 2,
        vertices: points, // Store pre-calculated vertices
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

export function createParticles(x, y, type = 'explosion') {
    const particleCount = type === 'explosion' ? 30 : 10;
    
    for (let i = 0; i < particleCount; i++) {
        // Create different layers of particles for a "shocking" effect
        // Layer 1: Core (Bright, fast)
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 2,
            color: '#fff',
            type: 'core',
            velocity: {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10
            }
        });

        // Layer 2: Flame/Fire (Orange/Red, medium speed)
        if (i < particleCount * 0.6) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 5 + 3,
                color: Math.random() > 0.5 ? '#ff4500' : '#ff8c00',
                type: 'flame',
                velocity: {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6
                }
            });
        }

        // Layer 3: Smoke (Dark/Grey, slow expansion)
        if (i < particleCount * 0.3) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 8 + 4,
                color: '#555',
                type: 'smoke',
                velocity: {
                    x: (Math.random() - 0.5) * 3,
                    y: (Math.random() - 0.5) * 3
                }
            });
        }
    }
}

export function shootBullet(isMachineGun) {
    if (gameState !== GAME_STATE.RUNNING) return;

    const type = isMachineGun ? 'machinegun' : 'cannon';
    const bulletSize = isMachineGun ? 5 : 15;
    const color = isMachineGun ? 'yellow' : 'aqua';

    bullets.push({
        x: plane.x + plane.width / 2 - bulletSize / 2,
        y: plane.y - 10,
        width: bulletSize,
        height: bulletSize,
        color: color,
        speed: isMachineGun ? 20 : 15
    });

    // Trigger differentiated sound based on weapon type
    playShootSound(type);
}

export function checkCollisions() {
    if (gameState !== GAME_STATE.RUNNING) return;

    // Bullet vs Meteor
    for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
        const bullet = bullets[bIndex];
        for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
            const meteor = meteors[mIndex];

            if (bullet.x < meteor.x + meteor.width &&
                bullet.x + bullet.width > meteor.x &&
                bullet.y < meteor.y + meteor.height &&
                bullet.y + bullet.height > meteor.y) {
                    createParticles(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2);
                    playExplosionSound();
                    // Trigger screen shake
                    gameState.shakeIntensity += 15;
                    meteors.splice(mIndex, 1);
                    bullets.splice(bIndex, 1);
                    break;
                }
            }
        }
    }

    // Plane vs Meteor
    for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
        const meteor = meteors[mIndex];
        if (Math.abs(plane.x - meteor.x) < (plane.width / 2 + meteor.width / 2) &&
            Math.abs(plane.y - meteor.y) < (plane.height / 2 + meteor.height / 2)) {
            createParticles(plane.x, plane.y, 'explosion');
            playExplosionSound();
            // Trigger heavy screen shake for player death
            gameState.shakeIntensity += 30;
            meteors.splice(mIndex, 1);
            return true; // Signal collision for game over
        }
    }
    return false;
}
