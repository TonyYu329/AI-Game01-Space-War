/**
 * @description Enhanced Visual Effects: Parallax, Glow, Screen Shake, Realistic Rendering.
 */
import { 
    GAME_STATE, 
    gameState, 
    plane, 
    meteors, 
    bullets, 
    particles, 
    backgroundStars,
    canvas,
    ctx
} from './entities.js';

// ============================================================
// === ENHANCED VISUAL CONSTANTS ===============================
// ============================================================

const VISUAL_CONFIG = {
    // 飞船增强配置
    ship: {
        glowIntensity: 25,           // 增强的辉光强度
        engineFlameLayers: 3,        // 多层引擎火焰
        flameColors: ['#ff6600', '#ff4400', '#ff2200'],  // 更丰富的火焰颜色
        wingGlowColor: '#00ffff',    // 机翼辉光色
        cockpitHighlight: 'rgba(255,255,255,0.9)',
        bodyGradient: {
            light: '#4ff',
            mid: '#3d8',
            dark: '#266'
        }
    },
    
    // 陨石增强配置
    meteor: {
        textureVariants: [           // 多种纹理变体
            ['#a52a2a', '#8b1e1e'],  // 深红岩石
            ['#8b4513', '#5c2d0f'],  // 棕色岩石
            ['#654321', '#3d2917'],  // 暗木色
            ['#cd853f', '#8b6914']   // 金色岩石
        ],
        highlightIntensity: 0.3,     // 高光强度
        shadowDepth: 0.15,           // 阴影深度
        rotationSpeedBase: 0.02,     // 基础旋转速度
        vertexJitter: 8             // 顶点抖动幅度（不规则感）
    },
    
    // 爆炸增强配置
    explosion: {
        coreSize: 15,                // 核心大小
        particleBursts: [            // 多层粒子爆发
            { count: 20, speed: 8,   // 外层碎片
              life: 60, 
              colors: ['#ff4400', '#ff6600'],
              drag: 0.95 },
            { count: 30, speed: 5,   // 中层火花
              life: 80, 
              colors: ['#ffff00', '#ffaa00'],
              drag: 0.94 },
            { count: 15, speed: 3,   // 内层核心碎片
              life: 120,
              colors: ['#ffffff', '#ffcc00'],
              drag: 0.98 }
        ],
        shockwaveRadius: 200,        // 冲击波半径
        shakeDuration: 15            // 屏幕震动持续时间
    },
    
    // 子弹增强配置
    bullet: {
        trailLength: 8,              // 更长的拖尾
        glowIntensity: 20,           // 辉光强度
        rotationSpeed: 0.1,          // 旋转效果
        flashOnFire: true            // 击中时闪光
    },
    
    // 背景星星增强配置
    stars: {
        parallaxLayers: [            // 多层视差
            { speed: 0.5, count: 200, size: 1.5, brightness: 0.4 },
            { speed: 0.8, count: 300, size: 1,   brightness: 0.6 },
            { speed: 1.2, count: 100, size: 0.7,  brightness: 0.8 }
        ],
        twinkleEffect: true          // 闪烁效果
    }
};

// ============================================================
// === SHIP VISUAL ENHANCEMENTS ================================
// ============================================================

/**
 * 绘制增强版飞船 - 多层立体感、动态火焰、机翼辉光
 */
export function drawEnhancedPlane() {
    const centerX = plane.x + plane.width / 2;
    const centerY = plane.y + plane.height / 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // 1. 动态倾斜效果（根据速度）
    const tiltAngle = Math.min(0.3, Math.max(-0.3, (plane.speed - 5) * 0.05));
    ctx.rotate(tiltAngle);
    
    // 2. 引擎火焰 - 多层渐变效果
    drawMultiLayerFlame();
    
    // 3. 机身主体 - 渐变立体感
    drawShipBodyWithGradient();
    
    // 4. 机翼辉光
    drawWingGlow();
    
    // 5. 座舱细节
    drawCockpitDetail();
    
    ctx.restore();
}

/**
 * 多层引擎火焰效果 - 模拟真实火焰的多层结构
 */
