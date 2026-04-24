/**
 * @description Simplified State Management
 * @date 2026-04-24
 */

// ============================================================
// === GAME STATES ==========================================
// ============================================================

export const GAME_STATE = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

// ============================================================
// === GLOBAL STATE =========================================
// ============================================================

let gameState = GAME_STATE.IDLE;

/**
 * Get current game state
 */
export function getCurrentState() {
    return gameState;
}

/**
 * Check if game is running
 */
export function isRunning() {
    return gameState === GAME_STATE.RUNNING;
}

/**
 * Set game state and notify listeners
 */
export function setState(newState) {
    const oldState = gameState;
    gameState = newState;
    
    console.log(`[STATE] ${oldState} -> ${newState}`);
    
    // Notify any registered callbacks
    if (typeof window !== 'undefined' && window.onStateChanged) {
        window.onStateChanged(oldState, newState);
    }
}

/**
 * Transition to a new state with optional callback
 */
export function transitionTo(newState, callback = null) {
    const oldState = gameState;
    
    if (oldState === newState) return false;
    
    gameState = newState;
    
    console.log(`[TRANSITION] ${oldState} -> ${newState}`);
    
    // Execute callback if provided
    if (callback) {
        try {
            callback(oldState, newState);
        } catch (e) {
            console.error('[STATE] Callback error:', e);
        }
    }
    
    return true;
}

// ============================================================
// === LIFECYCLE HOOKS =====================================
// ============================================================

export const LIFECYCLE = {
    INIT: 'init',
    START: 'start',
    UPDATE: 'update',
    RENDER: 'render',
    SHUTDOWN: 'shutdown'
};

/**
 * Register lifecycle hook callback
 */
let lifecycleHooks = {};

export function registerLifecycleHook(stage, callback) {
    if (!lifecycleHooks[stage]) {
        lifecycleHooks[stage] = [];
    }
    lifecycleHooks[stage].push(callback);
}

/**
 * Execute all registered hooks for a stage
 */
export function executeLifecycleHooks(stage) {
    const callbacks = lifecycleHooks[stage] || [];
    
    if (callbacks.length > 0) {
        console.log(`[LIFECYCLE] Running ${stage} hooks...`);
        callbacks.forEach(cb => cb());
    }
}

// ============================================================
// === STATE MANAGER ========================================
// ============================================================

export class StateManager {
    constructor() {
        this.currentState = GAME_STATE.IDLE;
        this.transitionListeners = new Map();
    }

    /**
     * Check if transition is valid
     */
    canTransition(from, to) {
        const key = `${from}_TO_${to}`;
        return TRANSITIONS[key] ? TRANSITIONS[key](this.currentState) : false;
    }

    /**
     * Execute state transition
     */
    transition(from, to, callback) {
        if (this.canTransition(from, to)) {
            this.currentState = to;
            console.log(`[Manager] State changed: ${from} -> ${to}`);
            
            // Call any registered callbacks
            const listeners = this.transitionListeners.get(key) || [];
            listeners.forEach(fn => fn());
            
            return true;
        }
        return false;
    }

    /**
     * Register transition callback
     */
    onTransition(from, to, callback) {
        if (!this.transitionListeners.has(from)) {
            this.transitionListeners.set(from, new Map());
        }
        const toMap = this.transitionListeners.get(from);
        if (!toMap.has(to)) {
            toMap.set(to, []);
        }
        toMap.get(to).push(callback);
    }

    /**
     * Get current state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if game is running
     */
    isActive() {
        return this.currentState === GAME_STATE.RUNNING;
    }
}

// Export singleton instance
export const stateManager = new StateManager();

// ============================================================
// === TRANSITION HELPERS ===================================
// ============================================================

const TRANSITIONS = {
    IDLE_TO_RUNNING: (state) => state === GAME_STATE.IDLE,
    RUNNING_TO_GAME_OVER: (state) => state === GAME_STATE.RUNNING,
    GAME_OVER_TO_IDLE: (state) => state === GAME_STATE.GAME_OVER
};

/**
 * Helper to check active state
 */
export function isRunning() {
    return gameState === GAME_STATE.RUNNING;
}
