/**
 * @description Audio System - Enhanced Sound Effects Module with Multi-Layer Sounds
 * @date 2026-04-25
 */

// We need a persistent reference that is accessible to all modules
let activeAudioCtx = null;

/**
 * Initialize audio system
 */
export function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    try {
        activeAudioCtx = new AudioContext();
        AUDIO_CONFIG.masterGainNode = activeAudioCtx;
        
        // Global listener to ensure context is resumed on any user interaction
        const resumeContext = () => {
            if (activeAudioCtx && activeAudioCtx.state === 'suspended') {
                activeAudioCtx.resume().then(() => {
                    console.log("AudioContext resumed successfully");
                });
            }
        };

        window.addEventListener('click', resumeContext, { once: false });
        window.addEventListener('keydown', resumeContext, { once: false });
        window.addEventListener('touchstart', resumeContext, { once: false });
        
    } catch (e) {
        console.error("Failed to initialize AudioContext:", e);
    }
}

// Helper to get the active context safely
export function getAudioContext() {
    return AUDIO_CONFIG.masterGainNode || activeAudioCtx;
}

// ============================================================
// === SOUND EFFECT FUNCTIONS =================================
// ============================================================

/**
 * Play shoot sound effect with type differentiation and multi-layer sounds
 * @param {string} type - 'machinegun' or 'cannon'
 */
export function playShootSound(type = 'machinegun') {
    if (!AUDIO_CONFIG.enabled || !AUDIO_CONFIG.masterGainNode) return;
    
    const ctx = AUDIO_CONFIG.masterGainNode;
    const now = ctx.currentTime;
    
    // Layer 1: Primary projectile sound (the "whoosh" of the bullet leaving)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    if (type === 'machinegun') {
        // Machine gun: high-pitched, quick burst
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2000, now);
        osc1.frequency.exponentialRampToValueAtTime(3500, now + 0.05);
    } else {
        // Cannon: deeper, heavier sound
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    }
    gain1.gain.setValueAtTime(type === 'machinegun' ? 0.05 : 0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + (type === 'machinegun' ? 0.08 : 0.2));
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(now + (type === 'machinegun' ? 0.1 : 0.3));

    // Layer 2: Secondary "thump" or "crack" sound (impact of leaving the barrel)
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Create a short burst of noise with some filtering
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'machinegun' ? 4000 : 2000, now);
    
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(type === 'machinegun' ? 0.1 : 0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + (type === 'machinegun' ? 0.1 : 0.25));
    
    noise.connect(filter);
    filter.connect(gain2);
    gain2.connect(ctx.destination);
    noise.start();
    noise.stop(now + (type === 'machinegun' ? 0.15 : 0.35));

    // Layer 3: Very low frequency "rumble" for cannon only
    if (type !== 'machinegun') {
        const rumbleOsc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumbleOsc.type = 'sine';
        rumbleOsc.frequency.setValueAtTime(60, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        
        rumbleGain.gain.setValueAtTime(0.2, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        rumbleOsc.start();
        rumbleOsc.stop(now + 0.3);
    }
}

/**
 * Play enhanced explosion sound effect with multiple layers for maximum impact
 */
export function playExplosionSound() {
    if (!AUDIO_CONFIG.enabled || !AUDIO_CONFIG.masterGainNode) return;
    const ctx = AUDIO_CONFIG.masterGainNode;
    const now = ctx.currentTime;

    // Layer 1: Sub-bass "Thump" - felt more than heard, creates physical impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.6);
    
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();
    subOsc.stop(now + 0.8);

    // Layer 2: Low-mid "Boom" - the main explosive sound
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(150, now);
    boomOsc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    
    boomGain.gain.setValueAtTime(0.8, now);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start();
    boomOsc.stop(now + 0.6);

    // Layer 3: Mid-range "Crackle" - debris and fragments flying apart
    const bufferSize = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Create a more complex noise burst with multiple frequency components
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
    }
    const crackleNoise = ctx.createBufferSource();
    crackleNoise.buffer = buffer;
    
    // Multi-band filtering for more realistic sound
    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(3000, now);
    lowPass.Q.value = 2;

    const midPass = ctx.createBiquadFilter();
    midPass.type = 'bandpass';
    midPass.frequency.setValueAtTime(1500, now);
    midPass.Q.value = 1.5;

    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(800, now);
    
    crackleNoise.connect(lowPass);
    lowPass.connect(midPass);
    midPass.connect(highPass);
    
    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.4, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    
    highPass.connect(crackleGain);
    crackleGain.connect(ctx.destination);
    crackleNoise.start();
    crackleNoise.stop(now + 0.8);

    // Layer 4: High-frequency "Spark" - tiny fragments and electrical discharge
    const sparkOsc = ctx.createOscillator();
    const sparkGain = ctx.createGain();
    sparkOsc.type = 'square';
    sparkOsc.frequency.setValueAtTime(2500, now);
    sparkOsc.frequency.exponentialRampToValueAtTime(8000, now + 0.15);
    
    sparkGain.gain.setValueAtTime(0.15, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    sparkOsc.connect(sparkGain);
    sparkGain.connect(ctx.destination);
    sparkOsc.start();
    sparkOsc.stop(now + 0.3);

    // Layer 5: Very low frequency "Ground Shaker" - felt in chest
    const groundOsc = ctx.createOscillator();
    const groundGain = ctx.createGain();
    groundOsc.type = 'triangle';
    groundOsc.frequency.setValueAtTime(20, now);
    groundOsc.frequency.exponentialRampToValueAtTime(15, now + 0.8);
    
    groundGain.gain.setValueAtTime(0.6, now);
    groundGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    
    groundOsc.connect(groundGain);
    groundGain.connect(ctx.destination);
    groundOsc.start();
    groundOsc.stop(now + 1.0);

    // Layer 6: Extended tail - lingering sound as debris settles
    const tailNoise = ctx.createBufferSource();
    const tailBufferSize = ctx.sampleRate * 1.5;
    const tailBuffer = ctx.createBuffer(1, tailBufferSize, ctx.sampleRate);
    const tailData = tailBuffer.getChannelData(0);
    
    // Create a decaying noise burst for the tail
    for (let i = 0; i < tailBufferSize; i++) {
        const decay = Math.exp(-i / (ctx.sampleRate * 1.2));
        tailData[i] = (Math.random() * 2 - 1) * decay;
    }
    
    tailNoise.buffer = tailBuffer;
    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'lowpass';
    tailFilter.frequency.setValueAtTime(800, now);
    tailFilter.Q.value = 0.5;
    
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.1, now + 0.4); // Start after main explosion
    tailGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    
    tailNoise.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(ctx.destination);
    tailNoise.start(now + 0.3); // Start slightly after main explosion for natural feel
    tailNoise.stop(now + 3.0);
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
