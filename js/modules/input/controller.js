/**
 * @description Input controller (keyboard + touch).
 */

import { CANVAS_CONFIG } from '../core/constants.js';
import { isRunning, stateManager } from '../core/state.js';
import { updatePlanePosition } from '../entities/plane.js';

// Input state tracking
const keys = {};

// Initialize input listeners
export function initInput() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (!isRunning()) return;
        
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                createBullet(true); // Machine gun mode
                break;
            case 'KeyR':
                resetPlane();
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Touch controls for mobile
    const touchStartX = 0;
    const touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (!isRunning()) return;
        
        e.preventDefault();
        touchStartX = e.touches[0].clientX - plane.x;
        touchStartY = e.touches[0].clientY - plane.y;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isRunning()) return;
        
        e.preventDefault();
        
        const x = e.touches[0].clientX - touchStartX;
        const y = e.touches[0].clientY - touchStartY;
        
        updatePlanePosition(x, y);
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        touchStartX = 0;
        touchStartY = 0;
    });
}

// Update plane position based on keyboard input
export function updateKeyboardInput() {
    if (!isRunning()) return;
    
    let x = plane.x, y = plane.y;
    
    // Keyboard movement (W/ArrowUp)
    if (keys['KeyW'] || keys['ArrowUp']) {
        y -= PLANE_DEFAULTS.speed;
    }
    
    updatePlanePosition(x, y);
}

// Check for game over input
export function checkGameOverInput() {
    // R key to restart
    if (keys['KeyR'] && !isRunning()) {
        stateManager.transition(GAME_STATE.GAME_OVER, GAME_STATE.RUNNING);
    }
}
