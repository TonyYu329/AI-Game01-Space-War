/**
 * @description Audio System - Sound Effects Module
 * @date 2026-04-24
 */

// ============================================================
// === AUDIO CONSTANTS ========================================
// ============================================================

const AUDIO_CONFIG = {
    defaultVolume: 0.5,
    masterGainNode: null,
    enabled: true
};

// ============================================================
// === SOUND EFFECTS =========================================
// ============================================================

/**
 * Sound effect definitions with synthesized sounds
 */
const SOUNDS = {
    shoot: {
        type: 'oscillator',
        freq: 600,
        type: 'square',
        duration: 0.1,
        volume: 0.3
    },
    explosion: {
        type: 'noise',
        duration: 0.5,
        volume: 0.5
    }
};

// ============================================================
// === INITIALIZATION =========================================
// ============================================================

/**
 * Initialize audio system
 */
export function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    AUDIO_CONFIG.masterGainNode = new AudioContext();
    
    // Auto-resume on first interaction
    document.addEventListener('click', () => {
        if (AUDIO_CONFIG.masterGainNode && AUDIO_CONFIG.masterGainNode.state === 'suspended') {
            AUDIO_CONFIG.masterGainNode.resume();
        }
    }, { once: true });
}

// ============================================================
// === SOUND EFFECT FUNCTIONS =================================
// ============================================================

/**
 * Play shoot sound effect
 */
export function playShootSound() {
    if (!AUDIO_CONFIG.enabled || !AUDIO_CONFIG.masterGainNode) return;
    
    const osc = AUDIO_CONFIG.masterGainNode.createOscillator();
    const gain = AUDIO_CONFIG.masterGainNode.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, AUDIO_CONFIG.masterGainNode.currentTime);
    
    gain.gain.setValueAtTime(0.15, AUDIO_CONFIG.masterGainNode.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, AUDIO_CONFIG.masterGainNode.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(AUDIO_CONFIG.masterGainNode.destination);
    
    osc.start();
    osc.stop(AUDIO_CONFIG.masterGainNode.currentTime + 0.1);
}

/**
 * Play explosion sound effect
 */
export function playExplosionSound() {
    if (!AUDIO_CONFIG.enabled || !AUDIO_CONFIG.masterGainNode) return;
    
    const bufferSize = AUDIO_CONFIG.masterGainNode.sampleRate * 0.5;
    const buffer = AUDIO_CONFIG.masterGainNode.createBuffer(1, bufferSize, AUDIO_CONFIG.masterGainNode.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = AUDIO_CONFIG.masterGainNode.createBufferSource();
    noise.buffer = buffer;
    const gain = AUDIO_CONFIG.masterGainNode.createGain();
    
    const filter = AUDIO_CONFIG.masterGainNode.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0.25, AUDIO_CONFIG.masterGainNode.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, AUDIO_CONFIG.masterGainNode.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(AUDIO_CONFIG.masterGainNode.destination);
    
    noise.start();
}

// ============================================================
// === UTILITY FUNCTIONS ======================================
// ============================================================

/**
 * Set master volume (0-1)
 */
export function setVolume(volume) {
    if (!AUDIO_CONFIG.masterGainNode) return;
    
    const gain = AUDIO_CONFIG.masterGainNode.createGain();
    gain.gain.value = volume;
    gain.connect(AUDIO_CONFIG.masterGainNode.destination);
}

/**
 * Toggle audio on/off
 */
export function toggleAudio(enabled) {
    AUDIO_CONFIG.enabled = enabled;
}
