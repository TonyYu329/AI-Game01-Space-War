/**
 * @description Canvas initialization and management (Fixed for compatibility)
 */

import { CANVAS_CONFIG } from './constants.js';

// Global canvas reference
let canvas = null;
let ctx = null;

/**
 * Initialize or find existing canvas element
 * Fixed: Now compatible with HTML that already has <canvas id="gameCanvas">
 */
export function initCanvas(width, height) {
    if (width && width !== CANVAS_CONFIG.defaultWidth) {
        CANVAS_CONFIG.defaultWidth = width;
    }
    if (height && height !== CANVAS_CONFIG.defaultHeight) {
        CANVAS_CONFIG.defaultHeight = height;
    }

    // Try to find existing canvas first, then create new one
    const existingCanvas = document.getElementById('gameCanvas');
    
    if (existingCanvas) {
        // Use existing canvas - just configure it
        console.log('[CANVAS] Using existing canvas element');
        existingCanvas.width = CANVAS_CONFIG.defaultWidth;
        existingCanvas.height = CANVAS_CONFIG.defaultHeight;
        existingCanvas.style.backgroundColor = CANVAS_CONFIG.backgroundColor;
        
        ctx = existingCanvas.getContext('2d', { alpha: false });
    } else {
        // Create new canvas if none exists
        console.log('[CANVAS] Creating new canvas element');
        canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';  // Give it an ID for future reference
        canvas.width = CANVAS_CONFIG.defaultWidth;
        canvas.height = CANVAS_CONFIG.defaultHeight;
        canvas.style.backgroundColor = CANVAS_CONFIG.backgroundColor;
        
        ctx = canvas.getContext('2d', { alpha: false });
        
        // Set canvas as fullscreen overlay
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none'; // Let clicks pass through
        
        document.body.appendChild(canvas);
    }
    
    return { width: CANVAS_CONFIG.defaultWidth, height: CANVAS_CONFIG.defaultHeight };
}

// Get canvas dimensions
export function getCanvasSize() {
    if (canvas) {
        return { 
            width: CANVAS_CONFIG.defaultWidth, 
            height: CANVAS_CONFIG.defaultHeight 
        };
    }
    return null;
}

// Resize canvas
export function resizeCanvas(width, height) {
    CANVAS_CONFIG.defaultWidth = width || CANVAS_CONFIG.defaultWidth;
    CANVAS_CONFIG.defaultHeight = height || CANVAS_CONFIG.defaultHeight;
    
    if (canvas) {
        canvas.width = CANVAS_CONFIG.defaultWidth;
        canvas.height = CANVAS_CONFIG.defaultHeight;
    }
}

// Get context reference
export function getContext() {
    return ctx;
}
