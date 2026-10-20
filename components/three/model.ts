import * as THREE from 'three';

import { arrowFrag, basicVert, meshFrag, pulseFrag, waterFrag, waterSideFrag } from './shaders';

/**
 * Procedural DryLah base, built to match the team's product renders:
 * forest-green tray with two screened outlets, a perforated platform with
 * four wedge supports, a cream-rimmed mesh, a clear dish of clay pebbles and
 * a braided wick running from the water up into the pot.
 *
 * Local units: the tray sits on y = 0 and is 2.6 wide. The model's "front"
 * is local +z; the water-flow cutaway always opens there.
 */

export type PartKey = 'overflow' | 'storage' | 'mesh' | 'platform' | 'wick' | 'pot';

export interface Part {
  key: PartKey;
  group: THREE.Group;
  /** Lift applied at full explode. */
  explode: number;
  /** Optional stretch at full explode (the wick spans the whole stack). */
  stretch?: { scale: number; offset: number };
  anchorY: number;
  anchorR: number;
}

export interface Pebbles {
  mesh: THREE.InstancedMesh;
  base: THREE.Matrix4[];
  angle: Float32Array;
}

export interface Model {
  root: THREE.Group;
  parts: Record<PartKey, Part>;
  order: PartKey[];
  lines: THREE.LineBasicMaterial;
  water: THREE.ShaderMaterial;
  waterSide: THREE.ShaderMaterial;
  pulse: THREE.ShaderMaterial;
  screens: THREE.ShaderMaterial[];
  clipped: THREE.Material[];
  pebbles: Pebbles[];
  arrows: { drain: THREE.Material[]; wick: THREE.Material[]; overflow: THREE.Material[] };
  arrowTime: { value: number };
  drops: THREE.InstancedMesh;
  dropData: Float32Array;
  dispose(): void;
}

/* -------------------------------------------------------------- dimensions */

const R = 1.3;
const WALL = 0.07;
const TRAY_TOP = 0.45;
const WATER_Y = 0.14;
const INNER_R = 0.95;
const DISH_Y = [0.12, 0.395];
const MESH_Y = 0.42;  // sits inside the tray rim, hidden when assembled
const PLATE_Y0 = 0.45;  // seated on the tray lip, no gap
const PLATE_Y1 = 0.51;
const FIN_H = 0.17;
const POT_Y = PLATE_Y1 + FIN_H;
const POT_H = 1.3;
const SOIL_Y = POT_Y + POT_H * 0.93;
const WINDOW_PHI = [Math.PI / 2 - 0.95, Math.PI / 2 + 0.95];
const WINDOW_HW = 0.27;
const WINDOW_Y = [0.12, 0.32];
const WICK_Y = [0.06, 1.75];

const GREEN = '#1d5c40';
const ARROW = '#5cc8ff';

/* ---------------------------------------------------------------- helpers */

function arcBlock(rIn: number, rOut: number, phi0: number, phi1: number, y0: number, y1: number, bevel = 0.008) {
  const a0 = -phi1, a1 = -phi0;
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
  s.absarc(0, 0, rOut, a0, a1, false);
  s.lineTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
  s.absarc(0, 0, rIn, a1, a0, true);
  s.closePath();
  return extrudeUp(s, y0, y1, bevel, Math.max(6, Math.ceil((a1 - a0) * 36)));
}

function ringShape(rIn: number, rOut: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  if (rIn > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, rIn, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

function extrudeUp(shape: THREE.Shape, y0: number, y1: number, bevel: number, curveSegments = 96) {
  const h = y1 - y0;
  const b = Math.min(bevel, h * 0.3);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - 2 * b, 0.0005),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 3,
    curveSegments,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + b, 0);
  return g;
}

function circlePoints(r: number, y: number, seg = 128) {
  const pts: number[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (Math.PI * 2 * i) / seg;
    const b = (Math.PI * 2 * (i + 1)) / seg;
    pts.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r);
  }
  return pts;
}

function lineSet(points: number[], mat: THREE.LineBasicMaterial) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const l = new THREE.LineSegments(g, mat);
  l.renderOrder = 3;
  return l;
}

