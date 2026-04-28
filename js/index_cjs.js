/**
 * Space War - cinematic single-file browser build.
 * Uses Canvas 2D + Web Audio API, no external audio/image dependency.
 */
(function () {
    'use strict';

    const CONFIG = {
        DESIGN_HEIGHT: 600,
        TARGET_DT: 1000 / 60,
        DEATH_EXPLOSION_MS: 2000,
        MAX_METEORS: 18,
        MAX_BULLETS: 70,
        MAX_PARTICLES: 420,
        STAR_COUNT: 230,
        BG_COLOR: '#02040d'
    };

    let canvas = null;
    let ctx = null;
    let animationFrameId = null;
    let gameScale = 1;
    let gameWidth = 800;
    let meteorSpawnTimer = 0;
    let fireCooldown = 0;

    const state = {
        current: 'idle',
        score: 0,
        startTime: 0,
        shake: 0,
        flash: 0,
        lastMouseX: gameWidth / 2,
        lastMouseY: CONFIG.DESIGN_HEIGHT * 0.75,
        time: 0,
        deathStartedAt: 0
    };

    const plane = {
        x: gameWidth / 2 - 28,
        y: CONFIG.DESIGN_HEIGHT * 0.72,
        width: 56,
        height: 44,
        vx: 0,
        vy: 0,
        tilt: 0,
        propellerAngle: 0,
        flamePhase: 0
    };

    let backgroundStars = [];
    let meteors = [];
    let bullets = [];
    let particles = [];
    let shockwaves = [];
    let heatHazes = [];
    let muzzleFlashes = [];

    const AUDIO = {
        ctx: null,
        master: null,
        enabled: true,
        lastShotAt: 0
    };

    function initCanvas() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            document.body.appendChild(canvas);
        }
        ctx = canvas.getContext('2d', { alpha: false });
        canvas.style.cssText += `;background:${CONFIG.BG_COLOR};touch-action:none;`;
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gameScale = canvas.height / CONFIG.DESIGN_HEIGHT;
        gameWidth = canvas.width / gameScale;
    }

    function initBackgroundStars() {
        backgroundStars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            const depth = Math.random();
            backgroundStars.push({
                x: Math.random() * gameWidth,
                y: Math.random() * CONFIG.DESIGN_HEIGHT,
                size: 0.4 + depth * 1.9,
                speed: 0.08 + depth * 0.75,
                alpha: 0.25 + depth * 0.75,
                twinkle: Math.random() * Math.PI * 2,
                hue: depth > 0.82 ? (Math.random() > 0.5 ? '#bfe9ff' : '#ffe6bd') : '#ffffff'
            });
        }
    }

    function ensureAudio() {
        if (!AUDIO.enabled) return null;
        if (!AUDIO.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;
            AUDIO.ctx = new AudioContext();
            AUDIO.master = AUDIO.ctx.createGain();
            AUDIO.master.gain.value = 0.72;
            AUDIO.master.connect(AUDIO.ctx.destination);
        }
        if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume();
        return AUDIO.ctx;
    }

    function makeNoiseBuffer(ctx, seconds, decay) {
        const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
        }
        return buffer;
    }

    function connectPanned(gain, x) {
        const ctxA = AUDIO.ctx;
        const pan = Math.max(-0.9, Math.min(0.9, (x / gameWidth) * 2 - 1));
        if (ctxA.createStereoPanner) {
            const panner = ctxA.createStereoPanner();
            panner.pan.value = pan;
            gain.connect(panner);
            panner.connect(AUDIO.master);
        } else {
            gain.connect(AUDIO.master);
        }
    }

    function playShootSound(type, x) {
        const ctxA = ensureAudio();
        if (!ctxA) return;
        const now = ctxA.currentTime;
        const isCannon = type === 'cannon';
        const age = now - AUDIO.lastShotAt;
        AUDIO.lastShotAt = now;
        const fatigue = age < 0.08 ? 0.72 : 1;

        const osc = ctxA.createOscillator();
        const gain = ctxA.createGain();
        osc.type = isCannon ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(isCannon ? 520 : 1800, now);
        osc.frequency.exponentialRampToValueAtTime(isCannon ? 95 : 3200, now + (isCannon ? 0.18 : 0.055));
        gain.gain.setValueAtTime((isCannon ? 0.36 : 0.12) * fatigue, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isCannon ? 0.28 : 0.09));
        osc.connect(gain);
        connectPanned(gain, x);
        osc.start(now);
        osc.stop(now + (isCannon ? 0.32 : 0.12));

        const noise = ctxA.createBufferSource();
        noise.buffer = makeNoiseBuffer(ctxA, isCannon ? 0.24 : 0.09, isCannon ? 0.08 : 0.025);
        const filter = ctxA.createBiquadFilter();
        filter.type = isCannon ? 'lowpass' : 'bandpass';
        filter.frequency.value = isCannon ? 1700 : 4300;
        filter.Q.value = isCannon ? 0.8 : 2.2;
        const nGain = ctxA.createGain();
        nGain.gain.setValueAtTime((isCannon ? 0.42 : 0.16) * fatigue, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + (isCannon ? 0.22 : 0.08));
        noise.connect(filter);
        filter.connect(nGain);
        connectPanned(nGain, x);
        noise.start(now);
    }

    function playExplosionSound(x, scale) {
        const ctxA = ensureAudio();
        if (!ctxA) return;
        const now = ctxA.currentTime;
        const power = Math.max(0.55, Math.min(1.6, scale || 1));

        function oscLayer(type, f1, f2, duration, volume) {
            const osc = ctxA.createOscillator();
            const gain = ctxA.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f1, now);
            osc.frequency.exponentialRampToValueAtTime(f2, now + duration * 0.78);
            gain.gain.setValueAtTime(volume * power, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            connectPanned(gain, x);
            osc.start(now);
            osc.stop(now + duration + 0.04);
        }

        oscLayer('sine', 82, 28, 0.78, 0.62);
        oscLayer('triangle', 35, 18, 1.1, 0.42);
        oscLayer('sawtooth', 190, 48, 0.58, 0.28);

        const blast = ctxA.createBufferSource();
        blast.buffer = makeNoiseBuffer(ctxA, 1.05, 0.35);
        const lowpass = ctxA.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(3400, now);
        lowpass.frequency.exponentialRampToValueAtTime(420, now + 0.9);
        const gain = ctxA.createGain();
        gain.gain.setValueAtTime(0.58 * power, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
        blast.connect(lowpass);
        lowpass.connect(gain);
        connectPanned(gain, x);
        blast.start(now);

        const spark = ctxA.createOscillator();
        const sparkGain = ctxA.createGain();
        spark.type = 'square';
        spark.frequency.setValueAtTime(2400, now);
        spark.frequency.exponentialRampToValueAtTime(7200, now + 0.16);
        sparkGain.gain.setValueAtTime(0.11 * power, now);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        spark.connect(sparkGain);
        connectPanned(sparkGain, x);
        spark.start(now);
        spark.stop(now + 0.26);
    }

    function screenToCanvas(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / gameScale,
            y: (e.clientY - rect.top) / gameScale
        };
    }

    function initInput() {
        const movePlane = (x, y) => {
            if (state.current !== 'running') return;
            const oldX = plane.x;
            const oldY = plane.y;
            plane.x = Math.max(0, Math.min(gameWidth - plane.width, x - plane.width / 2));
            plane.y = Math.max(0, Math.min(CONFIG.DESIGN_HEIGHT - plane.height, y - plane.height / 2));
            plane.vx = plane.x - oldX;
            plane.vy = plane.y - oldY;
            plane.tilt += ((plane.vx * 0.035) - plane.tilt) * 0.2;
        };

        canvas.addEventListener('mousemove', (e) => {
            const p = screenToCanvas(e);
            state.lastMouseX = p.x;
            state.lastMouseY = p.y;
            movePlane(p.x, p.y);
        });

        canvas.addEventListener('mousedown', (e) => {
            if (state.current !== 'running') return;
            e.preventDefault();
            if (e.button === 2) {
                shoot('cannon');
            } else if (e.button === 0) {
                shoot('machinegun', { single: true });
            }
        });

        document.addEventListener('keydown', (e) => {
            if (state.current !== 'running') return;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') shoot('machinegun');
            if (e.code === 'KeyE' || e.code === 'KeyX') shoot('cannon');
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!e.touches[0]) return;
            e.preventDefault();
            const p = screenToCanvas(e.touches[0]);
            movePlane(p.x, p.y);
        }, { passive: false });

        canvas.addEventListener('touchstart', (e) => {
            ensureAudio();
            if (state.current !== 'running') return;
            e.preventDefault();
            if (e.touches[0]) {
                const p = screenToCanvas(e.touches[0]);
                movePlane(p.x, p.y);
                shoot('machinegun');
            }
        }, { passive: false });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        ['click', 'keydown', 'touchstart'].forEach((name) => {
            window.addEventListener(name, ensureAudio, { passive: true });
        });
    }

    function createMeteor() {
        const radius = 24 + Math.random() * 38;
        const vertexCount = 10 + Math.floor(Math.random() * 7);
        const vertices = [];
        for (let i = 0; i < vertexCount; i++) {
            const a = (i / vertexCount) * Math.PI * 2;
            const r = radius * (0.68 + Math.random() * 0.48);
            vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        const craters = [];
        const craterCount = 4 + Math.floor(radius / 9);
        for (let i = 0; i < craterCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius * 0.58;
            craters.push({
                x: Math.cos(a) * r,
                y: Math.sin(a) * r,
                radius: 3 + Math.random() * radius * 0.14,
                alpha: 0.18 + Math.random() * 0.25
            });
        }
        const palette = [
            ['#9b4c26', '#4a1f13', '#1c0d08'],
            ['#7b6a55', '#3b3029', '#171313'],
            ['#8e3230', '#491512', '#160806'],
            ['#b87a35', '#60401f', '#1c1208']
        ][Math.floor(Math.random() * 4)];
        meteors.push({
            x: radius + Math.random() * (gameWidth - radius * 2),
            y: -radius * 2,
            width: radius * 2,
            height: radius * 2,
            radius,
            speed: 1.7 + Math.random() * 2.6 + Math.min(2.2, state.score * 0.025),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.035,
            vertices,
            craters,
            palette
        });
    }

    function shoot(type, opts = {}) {
        if (bullets.length >= CONFIG.MAX_BULLETS) return;
        const isCannon = type === 'cannon';
        const now = performance.now();
        if (now < fireCooldown) return;
        fireCooldown = now + (isCannon ? 260 : 80);
        const x = plane.x + plane.width / 2;
        const y = plane.y + 4;
        const spread = isCannon ? [0] : opts.single ? [0] : [-8, 8];
        spread.forEach((offset) => {
            bullets.push({
                x: x + offset,
                y,
                width: isCannon ? 12 : 5,
                height: isCannon ? 28 : 18,
                speed: isCannon ? 12 : 18,
                color: isCannon ? '255,140,30' : '255,240,80',
                glow: isCannon ? '#ff8c1e' : '#fff050',
                type,
                rotation: Math.random() * Math.PI * 2,
                trail: []
            });
        });
        muzzleFlashes.push({ x, y: y - 12, life: isCannon ? 11 : 6, maxLife: isCannon ? 11 : 6, radius: isCannon ? 34 : 20 });
        playShootSound(type, x);
    }

    function createExplosion(x, y, scale) {
        scale = scale || 1;
        const bursts = [
            { count: 28, speed: 7.5, size: 2.4, color: '255,245,205', life: 34, type: 'core' },
            { count: 42, speed: 5.2, size: 4.2, color: '255,108,22', life: 54, type: 'flame' },
            { count: 28, speed: 2.8, size: 7.0, color: '90,88,84', life: 86, type: 'smoke' },
            { count: 18, speed: 9.5, size: 1.8, color: '255,210,80', life: 30, type: 'spark' }
        ];
        bursts.forEach((b) => {
            for (let i = 0; i < b.count * scale; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = b.speed * (0.35 + Math.random() * 0.9) * scale;
                particles.push({
                    x, y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    size: b.size * (0.6 + Math.random() * 0.9) * scale,
                    color: b.color,
                    life: b.life * (0.75 + Math.random() * 0.55),
                    maxLife: b.life,
                    type: b.type
                });
            }
        });
        while (particles.length > CONFIG.MAX_PARTICLES) particles.shift();
        shockwaves.push({ x, y, radius: 6, maxRadius: 115 * scale, life: 28, maxLife: 28 });
        heatHazes.push({ x, y, radius: 12, maxRadius: 145 * scale, life: 22, maxLife: 22 });
        state.flash = Math.max(state.flash, 0.45 * scale);
        state.shake = Math.max(state.shake, 11 * scale);
        playExplosionSound(x, scale);
    }

    function updateVisualEffects() {
        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            const drag = p.type === 'smoke' ? 0.992 : 0.962;
            p.vx *= drag;
            p.vy *= drag;
            if (p.type !== 'spark') p.vy += 0.035;
            p.life -= 1;
            if (p.type === 'smoke') p.size *= 1.006;
        });
        particles = particles.filter((p) => p.life > 0 && p.size > 0.05);
        shockwaves.forEach((s) => { s.radius += (s.maxRadius - s.radius) * 0.18; s.life -= 1; });
        shockwaves = shockwaves.filter((s) => s.life > 0);
        heatHazes.forEach((h) => { h.radius += (h.maxRadius - h.radius) * 0.22; h.life -= 1; });
        heatHazes = heatHazes.filter((h) => h.life > 0);
        muzzleFlashes.forEach((f) => f.life -= 1);
        muzzleFlashes = muzzleFlashes.filter((f) => f.life > 0);
        state.shake *= 0.9;
        state.flash *= 0.86;
    }

    function beginDeathExplosion(meteorIndex) {
        if (state.current !== 'running') return;
        const cx = plane.x + plane.width / 2;
        const cy = plane.y + plane.height / 2;
        const meteor = meteors[meteorIndex];
        state.current = 'dying';
        state.deathStartedAt = performance.now();
        bullets = [];
        muzzleFlashes = [];
        if (meteor) {
            createExplosion(meteor.x, meteor.y, 1.35);
            meteors.splice(meteorIndex, 1);
        }
        createExplosion(cx, cy, 2.35);
        state.flash = Math.max(state.flash, 0.95);
        state.shake = Math.max(state.shake, 26);
        if (canvas) canvas.style.cursor = 'default';
    }

    function update() {
        if (state.current === 'dying') {
            state.time += 1;
            meteors.forEach((m) => {
                m.y += m.speed * 0.35;
                m.rotation += m.rotationSpeed * 0.6;
            });
            updateVisualEffects();
            if (performance.now() - state.deathStartedAt >= CONFIG.DEATH_EXPLOSION_MS) {
                gameOver();
            }
            return;
        }
        if (state.current !== 'running') return;
        state.time += 1;
        meteorSpawnTimer += 1;
        const spawnRate = Math.max(24, 62 - state.score * 0.55);
        if (meteorSpawnTimer >= spawnRate && meteors.length < CONFIG.MAX_METEORS) {
            meteorSpawnTimer = 0;
            createMeteor();
        }

        plane.propellerAngle += 0.72 + Math.min(0.8, Math.abs(plane.vx) * 0.025);
        plane.flamePhase += 0.24;
        plane.vx *= 0.86;
        plane.vy *= 0.86;
        plane.tilt *= 0.94;

        bullets.forEach((b) => {
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > (b.type === 'cannon' ? 10 : 7)) b.trail.shift();
            b.y -= b.speed;
            b.rotation += b.type === 'cannon' ? 0.08 : 0.18;
        });
        bullets = bullets.filter((b) => b.y + b.height > -20);

        meteors.forEach((m) => {
            m.y += m.speed;
            m.rotation += m.rotationSpeed;
            m.rotationSpeed *= 0.998;
        });
        meteors = meteors.filter((m) => m.y - m.radius < CONFIG.DESIGN_HEIGHT + 80);

        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const b = bullets[bIndex];
            for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                const m = meteors[mIndex];
                const dx = b.x - m.x;
                const dy = b.y - m.y;
                if (dx * dx + dy * dy < (m.radius + b.width) * (m.radius + b.width)) {
                    createExplosion(m.x, m.y, b.type === 'cannon' ? 1.25 : Math.min(1.25, m.radius / 38));
                    meteors.splice(mIndex, 1);
                    bullets.splice(bIndex, 1);
                    state.score += b.type === 'cannon' ? 2 : 1;
                    break;
                }
            }
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            const cx = plane.x + plane.width / 2;
            const cy = plane.y + plane.height / 2;
            const dx = cx - m.x;
            const dy = cy - m.y;
            if (dx * dx + dy * dy < (m.radius + 18) * (m.radius + 18)) {
                beginDeathExplosion(i);
                return;
            }
        }

        updateVisualEffects();
    }

    function renderBackground() {
        const g = ctx.createRadialGradient(gameWidth / 2, CONFIG.DESIGN_HEIGHT * 0.45, 20, gameWidth / 2, CONFIG.DESIGN_HEIGHT / 2, 620);
        g.addColorStop(0, '#081533');
        g.addColorStop(0.52, '#030814');
        g.addColorStop(1, '#000000');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, gameWidth, CONFIG.DESIGN_HEIGHT);

        backgroundStars.forEach((star) => {
            star.y += star.speed;
            star.x += Math.sin((state.time + star.y) * 0.002) * star.speed * 0.08;
            if (star.y > CONFIG.DESIGN_HEIGHT + 4) {
                star.y = -4;
                star.x = Math.random() * gameWidth;
            }
            const alpha = star.alpha * (0.65 + Math.sin(state.time * 0.035 + star.twinkle) * 0.28);
            ctx.fillStyle = star.hue === '#ffffff' ? `rgba(255,255,255,${alpha})` : star.hue;
            ctx.globalAlpha = Math.max(0.1, alpha);
            ctx.fillRect(star.x, star.y, star.size, star.size);
            ctx.globalAlpha = 1;
        });
    }

    function drawPlane() {
        const cx = plane.x + plane.width / 2;
        const cy = plane.y + plane.height / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(plane.tilt);

        const flameHeight = 30 + Math.sin(plane.flamePhase) * 7 + Math.random() * 8;
        for (let i = 0; i < 3; i++) {
            const grad = ctx.createLinearGradient(0, plane.height / 2 - 2, 0, plane.height / 2 + flameHeight);
            grad.addColorStop(0, i === 0 ? '#ffffff' : '#ffd070');
            grad.addColorStop(0.36, i === 0 ? '#42e7ff' : '#ff7a18');
            grad.addColorStop(1, 'rgba(255,70,0,0)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.7 - i * 0.16;
            ctx.beginPath();
            ctx.moveTo(-10 + i * 2, plane.height / 2 - 3);
            ctx.quadraticCurveTo(0, plane.height / 2 + flameHeight * (1 + i * 0.12), 10 - i * 2, plane.height / 2 - 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.shadowBlur = 24;
        ctx.shadowColor = '#00f5ff';
        const body = ctx.createRadialGradient(-8, -14, 4, 0, 0, 44);
        body.addColorStop(0, '#eaffff');
        body.addColorStop(0.28, '#54f6ff');
        body.addColorStop(0.72, '#11758e');
        body.addColorStop(1, '#062b3d');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(0, -plane.height / 2 - 10);
        ctx.lineTo(plane.width / 2, plane.height / 2 - 1);
        ctx.quadraticCurveTo(16, 15, 0, plane.height / 2 + 5);
        ctx.quadraticCurveTo(-16, 15, -plane.width / 2, plane.height / 2 - 1);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(210,255,255,0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(4,16,32,0.85)';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -10, 9, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(-3, -14, 3, 6, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = '#dfffff';
        ctx.lineWidth = 2.5;
        ctx.rotate(plane.propellerAngle);
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -plane.height / 2 - 4);
            ctx.lineTo(0, -plane.height / 2 - 20);
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
    }

    function drawMeteor(m) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rotation);
        ctx.beginPath();
        m.vertices.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
        ctx.closePath();
        const grad = ctx.createRadialGradient(-m.radius * 0.32, -m.radius * 0.36, 4, 0, 0, m.radius * 1.2);
        grad.addColorStop(0, m.palette[0]);
        grad.addColorStop(0.48, m.palette[1]);
        grad.addColorStop(1, m.palette[2]);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255,96,32,0.28)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,205,150,0.34)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        m.craters.forEach((c) => {
            const crater = ctx.createRadialGradient(c.x - c.radius * 0.3, c.y - c.radius * 0.3, 1, c.x, c.y, c.radius);
            crater.addColorStop(0, `rgba(255,210,165,${c.alpha})`);
            crater.addColorStop(0.42, `rgba(22,10,8,${c.alpha + 0.3})`);
            crater.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = crater;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawBullets() {
        bullets.forEach((b) => {
            b.trail.forEach((t, i) => {
                const a = (i + 1) / b.trail.length;
                ctx.fillStyle = `rgba(${b.color},${a * 0.2})`;
                ctx.fillRect(t.x - b.width * a, t.y, b.width * 2 * a, b.height * a);
            });
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rotation);
            ctx.shadowBlur = b.type === 'cannon' ? 24 : 16;
            ctx.shadowColor = b.glow;
            const grad = ctx.createLinearGradient(0, -b.height / 2, 0, b.height / 2);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, `rgb(${b.color})`);
            grad.addColorStop(1, 'rgba(255,80,20,0.45)');
            ctx.fillStyle = grad;
            ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
            ctx.restore();
        });
    }

    function drawParticles() {
        particles.forEach((p) => {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = p.type === 'smoke' ? 0 : 12;
            ctx.shadowColor = `rgb(${p.color})`;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, p.type === 'smoke' ? `rgba(${p.color},0.35)` : '#ffffff');
            grad.addColorStop(0.32, `rgba(${p.color},${alpha})`);
            grad.addColorStop(1, `rgba(${p.color},0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawEffects() {
        shockwaves.forEach((s) => {
            const a = s.life / s.maxLife;
            ctx.strokeStyle = `rgba(255,230,190,${0.52 * a})`;
            ctx.lineWidth = 3 + (1 - a) * 8;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        heatHazes.forEach((h) => {
            const a = h.life / h.maxLife;
            const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
            grad.addColorStop(0, `rgba(255,255,255,${0.06 * a})`);
            grad.addColorStop(0.55, `rgba(255,130,30,${0.05 * a})`);
            grad.addColorStop(1, 'rgba(255,130,30,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        muzzleFlashes.forEach((f) => {
            const a = f.life / f.maxLife;
            const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
            grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
            grad.addColorStop(0.38, `rgba(255,210,60,${0.55 * a})`);
            grad.addColorStop(1, 'rgba(255,100,20,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function render() {
        ctx.save();
        ctx.scale(gameScale, gameScale);
        if (state.shake > 0.05) {
            ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
        }
        renderBackground();
        drawEffects();
        if (state.current === 'running' || state.current === 'dying' || state.current === 'game_over') {
            meteors.forEach(drawMeteor);
            drawBullets();
            if (state.current === 'running' || state.current === 'game_over') drawPlane();
            drawParticles();
        }
        if (state.flash > 0.01) {
            ctx.fillStyle = `rgba(255,245,220,${state.flash})`;
            ctx.fillRect(0, 0, gameWidth, CONFIG.DESIGN_HEIGHT);
        }
        ctx.restore();
    }

    function updateHUD() {
        if (state.current !== 'running') return;
        const liveScore = document.getElementById('liveScore');
        if (liveScore) liveScore.textContent = state.score;
        const liveTime = document.getElementById('liveTime');
        if (liveTime) {
            const elapsed = Date.now() - state.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            liveTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    function startGameLoop() {
        let accumulator = 0;
        let lastTime = performance.now();
        function loop(now) {
            const delta = Math.min(50, now - lastTime);
            lastTime = now;
            accumulator += delta;
            while (accumulator >= CONFIG.TARGET_DT) {
                update();
                accumulator -= CONFIG.TARGET_DT;
            }
            updateHUD();
            render();
            animationFrameId = requestAnimationFrame(loop);
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(loop);
    }

    function buildHUD() {
        let hud = document.getElementById('hudContainer');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'hudContainer';
            document.body.appendChild(hud);
        }
        hud.innerHTML = `
            <div class="hud-row"><span class="hud-label">SCORE:</span> <span class="hud-value" id="liveScore">0</span></div>
            <div class="hud-row"><span class="hud-label">TIME:</span> <span class="hud-value" id="liveTime">00:00</span></div>
            <div class="hud-row" style="font-size:12px;opacity:.78">左键机枪 / 右键或 X 炮弹</div>
        `;
    }

    function resetEntities() {
        meteors = [];
        bullets = [];
        particles = [];
        shockwaves = [];
        heatHazes = [];
        muzzleFlashes = [];
        meteorSpawnTimer = 0;
        state.shake = 0;
        state.flash = 0;
        state.deathStartedAt = 0;
        plane.x = gameWidth / 2 - plane.width / 2;
        plane.y = CONFIG.DESIGN_HEIGHT * 0.73;
        plane.vx = 0;
        plane.vy = 0;
        plane.tilt = 0;
    }

    function startGame() {
        ensureAudio();
        resetEntities();
        state.current = 'running';
        state.score = 0;
        state.startTime = Date.now();
        state.deathStartedAt = 0;
        buildHUD();
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'none';
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        if (canvas) canvas.style.cursor = 'none';
    }

    function gameOver() {
        state.current = 'game_over';
        if (canvas) canvas.style.cursor = 'default';
        const finalScore = document.getElementById('finalScore');
        if (finalScore) finalScore.textContent = state.score;
        const elapsed = Date.now() - state.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const subtitle = document.querySelector('#gameOverScreen .overlay-subtitle');
        if (subtitle) {
            subtitle.innerHTML = `最终得分：<span id="finalScore">${state.score}</span><br/>生存时间：${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.style.display = 'flex';
    }

    function resetGame() {
        startGame();
    }

    function initAllModules() {
        initCanvas();
        initBackgroundStars();
        initInput();
        startGameLoop();
        window.startGame = startGame;
        window.resetGame = resetGame;
        window.gameOver = gameOver;
        console.log('[Space War] Cinematic build ready. Chrome Web Audio enabled, no external audio assets required.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllModules);
    } else {
        initAllModules();
    }
})();