function drawMultiLayerFlame() {
    const baseHeight = plane.height / 2 + 10;
    
    // 外层火焰（最大、最透明）
    for (let layer = 0; layer < VISUAL_CONFIG.ship.engineFlameLayers; layer++) {
        const scale = 1.3 - layer * 0.15;
        const heightOffset = baseHeight * (1 + layer * 0.2);
        
        ctx.save();
        ctx.scale(scale, scale);
        
        // 动态火焰高度
        const dynamicHeight = heightOffset + Math.random() * 8;
        
        // 渐变颜色
        const gradient = ctx.createLinearGradient(0, 0, 0, -dynamicHeight);
        gradient.addColorStop(0, VISUAL_CONFIG.ship.flameColors[0]);
        gradient.addColorStop(0.4, VISUAL_CONFIG.ship.flameColors[1]);
        gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-plane.width/6, 0);
        ctx.quadraticCurveTo(0, -dynamicHeight, plane.width/6, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * 机身主体绘制 - 使用渐变创造立体感
 */
function drawShipBodyWithGradient() {
    // 创建径向渐变模拟球体效果
    const radius = plane.width / 2;
    const gradient = ctx.createRadialGradient(0, -radius/4, radius/6, 0, 0, radius);
    
    gradient.addColorStop(0, VISUAL_CONFIG.ship.bodyGradient.light);
    gradient.addColorStop(0.5, VISUAL_CONFIG.ship.bodyGradient.mid);
    gradient.addColorStop(1, VISUAL_CONFIG.ship.bodyGradient.dark);
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = VISUAL_CONFIG.ship.glowIntensity;
    ctx.shadowColor = VISUAL_CONFIG.ship.wingGlowColor;
    
    // 机身多边形
    ctx.beginPath();
    ctx.moveTo(0, -plane.height/2);      // 机头
    ctx.lineTo(plane.width/3, plane.height/2);   // 右翼前缘
    ctx.quadraticCurveTo(0, plane.height/4, -plane.width/3, plane.height/2);  // 右后部
    ctx.closePath();
    ctx.fill();
    
    // 添加高光反射
    ctx.shadowBlur = 0;
    const highlightGradient = ctx.createLinearGradient(-radius/3, -radius/3, radius/3, radius/3);
    highlightGradient.addColorStop(0, 'rgba(255,255,255,0.4)');
    highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.moveTo(-plane.width/3, plane.height/2);
    ctx.quadraticCurveTo(0, plane.height/4, plane.width/3, plane.height/2);
    ctx.closePath();
    ctx.fill();
}

/**
 * 机翼辉光效果
 */
function drawWingGlow() {
    const wingOffset = plane.width / 6;
    
    // 右翼辉光
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = VISUAL_CONFIG.ship.wingGlowColor;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    
    ctx.beginPath();
    ctx.arc(wingOffset, plane.height/2, wingOffset/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // 左翼辉光
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = VISUAL_CONFIG.ship.wingGlowColor;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    
    ctx.beginPath();
    ctx.arc(-wingOffset, plane.height/2, wingOffset/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/**
 * 座舱细节绘制
 */
function drawCockpitDetail() {
    // 主座舱窗
    const cockpitX = -plane.width/6;
    const cockpitY = -plane.height/4 + plane.height/8;
    
    ctx.save();
    ctx.shadowBlur = 5;
    ctx.shadowColor = VISUAL_CONFIG.ship.cockpitHighlight;
    ctx.fillStyle = VISUAL_CONFIG.ship.cockpitHighlight;
    
    // 座舱窗椭圆
    ctx.beginPath();
    ctx.ellipse(cockpitX, cockpitY, plane.width/8, plane.height/12, 
                -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // 座舱内反光
    const reflectionGradient = ctx.createLinearGradient(
        cockpitX - plane.width/16, cockpitY - plane.height/8,
        cockpitX + plane.width/16, cockpitY + plane.height/8
    );
    reflectionGradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    reflectionGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = reflectionGradient;
    ctx.beginPath();
    ctx.ellipse(cockpitX, cockpitY, plane.width/8, plane.height/12, 
                -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// ============================================================
// === METEOR VISUAL ENHANCEMENTS ==============================
// ============================================================

/**
 * 增强版陨石绘制 - 不规则形状、多层纹理、动态高光
 */
export function drawEnhancedMeteors() {
    meteors.forEach((meteor) => {
        if (meteor.y < canvas.height + 150) {
            meteor.y += meteor.speed;
            
            ctx.save();
            
            // 旋转中心
            const centerX = meteor.x;
            const centerY = meteor.y;
            
            // 动态旋转角度
            let rotation = meteor.rotation || Math.random() * Math.PI * 2;
            meteor.rotationSpeed = (meteor.rotationSpeed || VISUAL_CONFIG.meteor.rotationSpeedBase) + 
                                  (Math.random() - 0.5) * 0.01;
            rotation += meteor.rotationSpeed;
            
            ctx.rotate(rotation);
            
            // 生成不规则顶点
            const vertices = generateIrregularVertices(meteor.width, meteor.height);
            
            // 随机选择纹理变体
            const textureColors = VISUAL_CONFIG.meteor.textureVariants[
                Math.floor(Math.random() * VISUAL_CONFIG.meteor.textureVariants.length)
            ];
            
            // 1. 绘制不规则形状
            ctx.beginPath();
            vertices.forEach((v, i) => {
                if (i === 0) ctx.moveTo(centerX + v.x, centerY + v.y);
                else ctx.lineTo(centerX + v.x, centerY + v.y);
            });
            ctx.closePath();
            
            // 2. 多层渐变填充
            const radius = meteor.width / 2;
            const gradient = ctx.createRadialGradient(
                centerX - radius/4, centerY - radius/4, radius/8,
                centerX, centerY, radius
            );
            
            gradient.addColorStop(0, textureColors[0]);
            gradient.addColorStop(0.3, textureColors[1]);
            gradient.addColorStop(0.6, '#2a1510');
            gradient.addColorStop(1, '#1a0d08');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // 3. 高光效果 - 模拟光照反射
            const highlightGradient = ctx.createRadialGradient(
                centerX - radius/6, centerY - radius/6, radius/12,
                centerX + radius/4, centerY + radius/8, radius/3
            );
            highlightGradient.addColorStop(0, `rgba(255, 200, 150, ${VISUAL_CONFIG.meteor.highlightIntensity})`);
            highlightGradient.addColorStop(0.5, 'rgba(255, 180, 140, 0.3)');
            highlightGradient.addColorStop(1, 'rgba(255, 160, 130, 0)');
            
            ctx.fillStyle = highlightGradient;
            ctx.fill();
            
            // 4. 阴影深度效果
            const shadowGradient = ctx.createRadialGradient(
                centerX + radius/4, centerY + radius/4, radius/6,
                centerX + radius/2, centerY + radius/2, radius * 1.5
            );
            shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            shadowGradient.addColorStop(1, `rgba(0, 0, 0, ${VISUAL_CONFIG.meteor.shadowDepth})`);
            
            ctx.fillStyle = shadowGradient;
            ctx.fill();
            
            // 5. 边缘高光（模拟锐利边缘）
            ctx.strokeStyle = 'rgba(255, 180, 140, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.restore();
        }
    });
}

/**
 * 生成不规则顶点 - 模拟自然岩石形状
 */
function generateIrregularVertices(width, height) {
    const vertices = [];
    const jitterAmount = VISUAL_CONFIG.meteor.vertexJitter;
    
    // 基础椭圆轮廓
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const baseX = Math.cos(angle) * width / 2;
        const baseY = Math.sin(angle) * height / 2;
        
        // 添加不规则抖动
        const jitterX = (Math.random() - 0.5) * jitterAmount;
        const jitterY = (Math.random() - 0.5) * jitterAmount;
        
        vertices.push({ x: baseX + jitterX, y: baseY + jitterY });
    }
    
    // 添加一些额外的顶点增加细节
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = width / 3 + (Math.random() - 0.5) * jitterAmount;
        vertices.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    
    return vertices;
}

// ============================================================
// === EXPLOSION VISUAL ENHANCEMENTS ===========================
// ============================================================

/**
 * 增强版爆炸效果 - 多层粒子、冲击波、屏幕震动
 */
export function drawEnhancedExplosion(x, y) {
    // 1. 冲击波效果
    if (gameState.shakeIntensity < VISUAL_CONFIG.explosion.shakeDuration) {
        gameState.shakeIntensity = Math.min(
            gameState.shakeIntensity + 5, 
            VISUAL_CONFIG.explosion.shakeDuration
        );
        
        ctx.save();
        const shakeX = (Math.random() - 0.5) * gameState.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * gameState.shakeIntensity;
        ctx.translate(shakeX, shakeY);
        
        // 冲击波环
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, VISUAL_CONFIG.explosion.shockwaveRadius, 0, Math.PI * 2);
        const shockGradient = ctx.createRadialGradient(
            x, y, VISUAL_CONFIG.explosion.shockwaveRadius * 0.8,
            x, y, VISUAL_CONFIG.explosion.shockwaveRadius
        );
        shockGradient.addColorStop(0, 'rgba(255, 200, 150, 0.3)');
        shockGradient.addColorStop(0.5, 'rgba(255, 180, 140, 0.15)');
        shockGradient.addColorStop(1, 'rgba(255, 160, 130, 0)');
        
        ctx.fillStyle = shockGradient;
        ctx.fill();
        ctx.restore();
        
        ctx.restore();
    } else {
        gameState.shakeIntensity *= 0.8; // 衰减
    }
    
    // 2. 多层粒子爆发
    VISUAL_CONFIG.explosion.particleBursts.forEach((burst, burstIndex) => {
        createExplosionParticles(x, y, burst);
    });
}

/**
 * 创建爆炸粒子
 */
function createExplosionParticles(x, y, burstConfig) {
    const colors = burstConfig.colors;
    
    for (let i = 0; i < burstConfig.count; i++) {
        // 随机方向
        const angle = Math.random() * Math.PI * 2;
        const speed = burstConfig.speed * (0.5 + Math.random());
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: burstConfig.size || 2 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: burstConfig.life || 60,
            maxLife: burstConfig.life || 60,
            type: 'explosion',
            drag: burstConfig.drag || 0.95
        });
    }
}

/**
 * 更新和绘制爆炸粒子
 */
export function updateAndDrawExplosionParticles() {
    particles = particles.filter(particle => {
        if (particle.type === 'explosion') {
            // 物理更新
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 摩擦/阻力
            particle.vx *= particle.drag;
            particle.vy *= particle.drag;
            
            // 重力效果（轻微下沉）
            particle.vy += 0.1;
            
            // 绘制
            ctx.save();
            const alpha = Math.min(1, particle.life / particle.maxLife);
            
            // 脉冲发光效果
            const pulseSize = 1 + Math.sin(particle.life * 0.2) * 0.3;
            ctx.scale(pulseSize, pulseSize);
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            // 渐变颜色
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
            gradient.addColorStop(0.3, particle.color);
            gradient.addColorStop(1, `rgba(${particle.color}, ${alpha * 0.4})`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // 外发光效果
            if (Math.random() < 0.3) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
            }
            
            ctx.restore();
            
            // 生命周期管理
            particle.life--;
            return particle.life > 0;
        }
        
        // 其他类型的粒子（原有逻辑）
        const drag = particle.type === 'smoke' ? 0.99 : 0.96;
        particle.vx *= drag;
        particle.vy *= drag;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        
        let opacity = Math.min(1, particle.size / 2);
        if (particle.type === 'core') {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
        } else if (particle.type === 'flame') {
            ctx.fillStyle = `${particle.color}, ${opacity * 0.8}`;
            ctx.shadowBlur = 5;
            ctx.shadowColor = particle.color;
        } else {
            ctx.fillStyle = `rgba(100, 100, 100, ${opacity * 0.4})`;
        }
        
        ctx.fill();
        ctx.restore();
        
        const decay = particle.type === 'smoke' ? 0.01 : 0.04;
        if (particle.size > 0.1) {
            particle.size -= decay;
            return true;
        } else {
            return false;
        }
    });
}

// ============================================================
// === BULLET VISUAL ENHANCEMENTS ==============================
// ============================================================

/**
 * 增强版子弹绘制 - 旋转、拖尾、闪光效果
 */
export function drawEnhancedBullets() {
    bullets = bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        
        // 1. 动态旋转效果
        if (!bullet.rotation) bullet.rotation = Math.random() * Math.PI * 2;
        bullet.rotation += VISUAL_CONFIG.bullet.rotationSpeed;
        
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(bullet.rotation);
        
        // 2. 多层拖尾效果
        const trailLength = VISUAL_CONFIG.bullet.trailLength;
        for (let i = 1; i <= trailLength; i++) {
            const alpha = i / trailLength * 0.3;
            const scale = 1 - i / trailLength * 0.5;
            
            ctx.save();
            ctx.scale(scale, scale);
            ctx.rotate(bullet.rotation + (i - 1) * 0.1);
            
            // 渐变拖尾颜色
            const gradient = ctx.createLinearGradient(
                -bullet.width/2, -bullet.height/2,
                bullet.width/2, bullet.height/2
            );
            gradient.addColorStop(0, `rgba(${bullet.color}, ${alpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${bullet.color}, ${alpha * 0.2})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-bullet.width/2, -bullet.height/2, bullet.width, bullet.height);
            ctx.restore();
        }
        
        // 3. 主子弹体 - 多层辉光
        const mainGlow = VISUAL_CONFIG.bullet.glowIntensity;
        ctx.shadowBlur = mainGlow;
        ctx.shadowColor = `rgba(${bullet.color}, 0.8)`;
        
        // 渐变填充
        const bodyGradient = ctx.createLinearGradient(
            -bullet.width/2, -bullet.height/2,
            bullet.width/2, bullet.height/2
        );
        bodyGradient.addColorStop(0, `rgba(${bullet.color}, 1)`);
        bodyGradient.addColorStop(0.5, `rgba(${bullet.color}, 0.7)`);
        bodyGradient.addColorStop(1, `rgba(${bullet.color}, 0.4)`);
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-bullet.width/2, -bullet.height/2, bullet.width, bullet.height);
        
        // 4. 高光反射
        const highlightGradient = ctx.createLinearGradient(
            -bullet.width/3, -bullet.height/3,
            bullet.width/3, bullet.height/3
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(-bullet.width/3, -bullet.height/3, bullet.width/3, bullet.height/3);
        
        // 5. 边缘高光
        ctx.shadowBlur = 0;
        const edgeGlow = ctx.createLinearGradient(
            -bullet.width/2, -bullet.height/2,
            bullet.width/2, bullet.height/2
        );
        edgeGlow.addColorStop(0, `rgba(${bullet.color}, 0.3)`);
        edgeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = edgeGlow;
        ctx.fillRect(-bullet.width/2, -bullet.height/2, bullet.width/2, bullet.height/2);
        
        ctx.restore();
        
        return bullet.y > 0;
    });
}

// ============================================================
// === BACKGROUND STAR ENHANCEMENTS =============================
// ============================================================

/**
 * 增强版背景星星 - 多层视差、闪烁效果
 */
export function drawEnhancedBackground() {
    // 多层视差星星
    VISUAL_CONFIG.stars.parallaxLayers.forEach((layer, layerIndex) => {
        backgroundStars.forEach(star => {
            // 每帧更新位置
            star.x += star.speedX * layer.speed;
            star.y += star.speedY * layer.speed;
            
            if (star.x > canvas.width + layer.size) star.x = -layer.size;
            if (star.y > canvas.height + layer.size) star.y = -layer.size;
            
            // 闪烁效果
            let twinkleAlpha = layer.brightness;
            if (VISUAL_CONFIG.stars.twinkleEffect && Math.random() < 0.1) {
                twinkleAlpha *= (0.5 + Math.random());
            }
            
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkleAlpha})`;
            ctx.fillRect(star.x, star.y, layer.size, layer.size);
        });
    });
}

// ============================================================
// === MAIN RENDER FUNCTION ====================================
// ============================================================

/**
 * 主渲染函数 - 整合所有增强效果
 */
export function renderEnhanced() {
    // 1. 背景星星（多层视差）
    drawEnhancedBackground();
    
    // 2. 飞船
    drawEnhancedPlane();
    
    // 3. 陨石
    drawEnhancedMeteors();
    
    // 4. 子弹
    drawEnhancedBullets();
    
    // 5. 粒子（包括爆炸）
    updateAndDrawExplosionParticles();
    
    // 6. 屏幕震动
    if (gameState.shakeIntensity > 0) {
        const dx = (Math.random() - 0.5) * gameState.shakeIntensity;
        const dy = (Math.random() - 0.5) * gameState.shakeIntensity;
        
        ctx.save();
        ctx.translate(dx, dy);
        gameState.shakeIntensity *= 0.9;
        
        if (gameState.shakeIntensity < 0.1) {
            gameState.shakeIntensity = 0;
            ctx.restore();
        }
    }
    
    // 7. UI/界面（如果有）
    drawUIOverlay();
}

/**
 * 绘制 UI 覆盖层
 */
function drawUIOverlay() {
    const alpha = Math.min(1, gameState.shakeIntensity / 20);
    
    ctx.save();
    if (alpha > 0) {
        // 震动模糊效果
        ctx.filter = `blur(${alpha * 3}px)`;
    }
    
    // 这里可以添加血条、分数等 UI
    // drawHealthBar();
    // drawScore();
    
    ctx.restore();
}

// ============================================================
// === EXPORTED FUNCTIONS =====================================
// ============================================================

export {
    VISUAL_CONFIG,           // 可视化配置对象
    drawEnhancedPlane,       // 增强飞船绘制
    drawEnhancedMeteors,     // 增强陨石绘制
    createExplosionParticles,// 创建爆炸粒子
    drawEnhancedBullets,     // 增强子弹绘制
    drawEnhancedBackground   // 增强背景绘制
};