function screenMaterial(scale: [number, number], color: string) {
  return new THREE.ShaderMaterial({
    vertexShader: basicVert,
    fragmentShader: meshFrag,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uScale: { value: new THREE.Vector2(...scale) },
      uOpacity: { value: 1 },
      uGlow: { value: 0 },
      uRound: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private phase: number, private y0: number, private y1: number, private r: number, private turns: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = this.phase + t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.r, this.y0 + (this.y1 - this.y0) * t, Math.sin(a) * this.r);
  }
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round clay ball with a little surface wobble. */
function pebbleGeometry(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const rand = rng(seed);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const k = [rand() * 6, rand() * 6, rand() * 6];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.035 * Math.sin(x * 5 + k[0]) * Math.sin(y * 4 + k[1]) + 0.025 * Math.sin(z * 7 + k[2]);
    pos.setXYZ(i, x * n, y * n * 0.94, z * n);
  }
  g.computeVertexNormals();
  return g;
}

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/**
 * Golden-pothos leaf face: deep green blade, a pale midrib, curved lateral
 * veins and the yellow marbling that makes the plant read as real.
 */
function leafTexture(seed: number) {
  const rand = rng(seed);
  const S = 512;
  const [c, ctx] = canvas(S);
  const g = ctx.createLinearGradient(0, S, 0, 0);
  g.addColorStop(0, '#2c7a2b');
  g.addColorStop(0.55, '#33862f');
  g.addColorStop(1, '#2a7428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // marbling: soft yellow-green streaks fanning out from the midrib
  ctx.filter = 'blur(7px)';
  for (let k = 0; k < 46; k++) {
    const y0 = S * (0.15 + rand() * 0.8);
    const side = rand() < 0.5 ? -1 : 1;
    const len = 60 + rand() * 170;
    ctx.strokeStyle = `rgba(${195 + rand() * 30}, ${205 + rand() * 25}, ${80 + rand() * 40}, ${0.12 + rand() * 0.26})`;
    ctx.lineWidth = 3 + rand() * 13;
    ctx.beginPath();
    ctx.moveTo(S / 2 + side * rand() * 12, y0);
    ctx.quadraticCurveTo(S / 2 + side * len * 0.5, y0 - 20 - rand() * 30, S / 2 + side * len, y0 - 40 - rand() * 60);
    ctx.stroke();
  }
  ctx.filter = 'none';
  // lateral veins
  ctx.strokeStyle = 'rgba(170, 220, 120, 0.32)';
  ctx.lineWidth = 2;
  for (let y = S * 0.88; y > S * 0.1; y -= 34 + rand() * 10) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(S / 2, y);
      ctx.quadraticCurveTo(S / 2 + side * 90, y - 26, S / 2 + side * 240, y - 110);
      ctx.stroke();
    }
  }
  // midrib, tapering toward the tip
  for (let y = S; y > 0; y -= 2) {
    const t = 1 - y / S;
    ctx.fillStyle = 'rgba(196, 230, 140, 0.85)';
    ctx.fillRect(S / 2 - (4 - t * 3.2), y, (4 - t * 3.2) * 2, 2);
  }
  return toTexture(c);
}

