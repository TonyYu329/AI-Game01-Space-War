/**
 * @description Visual enhancements: Parallax, Glow, Screen Shake.
 */
import { 
    GAME_STATE, 
    gameState, 
    plane, 
    meteors, 
    bullets, 
    particles, 
    backgroundStars,
    canvas,
    ctx
} from './entities.js';

export let shakeIntensity = 0;

export function applyScreenShake() {
    if (shakeIntensity > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.save();
        ctx.translate(dx, dy);
        shakeIntensity *= 0.9; // Decay
        if (shakeIntensity < 0.1) {
            shakeIntensity = 0;
            ctx.restore();
        }
    }
}

export function drawWithGlow(ctx, x, y, w, h, color) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0; // Reset
}

export function drawBackground() {
    backgroundStars.forEach(star => {
        star.x += star.speedX * 2;
        star.y += star.speedY * 2;

        if (star.x > canvas.width + star.size) star.x = -star.size;
        if (star.y > canvas.height + star.size) star.y = -star.size;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

export function drawPlane() {
    // Draw ship with glow effect
    const gradient = ctx.createLinearGradient(plane.x, plane.y, plane.x, plane.y - plane.height);
    gradient.addColorStop(0, '#4ff');
    gradient.addColorStop(1, '#0aa');
    
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#0ff';
    ctx.fillStyle = gradient;
    ctx.fillRect(plane.x, plane.y, plane.width, plane.height);
    ctx.shadowBlur = 0;
}

export function drawMeteors() {
    meteors.forEach((meteor) => {
        if (meteor.y < canvas.height + 50) {
            meteor.y += meteor.speed;
            
            // Pulsing red glow for meteors
            const pulse = Math.sin(Date.now() / 200) * 10 + 15;
            ctx.shadowBlur = pulse;
            ctx.shadowColor = 'red';
            ctx.fillStyle = `rgba(255, 0, 0, ${0.8 + Math.random() * 0.2})`;
            ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);
            ctx.shadowBlur = 0;
        }
    });
}

export function drawBullets() {
    bullets = bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        
        // Neon trail effect
        const trailLength = 5;
        for (let i = 1; i <= trailLength; i++) {
            ctx.fillStyle = `rgba(0, ${bullet.color === 'yellow' ? '255' : '200'}, ${bullet.color === 'yellow' ? '255' : '255'}, ${i / trailLength * 0.3})`;
            ctx.fillRect(bullet.x - i, bullet.y - i, bullet.width + i*2, bullet.height + i*2);
        }
        
        // Main bullet with glow
        drawWithGlow(ctx, bullet.x, bullet.y, bullet.width, bullet.height, bullet.color);
        
        return bullet.y > 0;
    });
}

export function drawParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        particle.velocity.x *= 0.985;
        particle.velocity.y *= 0.985;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.size / 2})`;
        ctx.fill();

        if (particle.size > 0.1) {
            particle.size -= 0.04;
            return true;
        } else {
            return false;
        }
    });
}
