/**
 * @description Core game loop and physics engine.
 */
import { 
    GAME_STATE, 
    gameState, 
    animationFrameId, 
    meteorInterval, 
    plane, 
    meteors, 
    bullets, 
    particles, 
    backgroundStars 
} from './entities.js';

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
    meteors.push({
        x: Math.random() * (canvas.width - 50),
        y: -50,
        width: 50,
        height: 50,
        speed: Math.random() * 3 + 2
    });
}

export function createParticles(x, y) {
    particles.push({
        x: x,
        y: y,
        size: 2,
        velocity: {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
        }
    });
}

export function shootBullet(isMachineGun) {
    if (gameState !== GAME_STATE.RUNNING) return;

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
            createParticles(plane.x, plane.y);
            meteors.splice(mIndex, 1);
            return true; // Signal collision for game over
        }
    }
    return false;
}
