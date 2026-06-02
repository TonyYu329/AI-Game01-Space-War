/**
 * @file index_3d.js — 3D 渲染叠加层
 * @description Three.js WebGL 透明画布，渲染 3D 战机和陨石
 *              叠在 2D 游戏画布之上，不参与游戏逻辑
 * @date 2026-06-02
 * @version 4.0.0
 */
import * as THREE from 'three';

const DESIGN_HEIGHT = 600;

let renderer, scene, camera;
let canvas3d;
let planeGroup;
let meteorMeshes = [];
let meteorMeshMap = new WeakMap();
/* 色板匹配 yunshi.png 参考图：暖色岩体 + 暗色阴影 + 高光 */
const meteorPalettes = [
    { base: [0x9b4c26, 0xb86a38, 0x5a2815], highlight: 0xdd9960 },  /* 橙褐岩 */
    { base: [0x8e3230, 0xb04a40, 0x4a1815], highlight: 0xe07050 },  /* 红褐岩 */
    { base: [0x6b5540, 0x8a6a50, 0x3a2820], highlight: 0xcc9966 },  /* 棕灰岩 */
    { base: [0x4a5560, 0x607080, 0x283038], highlight: 0x8899aa },  /* 青灰岩 */
    { base: [0xb87a35, 0xd09440, 0x60401f], highlight: 0xeebb66 },  /* 金褐岩 */
    { base: [0x503030, 0x684040, 0x301a1a], highlight: 0x996060 }   /* 暗红岩 */
];

/* 装饰模式（idle 状态） */
let decorMeteor = null;
let decorPlaneClone = null;
let decorAnimId = null;
let decorTimer = 0;

function init() {
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

    buildPlaneModel();
    buildDecorScene();
    window.addEventListener('resize', onResize);

    requestAnimationFrame(loop);
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

/* ---- 3D 战机构建（plane64.png 精灵 + 引擎发光 + 导航灯） ---- */
function buildPlaneModel() {
    planeGroup = new THREE.Group();

    /* 用 plane256.png 作为战机精灵（极致性能：2 三角形 + 单纹理） */
    const spriteMat = new THREE.MeshBasicMaterial({
        map: null, /* 异步加载 */
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false
    });
    /* 尺寸保持与游戏碰撞盒一致：56×44 */
    const spriteGeo = new THREE.PlaneGeometry(56, 44);
    const spriteMesh = new THREE.Mesh(spriteGeo, spriteMat);
    spriteMesh.name = 'planeSprite';
    spriteMesh.renderOrder = 1;
    planeGroup.add(spriteMesh);

    /* 引擎发光 × 2 */
    [-8, 8].forEach((ex) => {
        for (let l = 0; l < 3; l++) {
            const glowGeo = new THREE.SphereGeometry(4 - l * 1.2, 8, 6);
            const gMat = new THREE.MeshBasicMaterial({
                color: l === 0 ? 0xffffff : l === 1 ? 0x44bbff : 0x0066cc,
                transparent: true, opacity: 0.9 - l * 0.25
            });
            const glow = new THREE.Mesh(glowGeo, gMat);
            glow.position.set(ex, -20, 0);
            if (l === 0) glow.name = 'engineGlow';
            planeGroup.add(glow);
        }
    });

    /* 导航灯 */
    const navGeo = new THREE.SphereGeometry(1.5, 6, 4);
    const navL = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff3333 }));
    navL.position.set(-27, 4, 0);
    navL.name = 'navLightL';
    planeGroup.add(navL);
    const navR = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x33ff33 }));
    navR.position.set(27, 4, 0);
    navR.name = 'navLightR';
    planeGroup.add(navR);

    planeGroup.visible = false;
    scene.add(planeGroup);

    /* 异步加载纹理 */
    tryInitTexture();
}

