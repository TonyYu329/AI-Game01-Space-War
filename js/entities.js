/**
 * @description Simplified Entity Defaults & Utilities
 * @date 2026-04-24
 */

// ============================================================
// === ENTITY DEFAULTS & GLOBAL STATE =========================
// ============================================================

export const gameState = {
    status: 'loading', // 'running', 'gameover'
    score: 0,
    shakeIntensity: 0,
    isPaused: false
};

export const planeDefaults = {
    width: 50,
    height: 30,
    speed: 5,
    maxHealth: 100,
    health: 100,
    color: '#4ff',
    glowColor: '#0aa'
};

export const meteorDefaults = {
    width: 60 + Math.random() * 20,
    height: 60 + Math.random() * 20,
    speed: 1 + Math.random(),
    color: 'red',
    pulseSpeed: 5
};

export const bulletDefaults = {
    width: 8,
    height: 30,
    speed: 15,
    colors: ['#ff0', '#ff6'], // Yellow and orange
    trailLength: 5
};

// ============================================================
// === SHARED UTILITIES =====================================
// ============================================================

/**
 * Check if two rectangles intersect
 */
export function checkRectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

/**
 * Create a random color in neon palette
 */
export function getRandomNeonColor() {
    const colors = ['#f0f', '#ff0', '#0ff', '#fff'];
    return colors[Math.floor(Math.random() * colors.length)];
}
