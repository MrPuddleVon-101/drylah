import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildModel, MODEL, type PartKey } from './model';
import {
  basicVert, floorFrag, moteFrag, moteVert, shadowFrag,
} from './shaders';

/* ------------------------------------------------------------------ quality */

type Tier = 'high' | 'mid' | 'low';

function detectTier(): Tier {
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (w < 760 || (coarse && w < 1100)) return 'low';
  if (cores <= 4 || w < 1280) return 'mid';
  return 'high';
}

const QUALITY = {
  high: { dpr: 1.6, shadows: true, shadowMap: 1024, motes: 90 },
  mid: { dpr: 1.35, shadows: true, shadowMap: 1024, motes: 60 },
  low: { dpr: 1.15, shadows: false, shadowMap: 512, motes: 30 },
};

/* ------------------------------------------------------------------- easing */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Piecewise smootherstep through (progress, value) stops. */
export function ramp(p: number, stops: readonly (readonly [number, number])[]) {
  if (p <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (p >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, v0] = stops[i];
    const [p1, v1] = stops[i + 1];
    if (p <= p1) return v0 + (v1 - v0) * smoother(p1 === p0 ? 1 : (p - p0) / (p1 - p0));
  }
  return last[1];
}
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/* ----------------------------------------------------------- choreography */

/**
 * Story beats on the landing page, as scroll progress through the pinned
 * stage. Mirrored by BEATS in Stage.tsx, which places the copy.
 */
export const STORY = {
  heroOut: 0.1,
  explode: [0.1, 0.22] as const,
  labels: [0.24, 0.62] as const,
  flowIn: [0.64, 0.72] as const,
  end: 0.97,
};

export interface Look {
  explode: number;
  flow: number;
  /** Cutaway opening, 0 closed .. 1 fully open. */
  cut: number;
  comp: number;     // subject position, -1 (left) .. +1 (right) in half-widths
  compY: number;    // vertical nudge, in half-heights
  fitH: number;     // world height that must fit in frame
  fitW: number;     // fraction of frame width the model may occupy
  yaw: number;      // extra yaw on top of the idle turn
  pitch: number;    // camera elevation (rad)
  spin: number;     // idle turntable speed multiplier
  focus: number;    // -1 none, else part index highlighted
  flowStep: number; // 0..3 highlights one step of the water path, 4 shows all
}

function storyLook(p: number, narrow: boolean): Look {
  const e = ramp(p, [[STORY.explode[0], 0], [STORY.explode[1], 1], [STORY.labels[1], 1], [STORY.flowIn[1], 0.0]]);
  const flow = ramp(p, [[STORY.flowIn[0], 0], [STORY.flowIn[1], 1], [STORY.end, 1]]);
  const cut = ramp(p, [[STORY.flowIn[0] + 0.02, 0], [STORY.flowIn[1] + 0.02, 1]]);
  const comp = narrow
    ? ramp(p, [[0, 0], [1, 0]])
    : ramp(p, [[0, 0.36], [STORY.heroOut, 0.36], [STORY.explode[1], 0], [STORY.labels[1], 0], [STORY.flowIn[1], -0.4], [1, -0.4]]);
  const compY = narrow
    ? ramp(p, [[0, 0.5], [STORY.heroOut, 0.5], [STORY.explode[1], 0.2], [STORY.labels[1], 0.2], [STORY.flowIn[1], 0.36]])
    : ramp(p, [[0, 0.0], [STORY.heroOut, 0.0], [STORY.explode[1], 0.02], [STORY.labels[1], 0.02], [STORY.flowIn[1], 0.1]]);
  const fitH = ramp(p, [[0, 4.4], [STORY.heroOut, 4.4], [STORY.explode[1], 7.4], [STORY.labels[1], 7.4], [STORY.flowIn[1], 3.25]]);
  const fitW = narrow ? ramp(p, [[0, 0.62], [STORY.heroOut, 0.62], [STORY.explode[1], 0.95], [STORY.labels[1], 0.95], [STORY.flowIn[1], 0.62]]) : ramp(p, [[0, 0.38], [STORY.heroOut, 0.38], [STORY.explode[1], 0.34], [STORY.labels[1], 0.34], [STORY.flowIn[1], 0.46]]);
  const pitch = ramp(p, [[0, 0.3], [STORY.explode[1], 0.2], [STORY.labels[1], 0.24], [STORY.flowIn[1], 0.1]]);
  const spin = ramp(p, [[0, 1], [STORY.explode[0], 1], [STORY.explode[1], 0.25], [STORY.labels[1], 0.25], [STORY.flowIn[0], 0]]);
  const li = (p - STORY.labels[0]) / ((STORY.labels[1] - STORY.labels[0]) / 5);
  const focus = p > STORY.labels[0] && p < STORY.labels[1] ? Math.min(4, Math.floor(li)) : -1;
  const sw = (STORY.end - STORY.flowIn[1]) / 4;
  const flowStep = p >= STORY.flowIn[1] ? Math.min(3, Math.floor((p - STORY.flowIn[1]) / sw)) : 4;
  return { explode: e, flow, cut, comp, compY, fitH, fitW, yaw: 0, pitch, spin, focus, flowStep };
}

