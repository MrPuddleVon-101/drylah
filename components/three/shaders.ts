/* All GLSL for the DryLah scene. */

export const basicVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  #include <clipping_planes_pars_vertex>
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vViewDir = normalize(-mv.xyz);
    vNormalV = normalize(normalMatrix * normal);
    vec4 mvPosition = mv;
    #include <clipping_planes_vertex>
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * Woven screen. Lines are anti-aliased with fwidth so the weave stays crisp
 * at any zoom; the gaps keep a faint tint so the sheet still reads as a part.
 */
export const meshFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec2 uScale;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uRound;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    if (uRound > 0.5 && length(vUv - 0.5) > 0.5) discard;
    vec2 g = vUv * uScale;
    vec2 w = fwidth(g);
    vec2 f = abs(fract(g - 0.5) - 0.5) / max(w * 1.2, 1e-4);
    float line = 1.0 - clamp(min(f.x, f.y), 0.0, 1.0);
    // fade the weave out where it would alias, leaving an even grey sheet
    float detail = clamp(1.0 - max(w.x, w.y) * 2.2, 0.0, 1.0);
    line *= detail;
    float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.0);
    vec3 col = mix(uColor, uColor * 0.55, line) + vec3(0.62, 0.95, 0.45) * uGlow * 0.35;
    float a = 0.5 + line * 0.3 + fres * 0.1;
    gl_FragColor = vec4(col, a * uOpacity);
  }
`;

export const waterFrag = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  uniform float uOpacity;
  uniform vec3 uDeep;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <clipping_planes_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    #include <clipping_planes_fragment>
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float t = uTime;
    // drifting caustic web
    vec2 q = p * 5.0;
    float n = noise(q + vec2(t * 0.25, -t * 0.18)) + 0.5 * noise(q * 2.1 - vec2(t * 0.31, t * 0.22));
    float caustic = pow(1.0 - abs(n - 0.75) * 1.6, 6.0);
    // concentric rings from incoming drainage
    float ring = sin(r * 34.0 - t * 4.2) * 0.5 + 0.5;
    ring = pow(ring, 6.0) * smoothstep(1.0, 0.15, r) * uFlow;
    vec3 col = mix(uDeep, uLight, clamp(caustic * 0.55 + ring * 0.8, 0.0, 1.0));
    float edge = smoothstep(1.0, 0.92, r);
    gl_FragColor = vec4(col * (1.0 + ring * 0.6), (0.62 + caustic * 0.18 + ring * 0.2) * uOpacity * edge);
  }
`;

/** Capillary return: soft bands climbing the wick. Additive. */
export const pulseFrag = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    float band = sin((vUv.y * 5.0 - uTime * 0.9) * 6.2831) * 0.5 + 0.5;
    band = pow(band, 5.0);
    float rim = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.5);
    float fade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    vec3 col = vec3(0.55, 1.0, 0.62) * band + vec3(0.35, 0.85, 1.0) * rim * 0.25;
    gl_FragColor = vec4(col, (band * 0.85 + rim * 0.2) * uIntensity * fade);
  }
`;

/** CAD ground plane: major and minor grid, fading out radially into fog. */
export const floorFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uFocus;
  varying vec3 vWorld;
  float grid(vec2 p, float s) {
    vec2 g = p / s;
    vec2 w = fwidth(g);
    vec2 f = abs(fract(g - 0.5) - 0.5) / max(w, 1e-4);
    return 1.0 - clamp(min(f.x, f.y), 0.0, 1.0);
  }
  void main() {
    vec2 p = vWorld.xz;
    float d = length(p - uFocus.xz);
    float minor = grid(p, 0.25) * 0.35;
    float major = grid(p, 1.0);
    float fade = exp(-d * 0.16);
    float a = max(minor, major) * fade;
    // soft contact glow right under the product
    float halo = exp(-d * d * 0.55) * 0.22;
    gl_FragColor = vec4(uColor, (a * 0.55 + halo) * uOpacity);
  }
`;

