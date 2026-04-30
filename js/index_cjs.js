/**
 * @file index_cjs.js — 太空战机游戏主引擎
 * @description 使用 Canvas 2D + Web Audio API 实现的太空射击游戏
 * @date 2026-04-29
 * @version 3.0.0
 *
 * 核心功能：
 * - 飞船鼠标/触屏控制，自动射击系统
 * - 不规则 3D 球体陨石渲染（贝塞尔平滑 + 径向渐变 + 陨石坑 + 自旋转）
 * - 粒子特效、冲击波、热浪等视觉效果
 * - Web Audio 合成音效（射击/爆炸）
 * - 移动端触屏控制按钮（子弹 + 导弹）
 */
(function () {
    'use strict';

    const CONFIG = {
        DESIGN_HEIGHT: 600,         // 游戏世界坐标系高度
        TARGET_DT: 1000 / 60,       // 目标帧间隔（约 60 FPS）
        DEATH_EXPLOSION_MS: 2000,   // 死亡爆炸动画时长（毫秒）
        MAX_METEORS: 18,            // 最大同时陨石数
        MAX_BULLETS: 70,            // 最大同时子弹数
        MAX_PARTICLES: 420,         // 最大同时粒子数
        STAR_COUNT: 230,            // 背景星星数量
        BG_COLOR: '#02040d'         // 背景颜色
    };

    const DEBUG = false;            // 调试模式：true 时显示冲击波圆圈等调试信息

    let canvas = null;              // 画布元素引用
    let ctx = null;                 // 画布 2D 上下文
    let animationFrameId = null;    // 动画帧 ID
    let gameScale = 1;              // 缩放比例（适配不同屏幕）
    let gameWidth = 800;            // 游戏世界坐标系宽度
    let meteorSpawnTimer = 0;       // 陨石生成计时器
    let fireCooldown = 0;           // 射击冷却时间
    let mobileControls = null;      // 移动端控制按钮容器（开始游戏后显示）
    const keys = {};                // 键盘按键状态（方向键移动用）

    // ================================================================
    // === 游戏状态管理 ================================================
    // ================================================================

    const state = {
        current: 'idle',            // 当前状态: idle / running / dying / game_over
        score: 0,                   // 当前得分
        startTime: 0,               // 游戏开始时间戳
        shake: 0,                   // 屏幕震动强度
        flash: 0,                   // 屏幕闪白强度
        lastMouseX: gameWidth / 2,          // 鼠标/触屏最后 X 坐标
        lastMouseY: CONFIG.DESIGN_HEIGHT * 0.75,  // 鼠标/触屏最后 Y 坐标
        time: 0,                    // 游戏帧计数器
        deathStartedAt: 0           // 死亡动画开始时间
    };

    // ================================================================
    // === 飞船对象 ====================================================
    // ================================================================

    const plane = {
        x: gameWidth / 2 - 28,      // 左上角 X 坐标
        y: CONFIG.DESIGN_HEIGHT * 0.72,  // 左上角 Y 坐标
        width: 56,                  // 飞船宽度
        height: 44,                 // 飞船高度
        vx: 0,                      // 水平速度（惯性用）
        vy: 0,                      // 垂直速度
        tilt: 0,                    // 倾斜角度（鼠标移动时倾斜）
        propellerAngle: 0,          // 螺旋桨旋转角度
        flamePhase: 0               // 尾焰动画相位
    };

    // ================================================================
    // === 游戏对象数组 ================================================
    // ================================================================

    let backgroundStars = [];   // 背景星空
    let meteors = [];           // 陨石列表
    let bullets = [];           // 子弹列表
    let particles = [];         // 粒子列表
    let shockwaves = [];        // 冲击波列表
    let heatHazes = [];         // 热浪列表
    let muzzleFlashes = [];     // 枪口闪光列表

    // ================================================================
    // === 音频系统 ====================================================
    // ================================================================

    const AUDIO = {
        ctx: null,              // AudioContext 实例
        master: null,           // 主音量增益节点
        enabled: true,          // 音频是否启用
        lastShotAt: 0           // 上次射击时间（防重复触发）
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

        /* 重低音效果：40-60Hz 低频正弦波，长持续 */
        try {
            const bassOsc = ctxA.createOscillator();
            const bassGain = ctxA.createGain();
            bassOsc.type = 'sine';
            bassOsc.frequency.setValueAtTime(55, now);
            bassOsc.frequency.exponentialRampToValueAtTime(25, now + 0.85);
            bassGain.gain.setValueAtTime(0.48 * power, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            // 用低通滤波增强低频质感
            const bassFilter = ctxA.createBiquadFilter();
            bassFilter.type = 'lowpass';
            bassFilter.frequency.setValueAtTime(120, now);
            bassFilter.frequency.exponentialRampToValueAtTime(40, now + 0.85);
            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            connectPanned(bassGain, x);
            bassOsc.start(now);
            bassOsc.stop(now + 0.95);
        } catch(e) {}

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

    /**
     * @description 将屏幕坐标转换为游戏世界坐标
     * @param {Event} e 鼠标/触屏事件对象
     * @returns {{x: number, y: number}} 游戏坐标系中的坐标
     */
    function screenToCanvas(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / gameScale,
            y: (e.clientY - rect.top) / gameScale
        };
    }

    /**
     * @description 初始化所有输入事件监听（鼠标、键盘、触屏、移动端按钮）
     */
    function initInput() {
        /**
         * @description 移动飞船到指定游戏坐标，附带惯性倾斜效果
         * @param {number} x 目标 X 坐标
         * @param {number} y 目标 Y 坐标
         */
        const movePlane = (x, y) => {
            if (state.current !== 'running') return;
            const oldX = plane.x;
            const oldY = plane.y;
            // 将飞船限制在画布范围内
            plane.x = Math.max(0, Math.min(gameWidth - plane.width, x - plane.width / 2));
            plane.y = Math.max(0, Math.min(CONFIG.DESIGN_HEIGHT - plane.height, y - plane.height / 2));
            plane.vx = plane.x - oldX;
            plane.vy = plane.y - oldY;
            // 根据水平移动速度计算倾斜角度
            plane.tilt += ((plane.vx * 0.035) - plane.tilt) * 0.2;
        };

        /* ---- 鼠标控制 ---- */
        canvas.addEventListener('mousemove', (e) => {
            const p = screenToCanvas(e);
            state.lastMouseX = p.x;
            state.lastMouseY = p.y;
            movePlane(p.x, p.y);
        });

        /* 鼠标左键 = 机枪，右键 = 导弹 */
        canvas.addEventListener('mousedown', (e) => {
            if (state.current !== 'running') return;
            e.preventDefault();
            if (e.button === 2) {
                shoot('cannon');
            } else if (e.button === 0) {
                shoot('machinegun', { single: true });
            }
        });

        /* 鼠标离开画布时，飞船停在离鼠标最近的屏幕边界 */
        canvas.addEventListener('mouseleave', () => {
            if (state.current !== 'running') return;
            const clampX = Math.max(0, Math.min(gameWidth, state.lastMouseX));
            const clampY = Math.max(0, Math.min(CONFIG.DESIGN_HEIGHT, state.lastMouseY));
            movePlane(clampX, clampY);
        });

        /* 鼠标重新进入画布时恢复实时跟随 */
        canvas.addEventListener('mouseenter', () => {
            if (state.current !== 'running') return;
            // 鼠标重新进入时恢复正常跟踪（由 mousemove 事件驱动）
        });

        /* ---- 键盘控制 ---- */
        document.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (state.current !== 'running') return;
            // J 键发射子弹，K 键发射导弹
            if (e.code === 'KeyJ') shoot('machinegun', { single: true });
            if (e.code === 'KeyK') shoot('cannon');
        });

        /* 键盘释放时清除按键状态 */
        document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        /* ---- 触屏控制（手指跟踪） ---- */
        canvas.addEventListener('touchmove', (e) => {
            if (!e.touches[0]) return;
            e.preventDefault();
            const p = screenToCanvas(e.touches[0]);
            state.lastMouseX = p.x;
            state.lastMouseY = p.y;
            movePlane(p.x, p.y);
        }, { passive: false });

        /* 触摸开始 = 移动飞船 + 发射子弹 */
        canvas.addEventListener('touchstart', (e) => {
            ensureAudio();
            if (state.current !== 'running') return;
            e.preventDefault();
            if (e.touches[0]) {
                const p = screenToCanvas(e.touches[0]);
                state.lastMouseX = p.x;
                state.lastMouseY = p.y;
                movePlane(p.x, p.y);
                shoot('machinegun');
            }
        }, { passive: false });

        /* 触摸结束 = 停止移动 */
        canvas.addEventListener('touchend', () => {
            // 触摸结束后保持原位，不重置位置
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        ['click', 'keydown', 'touchstart'].forEach((name) => {
            window.addEventListener(name, ensureAudio, { passive: true });
        });

        /* ---- 移动端按钮控制 ---- */
        /** 子弹按钮 —— 发射机枪 */
        const btnBullet = document.getElementById('btnBullet');
        if (btnBullet) {
            btnBullet.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ensureAudio();
                if (state.current === 'running') {
                    shoot('machinegun', { single: true });
                }
            });
            btnBullet.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ensureAudio();
                if (state.current === 'running') {
                    shoot('machinegun', { single: true });
                }
            });
            btnBullet.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        /** 导弹按钮 —— 发射炮弹 */
        const btnMissile = document.getElementById('btnMissile');
        if (btnMissile) {
            btnMissile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ensureAudio();
                if (state.current === 'running') {
                    shoot('cannon');
                }
            });
            btnMissile.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ensureAudio();
                if (state.current === 'running') {
                    shoot('cannon');
                }
            });
            btnMissile.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    /**
     * @description 创建一个新的陨石，包含不规则顶点、陨石坑和颜色调色板
     */
    /**
     * @description 生成大陨石被击中后的固定裂缝几何数据（一次性，避免每帧闪烁）
     * @param {number} radius 陨石半径
     * @returns {Array} 裂缝数据数组，每条裂缝包含起点、多段折线终点、颜色、线宽
     */
    function generateCrackGeometry(radius) {
        const r = radius;
        const cracks = [];
        const crackCount = 3 + Math.floor(Math.random() * 3);  // 3-5 条裂缝
        for (let ci = 0; ci < crackCount; ci++) {
            const startA = Math.random() * Math.PI * 2;
            const startR = r * (0.1 + Math.random() * 0.3);
            const sx = Math.cos(startA) * startR;
            const sy = Math.sin(startA) * startR;
            // 生成 3-5 段折线，延伸到接近表面
            const segments = 3 + Math.floor(Math.random() * 3);
            const points = [];
            let px = sx, py = sy;
            for (let seg = 0; seg < segments; seg++) {
                const endA = startA + (Math.random() - 0.5) * 1.5;
                const endR = startR + ((seg + 1) / segments) * r * 0.82;
                if (endR > r * 0.92) break;
                px = Math.cos(endA) * endR;
                py = Math.sin(endA) * endR;
                points.push({ x: px, y: py });
            }
            // 主裂缝颜色（黑灰色，模拟岩石真实裂痕）
            const alpha = 0.7 + Math.random() * 0.25;
            cracks.push({
                startX: sx, startY: sy,
                points: points,
                color: `rgba(${20 + Math.floor(Math.random() * 30)}, ${18 + Math.floor(Math.random() * 25)}, ${15 + Math.floor(Math.random() * 20)}, ${alpha})`,
                shadow: `rgba(5, 3, 2, ${0.15 + Math.random() * 0.1})`,
                lineWidth: 2 + Math.random() * 1.2
            });
            // 分支裂缝（较细较短）
            if (Math.random() > 0.35 && points.length > 1) {
                const bp = points[Math.floor(Math.random() * points.length)];
                const branchA = startA + (Math.random() - 0.5) * 1.8;
                const branchLen = r * (0.15 + Math.random() * 0.25);
                cracks.push({
                    startX: bp.x, startY: bp.y,
                    points: [{
                        x: Math.cos(branchA) * (Math.sqrt(bp.x*bp.x + bp.y*bp.y) + branchLen),
                        y: Math.sin(branchA) * (Math.sqrt(bp.x*bp.x + bp.y*bp.y) + branchLen)
                    }],
                    color: `rgba(${15 + Math.floor(Math.random() * 20)}, ${12 + Math.floor(Math.random() * 15)}, ${10 + Math.floor(Math.random() * 10)}, 0.4)`,
                    shadow: `rgba(5, 3, 2, 0.12)`,
                    lineWidth: 1 + Math.random() * 0.5
                });
            }
        }
        return cracks;
    }

    function createMeteor() {
        // 大陨石（40%）半径 30-40，需 2 发子弹击毁，得分 +3
        // 小陨石（60%）半径 18-26，需 1 发子弹击毁，得分 +1
        const isLarge = Math.random() < 0.4;
        const radius = isLarge ? (30 + Math.random() * 12) : (18 + Math.random() * 8);
        // 增加顶点至 16-24 个，使圆形更平滑
        const vertexCount = 16 + Math.floor(Math.random() * 9);
        const vertices = [];
        for (let i = 0; i < vertexCount; i++) {
            const a = (i / vertexCount) * Math.PI * 2;
            // 缩小半径偏移范围：0.88~1.0 × 半径，保持近乎圆形
            const r = radius * (0.88 + Math.random() * 0.12);
            vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }

        // 生成控制点用于贝塞尔平滑（控制点偏移缩小到 ±8%）
        const ctrlPoints = [];
        for (let i = 0; i < vertexCount; i++) {
            const curr = vertices[i];
            const next = vertices[(i + 1) % vertexCount];
            ctrlPoints.push({
                x: (curr.x + next.x) / 2 + (Math.random() - 0.5) * radius * 0.08,
                y: (curr.y + next.y) / 2 + (Math.random() - 0.5) * radius * 0.08
            });
        }

        // 陨石坑 —— 数量更多，位置更随机
        const craters = [];
        const craterCount = 4 + Math.floor(radius / 8);
        for (let i = 0; i < craterCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius * 0.6;
            craters.push({
                x: Math.cos(a) * r,
                y: Math.sin(a) * r,
                radius: 3 + Math.random() * radius * 0.15,
                alpha: 0.18 + Math.random() * 0.28
            });
        }

        // 表面微纹理斑点（增加数量使凹凸感更丰富）
        const specks = [];
        const speckCount = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < speckCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius * 0.7;
            specks.push({
                x: Math.cos(a) * r,
                y: Math.sin(a) * r,
                size: 2 + Math.random() * 6,
                alpha: 0.08 + Math.random() * 0.12
            });
        }

        const palette = [
            ['#9b4c26', '#4a1f13', '#1c0d08'],
            ['#7b6a55', '#3b3029', '#171313'],
            ['#8e3230', '#491512', '#160806'],
            ['#b87a35', '#60401f', '#1c1208']
        ][Math.floor(Math.random() * 4)];
        // 亮色凸起斑点（受光面岩石凸起，一次性生成避免闪烁）
        const brightSpecks = [];
        for (let i = 0; i < 5 + Math.floor(Math.random() * 6); i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.random() * radius * 0.8;
            brightSpecks.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d,
                size: 2 + Math.random() * 5,
                elong: 1 + Math.random() * 2,
                alpha: 0.04 + Math.random() * 0.06
            });
        }
        // 细小颗粒（粗糙质感，一次性生成避免闪烁）
        const fineGrains = [];
        const grainCount = 20 + Math.floor(radius * 1.5);
        for (let i = 0; i < grainCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.random() * radius * 0.9;
            fineGrains.push({
                x: Math.cos(a) * d,
                y: Math.sin(a) * d,
                shade: Math.random() > 0.5 ? 10 : 35,
                size: 0.5 + Math.random() * 1.2,
                alpha: 0.15 + Math.random() * 0.2
            });
        }

        meteors.push({
            x: radius + Math.random() * (gameWidth - radius * 2),
            y: -radius * 2,
            width: radius * 2,
            height: radius * 2,
            radius,
            health: isLarge ? 2 : 1,            // 大陨石 2 点生命，小陨石 1 点
            isLarge,
            hit: false,                          // 是否已被击中过（大陨石第一次中弹后显示裂缝）
            cracks: null,                        // 裂缝几何数据（命中后生成，固定不闪烁）
            brightSpecks,                        // 亮色凸起（一次性生成）
            fineGrains,                          // 细小颗粒（一次性生成）
            speed: 1.7 + Math.random() * 2.6 + Math.min(2.2, state.score * 0.025),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.035,
            vertices,
            ctrlPoints,
            craters,
            specks,
            palette
        });
    }

    /**
     * @description 射击函数（机枪或导弹）
     * @param {string} type 射击类型: 'machinegun'（机枪） 或 'cannon'（导弹）
     * @param {Object} opts 可选参数: { single: true } 表示单发
     */
    function shoot(type, opts = {}) {
        if (bullets.length >= CONFIG.MAX_BULLETS) return;
        const isCannon = type === 'cannon';
        const now = performance.now();
        if (now < fireCooldown) return;
        fireCooldown = now + (isCannon ? 260 : 80);  // 导弹冷却时间长
        const x = plane.x + plane.width / 2;
        const y = plane.y + 4;
        const spread = isCannon ? [0] : opts.single ? [0] : [-8, 8];
        spread.forEach((offset) => {
            bullets.push({
                x: x + offset,
                y,
                width: isCannon ? 18 : 5,        // 导弹宽度为子弹的 3.6 倍
                height: isCannon ? 40 : 18,       // 导弹高度为子弹的 2.2 倍
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

    /**
     * @description 创建爆炸粒子效果
     * 产生核心火焰、外焰、烟尘、火花、碎片五种粒子，扩散范围大、残留时间长
     * @param {number} x 爆炸中心 X 坐标
     * @param {number} y 爆炸中心 Y 坐标
     * @param {number} scale 爆炸规模系数（1.0 为默认）
     */
    function createExplosion(x, y, scale) {
        scale = scale || 1;
        // 五种粒子类型：核心光、火焰、烟尘、火花、碎片
        const bursts = [
            { count: 36, speed: 8.5, size: 2.6, color: '255,245,205', life: 38, type: 'core' },
            { count: 52, speed: 6.0, size: 4.5, color: '255,108,22',  life: 60, type: 'flame' },
            { count: 36, speed: 3.2, size: 8.0, color: '90,88,84',   life: 96, type: 'smoke' },
            { count: 24, speed: 11.0, size: 2.0, color: '255,210,80', life: 34, type: 'spark' },
            { count: 16, speed: 7.0, size: 3.2, color: '180,120,60',  life: 52, type: 'debris' }
        ];
        bursts.forEach((b) => {
            for (let i = 0; i < b.count * scale; i++) {
                const a = Math.random() * Math.PI * 2;
                const sp = b.speed * (0.35 + Math.random() * 0.95) * scale;
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
        // 限制粒子总数不超过上限
        while (particles.length > CONFIG.MAX_PARTICLES) particles.shift();
        // 冲击波（仅在 DEBUG 模式下可见）
        shockwaves.push({ x, y, radius: 6, maxRadius: 115 * scale, life: 28, maxLife: 28 });
        // 热浪（始终可见的模糊光晕）
        heatHazes.push({ x, y, radius: 12, maxRadius: 145 * scale, life: 22, maxLife: 22 });
        // 屏幕特效
        state.flash = Math.max(state.flash, 0.5 * scale);   // 闪白强度提高
        state.shake = Math.max(state.shake, 14 * scale);     // 震动强度提高
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
        // 飞船爆炸时立即隐藏移动端按钮
        if (mobileControls) mobileControls.style.display = 'none';
        if (canvas) canvas.style.cursor = 'default';
    }

    /**
     * @description 游戏主更新逻辑，处理状态切换、陨石生成、物理运动、碰撞检测
     */
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

        /* 方向键移动飞船（叠加到鼠标位置） */
        const KEY_SPEED = 16;  // 方向键移动速度（原 4，加快 4 倍）
        if (keys['ArrowUp'] || keys['KeyW']) plane.y -= KEY_SPEED;
        if (keys['ArrowDown'] || keys['KeyS']) plane.y += KEY_SPEED;
        if (keys['ArrowLeft'] || keys['KeyA']) plane.x -= KEY_SPEED;
        if (keys['ArrowRight'] || keys['KeyD']) plane.x += KEY_SPEED;
        plane.x = Math.max(0, Math.min(gameWidth - plane.width, plane.x));
        plane.y = Math.max(0, Math.min(CONFIG.DESIGN_HEIGHT - plane.height, plane.y));

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

        /* ---- 子弹碰撞检测（含导弹 AOE） ---- */
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const b = bullets[bIndex];
            const isMissile = b.type === 'cannon';

            if (isMissile) {
                /* 第一步：先检测导弹是否直接命中陨石（碰撞检测，同子弹逻辑） */
                let hitIndex = -1;
                for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                    const m = meteors[mIndex];
                    const dx = b.x - m.x;
                    const dy = b.y - m.y;
                    if (dx * dx + dy * dy < (m.radius + b.width / 2) * (m.radius + b.width / 2)) {
                        hitIndex = mIndex;
                        break;
                    }
                }
                if (hitIndex >= 0) {
                    /* 第二步：直接命中后，在命中点产生爆炸 */
                    const hitMeteor = meteors[hitIndex];
                    createExplosion(hitMeteor.x, hitMeteor.y, 1.25);
                    meteors.splice(hitIndex, 1);
                    /* 第三步：AOE 范围伤害——销毁 180px 内剩余陨石 */
                    for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                        const m = meteors[mIndex];
                        const dx = b.x - m.x;
                        const dy = b.y - m.y;
                        if (dx * dx + dy * dy < 180 * 180) {
                            createExplosion(m.x, m.y, 1.25);
                            state.score += m.isLarge ? 3 : 1;
                            meteors.splice(mIndex, 1);
                        }
                    }
                    bullets.splice(bIndex, 1);
                    state.flash = Math.max(state.flash, 0.6);
                    state.shake = Math.max(state.shake, 18);
                }
            } else {
                /* 子弹：降低陨石生命值，生命值为 0 时才销毁 */
                for (let mIndex = meteors.length - 1; mIndex >= 0; mIndex--) {
                    const m = meteors[mIndex];
                    const dx = b.x - m.x;
                    const dy = b.y - m.y;
                    if (dx * dx + dy * dy < (m.radius + b.width) * (m.radius + b.width)) {
                        m.health -= 1;  // 生命值减 1
                        if (m.health <= 0) {
                            // 生命值为 0，陨石销毁
                            createExplosion(m.x, m.y, Math.min(1.25, m.radius / 38));
                            state.score += m.isLarge ? 3 : 1;
                            meteors.splice(mIndex, 1);
                        } else {
                            // 还有生命值，产生小火花效果，大陨石生成固定裂缝几何
                            m.hit = true;    // 标记为已击中，显示裂缝
                            m.cracks = generateCrackGeometry(m.radius);  // 一次性生成固定裂缝
                            createExplosion(m.x, m.y, 0.3);
                        }
                        bullets.splice(bIndex, 1);
                        break;
                    }
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

    /**
     * @description 渲染一个不规则 3D 球体陨石
     * 使用贝塞尔曲线绘制平滑轮廓，径向渐变模拟立体光照，
     * 陨石坑和微纹理增强岩石质感
     * @param {Object} m 陨石对象
     */
    function drawMeteor(m) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rotation);

        const r = m.radius;
        const pts = m.vertices;
        const ctrl = m.ctrlPoints;

        // ---- 第 1 层：绘制不规则轮廓（贝塞尔曲线） ----
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length; i++) {
            const next = pts[(i + 1) % pts.length];
            const cp = ctrl[i];
            ctx.quadraticCurveTo(cp.x, cp.y, next.x, next.y);
        }
        ctx.closePath();

        // ---- 第 2 层：3D 球体渐变 — 5 层光源（左上） ----
        const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.30, 2, 0, 0, r * 1.2);
        grad.addColorStop(0,   m.palette[0]);        // 镜面高光区（亮白/浅黄）
        grad.addColorStop(0.2, m.palette[0]);        // 受光面
        grad.addColorStop(0.5, m.palette[1]);        // 中间调
        grad.addColorStop(0.82, m.palette[2]);       // 暗面过渡
        grad.addColorStop(1,   m.palette[2]);        // 阴影面
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,96,32,0.18)';
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;

        // ---- 第 4 层：陨石坑（透视椭圆模拟球面曲率） ----
        m.craters.forEach((c) => {
            // 根据陨石坑距中心距离计算透视扁率（边缘更扁）
            const dist = Math.sqrt(c.x * c.x + c.y * c.y) / r;
            const flatten = 0.5 + 0.5 * (1 - dist * dist);  // 中心正圆，边缘 1:0.5
            const cr = c.radius * 0.8;  // 坑尺寸缩小 20%
            const angle = Math.atan2(c.y, c.x);

            // 4a. 陨石坑暗色凹陷（透视椭圆）
            ctx.fillStyle = `rgba(10,5,3,${c.alpha + 0.12})`;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, cr * 1.1, cr * 1.1 * flatten, 0, 0, Math.PI * 2);
            ctx.fill();

            // 4b. 陨石坑内侧亮弧（受光侧）
            ctx.beginPath();
            ctx.ellipse(c.x - cr * 0.08, c.y - cr * 0.08, cr * 1.0, cr * 1.0 * flatten, angle, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,210,165,${c.alpha * 0.4})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // 4c. 陨石坑底部暗点（最深的部分）
            ctx.fillStyle = `rgba(8,4,2,${c.alpha + 0.2})`;
            ctx.beginPath();
            ctx.ellipse(c.x + cr * 0.05, c.y + cr * 0.05, cr * 0.5, cr * 0.5 * flatten, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // ---- 第 5 层：表面凹凸纹理 — 使用预先存储的固定数据（不闪烁） ----
        // 5a. 暗色斑点（原有斑点，渲染时加量）
        if (m.specks) {
            m.specks.forEach((sp) => {
                ctx.fillStyle = `rgba(0,0,0,${sp.alpha * 1.2})`;
                ctx.beginPath();
                ctx.ellipse(sp.x, sp.y, sp.size * 1.2, sp.size * 0.8, sp.x * 0.1, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        // 5b. 亮色凸起（受光面的岩石凸起，一次性生成不闪烁）
        if (m.brightSpecks) {
            m.brightSpecks.forEach((sp) => {
                ctx.fillStyle = `rgba(180,160,120,${sp.alpha})`;
                ctx.beginPath();
                ctx.ellipse(sp.x, sp.y, sp.size, sp.elong, sp.x * 0.05, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        // 5c. 细小颗粒（粗糙质感，一次性生成不闪烁）
        if (m.fineGrains) {
            m.fineGrains.forEach((g) => {
                ctx.fillStyle = `rgba(${g.shade}, ${g.shade - 5}, ${g.shade - 8}, ${g.alpha})`;
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // ---- 第 6 层：极微弱高光（无光泽球体只需轻微光照提示） ----
        const specSoft = ctx.createRadialGradient(
            -r * 0.12, -r * 0.16, 0,
            -r * 0.12, -r * 0.16, r * 0.3
        );
        specSoft.addColorStop(0, 'rgba(255,245,230,0.18)');
        specSoft.addColorStop(0.4, 'rgba(255,240,220,0.08)');
        specSoft.addColorStop(1, 'rgba(255,240,220,0)');
        ctx.fillStyle = specSoft;
        ctx.beginPath();
        ctx.arc(-r * 0.12, -r * 0.16, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // ---- 第 7 层：底部阴影弧（增强球体立体感） ----
        const shadowGrad = ctx.createRadialGradient(
            0, r * 0.3, r * 0.4,
            0, 0, r * 1.0
        );
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2);
        ctx.fill();

        // ---- 第 8 层：边缘半透明轮廓线（让球体从背景中突出） ----
        ctx.strokeStyle = `hsla(40, 15%, 60%, 0.08)`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        /* 大陨石被击中后显示裂缝——使用预先存储的固定几何数据，不闪烁 */
        if (m.isLarge && m.hit && m.cracks && m.cracks.length > 0) {
            m.cracks.forEach(function(crack) {
                // 阴影层（偏移 1.5px 增强立体感）
                ctx.strokeStyle = crack.shadow;
                ctx.lineWidth = crack.lineWidth * 0.7;
                ctx.beginPath();
                ctx.moveTo(crack.startX + 1.5, crack.startY + 1.5);
                crack.points.forEach(function(p) {
                    ctx.lineTo(p.x + 1.5, p.y + 1.5);
                });
                ctx.stroke();
                // 主裂缝（黑灰色）
                ctx.strokeStyle = crack.color;
                ctx.lineWidth = crack.lineWidth;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(crack.startX, crack.startY);
                crack.points.forEach(function(p) {
                    ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
        }

        ctx.restore();
    }

    function drawBullets() {
        bullets.forEach((b) => {
            const isMissile = b.type === 'cannon';
            const hw = b.width / 2, hh = b.height / 2;

            if (isMissile) {
                /* 导弹：尖头锥形 + 尾部火焰 + 绚丽烟尘尾迹 */
                // 尾迹烟尘（从近到远渐变，由橙红渐变为灰白）
                b.trail.forEach((t, i) => {
                    const a = (i + 1) / b.trail.length;  // 0~1，旧→新
                    const invA = 1 - a;                    // 1~0，旧→新
                    const r = hw * (0.5 + invA * 1.8);     // 烟圈半径：越旧越大
                    // 烟尘颜色：由橙红渐变到灰白
                    const hue = 30 + invA * 20;
                    const sat = 80 - invA * 40;
                    const lit = 50 + invA * 30;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, a * 0.35);
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = `hsl(25, 90%, 50%)`;
                    // 外层大光圈
                    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${a * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y - 6, r, 0, Math.PI * 2);
                    ctx.fill();
                    // 内层亮核
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = `hsla(30, 100%, 60%, ${a * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y - 6, r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                ctx.save();
                ctx.translate(b.x, b.y);

                // 导弹发光
                ctx.shadowBlur = 24;
                ctx.shadowColor = '#ff8c1e';

                // 导弹弹体（锥形）
                ctx.beginPath();
                ctx.moveTo(0, -hh);                // 弹头尖端
                ctx.lineTo(-hw * 0.4, hh * 0.2);    // 左侧
                ctx.lineTo(-hw * 0.3, hh);           // 左尾
                ctx.lineTo(hw * 0.3, hh);            // 右尾
                ctx.lineTo(hw * 0.4, hh * 0.2);      // 右侧
                ctx.closePath();

                const bodyGrad = ctx.createLinearGradient(0, -hh, 0, hh);
                bodyGrad.addColorStop(0, '#ffd060');
                bodyGrad.addColorStop(0.35, '#ff8c1e');
                bodyGrad.addColorStop(0.7, '#cc4020');
                bodyGrad.addColorStop(1, '#661010');
                ctx.fillStyle = bodyGrad;
                ctx.fill();

                // 尾部火焰（脉动橙色）
                ctx.shadowBlur = 0;
                const flameLen = 6 + Math.sin(state.time * 0.35) * 3;
                const flameGrad = ctx.createLinearGradient(0, hh - 2, 0, hh + flameLen);
                flameGrad.addColorStop(0, 'rgba(255,220,100,0.9)');
                flameGrad.addColorStop(0.4, 'rgba(255,120,20,0.6)');
                flameGrad.addColorStop(1, 'rgba(255,50,0,0)');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(-hw * 0.25, hh - 2);
                ctx.quadraticCurveTo(0, hh + flameLen, hw * 0.25, hh - 2);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            } else {
                /* 普通子弹：矩形 + 拖尾光效 */
                b.trail.forEach((t, i) => {
                    const a = (i + 1) / b.trail.length;
                    ctx.fillStyle = `rgba(${b.color},${a * 0.2})`;
                    ctx.fillRect(t.x - b.width * a, t.y, b.width * 2 * a, b.height * a);
                });
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rotation);
                ctx.shadowBlur = 16;
                ctx.shadowColor = b.glow;
                const grad = ctx.createLinearGradient(0, -b.height / 2, 0, b.height / 2);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.35, `rgb(${b.color})`);
                grad.addColorStop(1, 'rgba(255,80,20,0.45)');
                ctx.fillStyle = grad;
                ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
                ctx.restore();
            }
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
        // 冲击波圆圈：仅在 DEBUG 模式下显示
        if (DEBUG) {
            shockwaves.forEach((s) => {
                const a = s.life / s.maxLife;
                ctx.strokeStyle = `rgba(255,230,190,${0.52 * a})`;
                ctx.lineWidth = 3 + (1 - a) * 8;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.stroke();
            });
        }
        // 热浪（半透明渐变圆，非描边圆圈，始终显示）
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

    /**
     * @description 渲染一帧画面：背景、特效、陨石、子弹、飞船、粒子、闪白
     */
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
            <div class="hud-row" style="font-size:12px;opacity:.78">左键或J子弹 右键或K导弹 方向键移动</div>
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

    /**
     * @description 开始新游戏，重置实体状态、隐藏覆盖层、显示移动端按钮、启动游戏循环
     */
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
        // 显示移动端控制按钮（子弹 + 导弹）
        if (mobileControls) mobileControls.style.display = 'flex';
        if (canvas) canvas.style.cursor = 'none';
        // 启动游戏循环（只有一次，避免重复启动）
        if (!animationFrameId) {
            startGameLoop();
        }
    }

    /**
     * @description 游戏结束处理：显示分数、生存时间、弹出 Game Over 覆盖层
     */
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
        if (mobileControls) mobileControls.style.display = 'none';
    }
    function resetGame() {
        startGame();
    }
    function initAllModules() {
        initCanvas();
        initBackgroundStars();
        initInput();
        mobileControls = document.getElementById('mobileControls');
        window.startGame = startGame;
        window.resetGame = resetGame;
        window.gameOver = gameOver;
        console.log('[Space War] 太空战机准备就绪。单击「开始游戏」启动。');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllModules);
    } else {
        initAllModules();
    }
})();