export type ViewerMode = 'assembled' | 'exploded' | 'flow';

function viewerLook(mode: ViewerMode, narrow: boolean, focus: number): Look {
  const base: Look = {
    explode: 0, flow: 0, cut: 0, comp: narrow ? 0 : 0.18, compY: narrow ? 0.05 : 0.1, fitH: 3.8, fitW: narrow ? 0.85 : 0.5,
    yaw: 0, pitch: 0.3, spin: 0.35, focus, flowStep: 4,
  };
  if (mode === 'exploded') return { ...base, explode: 1, fitH: 7.8, fitW: narrow ? 0.8 : 0.42, pitch: 0.22, compY: 0.12 };
  if (mode === 'flow') return { ...base, flow: 1, cut: 1, spin: 0, pitch: 0.16 };
  return base;
}

/* ------------------------------------------------------------------ public */

export interface Anchor { x: number; y: number; side: 1 | -1; depth: number }

export interface FrameInfo {
  anchors: Anchor[];
  /** Model centre and rough radius on screen, in CSS px. */
  center: { x: number; y: number; r: number };
  progress: number;
  width: number;
  height: number;
}

export interface EngineOptions {
  mode: 'story' | 'viewer';
  reducedMotion: boolean;
  getProgress?: () => number;
  onFrame?: (f: FrameInfo) => void;
  onReady?: () => void;
}

export interface EngineHandle {
  resize(): void;
  setPaused(p: boolean): void;
  setMotion(on: boolean): void;
  setMode(m: ViewerMode): void;
  setFocus(i: number): void;
  zoom(dir: 1 | -1): void;
  resetView(): void;
  intro(): void;
  debug(): Record<string, unknown>;
  dispose(): void;
}

/* ------------------------------------------------------------------ engine */

