/**
 * @file index_3d.js — 3D 渲染叠加层
 * @description Three.js WebGL 透明画布，渲染 3D 战机和陨石
 *              叠在 2D 游戏画布之上，不参与游戏逻辑
 * @date 2026-06-02
 * @version 4.1.0
 */
const DESIGN_HEIGHT = 600;

let renderer, scene, camera;
let canvas3d;
let planeGroup = null;  // 3D 战机已禁用（使用 2D plane128.png）
let meteorMeshes = [];
let meteorMeshMap = new WeakMap();
/* 18 色调色板：覆盖极宽颜色范围，每颗陨石明显不同（glow为辉光色） */
const meteorPalettes = [
    { base: [0x7a5a3a, 0x3a2216, 0x0c0808], highlight: 0x9a7a5a, glow: 0xff6622 },  // 暖棕岩
    { base: [0x5a4a4a, 0x282018, 0x080808], highlight: 0x7a6a6a, glow: 0xff8844 },  // 暗灰岩
    { base: [0x8a4830, 0x402018, 0x0e0808], highlight: 0xaa6848, glow: 0xff5518 },  // 铁锈红
    { base: [0x9a7a40, 0x483818, 0x0a0804], highlight: 0xba9a60, glow: 0xffcc44 },  // 金黄岩
    { base: [0x4a443a, 0x201a16, 0x060606], highlight: 0x6a645a, glow: 0xff7730 },  // 黑曜岩
    { base: [0x786050, 0x382a1e, 0x0c0a08], highlight: 0x988068, glow: 0xff9940 },  // 暖灰岩
    { base: [0x4a5a6a, 0x1a222e, 0x080a0e], highlight: 0x6a7a8a, glow: 0x44aaff },  // 蓝钢岩
    { base: [0x5a5a3a, 0x28281a, 0x080806], highlight: 0x7a7a5a, glow: 0x88cc44 },  // 橄榄绿
    { base: [0x6a4a6a, 0x2e1a2e, 0x0a080a], highlight: 0x8a6a8a, glow: 0xcc66ff },  // 紫灰岩
    { base: [0x3a6a5a, 0x1a3028, 0x060e0a], highlight: 0x5a8a7a, glow: 0x44ffaa },  // 铜绿岩
    { base: [0x8a7a5a, 0x4a3828, 0x0e0a06], highlight: 0xaa9a7a, glow: 0xffcc66 },  // 沙色岩
    { base: [0x6a3a2a, 0x3a1a10, 0x0a0402], highlight: 0x8a5a4a, glow: 0xff8844 },  // 巧克力
    { base: [0x6a6a6a, 0x2a2a2a, 0x0a0a0a], highlight: 0x8a8a8a, glow: 0x88bbff },  // 银灰岩
    { base: [0x8a2a2a, 0x4a1010, 0x0e0000], highlight: 0xaa4a4a, glow: 0xff4444 },  // 绯红岩
    { base: [0x8a5a20, 0x4a2a08, 0x0e0600], highlight: 0xaa7a40, glow: 0xff8800 },  // 焦橙岩
    { base: [0x2a5a5a, 0x122a2a, 0x040808], highlight: 0x4a7a7a, glow: 0x44ffff },  // 暗青岩
    { base: [0x3a3a3a, 0x1a1a1a, 0x040404], highlight: 0x5a5a5a, glow: 0xffaa55 },  // 炭黑岩
    { base: [0x7a6a4a, 0x3a2e1a, 0x0a0806], highlight: 0x9a8a6a, glow: 0xffcc44 }   // 青铜岩
];

/* 装饰模式（idle 状态） */
let decorMeteor = null;
let decorPlaneClone = null;
let decorAnimId = null;
let decorTimer = 0;

function init() {
    window._3dReady = false;
    try {
        canvas3d = document.getElementById('canvas3d');
        if (!canvas3d) {
            canvas3d = document.createElement('canvas');
            canvas3d.id = 'canvas3d';
            document.body.appendChild(canvas3d);
        }
        canvas3d.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1;';

        renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: false, alpha: true });
        renderer.setPixelRatio(1);
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene = new THREE.Scene();

        const aspect = window.innerWidth / window.innerHeight;
        const fh = DESIGN_HEIGHT;
        const fw = fh * aspect;
        camera = new THREE.OrthographicCamera(-fw / 2, fw / 2, fh / 2, -fh / 2, 0.1, 100);
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0x333355, 0.5));
        const sun = new THREE.DirectionalLight(0xffffcc, 1.0);
        sun.position.set(4, 6, 10);
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0x335577, 0.4);
        fill.position.set(-3, -1, 5);
        scene.add(fill);

        // buildPlaneModel() removed — 2D only, plane128.png
        buildDecorScene();
        window.addEventListener('resize', onResize);

        window._3dReady = true;
        requestAnimationFrame(loop);
    } catch (e) {
        console.warn('[3D] 初始化失败，使用 2D 回退:', e.message);
        window._3dReady = false;
        if (canvas3d) canvas3d.style.display = 'none';
    }
}