function clayTextures() {
  const S = 1024;
  const [c, ctx] = canvas(S);
  const [b, bx] = canvas(S);
  ctx.fillStyle = '#cf6a3e';
  ctx.fillRect(0, 0, S, S);
  bx.fillStyle = '#808080';
  bx.fillRect(0, 0, S, S);
  const img = ctx.getImageData(0, 0, S, S);
  const bimg = bx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    img.data[i] += n; img.data[i + 1] += n * 0.75; img.data[i + 2] += n * 0.55;
    const bn = 128 + (Math.random() - 0.5) * 70;
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bn;
  }
  ctx.putImageData(img, 0, 0);
  bx.putImageData(bimg, 0, 0);
  // fired-clay speckle: pale grog and dark iron flecks, pitted in the bump map
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 0.4 + Math.random() * 1.0;
    const dark = Math.random() < 0.55;
    ctx.fillStyle = dark ? `rgba(120, 55, 28, ${0.15 + Math.random() * 0.25})` : `rgba(235, 170, 130, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    bx.fillStyle = dark ? '#3a3a3a' : '#b0b0b0';
    bx.beginPath(); bx.arc(x, y, r, 0, Math.PI * 2); bx.fill();
  }
  return { map: toTexture(c), bump: toTexture(b, false) };
}

function soilTexture() {
  const S = 512;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = '#24170f';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    ctx.fillStyle = v < 0.5 ? `rgba(15, 9, 5, ${0.5 + Math.random() * 0.4})` : `rgba(${70 + Math.random() * 40}, ${45 + Math.random() * 25}, ${28 + Math.random() * 15}, ${0.4 + Math.random() * 0.4})`;
    const r = 0.8 + Math.random() * 2.6;
    ctx.fillRect(Math.random() * S, Math.random() * S, r, r);
  }
  return toTexture(c);
}

/** Expanded-clay pebble surface: porous, with dark pits. */
function pebbleTexture() {
  const S = 256;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const r = 0.5 + Math.random() * 1.8;
    ctx.fillStyle = `rgba(60, 50, 40, ${0.15 + Math.random() * 0.45})`;
    ctx.beginPath(); ctx.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

/** Pothos leaf geometry: rounded heart base, long pointed tip, cupped and arched. */
function leafGeometry() {
  const U = 12, V = 22;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= V; j++) {
    const v = j / V;
    const w = 0.56 * Math.pow(Math.sin(Math.PI * (0.13 + 0.87 * v)), 0.62) * (1.06 - 0.56 * v);
    for (let i = 0; i <= U; i++) {
      const u = (i / U) * 2 - 1;
      const notch = 0.06 * Math.pow(1 - Math.abs(u), 2) * Math.pow(1 - v, 6);
      pos.push(u * w, v - 0.04 + notch, Math.abs(u) * w * 0.3 - v * v * 0.26 + u * u * w * 0.08);
      uv.push(0.5 + (u * w) / 1.2, v);
    }
  }
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ build */

export function buildModel(opts: { shadows: boolean }): Model {
  const root = new THREE.Group();
  root.name = 'drylah';
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  const clipped: THREE.Material[] = [];
  const clip = <T extends THREE.Material>(m: T) => { clipped.push(m); return m; };

  const lines = clip(track(new THREE.LineBasicMaterial({ color: '#c8f57e', transparent: true, opacity: 0.18, depthWrite: false })));

  const plastic = (color = GREEN) => clip(track(new THREE.MeshPhysicalMaterial({
    color, roughness: 0.62, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, side: THREE.DoubleSide,
  })));

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
    track(g);
    const o = new THREE.Mesh(g, m);
    o.castShadow = cast && opts.shadows;
    o.receiveShadow = opts.shadows;
    return o;
  };

  const part = (key: PartKey, explode: number, anchorY: number, anchorR: number): Part => {
    const group = new THREE.Group();
    group.name = key;
    root.add(group);
    return { key, group, explode, anchorY, anchorR };
  };

  /* ---- 5: reservoir tray with screened overflow ---- */
  const tray = part('overflow', -0.38, 0.24, R + 0.02);
  const screens: THREE.ShaderMaterial[] = [];
  const m5 = plastic();
  {
    const g = tray.group;
    g.add(mesh(extrudeUp(ringShape(0, R - 0.02), 0, 0.05, 0.012), m5));
    const cuts = WINDOW_PHI.map((p) => [p - WINDOW_HW, p + WINDOW_HW]).sort((a, b) => a[0] - b[0]);
    let start = cuts[cuts.length - 1][1] - Math.PI * 2;
    for (const [c0, c1] of cuts) {
      g.add(mesh(arcBlock(R - WALL, R, start, c0, 0.04, TRAY_TOP - 0.03), m5));
      g.add(mesh(arcBlock(R - WALL, R, c0, c1, 0.04, WINDOW_Y[0]), m5));
      g.add(mesh(arcBlock(R - WALL, R, c0, c1, WINDOW_Y[1], TRAY_TOP - 0.03), m5));
      start = c1;
    }
    g.add(mesh(extrudeUp(ringShape(R - WALL - 0.015, R + 0.012), TRAY_TOP - 0.035, TRAY_TOP, 0.01), m5));
    for (const p of WINDOW_PHI) {
      // raised surround either side of each outlet, like the renders
      g.add(mesh(arcBlock(R - 0.005, R + 0.018, p - WINDOW_HW - 0.035, p - WINDOW_HW, WINDOW_Y[0] - 0.03, WINDOW_Y[1] + 0.03, 0.004), m5));
      g.add(mesh(arcBlock(R - 0.005, R + 0.018, p + WINDOW_HW, p + WINDOW_HW + 0.035, WINDOW_Y[0] - 0.03, WINDOW_Y[1] + 0.03, 0.004), m5));
      for (const s of [-1, 1]) {
        const c = p + s * (WINDOW_HW + 0.05);
        g.add(mesh(arcBlock(INNER_R + 0.01, R - WALL + 0.005, c - 0.022, c + 0.022, 0.05, 0.33, 0.006), m5));
      }
      const h = WINDOW_Y[1] - WINDOW_Y[0];
      const arc = (R - 0.035) * WINDOW_HW * 2;
      const sm = clip(track(screenMaterial([arc * 70, h * 70], '#8e958d')));
      const geo = track(new THREE.CylinderGeometry(R - 0.035, R - 0.035, h, 24, 1, true, Math.PI / 2 - (p + WINDOW_HW), WINDOW_HW * 2));
      const sc = new THREE.Mesh(geo, sm);
      sc.position.y = (WINDOW_Y[0] + WINDOW_Y[1]) / 2;
      sc.renderOrder = 2;
      g.add(sc);
      screens.push(sm);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const foot = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), m5);
      foot.position.set(Math.cos(a) * 1.08, -0.03, Math.sin(a) * 1.08);
      foot.rotation.y = -a;
      g.add(foot);
    }
    g.add(lineSet([
      ...circlePoints(R + 0.012, TRAY_TOP, 160),
      ...circlePoints(R - WALL - 0.015, TRAY_TOP, 160),
      ...circlePoints(R - 0.02, 0.0, 160),
    ], lines));
  }

  // water: surface plus a side wall so the cutaway reads as a volume
  const water = clip(track(new THREE.ShaderMaterial({
    vertexShader: basicVert,
    fragmentShader: waterFrag,
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uOpacity: { value: 0.92 },
      uDeep: { value: new THREE.Color('#1a7480') },
      uLight: { value: new THREE.Color('#a8f1ef') },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  {
    const wg = track(new THREE.CircleGeometry(R - WALL - 0.005, 96));
    wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, water);
    w.position.y = WATER_Y;
    w.renderOrder = 1;
    tray.group.add(w);
  }
  const waterSide = clip(track(new THREE.ShaderMaterial({
    vertexShader: basicVert,
    fragmentShader: waterSideFrag,
    uniforms: { uOpacity: { value: 0.9 }, uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  {
    const ws = new THREE.Mesh(track(new THREE.CylinderGeometry(R - WALL - 0.006, R - WALL - 0.006, WATER_Y - 0.05, 96, 1, true)), waterSide);
    ws.position.y = (WATER_Y + 0.05) / 2;
    ws.renderOrder = 1;
    tray.group.add(ws);
  }

  /* ---- 3: mineral storage layer ---- */
  const storage = part('storage', 0.5, 0.27, INNER_R + 0.02);
  const pebbles: Pebbles[] = [];
  {
    const g = storage.group;
    const clear = clip(track(new THREE.MeshPhysicalMaterial({
      color: '#e4f4ee', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
    })));
    const cyl = mesh(new THREE.CylinderGeometry(INNER_R, INNER_R, DISH_Y[1] - DISH_Y[0], 96, 1, true), clear, false);
    cyl.position.y = (DISH_Y[0] + DISH_Y[1]) / 2;
    cyl.renderOrder = 2;
    g.add(cyl);
    const bottom = track(new THREE.CircleGeometry(INNER_R, 96));
    bottom.rotateX(-Math.PI / 2);
    const bm = new THREE.Mesh(bottom, clear);
    bm.position.y = DISH_Y[0];
    g.add(bm);
    const rimMat = clip(track(new THREE.MeshPhysicalMaterial({ color: '#f1f7f4', roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 })));
    g.add(mesh(extrudeUp(ringShape(INNER_R - 0.012, INNER_R + 0.012), DISH_Y[1] - 0.012, DISH_Y[1], 0.004), rimMat, false));

    // hex-packed clay balls, three layers, keeping the wick channel clear
    const palette = ['#dccbaa', '#cdb790', '#e8dfc8', '#9a9e9b', '#b3b0a6', '#c4a77f', '#7f8482'].map((c) => new THREE.Color(c));
    const rand = rng(7);
    const balls: { p: THREE.Vector3; s: number; c: THREE.Color }[] = [];
    const r = 0.062;
    const step = r * 2.04;
    for (let layer = 0; layer < 3; layer++) {
      const y = DISH_Y[0] + r + layer * r * 1.64;
      const off = layer % 2 ? step / 2 : 0;
      let row = 0;
      for (let gz = -INNER_R; gz <= INNER_R; gz += step * 0.866, row++) {
        for (let gx = -INNER_R; gx <= INNER_R; gx += step) {
          const x = gx + (row % 2 ? step / 2 : 0) + off + (rand() - 0.5) * 0.02;
          const z = gz + off * 0.5 + (rand() - 0.5) * 0.02;
          const d = Math.hypot(x, z);
          if (d > INNER_R - r * 1.05 || d < 0.13) continue;
          balls.push({ p: new THREE.Vector3(x, y + (rand() - 0.5) * 0.015, z), s: r * (0.86 + rand() * 0.22), c: palette[Math.floor(rand() * palette.length)] });
        }
      }
    }
    const pebMap = track(pebbleTexture());
    pebMap.repeat.set(2, 2);
    const stone = track(new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0, map: pebMap, bumpMap: pebMap, bumpScale: 1.2 }));
    const halves = [balls.filter((_, i) => i % 2 === 0), balls.filter((_, i) => i % 2 === 1)];
    halves.forEach((set, hi) => {
      const geo = track(pebbleGeometry(hi ? 11 : 3));
      const inst = new THREE.InstancedMesh(geo, stone, set.length);
      inst.receiveShadow = opts.shadows;
      inst.castShadow = opts.shadows;
      const base: THREE.Matrix4[] = [];
      const angle = new Float32Array(set.length);
      const q = new THREE.Quaternion();
      set.forEach((b, i) => {
        q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
        const m4 = new THREE.Matrix4().compose(b.p, q, new THREE.Vector3(b.s, b.s, b.s));
        base.push(m4);
        inst.setMatrixAt(i, m4);
        inst.setColorAt(i, b.c);
        angle[i] = Math.atan2(b.p.z, b.p.x);
      });
      g.add(inst);
      pebbles.push({ mesh: inst, base, angle });
      disposables.push({ dispose: () => inst.dispose() });
    });
  }

  /* ---- 2: mosquito-blocking mesh ---- */
  const screen = part('mesh', 1.08, MESH_Y, 1.22);
  {
    const g = screen.group;
    const sm = clip(track(screenMaterial([2.4 * 70, 2.4 * 70], '#a9aea7')));
    const geo = track(new THREE.CircleGeometry(1.17, 128));
    geo.rotateX(-Math.PI / 2);
    const s = new THREE.Mesh(geo, sm);
    s.position.y = MESH_Y;
    s.renderOrder = 2;
    g.add(s);
    screens.push(sm);
    const frameMat = clip(track(new THREE.MeshStandardMaterial({ color: '#ece6d6', roughness: 0.55, metalness: 0, side: THREE.DoubleSide })));
    g.add(mesh(extrudeUp(ringShape(1.155, 1.225), MESH_Y - 0.014, MESH_Y + 0.014, 0.006), frameMat, true));
  }

  /* ---- 1: raised support platform ---- */
  const plate = part('platform', 1.72, PLATE_Y0 + 0.04, 1.29);
  {
    const g = plate.group;
    const m = plastic('#21664a');
    const RP = 1.27;
    const FIN_PHI = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    const s = ringShape(0, RP);
    const rand = rng(21);
    for (let r = 0.3; r < 1.15; r += 0.075) {
      const n = Math.floor((Math.PI * 2 * r) / 0.082);
      const off = rand() * Math.PI;
      for (let i = 0; i < n; i++) {
        const phi = off + (i / n) * Math.PI * 2;
        const nearFin = FIN_PHI.some((f) => {
          const d = Math.atan2(Math.sin(phi - f), Math.cos(phi - f));
          return Math.abs(d * r) < 0.11 && r > 0.4 && r < 1.02;
        });
        if (nearFin) continue;
        const hr = 0.019 + ((i * 7 + Math.round(r * 40)) % 3) * 0.003;
        const h = new THREE.Path();
        h.absarc(Math.cos(phi) * r, -Math.sin(phi) * r, hr, 0, Math.PI * 2, true);
        s.holes.push(h);
      }
    }
    g.add(mesh(extrudeUp(s, PLATE_Y0, PLATE_Y1, 0.01, 10), m));
    g.add(mesh(extrudeUp(ringShape(RP - 0.07, RP), PLATE_Y1 - 0.01, PLATE_Y1 + 0.045, 0.01), m));
    g.add(mesh(extrudeUp(ringShape(0.12, 0.21), PLATE_Y1 - 0.01, PLATE_Y1 + 0.06, 0.01, 48), m));
    for (const f of FIN_PHI) {
      const prof = new THREE.Shape();
      prof.moveTo(0.5, 0);
      prof.lineTo(1.0, 0);
      prof.lineTo(1.0, 0.07);
      prof.lineTo(0.64, FIN_H);
      prof.lineTo(0.5, FIN_H);
      prof.closePath();
      const fg = new THREE.ExtrudeGeometry(prof, { depth: 0.15, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
      fg.translate(0, 0, -0.075);
      const fin = mesh(fg, m);
      fin.position.y = PLATE_Y1;
      fin.rotation.y = -f;
      g.add(fin);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const tab = mesh(new THREE.BoxGeometry(0.06, 0.08, 0.16), m);
      tab.position.set(Math.cos(a) * 1.215, PLATE_Y0 - 0.035, Math.sin(a) * 1.215);
      tab.rotation.y = -a;
      g.add(tab);
    }
    g.add(lineSet([...circlePoints(RP, PLATE_Y1 + 0.045, 160), ...circlePoints(RP - 0.07, PLATE_Y1 + 0.045, 160)], lines));
  }

  /* ---- 4: capillary wick (stretches to span the exploded stack) ---- */
  const wick = part('wick', 0, 0.78, 0.1);
  wick.stretch = { scale: 2.22, offset: -0.43 };
  const pulse = track(new THREE.ShaderMaterial({
    vertexShader: basicVert,
    fragmentShader: pulseFrag,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  {
    const g = wick.group;
    const rope = track(new THREE.MeshStandardMaterial({ color: '#f1ebdd', roughness: 0.9, metalness: 0 }));
    const [y0, y1] = WICK_Y;
    for (let k = 0; k < 3; k++) {
      const curve = new Helix((k / 3) * Math.PI * 2, y0, y1, 0.034, (y1 - y0) / 0.13);
      g.add(mesh(new THREE.TubeGeometry(curve, 360, 0.034, 8, false), rope));
    }
    const sleeve = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.09, y1 - y0, 32, 1, true)), pulse);
    sleeve.position.y = (y0 + y1) / 2;
    sleeve.renderOrder = 4;
    g.add(sleeve);
  }

  /* ---- the customer's own pot (not a numbered part, never cut) ---- */
  const pot = part('pot', 2.65, POT_Y + 0.5, 1.12);
  {
    const g = pot.group;
    const tex = clayTextures();
    track(tex.map); track(tex.bump);
    tex.map.repeat.set(3, 1.4);
    tex.bump.repeat.set(3, 1.4);
    const clay = track(new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 0.6, roughness: 0.92, metalness: 0 }));
    const H = POT_H;
    const prof = [
      [0.11, 0], [0.64, 0], [0.68, 0.012], [0.69, 0.04], [0.715, 0.05],          // foot ring
      [1.02, H * 0.785], [1.035, H * 0.795], [1.1, H * 0.802], [1.12, H * 0.82],    // under-rim step
      [1.13, H * 0.9], [1.135, H * 0.975], [1.125, H * 0.995], [1.105, H],          // rolled rim band
      [1.04, H], [1.02, H * 0.985], [0.98, H * 0.82], [0.66, 0.085], [0.11, 0.085], [0.11, 0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const potMesh = mesh(new THREE.LatheGeometry(prof, 160), clay);
    potMesh.position.y = POT_Y;
    g.add(potMesh);

    const soilMap = track(soilTexture());
    soilMap.repeat.set(2, 2);
    const soil = track(new THREE.MeshStandardMaterial({ map: soilMap, bumpMap: soilMap, bumpScale: 1.5, roughness: 1 }));
    const sg = track(new THREE.CircleGeometry(1.0, 96));
    sg.rotateX(-Math.PI / 2);
    const soilMesh = new THREE.Mesh(sg, soil);
    soilMesh.position.y = SOIL_Y;
    soilMesh.receiveShadow = opts.shadows;
    g.add(soilMesh);

    // soil detail: dark crumbs and white perlite, like real potting mix
    const rand = rng(42);
    const scatter = (count: number, color: string, s0: number, s1: number, rough: number) => {
      const geo = track(new THREE.IcosahedronGeometry(1, 0));
      const mat = track(new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true }));
      const inst = new THREE.InstancedMesh(geo, mat, count);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(rand()) * 0.94;
        const a = rand() * Math.PI * 2;
        const sc = s0 + rand() * (s1 - s0);
        m4.compose(
          new THREE.Vector3(Math.cos(a) * r, SOIL_Y + sc * 0.3, Math.sin(a) * r),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3)),
          new THREE.Vector3(sc, sc * 0.7, sc * (0.8 + rand() * 0.4)),
        );
        inst.setMatrixAt(i, m4);
      }
      inst.receiveShadow = opts.shadows;
      g.add(inst);
      disposables.push({ dispose: () => inst.dispose() });
    };
    scatter(220, '#2e1d12', 0.014, 0.032, 1);
    scatter(34, '#e9e6de', 0.009, 0.018, 0.95);

    // golden pothos: broad marbled leaves on long petioles, fountaining out
    const leafMats = [3, 9, 17].map((seed) => {
      const t = track(leafTexture(seed));
      return track(new THREE.MeshPhysicalMaterial({
        map: t, roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
        bumpMap: t, bumpScale: 0.4,
      }));
    });
    const stemMat = track(new THREE.MeshStandardMaterial({ color: '#5d9c3e', roughness: 0.55 }));
    const leafGeo = track(leafGeometry());
    const up = new THREE.Vector3(0, 1, 0);
    const N = 13;
    for (let i = 0; i < N; i++) {
      const phi = i * 2.39996 + rand() * 0.35;
      const out = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
      const t = i / (N - 1);
      const reach = 0.18 + t * 0.62 + rand() * 0.08;
      const height = 1.05 - t * 0.6 + rand() * 0.1;
      const s0 = out.clone().multiplyScalar(0.05 + rand() * 0.08).setY(SOIL_Y);
      const tip = out.clone().multiplyScalar(reach).setY(SOIL_Y + height);
      const ctrl = s0.clone().lerp(tip, 0.2).setY(SOIL_Y + height * 0.95);
      g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(s0, ctrl, tip), 24, 0.019, 8, false), stemMat));

      const elev = 0.85 - t * 1.05 + (rand() - 0.5) * 0.25;
      const dir = out.clone().multiplyScalar(Math.cos(elev)).addScaledVector(up, Math.sin(elev)).normalize();
      const z = up.clone().addScaledVector(dir, -up.dot(dir)).normalize();
      const x = new THREE.Vector3().crossVectors(dir, z).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, dir, z));
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, (rand() - 0.5) * 0.9));
      const leaf = mesh(leafGeo, leafMats[i % 3]);
      const size = 0.74 + rand() * 0.24;
      leaf.matrixAutoUpdate = false;
      leaf.matrix.compose(tip, q, new THREE.Vector3(size, size, size));
      g.add(leaf);
    }
  }

  /* ---- flow arrows: drain down, wick up, overflow out (front, in the cutaway) ---- */
  const arrowTime = { value: 0 };
  const arrowSet = (paths: THREE.Vector3[][]) => {
    const tubeMat = track(new THREE.ShaderMaterial({
      vertexShader: basicVert,
      fragmentShader: arrowFrag,
      uniforms: { uTime: arrowTime, uIntensity: { value: 0 }, uColor: { value: new THREE.Color(ARROW) } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }));
    const headMat = track(new THREE.MeshBasicMaterial({ color: ARROW, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
    for (const pts of paths) {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 64, 0.016, 8, false)), tubeMat);
      tube.renderOrder = 10;
      root.add(tube);
      const head = new THREE.Mesh(track(new THREE.ConeGeometry(0.042, 0.1, 14)), headMat);
      head.position.copy(curve.getPoint(1));
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(1));
      head.renderOrder = 10;
      root.add(head);
    }
    return [tubeMat, headMat] as THREE.Material[];
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const outlet = WINDOW_PHI[0];
  const arrows = {
    drain: arrowSet([
      [V(-0.14, POT_Y + 0.02, 0.34), V(-0.2, 0.6, 0.36), V(-0.42, 0.47, 0.4), V(-0.46, 0.32, 0.42), V(-0.46, 0.2, 0.42)],
      [V(0.14, POT_Y + 0.02, 0.34), V(0.2, 0.6, 0.36), V(0.42, 0.47, 0.4), V(0.46, 0.32, 0.42), V(0.46, 0.2, 0.42)],
    ]),
    wick: arrowSet([[V(0, 0.12, 0.085), V(0, 0.4, 0.085), V(0, 0.66, 0.085)]]),
    overflow: arrowSet([[V(0.3, 0.17, 0.55), V(0.7, 0.18, 0.62), V(Math.cos(outlet) * (R + 0.3), 0.2, Math.sin(outlet) * (R + 0.3))]]),
  };

  /* ---- a few drainage droplets, front half only ---- */
  const DROPS = 28;
  const dropMat = track(new THREE.MeshStandardMaterial({ color: '#bff4f2', emissive: '#4fd6cf', emissiveIntensity: 1.2, roughness: 0.1, transparent: true }));
  const drops = new THREE.InstancedMesh(track(new THREE.SphereGeometry(1, 12, 8)), dropMat, DROPS);
  drops.frustumCulled = false;
  drops.renderOrder = 5;
  root.add(drops);
  disposables.push({ dispose: () => drops.dispose() });
  const dropData = new Float32Array(DROPS * 4);
  const dr = rng(99);
  for (let i = 0; i < DROPS; i++) {
    dropData[i * 4] = 0;
    dropData[i * 4 + 1] = dr();
    dropData[i * 4 + 2] = 0.2 + dr() * 0.5;
    dropData[i * 4 + 3] = Math.PI / 2 + (dr() - 0.5) * 1.6;
  }

  const parts = { overflow: tray, storage, mesh: screen, platform: plate, wick, pot } as Record<PartKey, Part>;

  return {
    root,
    parts,
    order: ['platform', 'mesh', 'storage', 'wick', 'overflow'],
    lines,
    water,
    waterSide,
    pulse,
    screens,
    clipped,
    pebbles,
    arrows,
    arrowTime,
    drops,
    dropData,
    dispose() { for (const d of disposables) d.dispose(); },
  };
}

export const MODEL = { R, WATER_Y, POT_Y, POT_H, PLATE_Y1, MESH_Y, WINDOW_PHI, WINDOW_Y, INNER_R };
