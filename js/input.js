/**
 * @description Simplified Input Handling: Mouse, Keyboard, Resize Events
 * @date 2026-04-24
 */

// ============================================================
// === CONFIGURATION ========================================
// ============================================================

export const INPUT_CONFIG = {
    mouseSensitivity: 1.0,
    keyboardSpeed: 500,
    autoCenterOnResize: true
};

// ============================================================
// === MOUSE HANDLING =======================================
// ============================================================

/**
 * Handle mouse move - update plane position
 */
export function handleMouseMove(event) {
    if (!plane || !canvas) return;
    
    // Calculate centered position relative to canvas
    const rect = canvas.getBoundingClientRect();
    plane.x = event.clientX - rect.left - plane.width / 2;
    plane.y = event.clientY - rect.top - plane.height / 2;
}

/**
 * Handle mouse down - shooting and context menu prevention
 */
export function handleMouseDown(event) {
    if (!plane || !canvas) return;
    
    // Prevent default context menu on right-click
    if (event.button === 2) {
        event.preventDefault();
    }
    
    const isMachineGun = event.button === 0; // Left click
    
    // Only shoot when game is running
    if (gameState === GAME_STATE.RUNNING) {
        shootBullet(isMachineGun);
    }
}

/**
 * Handle mouse up - release machine gun mode
 */
export function handleMouseUp() {
    if (!plane) return;
    
    // Release machine gun mode after short delay
    setTimeout(() => {
        plane.isFiring = false;
    }, 200);
}

/**
 * Handle mouse wheel - zoom effect (optional feature)
 */
export function handleMouseWheel(event) {
    if (!plane || !canvas) return;
    
    // Optional: Zoom in/out with scroll wheel
    const delta = event.deltaY > 0 ? -1 : 1;
    plane.zoom = Math.max(0.5, Math.min(plane.zoom + delta * 0.1, 2.0));
}

// ============================================================
// === KEYBOARD HANDLING ====================================
// ============================================================

/**
 * Handle keyboard input
 */
export function handleKeyDown(event) {
    if (!plane || !canvas) return;
    
    // W key - shoot or reset position
    if (event.key.toLowerCase() === 'w') {
        event.preventDefault();
        
        if (gameState === GAME_STATE.RUNNING) {
            shootBullet(true); // Machine gun burst
        } else if (gameState === GAME_STATE.IDLE || 
                   gameState === GAME_STATE.GAME_OVER) {
            resetPlanePosition();
        }
    }
    
    // R key - reset plane position
    if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetPlanePosition();
    }
}

/**
 * Handle keyboard repeat events
 */
export function handleKeyUp(event) {
    if (!plane || !canvas) return;
    
    // W key - release machine gun mode
    if (event.key.toLowerCase() === 'w') {
        event.preventDefault();
        
        setTimeout(() => {
            plane.isFiring = false;
        }, 200);
    }
}

// ============================================================
// === RESIZE HANDLING ======================================
// ============================================================

/**
 * Handle canvas resize - center plane on resize
 */
export function handleResize() {
    if (!plane || !canvas) return;
    
    // Auto-center plane when resized (optional)
    if (INPUT_CONFIG.autoCenterOnResize) {
        const rect = canvas.getBoundingClientRect();
        plane.x = rect.width / 2 - plane.width / 2;
        plane.y = rect.height * 0.7 - plane.height / 2;
    }
}

/**
 * Handle window resize event
 */
export function handleWindowResize(event) {
    if (!canvas) return;
    
    // Update canvas dimensions (if not already done by engine)
    const newWidth = Math.min(window.innerWidth, 1920);
    const newHeight = Math.min(window.innerHeight, 1080);
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Trigger resize handler for game logic
        handleResize();
    }
}

// ============================================================
// === UTILITY FUNCTIONS ====================================
// ============================================================

/**
 * Reset plane to center position
 */
export function resetPlanePosition() {
    if (!plane || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    plane.x = rect.width / 2 - plane.width / 2;
    plane.y = rect.height * 0.7 - plane.height / 2;
}

/**
 * Check if mouse is over canvas
 */
export function isMouseOverCanvas() {
    const rect = canvas.getBoundingClientRect();
    return (
        event.clientX >= rect.left &&
        event.clientY >= rect.top &&
        event.clientX <= rect.right &&
        event.clientY <= rect.height
    );
}