function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const aspect = window.innerWidth / window.innerHeight;
    const fh = DESIGN_HEIGHT;
    const fw = fh * aspect;
    camera.left = -fw / 2;
    camera.right = fw / 2;
    camera.top = fh / 2;
    camera.bottom = -fh / 2;
    camera.updateProjectionMatrix();
}


/* ---- 3D 陨石创建 ---- */
function createMeteor3D(m) {
    const r = m.radius;
    const segs = 28;
    const rings = 22;
    const geo = new THREE.SphereGeometry(r, segs, rings);

    const pos = geo.attributes.position;
    const s1 = Math.random() * 100, s2 = Math.random() * 100, s3 = Math.random() * 100;
    const s4 = Math.random() * 100;

    /* 生成随机环形山中心（球面坐标） */
    const craterCount = 10 + Math.floor(Math.random() * 13);
    const craters = [];
    for (let c = 0; c < craterCount; c++) {
        craters.push({
            phi: Math.random() * Math.PI * 0.85 + 0.075,
            theta: Math.random() * Math.PI * 2,
            radius: (0.08 + Math.random() * 0.25) * r,
            depth: (0.15 + Math.random() * 0.28) * r
        });
    }

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;

        /* FBM 6 层 octave 噪声 */
        let fbm = 0, amp = 1, freq = 1, total = 0;
        for (let o = 0; o < 6; o++) {
            fbm += (Math.sin(nx * 8 * freq + s1) * Math.cos(ny * 10 * freq + s2)
                  + Math.sin((nx + ny) * 6 * freq + s3) * 0.5
                  + Math.cos((ny + nz) * 7 * freq + s1) * 0.3
                  + Math.cos((nx - nz) * 5 * freq + s4) * 0.25) * amp;
            total += amp;
            amp *= 0.5;
            freq *= 2.5;
        }
        /* 柔和变形：减少凸起，增强凹陷感 */
        let noise = fbm / total;
        noise = Math.sign(noise) * Math.pow(Math.abs(noise), 1.30) * 0.22;

        /* 环形山凹陷 */
        let craterDisp = 0;
        craters.forEach((cr) => {
            const dPhi = ny - Math.cos(cr.phi);
            const dTheta = Math.atan2(nz, nx) - cr.theta;
            const angDist = Math.sqrt(dPhi * dPhi + dTheta * dTheta) * r;
            const crR = cr.radius;
            if (angDist < crR) {
                /* 坑内：向内凹陷 */
                const t = angDist / crR;
                craterDisp -= cr.depth * (1 - t * t) * 0.8;
            } else if (angDist < crR * 1.2) {
                /* 坑缘：明显隆起 */
                const t = (angDist - crR) / (crR * 0.2);
                craterDisp += cr.depth * 0.18 * (1 - t * t);
            }
        });

        pos.setXYZ(i,
            x + nx * (noise * r + craterDisp),
            y + ny * (noise * r + craterDisp),
            z + nz * (noise * r + craterDisp)
        );
    }
    geo.computeVertexNormals();

    const pIdx = Math.floor(Math.random() * meteorPalettes.length);
    const pal = meteorPalettes[pIdx];

    /* 顶点颜色：深黑金属岩石 + 内部熔岩暖光透出 */
    const sVar = Math.random() * 100;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x*x + y*y + z*z);
        const nx = x/len, ny = y/len, nz = z/len;
        /* 以噪声混合主色/中色/暗色 — 暗色主导（55%） */
        const mix = (Math.sin(nx*7+sVar)*Math.cos(ny*9+sVar)*Math.sin(nz*5+sVar)) * 0.5 + 0.5;
        const baseIdx = mix < 0.55 ? 2 : mix < 0.85 ? 1 : 0;
        const c = new THREE.Color(pal.base[baseIdx]);

        /* 凹陷区域透出熔岩辉光（顶点距球心小于原始半径时） */
        const indent = (r - len) / r;  // 正值=凹陷
        if (indent > 0.05) {
            c.lerp(new THREE.Color(pal.glow), Math.min(1, indent * 2.5));
        }

        /* 朝向光源的方向添加强烈高光（金属反光感） */
        const lightDir = new THREE.Vector3(0.6, 0.3, 0.8).normalize();
        const vNorm = new THREE.Vector3(nx, ny, nz);
        const dot = vNorm.dot(lightDir);
        if (dot > 0.25) c.lerp(new THREE.Color(pal.highlight), (dot - 0.25) * 0.8);
        if (dot < -0.15) c.lerp(new THREE.Color(0x030304), Math.min(1, (-dot - 0.15) * 0.5));
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.65 + Math.random() * 0.20,
        metalness: 0.01 + Math.random() * 0.03,
        emissive: new THREE.Color(0x221100),
        emissiveIntensity: 0.25
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.rotX = (Math.random() - 0.5) * 0.03;
    mesh.userData.rotY = (Math.random() - 0.5) * 0.035;
    mesh.userData.rotZ = (Math.random() - 0.5) * 0.025;
    mesh.userData.meteorRef = m;
    mesh.userData.crackLines = null;
    /* 大型陨石内部点光源（模拟熔岩光照亮周围） */
    if (m.isLarge) {
        const ptLight = new THREE.PointLight(pal.glow, 0.3 + Math.random() * 0.3, r * 2.5);
        ptLight.position.set(0, 0, 0);
        mesh.add(ptLight);
        mesh.userData.pointLight = ptLight;
    }

    scene.add(mesh);
    return mesh;
}

