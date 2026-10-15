// The mountain, built rather than photographed: a raymarched heightfield with
// snow, rock, forest, a cloud layer, fog and a reflecting lake. World units are
// metres; the lake surface is y = 0 and the summit stands ~3 km above it.
//
// The terrain is evaluated once into a height texture (HEIGHT_FS) and every
// frame marches that texture (WORLD_FS), which is many times cheaper than
// evaluating the noise per step. Fine detail near the camera stays procedural.

const COMMON = `
// ---- noise -------------------------------------------------------------
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// value noise with analytic derivatives (Inigo Quilez)
vec3 noised(vec2 x) {
  vec2 p = floor(x), w = fract(x);
  vec2 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = hash12(p), b = hash12(p + vec2(1, 0)), c = hash12(p + vec2(0, 1)), d = hash12(p + vec2(1, 1));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(-1.0 + 2.0 * (a + k1 * u.x + k2 * u.y + k4 * u.x * u.y), 2.0 * du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
}
float noise(vec2 x) { return noised(x).x; }
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);

// the height texture covers this rectangle of the world (x, z, width, depth);
// beyond it the terrain is mirrored, and fog hides the repeat
const vec4 BOUNDS = vec4(-4800.0, -3600.0, 9600.0, 14400.0);
const float H_MIN = -600.0, H_RANGE = 4800.0;
`

// where the climber's rock sits in the lake (world x, z); shared with the
// camera path and the DOM layer that places him on it
export const ISLAND = [105, 6700]

// Two tiers: 'full' for desktop GPUs, 'lite' for phones and weaker machines
// (smaller height texture, far fewer march steps, no traced shadows or
// reflections, lighter clouds).
export const TIERS = {
  full: { heightW: 2048, heightH: 3072 },
  lite: { heightW: 1024, heightH: 1536 },
}

export const heightShader = (tier) => `#version 300 es
precision highp float;
uniform vec2 uSize;
out vec4 o;
${COMMON}
// eroded fbm: octaves fade where the slope is already steep, which gives
// ridges and gullies instead of blobs
float erosion(vec2 x, int oct) {
  float a = 0.0, b = 1.0;
  vec2 d = vec2(0.0);
  for (int i = 0; i < 11; i++) {
    if (i >= oct) break;
    vec3 n = noised(x);
    d += n.yz;
    a += b * n.x / (1.0 + dot(d, d));
    b *= 0.5;
    x = M2 * x * 2.0;
  }
  return a;
}
// sharp-crested noise for ridges and faces
float ridged(vec2 x, int oct) {
  float a = 0.0, b = 0.55, w = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    float n = 1.0 - abs(noise(x));
    n *= n;
    a += b * n * w;
    w = clamp(n * 1.6, 0.0, 1.0);
    b *= 0.5;
    x = M2 * x * 2.03;
  }
  return a;
}
float valleyX(float z) { return 260.0 * sin(z / 2300.0) - 120.0 * sin(z / 900.0 + 1.3); }

float terrain(vec2 p) {
  float e = erosion(p / 1700.0 + vec2(3.1, 7.4), ${tier === 'lite' ? 8 : 10});
  float rg = ridged(p / 2300.0 + vec2(1.7, 4.2), ${tier === 'lite' ? 6 : 7});
  float dx = abs(p.x - valleyX(p.y));
  float z = p.y;
  // the summit: a ridged pyramid rather than a cone
  vec2 q = p * vec2(1.0, 0.82);
  float r = length(q) * (1.0 - 0.18 * rg) + 140.0 * noise(p / 600.0);
  float peak = 3150.0 * pow(max(0.0, 1.0 - r / 2600.0), 1.55) * (0.78 + 0.32 * rg);
  // the valley floor runs from the foot of the peak down to the lake
  float t = smoothstep(500.0, 5800.0, z);
  float floorH = mix(1500.0, -70.0, t);
  float halfW = mix(330.0, 1450.0, smoothstep(0.0, 6000.0, z));
  float walls = smoothstep(halfW * 0.3, halfW * 1.5, dx + 160.0 * e);
  float sides = walls * (700.0 + 1250.0 * rg + 220.0 * e) * mix(0.8, 1.0, t);
  float h = floorH + sides + e * mix(150.0, 45.0, t);
  float hh = max(h, peak + e * 160.0 * smoothstep(0.0, 1500.0, peak));
  // the lake basin, an irregular oval
  vec2 lk = vec2((p.x - valleyX(z)) / 1250.0, (z - 6950.0) / 1500.0);
  float basin = smoothstep(1.0, 0.72, length(lk) + 0.18 * noise(p / 520.0));
  return mix(hh, -55.0 + e * 20.0, basin);
}

void main() {
  vec2 p = BOUNDS.xy + gl_FragCoord.xy / uSize * BOUNDS.zw;
  float hn = clamp((terrain(p) - H_MIN) / H_RANGE, 0.0, 1.0);
  // 16-bit height split over two 8-bit channels
  float v = floor(hn * 65535.0 + 0.5);
  o = vec4(floor(v / 256.0) / 255.0, mod(v, 256.0) / 255.0, 0.0, 1.0);
}`