function tryInitTexture() {
    const img = window._planeImage;
    if (!img || !img.complete) {
        setTimeout(tryInitTexture, 200);
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMesh = planeGroup.getObjectByName('planeSprite');
    if (spriteMesh) {
        spriteMesh.material.map = tex;
        spriteMesh.material.needsUpdate = true;
    }
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
    const craterCount = 4 + Math.floor(Math.random() * 6);
    const craters = [];
    for (let c = 0; c < craterCount; c++) {
        craters.push({
            phi: Math.random() * Math.PI * 0.85 + 0.075,
            theta: Math.random() * Math.PI * 2,
            radius: (0.08 + Math.random() * 0.18) * r,
            depth: (0.08 + Math.random() * 0.14) * r
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
        noise = Math.sign(noise) * Math.pow(Math.abs(noise), 1.35) * 0.16;

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
        metalness: 0.005 + Math.random() * 0.015
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
    const count = 6 + Math.floor(Math.random() * 5);
    const r = radius;
    for (let c = 0; c < count; c++) {
        let phi = Math.random() * Math.PI, theta = Math.random() * Math.PI * 2;
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
            new THREE.LineBasicMaterial({ color: 0x441111, depthTest: true })));

        /* 第 2 层：内层发光（暗橙红） */
        const g2Pts = pts.map((p) => new THREE.Vector3(p.x + offX*1.3, p.y + offY*1.3, p.z + offZ*1.3));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(g2Pts),
            new THREE.LineBasicMaterial({ color: 0x220a0a, depthTest: true })));

        /* 第 3 层：阴影偏移 */
        const shPts = pts.map((p) => new THREE.Vector3(p.x + offX, p.y + offY, p.z + offZ));
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shPts),
            new THREE.LineBasicMaterial({ color: 0x020000, depthTest: true })));

        /* 第 4 层：主裂纹（深黑） */
        lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x050000, depthTest: true })));

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

function syncPlane(plane, state) {
    if (state.current !== 'running') {
        planeGroup.visible = false;
        return;
    }
    planeGroup.visible = true;
    const gw = window._gameData ? window._gameData.gameWidth : 800;
    const cx = plane.x + plane.width / 2;
    const cy = plane.y + plane.height / 2;
    planeGroup.position.set(cx - gw / 2, DESIGN_HEIGHT / 2 - cy, 0.5);
    planeGroup.rotation.z = plane.tilt;

    /* 引擎发光脉动 */
    const glowChildren = planeGroup.children.filter((c) => c.name === 'engineGlow');
    const intensity = 0.6 + Math.sin(plane.flamePhase) * 0.3 + Math.random() * 0.1;
    glowChildren.forEach((g) => {
        g.material.opacity = intensity;
        g.scale.setScalar(0.8 + Math.random() * 0.5);
    });

    /* 导航灯闪烁 */
    const time = state.time;
    const navL = planeGroup.children.find((c) => c.name === 'navLightL');
    const navR = planeGroup.children.find((c) => c.name === 'navLightR');
    if (navL) navL.material.opacity = Math.sin(time * 0.06) > 0 ? 1 : 0.15;
    if (navR) navR.material.opacity = Math.sin(time * 0.06 + Math.PI) > 0 ? 1 : 0.15;
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
    decorMeteor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9b4c26, roughness: 0.78, metalness: 0.05 }));
    decorMeteor.position.set(180, 130, 0);
    group.add(decorMeteor);

    /* 装饰用战机简化克隆 */
    decorPlaneClone = new THREE.Group();
    const sc = 0.65;
    const bMat = new THREE.MeshStandardMaterial({ color: 0x336688, roughness: 0.35, metalness: 0.7 });
    decorPlaneClone.add(new THREE.Mesh(new THREE.BoxGeometry(28 * sc, 8 * sc, 44 * sc), bMat));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(7 * sc, 18 * sc, 8, 8), bMat);
    nose.position.y = 31 * sc;
    decorPlaneClone.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(56 * sc, 2 * sc, 14 * sc),
        new THREE.MeshStandardMaterial({ color: 0x1a3344, roughness: 0.5, metalness: 0.55 }));
    wing.position.y = -2 * sc;
    decorPlaneClone.add(wing);
    decorPlaneClone.position.set(-140, -30, 0);
    decorPlaneClone.rotation.z = 0.1;
    group.add(decorPlaneClone);

    scene.add(group);
}

function decorLoop() {
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
    if (decorPlaneClone) {
        decorPlaneClone.position.y = -30 + Math.sin(decorTimer * 0.015) * 10;
    }
    decorAnimId = requestAnimationFrame(decorLoop);
}

/* ---- 主循环 ---- */
function loop() {
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
    syncPlane(gd.plane, gd.state);
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