/* ---- 裂纹线生成（大裂纹 + 分支，模拟快要散架的岩石） ---- */
function generateCrackLines(radius) {
    const lines = [];
    const count = 12 + Math.floor(Math.random() * 5);
    const r = radius;
    for (let c = 0; c < count; c++) {
        // 偏向屏幕正面（+Z 半球），确保正面至少 6 条可见
        let phi = Math.random() * Math.PI * 0.85 + 0.075;
        let theta = Math.PI * 0.3 + Math.random() * Math.PI * 1.4;
        const pts = [];
        /* 更长的主裂纹：15 段 */
        for (let s = 0; s < 15; s++) {
            phi += (Math.random() - 0.5) * 0.35;
            theta += (Math.random() - 0.5) * 0.35;
            phi = Math.max(0.03, Math.min(Math.PI - 0.03, phi));
            pts.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * r * 0.995,
                Math.cos(phi) * r * 0.995,
                Math.sin(phi) * Math.sin(theta) * r * 0.995
            ));
        }
        const offX = (Math.random() - 0.5) * 1.8;
        const offY = (Math.random() - 0.5) * 1.8;
        const offZ = (Math.random() - 0.5) * 1.8;

        /* 第 1 层：外层大范围发光（熔岩暖光） */
        const g1Pts = pts.map((p) => new THREE.Vector3(p.x + offX*2.2, p.y + offY*2.2, p.z + offZ*2.2));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g1Pts),
            new THREE.LineBasicMaterial({ color: 0xff5518, depthTest: true })));

        /* 第 2 层：内层发光（橙红熔岩光） */
        const g2Pts = pts.map((p) => new THREE.Vector3(p.x + offX*1.3, p.y + offY*1.3, p.z + offZ*1.3));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g2Pts),
            new THREE.LineBasicMaterial({ color: 0xff8833, depthTest: true })));

        /* 第 3 层：阴影偏移 */
        const shPts = pts.map((p) => new THREE.Vector3(p.x + offX, p.y + offY, p.z + offZ));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shPts),
            new THREE.LineBasicMaterial({ color: 0x050302, depthTest: true })));

        /* 第 4 层：主裂纹（深黑带暖底） */
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x1a0804, depthTest: true })));

        /* 第 5 层：极亮熔岩线 */
        const g5Pts = pts.map((p) => new THREE.Vector3(p.x + offX*0.2, p.y + offY*0.2, p.z + offZ*0.2));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g5Pts),
            new THREE.LineBasicMaterial({ color: 0xffcc44, depthTest: true })));

        /* 50% 概率生成分支裂纹 */
        if (Math.random() > 0.5 && pts.length > 5) {
            const bp = pts[Math.floor(pts.length * 0.4)];
            const brPts = [bp.clone()];
            let bPhi = phi + (Math.random() - 0.5) * 0.6;
            let bTheta = theta + (Math.random() - 0.5) * 0.6;
            for (let s = 0; s < 6; s++) {
                bPhi += (Math.random() - 0.5) * 0.4;
                bTheta += (Math.random() - 0.5) * 0.4;
                bPhi = Math.max(0.05, Math.min(Math.PI - 0.05, bPhi));
                brPts.push(new THREE.Vector3(
                    Math.sin(bPhi) * Math.cos(bTheta) * r * 0.99,
                    Math.cos(bPhi) * r * 0.99,
                    Math.sin(bPhi) * Math.sin(bTheta) * r * 0.99
                ));
            }
            lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(brPts),
                new THREE.LineBasicMaterial({ color: 0x1a0804, depthTest: true })));
            /* 分支阴影 */
            const brShPts = brPts.map((p) => new THREE.Vector3(p.x + offX*0.6, p.y + offY*0.6, p.z + offZ*0.6));
            lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(brShPts),
                new THREE.LineBasicMaterial({ color: 0x060302, depthTest: true })));
        }
    }
    return lines;
}