export const worldShader = (tier) => `#version 300 es
precision highp float;
${tier === 'lite' ? '#define LITE' : ''}
uniform sampler2D uHeight;
uniform vec2 uRes;          // render target size (px)
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uFov;         // tan(half vertical fov)
uniform float uTime;
uniform float uQuality;     // 0 .. 1: trades march steps for speed
out vec4 o;
${COMMON}
const vec3 SUN = normalize(vec3(-0.55, 0.42, 0.72));
const vec3 SUN_COL = vec3(1.0, 0.95, 0.88);
const vec3 SKY_COL = vec3(0.56, 0.68, 0.76);
const vec3 FOG_COL = vec3(0.64, 0.72, 0.76);
const vec2 SIZE = vec2(${TIERS[tier].heightW}.0, ${TIERS[tier].heightH}.0);

float texel(ivec2 i) {
  // mirror past the edges so the land carries on instead of smearing
  ivec2 n = ivec2(SIZE);
  ivec2 m = abs(i);
  m = ivec2(m.x % (2 * n.x), m.y % (2 * n.y));
  m = ivec2(m.x >= n.x ? 2 * n.x - 1 - m.x : m.x, m.y >= n.y ? 2 * n.y - 1 - m.y : m.y);
  vec2 rg = texelFetch(uHeight, m, 0).rg;
  return H_MIN + (rg.r * 255.0 * 256.0 + rg.g * 255.0) / 65535.0 * H_RANGE;
}
// bilinear by hand: the height is packed, so hardware filtering cannot be used
float height(vec2 xz) {
  vec2 uv = (xz - BOUNDS.xy) / BOUNDS.zw * SIZE - 0.5;
  vec2 f = fract(uv);
  ivec2 i = ivec2(floor(uv));
  float a = texel(i), b = texel(i + ivec2(1, 0)), c = texel(i + ivec2(0, 1)), d = texel(i + ivec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float march(vec3 ro, vec3 rd, float tmax, int steps) {
  float t = 1.0;
  for (int i = 0; i < 300; i++) {
    if (i >= steps) break;
#ifdef LITE
    if (i >= 80) break;
#endif
    vec3 p = ro + rd * t;
    float h = p.y - height(p.xz);
    if (h < 0.002 * t || t > tmax) break;
#ifdef LITE
    t += max(1.0, 0.6 * h);
#else
    t += max(0.5, 0.45 * h);
#endif
    if (p.y > 3400.0 && rd.y > 0.0) return tmax + 1.0;
  }
  return t;
}

// world size of one rendered pixel at distance t; detail finer than this
// only flickers between frames, so it is faded out (a cheap mip for noise)
float pixelSize(float t) { return t * uFov * 2.0 / uRes.y; }
float keep(float period, float t) { return clamp(1.5 - 2.0 * pixelSize(t) / period, 0.0, 1.0); }

vec3 normalAt(vec3 p, float t) {
  float eps = BOUNDS.z / SIZE.x;
  vec2 e = vec2(eps, 0.0);
  vec3 n = normalize(vec3(height(p.xz - e.xy) - height(p.xz + e.xy), 2.0 * eps, height(p.xz - e.yx) - height(p.xz + e.yx)));
  // close up, add surface detail the texture is too coarse to hold
  float near = smoothstep(2500.0, 200.0, t);
  vec2 tp = vec2(p.x + p.z * 0.7, p.y * 1.3 + p.z * 0.3);
  vec2 g = noised(tp / 9.0).yz * 0.55 * keep(9.0, t) + noised(tp / 3.1).yz * 0.25 * keep(3.1, t) + noised(p.xz / 40.0).yz * 0.35 * keep(40.0, t);
#ifndef LITE
  n = normalize(n + vec3(g.x, 0.0, g.y) * 0.35 * near);
#endif
  return n;
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 6.0;
  for (int i = 0; i < 24; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - height(p.xz);
    res = min(res, 9.0 * h / t);
    t += clamp(h, 15.0, 260.0);
    if (res < 0.01 || p.y > 3400.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 skyColor(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 col = mix(vec3(0.72, 0.78, 0.80), vec3(0.20, 0.33, 0.38), pow(y, 0.55));
  col += vec3(1.0, 0.9, 0.75) * 0.25 * pow(max(dot(rd, SUN), 0.0), 8.0);
  if (rd.y > 0.0) {
    vec2 uv = rd.xz / (rd.y + 0.12) * 1.6 + uTime * 0.004;
    float c = 0.0, a = 0.55;
#ifdef LITE
    for (int i = 0; i < 3; i++) { c += a * noise(uv); uv = M2 * uv * 2.03; a *= 0.5; }
#else
    for (int i = 0; i < 5; i++) { c += a * noise(uv); uv = M2 * uv * 2.03; a *= 0.5; }
#endif
    c = smoothstep(-0.15, 0.55, c);
    col = mix(col, mix(vec3(0.85, 0.88, 0.9), vec3(0.42, 0.50, 0.55), 0.5 - 0.5 * rd.y), c * 0.75 * smoothstep(0.0, 0.25, rd.y));
  }
  return col;
}

vec3 shade(vec3 p, vec3 rd, float t) {
  vec3 n = normalAt(p, t);
  float h = p.y;
  vec2 tp = vec2(p.x + p.z * 0.7, p.y * 1.3 + p.z * 0.3);  // samples faces as well as tops
  float detail = noise(tp / 6.0) * 0.5 * keep(6.0, t) + noise(tp / 1.7) * 0.25 * keep(1.7, t) + noise(tp / 22.0) * 0.4 * keep(22.0, t);
  float strata = noise(vec2(h / 28.0 + noise(p.xz / 180.0) * 2.0, 0.5));
  vec3 rock = mix(vec3(0.24, 0.235, 0.235), vec3(0.44, 0.42, 0.40), 0.5 + 0.35 * strata + 0.25 * noise(tp / 40.0));
  rock = mix(rock, vec3(0.36, 0.31, 0.27), 0.25 * smoothstep(0.2, 0.7, noise(p.xz / 300.0)));
  rock *= 0.8 + 0.35 * detail;
  float snowLine = mix(0.86, 0.5, smoothstep(300.0, 2600.0, h));
  float snow = smoothstep(snowLine - 0.06, snowLine + 0.06, n.y + 0.18 * noise(p.xz / 90.0) + 0.06 * detail);
  snow = max(snow, smoothstep(0.88, 0.98, n.y) * smoothstep(70.0, 8.0, h) * smoothstep(-0.05, 0.3, noise(p.xz / 420.0) + 0.1 * detail));
  float forest = smoothstep(1250.0, 1050.0, h) * smoothstep(0.62, 0.8, n.y) * smoothstep(-0.15, 0.25, noise(p.xz / 260.0)) * smoothstep(8.0, 30.0, h);
  forest *= 1.0 - snow;
  vec3 pine = vec3(0.045, 0.085, 0.075) * (0.7 + 0.6 * noise(p.xz / 3.0) * keep(3.0, t));
  vec3 alb = mix(rock, pine, forest);
  alb = mix(alb, vec3(0.93, 0.95, 0.97), snow);

#ifdef LITE
  float sh = 0.45 + 0.55 * smoothstep(0.05, 0.6, dot(n, SUN));
#else
  float sh = 0.25 + 0.75 * softShadow(p + n * 3.0, SUN);   // never fully black: sky light fills shadows
#endif
  float dif = max(dot(n, SUN), 0.0) * sh;
  float sky = 0.55 + 0.45 * n.y;
  float occ = clamp(0.55 + 0.45 * (p.y - height(p.xz + n.xz * 40.0) + 40.0) / 80.0, 0.35, 1.0);
  vec3 lit = SUN_COL * dif * 1.55 + SKY_COL * sky * 0.62 * occ;
  lit = mix(lit, lit * vec3(0.86, 0.94, 1.08), snow * (1.0 - dif));   // blue snow in shade
  vec3 col = alb * lit;
  return col;
}

vec3 fog(vec3 col, vec3 ro, vec3 rd, float t) {
  float a = 0.00006, b = 0.0012;
  float f = abs(rd.y) < 1e-4 ? a * exp(-ro.y * b) * t : a / b * exp(-ro.y * b) * (1.0 - exp(-t * rd.y * b)) / rd.y;
  f = 1.0 - exp(-f);
  float sun = pow(max(dot(rd, SUN), 0.0), 6.0);
  return mix(col, mix(FOG_COL, vec3(0.92, 0.88, 0.8), sun * 0.4), clamp(f, 0.0, 1.0));
}

// the cloud layer the camera descends through
vec4 clouds(vec3 ro, vec3 rd, float tmax) {
  const float LO = 2350.0, HI = 2950.0;
  float t0, t1;
  if (abs(rd.y) < 1e-4) {
    if (ro.y < LO || ro.y > HI) return vec4(0.0);
    t0 = 0.0; t1 = min(tmax, 3000.0);
  } else {
    t0 = (LO - ro.y) / rd.y; t1 = (HI - ro.y) / rd.y;
    if (t0 > t1) { float s = t0; t0 = t1; t1 = s; }
    t0 = max(t0, 0.0); t1 = min(t1, min(tmax, t0 + 6000.0));
  }
  if (t1 <= t0) return vec4(0.0);
#ifdef LITE
  const int CS = 4;
#else
  const int CS = 10;
#endif
  float dt = (t1 - t0) / float(CS);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < CS; i++) {
    vec3 p = ro + rd * (t0 + dt * (float(i) + 0.5));
    float hy = (p.y - LO) / (HI - LO);
    vec2 q = p.xz / 900.0 + vec2(uTime * 0.01, 0.0);
    float d = noise(q) * 0.6 + noise(M2 * q * 2.1) * 0.3 + noise(M2 * q * 4.3) * 0.15;
    d = clamp(d + 0.15 - abs(hy - 0.45) * 1.6, 0.0, 1.0) * 0.0035 * dt;
    vec3 c = mix(vec3(0.62, 0.70, 0.74), vec3(0.95, 0.96, 0.97), 0.75 + 0.25 * hy);
    acc.rgb += (1.0 - acc.a) * c * d;
    acc.a += (1.0 - acc.a) * d;
    if (acc.a > 0.97) break;
  }
  return acc;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
  vec3 rd = normalize(uCamFwd + uFov * (uv.x * uCamRight + uv.y * uCamUp));
  vec3 ro = uCamPos;
  float tmax = 26000.0;
  int steps = int(mix(120.0, 260.0, uQuality));

  vec3 col;
  float t = march(ro, rd, tmax, steps);
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;   // lake surface at y = 0
  bool water = tw > 0.0 && tw < t;
  float tHit = water ? tw : t;
  if (water) {
    vec3 p = ro + rd * tw;
    vec2 wq = p.xz / 18.0 + uTime * 0.05;
    vec3 n = normalize(vec3(noised(wq).yz * 0.025 + noised(wq * 3.1).yz * 0.012, 1.0).xzy);
    vec3 rr = reflect(rd, n);
#ifdef LITE
    vec3 refl = mix(vec3(0.34, 0.40, 0.43), skyColor(rr), smoothstep(0.05, 0.35, rr.y));
#else
    float tr = march(p + n * 0.5, rr, tmax, steps / 2);
    vec3 refl = tr < tmax ? fog(shade(p + rr * tr, rr, tr), p, rr, tr) : skyColor(rr);
#endif
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    float depth = clamp(-height(p.xz) / 40.0, 0.0, 1.0);
    vec3 body = mix(vec3(0.13, 0.55, 0.55), vec3(0.02, 0.24, 0.26), depth);
    col = mix(body * (0.6 + 0.4 * max(dot(n, SUN), 0.0)), refl, clamp(fres + 0.25, 0.0, 1.0));
  } else if (t < tmax) {
    col = shade(ro + rd * t, rd, t);
  } else {
    col = skyColor(rd);
  }
  if (tHit < tmax) col = fog(col, ro, rd, tHit);
  vec4 cl = clouds(ro, rd, min(tHit, tmax));
  col = mix(col, cl.rgb / max(cl.a, 1e-3), cl.a);

  col = aces(col * 1.05);
  col = mix(col, col * vec3(0.94, 1.0, 1.03), 0.6);
  col = pow(col, vec3(0.95));
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;   // static dither, no shimmer
  o = vec4(col, 1.0);
}`