/** Contact shadow under the floating product. */
export const shadowFrag = /* glsl */ `
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * uStrength);
  }
`;

/** Distant tower blocks: lit window grid, mostly dark, swallowed by fog. */
export const towerVert = /* glsl */ `
  attribute vec3 aSize;
  attribute float aSeed;
  varying vec3 vLocal;
  varying vec3 vSize;
  varying float vSeed;
  varying float vDepth;
  varying vec3 vN;
  void main() {
    vLocal = position * aSize;
    vSize = aSize;
    vSeed = aSeed;
    vN = normal;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const towerFrag = /* glsl */ `
  uniform vec3 uFog;
  uniform float uTime;
  varying vec3 vLocal;
  varying vec3 vSize;
  varying float vSeed;
  varying float vDepth;
  varying vec3 vN;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main() {
    vec3 base = vec3(0.018, 0.032, 0.026);
    float side = abs(vN.y) > 0.5 ? 0.0 : 1.0;
    // window grid on the facades
    vec2 uv = vec2(abs(vN.x) > 0.5 ? vLocal.z : vLocal.x, vLocal.y + vSize.y * 0.5);
    vec2 cell = floor(uv / vec2(0.42, 0.34));
    vec2 f = fract(uv / vec2(0.42, 0.34));
    float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.75);
    float lit = step(0.91, hash(cell + vSeed * 17.0));
    float flicker = 0.75 + 0.25 * sin(uTime * 0.6 + hash(cell) * 30.0);
    vec3 warm = mix(vec3(1.0, 0.82, 0.55), vec3(0.75, 1.0, 0.85), hash(cell * 1.7));
    vec3 col = base + warm * win * lit * flicker * 0.32 * side;
    float fog = 1.0 - exp(-vDepth * 0.032);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;

/** Floating motes: spores and droplets. */
export const moteVert = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixel;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aSeed * 0.08) + 4.0, 8.0) - 4.0;
    p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
    p.z += cos(uTime * 0.25 + aSeed * 23.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixel * (0.6 + aSeed * 1.6) * (6.0 / -mv.z);
    vAlpha = smoothstep(4.0, 2.5, abs(p.y)) * (0.25 + aSeed * 0.5);
    vSeed = aSeed;
  }
`;

export const moteFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(0.66, 0.95, 0.42), vec3(0.55, 0.9, 1.0), step(0.7, vSeed));
    gl_FragColor = vec4(col, a * vAlpha * uOpacity);
  }
`;

/** Final grade: vignette, green-lifted shadows, fine grain. */
export const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.95, 0.2, length(d * vec2(1.15, 1.0)));
      c.rgb *= mix(1.0, v, uVignette);
      // lift shadows toward the brand's deep green
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += vec3(0.004, 0.016, 0.010) * (1.0 - smoothstep(0.0, 0.25, l));
      c.rgb += (hash(vUv * 1000.0 + fract(uTime)) - 0.5) * uGrain;
      gl_FragColor = c;
    }
  `,
};

/** Flow arrow: dashes travelling along a tube toward its head. Additive. */
export const arrowFrag = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = fract(vUv.x * 6.0 - uTime * 1.2);
    float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.55, 0.65, d));
    float body = 0.35 + dash * 0.65;
    float ends = smoothstep(0.0, 0.06, vUv.x);
    gl_FragColor = vec4(uColor * (0.9 + dash * 0.6), body * ends * uIntensity);
  }
`;

export const waterSideFrag = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    float wave = sin(vUv.x * 80.0 + uTime * 1.5) * 0.02;
    float top = smoothstep(0.92 + wave, 0.98 + wave, vUv.y);
    vec3 col = mix(vec3(0.10, 0.48, 0.55), vec3(0.62, 0.94, 0.96), vUv.y * 0.6 + top * 0.5);
    gl_FragColor = vec4(col, (0.55 + top * 0.3) * uOpacity);
  }
`;