function syncMeteors(meteors) {
    /* 清除不存在的陨石 */
    for (let i = meteorMeshes.length - 1; i >= 0; i--) {
        const mesh = meteorMeshes[i];
        if (!meteors.includes(mesh.userData.meteorRef)) {
            /* 清理裂纹线 */
            if (mesh.userData.crackLines) {
                mesh.userData.crackLines.forEach((l) => { mesh.remove(l); l.geometry.dispose(); l.material.dispose(); });
            }
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            meteorMeshes.splice(i, 1);
        }
    }

    /* 添加新陨石、更新已有 */
    meteors.forEach((m) => {
        let mesh = meteorMeshes.find((mm) => mm.userData.meteorRef === m);
        if (!mesh) {
            mesh = createMeteor3D(m);
            meteorMeshes.push(mesh);
        }
        const gw = window._gameData ? window._gameData.gameWidth : 800;
        mesh.position.set(m.x - gw / 2, DESIGN_HEIGHT / 2 - m.y, 0);
        mesh.rotation.x += mesh.userData.rotX;
        mesh.rotation.y += mesh.userData.rotY;
        mesh.rotation.z += mesh.userData.rotZ;

        // Update trail plane
        if (mesh.userData.trailPlane) {
            var tw = m.hit ? r * 3.5 : r * 1.0;
            var tlen = m.hit ? r * 5 : r * 3;
            mesh.userData.trailPlane.scale.set(tw / r, tlen / (r * 1.5), 1);
            mesh.userData.trailPlane.position.set(0, tlen * 0.55, -0.1);
            mesh.userData.trailPlane.material.opacity = m.hit ? 0.9 : 0.6;
        }

        /* 击中状态：仅显示裂痕，不改变发光 */
        if (m.hit && m.isLarge) {
            if (!mesh.userData.crackLines) {
                mesh.userData.crackLines = generateCrackLines(m.radius);
                mesh.userData.crackLines.forEach((l) => mesh.add(l));
            }
        }
    });
}


/* ---- 装饰场景（idle 状态） ---- */
function buildDecorScene() {
    const group = new THREE.Group();
    group.name = 'decorGroup';

    const geo = new THREE.SphereGeometry(50, 32, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;
        const d = (Math.sin(nx * 9) * Math.cos(ny * 11) * Math.sin(nz * 8)) * 12 + (Math.random() - 0.5) * 5;
        pos.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
    }
    geo.computeVertexNormals();
    decorMeteor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.55, metalness: 0.05, emissive: 0x441100, emissiveIntensity: 0.15 }));
    decorMeteor.position.set(180, 130, 0);
    group.add(decorMeteor);


    scene.add(group);
}

function decorLoop() {
    if (!window._3dReady) { decorAnimId = requestAnimationFrame(decorLoop); return; }
    const gd = window._gameData;
    if (!gd || gd.state.current !== 'idle') {
        const dg = scene.getObjectByName('decorGroup');
        if (dg) dg.visible = false;
        decorAnimId = requestAnimationFrame(decorLoop);
        return;
    }
    const dg = scene.getObjectByName('decorGroup');
    if (dg) dg.visible = true;
    decorTimer++;
    if (decorMeteor) {
        decorMeteor.rotation.y += 0.004;
        decorMeteor.rotation.x += 0.002;
    }
    // decorPlaneClone removed — 2D only
    decorAnimId = requestAnimationFrame(decorLoop);
}

/* ---- 主循环 ---- */
function loop() {
    if (!window._3dReady) return;

    requestAnimationFrame(loop);

    const gd = window._gameData;
    if (!gd) {
        renderer.render(scene, camera);
        return;
    }

    /* 状态切换时调整 3D Canvas 层级 */
    if (gd.state.current === 'idle') {
        canvas3d.style.zIndex = '105'; /* 高于 .game-ui(100)，低于 mobile-controls(200) */
        renderer.render(scene, camera);
        return;
    }
    canvas3d.style.zIndex = '1'; /* 运行时在 gameCanvas 上方 */

    syncMeteors(gd.meteors || []);
    // syncPlane removed — 2D only
    renderer.render(scene, camera);
}

/* 启动装饰循环 */
decorAnimId = requestAnimationFrame(decorLoop);

/* 导出停止函数 */
window._stop3dDecor = function () {
    if (decorAnimId) { cancelAnimationFrame(decorAnimId); decorAnimId = null; }
    const dg = scene.getObjectByName('decorGroup');
    if (dg) dg.visible = false;
};

/* ---- 初始化 ---- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