export function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions): EngineHandle {
  const tier = detectTier();
  const Q = QUALITY[tier];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[tier].dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Khronos neutral: keeps product colours true instead of greying them out
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = Q.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;

  const FOG = new THREE.Color('#010201');
  const scene = new THREE.Scene();
  // transparent: the page's backdrop wordmark shows through behind the model
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  scene.fog = new THREE.FogExp2(FOG, 0.035);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 120);

  /* lights */
  const key = new THREE.DirectionalLight('#fff8ef', 2.7);
  key.position.set(-3.5, 6, 4);
  key.castShadow = Q.shadows;
  key.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#eef6ff', 1.6);
  rim.position.set(4, 2.5, -5);
  // soft lime back light: catches the silhouette so the product separates from the dark
  const halo = new THREE.DirectionalLight('#b5e655', 1.6);
  halo.position.set(-1, 3, -6);
  scene.add(halo);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#ffffff', 0.5);
  rim2.position.set(-5, 1, -3);
  scene.add(rim2);
  scene.add(new THREE.HemisphereLight('#e6f4ea', '#0a120d', 0.45));
  // soft front fill so the product reads bright against the dark stage
  const fill = new THREE.DirectionalLight('#ffffff', 0.9);
  fill.position.set(1.5, 2, 7);
  scene.add(fill);

  /* model */
  const model = buildModel({ shadows: Q.shadows });
  const pivot = new THREE.Group();   // pointer tilt + float
  const turn = new THREE.Group();    // turntable
  pivot.add(turn);
  turn.add(model.root);
  scene.add(pivot);

  // cutaway: two vertical planes through the axis; with clipIntersection only
  // the wedge between them (the model's front) is removed
  const cutPlanes = [new THREE.Plane(), new THREE.Plane()];
  for (const m of model.clipped) {
    m.clippingPlanes = cutPlanes;
    m.clipIntersection = true;
    m.clipShadows = true;
  }
  const localPlane = new THREE.Plane();
  let lastCut = -1;

  /* stage: floor grid, contact shadow, skyline, motes */
  const FLOOR_Y = -1.55;
  const floorMat = new THREE.ShaderMaterial({
    vertexShader: basicVert, fragmentShader: floorFrag,
    uniforms: { uColor: { value: new THREE.Color('#7fd86b') }, uOpacity: { value: 0.24 }, uFocus: { value: new THREE.Vector3() } },
    transparent: true, depthWrite: false, fog: false,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: basicVert, fragmentShader: shadowFrag,
    uniforms: { uStrength: { value: 0.75 } }, transparent: true, depthWrite: false,
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), shadowMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = FLOOR_Y + 0.002;
  scene.add(contact);

  const moteGeo = new THREE.BufferGeometry();
  {
    const n = Q.motes;
    const p = new Float32Array(n * 3);
    const sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 16;
      p[i * 3 + 1] = (Math.random() - 0.5) * 8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      sd[i] = Math.random();
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  }
  const moteMat = new THREE.ShaderMaterial({
    vertexShader: moteVert, fragmentShader: moteFrag,
    uniforms: { uTime: { value: 0 }, uPixel: { value: 2.2 * renderer.getPixelRatio() }, uOpacity: { value: 0.55 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  /* post */
  // No post-processing: the canvas renders straight to screen with native
  // MSAA. Vignette and grain are done in CSS, which costs nothing per frame.
  let dpr = Math.min(window.devicePixelRatio, Q.dpr);
  const frameTimes: number[] = [];

  /* controls (viewer only) */
  let controls: OrbitControls | null = null;
  if (opts.mode === 'viewer') {
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.6;
  }

  /* state */
  let width = 1, height = 1;
  let narrow = false;
  let motion = !opts.reducedMotion;
  let paused = false;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let introT = opts.reducedMotion ? 1 : -1; // -1: waiting, 0..1 playing
  let viewerMode: ViewerMode = 'assembled';
  let viewerFocus = -1;
  let zoomMul = 1;
  let ready = false;
  let frames = 0;

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const cur: Look = opts.mode === 'story' ? storyLook(0, false) : viewerLook('assembled', false, -1);
  let progress = 0;
  let idleYaw = -0.5;

  const tmpV = new THREE.Vector3();
  const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
  const camRight = new THREE.Vector3();
  const anchorObjs = model.order.map((k) => {
    const o = new THREE.Object3D();
    o.position.y = model.parts[k].anchorY;
    model.parts[k].group.add(o);
    return o;
  });

  /*
   * Resizing a canvas clears its drawing buffer, and the browser can composite
   * that empty buffer before the next render. So the size is only applied at
   * the top of a frame (immediately followed by a render), only when it really
   * changed, and never to zero (a collapsed or hidden canvas keeps its last size).
   * Mobile URL-bar show/hide fires resize events without changing the canvas,
   * which used to blank the model mid-scroll.
   */
  let sizeDirty = true;
  let pendingDpr = 0;
  function applySize() {
    sizeDirty = false;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const dprChanged = pendingDpr > 0 && pendingDpr !== renderer.getPixelRatio();
    if (!dprChanged && w === width && h === height) return;
    width = w;
    height = h;
    narrow = width < 1024;
    if (dprChanged) renderer.setPixelRatio(pendingDpr);
    pendingDpr = 0;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resize = () => { sizeDirty = true; };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const onDprChange = () => { pendingDpr = Math.min(window.devicePixelRatio, Q.dpr, dpr); sizeDirty = true; };
  let dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const watchDpr = () => {
    dprQuery.removeEventListener('change', onDprChangeOnce);
    dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener('change', onDprChangeOnce);
  };
  function onDprChangeOnce() { onDprChange(); watchDpr(); }
  dprQuery.addEventListener('change', onDprChangeOnce);

  /* WebGL context loss (GPU reset, too many tabs): stop drawing until three
     restores the context, then pick up from the same state. */
  let contextLost = false;
  const onLost = (e: Event) => { e.preventDefault(); contextLost = true; };
  const onRestored = () => { contextLost = false; sizeDirty = true; width = 0; };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  // the floating nav covers the top of the story canvas: frame the model in
  // the space below it so it never slides under the bar
  const insetTop = opts.mode === 'story' ? 104 : 0;
  const insetBottom = opts.mode === 'story' ? 36 : 0;

  function fitDistance(look: Look) {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const avail = Math.max(0.5, (height - insetTop - insetBottom) / height);
    const dH = (look.fitH / 2) / tanH / avail;
    const dW = (2.75 / (2 * look.fitW)) / (tanH * camera.aspect);
    return Math.max(dH, dW) + 1.3;
  }

  function step(dt: number) {
    time += motion ? dt : 0;

    // target look
    let target: Look;
    if (warmTarget) {
      target = warmTarget;
    } else if (opts.mode === 'story') {
      const raw = clamp01(opts.getProgress?.() ?? 0);
      progress = damp(progress, raw, 7, dt);
      target = storyLook(progress, narrow);
    } else {
      target = viewerLook(viewerMode, narrow, viewerFocus);
    }
    const k = opts.mode === 'story' ? 9 : 4.5;
    for (const key of Object.keys(target) as (keyof Look)[]) {
      if (key === 'focus') { cur.focus = target.focus; continue; }
      cur[key] = damp(cur[key], target[key], k, dt);
    }

    // intro: the model rises and turns into place as the title card wipes away
    let intro = 1;
    if (introT >= 0 && introT < 1) {
      introT = Math.min(1, introT + dt / 2.2);
    }
    if (introT >= 0) intro = smoother(introT);
    else intro = 0;

    // explode
    for (const key of Object.keys(model.parts) as PartKey[]) {
      const part = model.parts[key];
      if (part.stretch) {
        part.group.position.y = part.stretch.offset * cur.explode;
        part.group.scale.y = 1 + (part.stretch.scale - 1) * cur.explode;
      } else {
        part.group.position.y = part.explode * cur.explode;
      }
    }
    model.root.position.y = -THREE.MathUtils.lerp(1.4, 2.55, cur.explode);
    model.lines.visible = false;

    // highlight for the water-path steps
    const all = cur.flowStep >= 4;
    const hi = (i: number) => (all || cur.flowStep === i ? 1 : 0.45);
    const flowVis = cur.flow * cur.cut * (1 - clamp01(cur.explode * 3));

    for (const s of model.screens) {
      const g = cur.focus === 1 || cur.focus === 4 ? 0.6 : flowVis * (cur.flowStep === 1 ? 0.9 : 0.15);
      s.uniforms.uGlow.value = damp(s.uniforms.uGlow.value, g * 0.25, 6, dt);
    }

    model.water.uniforms.uTime.value = time;
    model.water.uniforms.uFlow.value = cur.flow;
    model.waterSide.uniforms.uTime.value = time;
    model.pulse.uniforms.uTime.value = time;
    model.pulse.uniforms.uIntensity.value = Math.max(flowVis * hi(2), cur.focus === 3 ? 0.8 : 0) * (1 - cur.explode * 0.5);
    model.arrowTime.value = time;
    const setArrows = (mats: THREE.Material[], v: number) => {
      (mats[0] as THREE.ShaderMaterial).uniforms.uIntensity.value = v;
      (mats[1] as THREE.MeshBasicMaterial).opacity = v;
      mats[0].visible = mats[1].visible = v > 0.005;
    };
    setArrows(model.arrows.drain, flowVis * hi(0));
    setArrows(model.arrows.wick, flowVis * hi(2));
    setArrows(model.arrows.overflow, flowVis * hi(3));
    updateDrops(flowVis * (all || cur.flowStep === 0 ? 1 : 0.35));

    // turntable + float
    const spin = motion ? cur.spin : 0;
    idleYaw += dt * 0.22 * spin;
    const introYaw = (1 - intro) * 1.6;
    pointer.sx = damp(pointer.sx, motion ? pointer.x : 0, 2.5, dt);
    pointer.sy = damp(pointer.sy, motion ? pointer.y : 0, 2.5, dt);
    // free turntable, or locked so the cutaway faces the camera
    const free = idleYaw + cur.yaw - introYaw + pointer.sx * 0.22;
    const camAz = Math.atan2(camera.position.z, camera.position.x);
    const face = Math.PI / 2 - camAz;
    const locked = face + Math.PI * 2 * Math.round((free - face) / (Math.PI * 2)) + pointer.sx * 0.06;
    const lockAmt = smoother(clamp01(cur.cut * 1.4));
    turn.rotation.y = free + (locked - free) * lockAmt;
    const bob = motion ? Math.sin(time * 0.9) * 0.05 : 0;
    pivot.position.y = bob - (1 - intro) * 0.6;
    pivot.rotation.x = pointer.sy * 0.07 + (motion ? Math.sin(time * 0.6) * 0.012 : 0);
    pivot.rotation.z = -pointer.sx * 0.04 + (motion ? Math.cos(time * 0.5) * 0.01 : 0);
    const sc = 0.82 + intro * 0.18;
    pivot.scale.setScalar(sc);

    // cut planes, defined in model space and carried into world space
    const a = cur.cut * 0.8;
    model.root.updateWorldMatrix(true, false);
    const t1 = Math.PI / 2 - a, t2 = Math.PI / 2 + a;
    localPlane.set(new THREE.Vector3(Math.sin(t1), 0, -Math.cos(t1)), 0);
    cutPlanes[0].copy(localPlane).applyMatrix4(model.root.matrixWorld);
    localPlane.set(new THREE.Vector3(-Math.sin(t2), 0, Math.cos(t2)), 0);
    cutPlanes[1].copy(localPlane).applyMatrix4(model.root.matrixWorld);
    if (Math.abs(a - lastCut) > 0.004) {
      lastCut = a;
      // pebbles are hidden whole rather than sliced
      for (const set of model.pebbles) {
        for (let i = 0; i < set.base.length; i++) {
          const d = Math.abs(Math.atan2(Math.sin(set.angle[i] - Math.PI / 2), Math.cos(set.angle[i] - Math.PI / 2)));
          set.mesh.setMatrixAt(i, d < a - 0.04 ? HIDE : set.base[i]);
        }
        set.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    contact.scale.setScalar(1 + cur.explode * 0.25 - bob * 0.8);
    shadowMat.uniforms.uStrength.value = 0.7 * intro * (1 - cur.explode * 0.35);

    // camera
    const dist = fitDistance(cur) * zoomMul;
    if (controls) {
      // the orbit owns direction; we own distance and framing
      tmpV.copy(camera.position).normalize();
      camera.position.copy(tmpV.multiplyScalar(THREE.MathUtils.lerp(camera.position.length(), dist, 1 - Math.exp(-5 * dt))));
      controls.update();
    } else {
      camera.position.set(0, Math.sin(cur.pitch) * dist, Math.cos(cur.pitch) * dist);
      camera.lookAt(0, 0, 0);
    }
    camera.setViewOffset(width, height, -cur.comp * width * 0.5, cur.compY * height * 0.5 - (insetTop - insetBottom) / 2, width, height);

    floorMat.uniforms.uFocus.value.set(0, 0, 0);
    moteMat.uniforms.uTime.value = time;
  }

  const dropM = new THREE.Matrix4();
  const dropQ = new THREE.Quaternion();
  const dropS = new THREE.Vector3();
  const dropP = new THREE.Vector3();
  function updateDrops(amount: number) {
    const d = model.dropData;
    const n = d.length / 4;
    const top = MODEL.POT_Y + 0.02;
    const water = MODEL.WATER_Y;
    for (let i = 0; i < n; i++) {
      const kind = d[i * 4];
      const t = (d[i * 4 + 1] + time * (kind ? 0.32 : 0.55)) % 1;
      const visible = amount > 0.02 && (i / n) < amount;
      let s = visible ? 0.018 : 0;
      if (kind === 0) {
        // drain: falls from the pot base, accelerating, through platform and mesh
        const r = d[i * 4 + 2], a = d[i * 4 + 3];
        const y = top - (top - water) * t * t;
        dropP.set(Math.cos(a) * r, y, Math.sin(a) * r);
        dropS.set(s * 0.8, s * (1 + t * 1.6), s * 0.8);
        if (t > 0.97) s = 0;
      } else {
        // overflow: travels out through a screened outlet and falls away
        const a = d[i * 4 + 3];
        const rr = THREE.MathUtils.lerp(MODEL.INNER_R, MODEL.R + 0.35, Math.min(1, t * 1.6));
        const fall = Math.max(0, t * 1.6 - 1) * 0.9;
        const y = 0.2 - fall * fall * 1.6;
        dropP.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
        dropS.set(s, s, s);
        if (y < -0.5) s = 0;
      }
      if (s === 0) dropS.set(0, 0, 0);
      dropM.compose(dropP, dropQ, dropS);
      model.drops.setMatrixAt(i, dropM);
    }
    model.drops.instanceMatrix.needsUpdate = true;
  }

  // in the viewer the overflow hotspot sits on whichever screened outlet faces the camera
  const outlets = MODEL.WINDOW_PHI.map((phi) => {
    const o = new THREE.Object3D();
    o.position.set(Math.cos(phi) * (MODEL.R + 0.02), (MODEL.WINDOW_Y[0] + MODEL.WINDOW_Y[1]) / 2, Math.sin(phi) * (MODEL.R + 0.02));
    model.parts.overflow.group.add(o);
    return o;
  });
  const camPos = new THREE.Vector3();
  const anchors: Anchor[] = model.order.map(() => ({ x: 0, y: 0, side: 1, depth: 0 }));
  const center = { x: 0, y: 0, r: 0 };
  function computeAnchors() {
    camera.updateMatrixWorld();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    for (let i = 0; i < anchorObjs.length; i++) {
      const part = model.parts[model.order[i]];
      const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
      if (opts.mode === 'viewer' && model.order[i] === 'overflow') {
        camera.getWorldPosition(camPos);
        const d = outlets.map((o) => o.getWorldPosition(new THREE.Vector3()).distanceTo(camPos));
        outlets[d[0] < d[1] ? 0 : 1].getWorldPosition(tmpV);
      } else {
        anchorObjs[i].getWorldPosition(tmpV);
        tmpV.addScaledVector(camRight, part.anchorR * side * pivot.scale.x);
      }
      tmpV.project(camera);
      anchors[i].x = (tmpV.x * 0.5 + 0.5) * width;
      anchors[i].y = (-tmpV.y * 0.5 + 0.5) * height;
      anchors[i].side = side;
      anchors[i].depth = tmpV.z;
    }
  }

  /*
   * Shader warm-up. three compiles a material's program the first time it is
   * drawn, and the water, arrows, drops and cutaway only become visible deep in
   * the scroll story, so their compile (300 to 650 ms) used to freeze the page
   * mid-scroll. Before the reveal, the key looks are rendered once each while
   * the title card (or the page's first paint) still covers the canvas.
   */
  const warmLooks: Look[] = opts.mode === 'story'
    ? [storyLook(0.16, false), storyLook(0.42, false), storyLook(0.86, false)]
    : [viewerLook('exploded', false, -1), viewerLook('flow', false, -1)];
  let warmTarget: Look | null = null;
  function warmUp() {
    const keep = { time, idleYaw, introT, progress };
    const keepCam = camera.position.clone();
    for (const look of warmLooks) {
      warmTarget = look;
      step(10);
      renderer.render(scene, camera);
    }
    warmTarget = null;
    time = keep.time; idleYaw = keep.idleYaw; introT = keep.introT;
    // snap straight to the real starting look (and the real scroll position)
    progress = opts.mode === 'story' ? clamp01(opts.getProgress?.() ?? 0) : keep.progress;
    step(10);
    time = keep.time; idleYaw = keep.idleYaw; introT = keep.introT;
    if (controls) camera.position.copy(keepCam);
  }
  let warmed = false;

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (paused || contextLost) return;
    if (sizeDirty) applySize();
    if (!warmed) { warmed = true; warmUp(); last = performance.now(); }
    frames++;
    step(dt);
    renderer.render(scene, camera);
    // adaptive resolution: if frames run long, step the pixel ratio down. The
    // change is applied at the top of the next frame, right before a render,
    // so the cleared buffer is never shown.
    frameTimes.push(dt);
    if (frameTimes.length >= 90) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      frameTimes.length = 0;
      if (avg > 1 / 45 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.2);
        pendingDpr = dpr;
        sizeDirty = true;
        if (dpr <= 1.05 && renderer.shadowMap.enabled) {
          // last resort on slow machines: freeze shadows after one update
          renderer.shadowMap.autoUpdate = false;
          renderer.shadowMap.needsUpdate = true;
        }
      }
    }
    computeAnchors();
    // model centre and size on screen, for the CSS aura behind the canvas
    pivot.getWorldPosition(tmpV);
    const cx = tmpV.clone();
    tmpV.project(camera);
    center.x = (tmpV.x * 0.5 + 0.5) * width;
    center.y = (-tmpV.y * 0.5 + 0.5) * height;
    cx.addScaledVector(camRight, 1.9 * pivot.scale.x).project(camera);
    center.r = Math.abs((cx.x * 0.5 + 0.5) * width - center.x);
    opts.onFrame?.({ anchors, center, progress, width, height });
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
  }

  applySize();
  if (controls) {
    const d = fitDistance(cur);
    camera.position.set(0.9, Math.sin(0.3) * d, Math.cos(0.3) * d);
    controls.target.set(0, 0, 0);
  }
  raf = requestAnimationFrame(frame);

  return {
    resize,
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      last = performance.now();
    },

    setMotion(on) { motion = on; },
    setMode(m) { viewerMode = m; },
    setFocus(i) { viewerFocus = i; },
    zoom(dir) { zoomMul = THREE.MathUtils.clamp(zoomMul * (dir > 0 ? 0.85 : 1.18), 0.55, 1.6); },
    resetView() {
      zoomMul = 1;
      if (controls) {
        const d = fitDistance(cur);
        camera.position.set(0.9, Math.sin(0.3) * d, Math.cos(0.3) * d);
      }
    },
    intro() { if (introT < 0) introT = 0; },
    debug() { return { frames, paused, progress, disposed, dpr, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, programs: renderer.info.programs?.length ?? 0 }; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      dprQuery.removeEventListener('change', onDprChangeOnce);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      window.removeEventListener('pointermove', onPointer);
      controls?.dispose();
      model.dispose();
      floor.geometry.dispose(); floorMat.dispose();
      contact.geometry.dispose(); shadowMat.dispose();
      moteGeo.dispose(); moteMat.dispose();
      env.dispose(); pmrem.dispose();
      renderer.dispose();
      // Free the GPU context once the canvas has left the page (route change).
      // Under React Strict Mode the same canvas is reused straight away, and a
      // lost context cannot be reacquired, so only release a detached canvas.
      setTimeout(() => { if (!canvas.isConnected) renderer.forceContextLoss(); }, 0);
    },
  };
}
