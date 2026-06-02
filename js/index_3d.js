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
/* 色板匹配 yunshi.png 参考图：暖色岩体 + 暗色阴影 + 高光 */
const meteorPalettes = [
    { base: [0x9e8e7e, 0x8a7a6a, 0x5a4a3a], highlight: 0xc4b8a8 },  /* 灰褐岩 */
    { base: [0xb09878, 0x9a8860, 0x6a5840], highlight: 0xd4c4a0 },  /* 暖沙岩 */
    { base: [0x78909c, 0x607080, 0x405060], highlight: 0x98b0c0 },  /* 青灰岩 */
    { base: [0x8a8a84, 0x6e6e68, 0x3e3e38], highlight: 0xa8a8a2 },  /* 石板灰 */
    { base: [0xb08868, 0x987048, 0x684830], highlight: 0xccb098 },  /* 红褐岩 */
    { base: [0x7a8a7a, 0x5a6e5a, 0x3a4a3a], highlight: 0x98b098 },  /* 灰绿岩 */
    { base: [0x968878, 0x7a6e60, 0x4c4032], highlight: 0xb8a898 },  /* 暗沙岩 */
    { base: [0x6e7a8e, 0x506078, 0x384458], highlight: 0x8898b0 }   /* 蓝灰岩 */
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
    const segs = 20;
    const rings = 16;
    const geo = new THREE.SphereGeometry(r, segs, rings);

    const pos = geo.attributes.position;
    const s1 = Math.random() * 100, s2 = Math.random() * 100, s3 = Math.random() * 100;

    /* 生成随机环形山中心（球面坐标） */
    const craterCount = 6 + Math.floor(Math.random() * 8);
    const craters = [];
    for (let c = 0; c < craterCount; c++) {
        craters.push({
            phi: Math.random() * Math.PI * 0.85 + 0.075,
            theta: Math.random() * Math.PI * 2,
            radius: (0.06 + Math.random() * 0.2) * r,
            depth: (0.1 + Math.random() * 0.18) * r
        });
    }

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;

        /* FBM 4 层 octave 噪声 */
        let fbm = 0, amp = 1, freq = 1, total = 0;
        for (let o = 0; o < 4; o++) {
            fbm += (Math.sin(nx * 8 * freq + s1) * Math.cos(ny * 10 * freq + s2)
                  + Math.sin((nx + ny) * 6 * freq + s3) * 0.5
                  + Math.cos((ny + nz) * 7 * freq + s1) * 0.3) * amp;
            total += amp;
            amp *= 0.5;
            freq *= 2.2;
        }
        /* 锐化：增强峰谷对比 */
        let noise = fbm / total;
        noise = Math.sign(noise) * Math.pow(Math.abs(noise), 1.35) * 0.22;

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
            } else if (angDist < crR * 1.3) {
                /* 坑缘：微微隆起 */
                const t = (angDist - crR) / (crR * 0.3);
                craterDisp += cr.depth * 0.15 * (1 - t * t);
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

    /* 顶点颜色：模拟参考图的多色岩体（暖色基底 + 高光 + 暗色阴影） */
    const sVar = Math.random() * 100;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const len = Math.sqrt(x*x + y*y + z*z);
        const nx = x/len, ny = y/len, nz = z/len;
        /* 以噪声混合主色/中色/暗色 */
        const mix = (Math.sin(nx*7+sVar)*Math.cos(ny*9+sVar)*Math.sin(nz*5+sVar)) * 0.5 + 0.5;
        const baseIdx = mix < 0.4 ? 2 : mix < 0.75 ? 1 : 0;
        const c = new THREE.Color(pal.base[baseIdx]);
        /* 朝向 "右上光源" 的方向添加高光色 */
        const lightDir = new THREE.Vector3(0.6, 0.3, 0.8).normalize();
        const vNorm = new THREE.Vector3(nx, ny, nz);
        const dot = vNorm.dot(lightDir);
        if (dot > 0.2) c.lerp(new THREE.Color(pal.highlight), (dot - 0.2) * 0.6);
        if (dot < -0.2) c.lerp(new THREE.Color(0x050508), Math.min(1, (-dot - 0.2) * 0.4));
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82 + Math.random() * 0.14,
        metalness: 0.005 + Math.random() * 0.015,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.15
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.rotX = (Math.random() - 0.5) * 0.03;
    mesh.userData.rotY = (Math.random() - 0.5) * 0.035;
    mesh.userData.rotZ = (Math.random() - 0.5) * 0.025;
    mesh.userData.meteorRef = m;
    mesh.userData.crackLines = null;
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

        /* 第 1 层：外层大范围发光（暗红，模拟岩石裂口热光） */
        const g1Pts = pts.map((p) => new THREE.Vector3(p.x + offX*2.2, p.y + offY*2.2, p.z + offZ*2.2));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g1Pts),
            new THREE.LineBasicMaterial({ color: 0x661111, depthTest: true })));

        /* 第 2 层：内层发光（暗橙红） */
        const g2Pts = pts.map((p) => new THREE.Vector3(p.x + offX*1.3, p.y + offY*1.3, p.z + offZ*1.3));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g2Pts),
            new THREE.LineBasicMaterial({ color: 0x330a0a, depthTest: true })));

        /* 第 3 层：阴影偏移 */
        const shPts = pts.map((p) => new THREE.Vector3(p.x + offX, p.y + offY, p.z + offZ));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shPts),
            new THREE.LineBasicMaterial({ color: 0x020000, depthTest: true })));

        /* 第 4 层：主裂纹（深黑） */
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x080000, depthTest: true })));

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
                new THREE.LineBasicMaterial({ color: 0x080000, depthTest: true })));
            /* 分支阴影 */
            const brShPts = brPts.map((p) => new THREE.Vector3(p.x + offX*0.6, p.y + offY*0.6, p.z + offZ*0.6));
            lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(brShPts),
                new THREE.LineBasicMaterial({ color: 0x030000, depthTest: true })));
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

        /* 击中状态发光 */
        if (m.hit && m.isLarge) {
            mesh.material.emissive = new THREE.Color(0x331100);
            mesh.material.emissiveIntensity = 0.4;
            /* 裂纹线（仅生成一次） */
            if (!mesh.userData.crackLines) {
                mesh.userData.crackLines = generateCrackLines(m.radius);
                mesh.userData.crackLines.forEach((l) => mesh.add(l));
            }
        } else {
            mesh.material.emissiveIntensity *= 0.9;
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
    decorMeteor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc48a4a, roughness: 0.78, metalness: 0.05 }));
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
