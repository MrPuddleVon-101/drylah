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
const DISH_Y = [0.12, 0.42];
const MESH_Y = 0.465;
const PLATE_Y0 = 0.48;
const PLATE_Y1 = 0.54;
const FIN_H = 0.17;
const POT_Y = PLATE_Y1 + FIN_H;
const POT_H = 1.3;
const SOIL_Y = POT_Y + POT_H * 0.93;
const WINDOW_PHI = [Math.PI / 2 - 0.95, Math.PI / 2 + 0.95];
const WINDOW_HW = 0.27;
const WINDOW_Y = [0.12, 0.32];
const WICK_Y = [0.06, 1.75];

const GREEN = '#1f5b40';
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

function noiseTexture(base: string, spread: number, fleck: [number, number, number], size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * spread;
    img.data[i] += n;
    img.data[i + 1] += n * 0.8;
    img.data[i + 2] += n * 0.6;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${fleck[0]},${fleck[1]},${fleck[2]},${Math.random() * 0.35})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
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

/** Pothos leaf: heart base, long pointed tip, folded along the midrib. */
function leafGeometry(rand: () => number) {
  const U = 10, V = 18;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const deep = new THREE.Color('#2d7a2e');
  const mid = new THREE.Color('#4f9e3a');
  const light = new THREE.Color('#8fcf5a');
  const tmp = new THREE.Color();
  const tint = rand() * 0.25;
  for (let j = 0; j <= V; j++) {
    const v = j / V;
    const w = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + v * 0.96)), 0.7) * (1.12 - 0.62 * v);
    for (let i = 0; i <= U; i++) {
      const u = (i / U) * 2 - 1;
      pos.push(u * w, v - 0.06, Math.abs(u) * w * 0.42 - v * v * 0.32 - u * u * 0.04);
      const rib = Math.max(0, 1 - Math.abs(u) * 6);
      tmp.copy(deep).lerp(mid, 0.4 + tint + (1 - Math.abs(u)) * 0.25).lerp(light, rib * 0.55 + (1 - v) * 0.1);
      col.push(tmp.r, tmp.g, tmp.b);
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
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
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
    color, roughness: 0.52, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide,
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
      const sm = clip(track(screenMaterial([arc * 70, h * 70], '#c9cec7')));
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
    const stone = track(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }));
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
    const m = plastic('#22634a');
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
    const clay = track(new THREE.MeshStandardMaterial({
      color: '#ffffff', map: track(noiseTexture('#c76c43', 14, [120, 60, 30])), roughness: 0.9, metalness: 0,
    }));
    clay.map!.repeat.set(5, 2);
    const H = POT_H;
    const prof = [
      [0.11, 0], [0.68, 0], [0.715, 0.03], [1.02, H * 0.79], [1.1, H * 0.8], [1.118, H * 0.82],
      [1.135, H * 0.985], [1.12, H], [1.04, H], [1.02, H * 0.98], [0.975, H * 0.82], [0.66, 0.08], [0.11, 0.08], [0.11, 0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const potMesh = mesh(new THREE.LatheGeometry(prof, 128), clay);
    potMesh.position.y = POT_Y;
    g.add(potMesh);

    const soil = track(new THREE.MeshStandardMaterial({ color: '#ffffff', map: track(noiseTexture('#2b1d14', 46, [230, 225, 210])), roughness: 1 }));
    soil.map!.repeat.set(3, 3);
    const sg = track(new THREE.CircleGeometry(1.0, 96));
    sg.rotateX(-Math.PI / 2);
    const soilMesh = new THREE.Mesh(sg, soil);
    soilMesh.position.y = SOIL_Y;
    soilMesh.receiveShadow = opts.shadows;
    g.add(soilMesh);

    // a full pothos: long stems fountaining out, leaves pointing outward
    const rand = rng(42);
    const leafMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, side: THREE.DoubleSide }));
    const stemMat = track(new THREE.MeshStandardMaterial({ color: '#4c8f3a', roughness: 0.6 }));
    const up = new THREE.Vector3(0, 1, 0);
    const N = 19;
    for (let i = 0; i < N; i++) {
      const phi = i * 2.39996 + rand() * 0.3;
      const out = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
      const t = i / (N - 1);
      const reach = 0.25 + t * 0.85 + rand() * 0.1;
      const height = 1.0 - t * 0.75 + rand() * 0.12;
      const s0 = out.clone().multiplyScalar(0.06 + rand() * 0.1).setY(SOIL_Y);
      const tip = out.clone().multiplyScalar(reach).setY(SOIL_Y + height);
      const ctrl = s0.clone().lerp(tip, 0.25).setY(SOIL_Y + height * 1.05 + 0.1);
      g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(s0, ctrl, tip), 20, 0.014, 6, false), stemMat));

      const elev = 0.55 - t * 0.85 + (rand() - 0.5) * 0.2;
      const dir = out.clone().multiplyScalar(Math.cos(elev)).addScaledVector(up, Math.sin(elev)).normalize();
      const z = up.clone().addScaledVector(dir, -up.dot(dir)).normalize();
      const x = new THREE.Vector3().crossVectors(dir, z).normalize();
      const leaf = mesh(leafGeometry(rand), leafMat);
      const size = 0.5 + rand() * 0.2;
      leaf.matrixAutoUpdate = false;
      const rot = new THREE.Matrix4().makeBasis(x, dir, z);
      leaf.matrix.compose(tip, new THREE.Quaternion().setFromRotationMatrix(rot), new THREE.Vector3(size, size, size));
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