// Camera stops along the descent. yaw 0 looks down the valley (+z); base camp
// turns round to look back up at the summit across the lake.
export const WORLD_KEYS = [
  null, // stop 0 is the snow close-up, drawn by the 2D pass
  { pos: [20, 3650, 260], yaw: 0.0, pitch: -0.55 },
  { pos: [180, 3100, 1100], yaw: 0.1, pitch: -0.38 },
  { pos: [-60, 2250, 2100], yaw: 0.12, pitch: -0.3 },
  { pos: [300, 1180, 2950], yaw: -0.12, pitch: -0.22 },
  { pos: [-160, 560, 4400], yaw: 0.06, pitch: -0.1 },
  // turned round over the lake: the climber is a speck on his rock, far ahead
  { pos: [ISLAND[0] + 30, 24, ISLAND[1] + 240], yaw: Math.PI, pitch: 0.07 },
  // flown in low over the water until he fills the frame
  { pos: [ISLAND[0], 1.6, ISLAND[1] + 3.7], yaw: Math.PI, pitch: 0.07 },
]

const lerp = (a, b, t) => a + (b - a) * t
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)

// Camera for continuous stop index u (1 .. 7): Catmull-Rom through the stop
// positions, angles eased between stops.
export function worldCamera(u, yawOffset = 0) {
  const n = WORLD_KEYS.length - 1
  const uu = Math.min(n, Math.max(1, u))
  const i = Math.min(n - 1, Math.floor(uu))
  const t = uu - i
  const P = (k) => WORLD_KEYS[Math.min(n, Math.max(1, k))].pos
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
  if (i === n - 1) {
    // the fly-in to the climber: close the distance at a steady rate (each
    // scroll step multiplies it by the same factor), so he grows evenly
    const I = [ISLAND[0], 1, ISLAND[1]]
    const d = (p) => Math.hypot(p[0] - I[0], p[1] - I[1], p[2] - I[2])
    const dA = d(p1), dB = d(p2)
    const want = dA * Math.pow(dB / dA, t)
    const k = (dA - want) / (dA - dB)
    const pos = [0, 1, 2].map((c) => p1[c] + (p2[c] - p1[c]) * k)
    return orient(pos, WORLD_KEYS[i], WORLD_KEYS[i + 1], smoother(t), yawOffset)
  }
  const pos = [0, 1, 2].map((c) => {
    const a = p1[c], b = p2[c]
    const m1 = (p2[c] - p0[c]) * 0.5, m2 = (p3[c] - p1[c]) * 0.5
    const t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * b + (t3 - t2) * m2
  })
  pos[1] = Math.max(pos[1], 1.2)
  return orient(pos, WORLD_KEYS[i], WORLD_KEYS[i + 1], smoother(t), yawOffset)
}

function orient(pos, A, B, e, yawOffset) {
  const yaw = lerp(A.yaw, B.yaw, e) + yawOffset
  const pitch = lerp(A.pitch, B.pitch, e)
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  const fwd = [sy * cp, sp, cy * cp]
  const right = [cy, 0, -sy]
  const up = [fwd[1] * right[2] - fwd[2] * right[1], fwd[2] * right[0] - fwd[0] * right[2], fwd[0] * right[1] - fwd[1] * right[0]]
  return { pos, fwd, right, up }
}
