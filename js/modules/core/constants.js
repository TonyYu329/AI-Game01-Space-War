/**
 * @description Game constants and configuration.
 */

// Game states
export const GAME_STATE = {
    IDLE: 'idle',
    RUNNING: 'running',
    GAME_OVER: 'game_over'
};

// Canvas dimensions (will be overridden by resize)
export const CANVAS_CONFIG = {
    defaultWidth: 800,
    defaultHeight: 600,
    backgroundColor: '#000000'
};

// Performance settings
export const PERFORMANCE_CONFIG = {
    maxMeteors: 20,
    maxBullets: 50,
    maxParticles: 100,
    starCount: 150
};

// Physics constants
export const PHYSICS_CONFIG = {
    gravity: 0.05,
    friction: 0.98,
    collisionMargin: 4
};

// Audio defaults
export const AUDIO_DEFAULTS = {
    bgmVolume: 0.3,
    sfxVolume: 0.5
};

/**
 * @description Utility functions for constants access
 */

/**
 * Get a config value with fallback
 * @param {string} key - The configuration key path (e.g., 'CANVAS_CONFIG.defaultWidth')
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The resolved value
 */
export function getConfigValue(key, defaultValue = undefined) {
    const parts = key.split('.');
    let result;
    
    for (const part of parts) {
        if (result === undefined) {
            // Try to get from the exported constant directly
            try {
                result = window[part] || CANVAS_CONFIG[part];
            } catch (e) {
                result = defaultValue;
            }
        } else {
            result = result[part];
        }
    }
    
    return result ?? defaultValue;
}

/**
 * Check if a config key exists
 * @param {string} key - The configuration key path
 * @returns {boolean} Whether the key exists
 */
export function hasConfigKey(key) {
    const parts = key.split('.');
    let current = window || CANVAS_CONFIG;
    
    for (const part of parts) {
        if (current === undefined || current === null) return false;
        current = current[part];
    }
    
    return true;
}
