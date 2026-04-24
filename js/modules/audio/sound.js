/**
 * @description Audio system (sound effects + BGM).
 */

import { AUDIO_DEFAULTS } from '../core/constants.js';

// Sound effect definitions
const SFX = {
    SHOOT: 'shoot',
    EXPLODE: 'explode',
    HIT: 'hit'
};

// Initialize audio system
export function initAudio() {
    // Create AudioContext (browser requirement)
    if (!window.AudioContext && !window.webkitAudioContext) {
        window.AudioContext = window.webkitAudioContext;
    }
    
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
}

// Play a sound effect using synthesized audio
export function playSound(type, volume = 1.0) {
    if (!this.ctx || !isRunning()) return;
    
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = volume * AUDIO_DEFAULTS.sfxVolume;
    
    switch (type) {
        case SFX.SHOOT:
            // Quick "pew" sound
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            
            osc1.frequency.setValueAtTime(800, t);
            osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
            osc2.frequency.setValueAtTime(600, t);
            osc2.frequency.exponentialRampToValueAtTime(900, t + 0.1);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + 0.1);
            osc2.stop(t + 0.1);
            break;
        
        case SFX.EXPLODE:
            // Low "boom" sound
            const boomOsc = this.ctx.createOscillator();
            const noiseBuffer = this.ctx.createBuffer(
                1, 
                this.ctx.sampleRate * 2, 
                this.ctx.sampleRate
            );
            const data = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;
            noiseSrc.connect(gain);
            gain.connect(this.ctx.destination);
            
            boomOsc.frequency.setValueAtTime(150, t);
            boomOsc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
            
            noiseSrc.start(t);
            boomOsc.start(t);
            boomOsc.stop(t + 0.3);
            break;
        
        case SFX.HIT:
            // Short "thud" sound
            const hitOsc = this.ctx.createOscillator();
            hitOsc.frequency.setValueAtTime(200, t);
            hitOsc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
            
            hitOsc.connect(gain);
            gain.connect(this.ctx.destination);
            
            hitOsc.start(t);
            hitOsc.stop(t + 0.15);
            break;
    }
}

// Set volume levels
export function setVolumes(bgm = AUDIO_DEFAULTS.bgmVolume, sfx = AUDIO_DEFAULTS.sfxVolume) {
    if (this.ctx) {
        // Apply to all active gains
        this.gains.forEach(g => g.gain.value = sfx);
    }
}

// Get audio context reference
export function getAudioContext() {
    return this.ctx;
}
