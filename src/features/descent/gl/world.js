// The mountain, built rather than photographed: a raymarched heightfield with
// snow, rock, forest, a cloud layer, fog and a reflecting lake. World units are
// metres; the lake surface is y = 0 and the summit stands ~3 km above it.
//
// The terrain is evaluated once into a height texture (HEIGHT_FS) and every
// frame marches that texture (WORLD_FS), which is many times cheaper than
// evaluating the noise per step. Fine detail near the camera stays procedural.

// The summit camp: a few tents on a levelled shelf on the ridge just below
// the top. The route climbs from there to the summit; the footprints in the
// snow follow it.
export const CAMP = { x: 25, z: 175 }
export const ROUTE = [[25, 175], [8, 130], [0, 90], [-20, 50], [-45, 20], [-64, 8]]
// tents: x, z offset from the camp, radii (across, up, along), colour
const TENTS = [
  [-9, 3, 2.2, 1.5, 2.8, [0.92, 0.36, 0.07]],
  [3, -4, 2.8, 1.6, 2.2, [0.95, 0.7, 0.1]],
  [11, 7, 2.0, 1.4, 2.6, [0.78, 0.13, 0.08]],
  [-2, 11, 2.3, 1.5, 2.3, [0.92, 0.36, 0.07]],
  [-14, -7, 1.9, 1.3, 2.4, [0.12, 0.42, 0.55]],
]
// Base camp: where the climber stands, on a gravel beach at the water's edge
// at the near end of the lake, looking across it to the summit
export const PERCH = [-12, 0.6, 8364]
// boulders on the beach around him: x, z offset from him, radii; kept beside
// and behind him, never between him and the camera
const BOULDERS = [
  [-5, -2, 0.9, 0.6, 0.8],
  [4.5, -1, 0.6, 0.4, 0.55],
  [8, -5, 1.3, 0.9, 1.1],
  [-11, 2, 1.6, 1.1, 1.4],
  [2.5, -8, 0.6, 0.4, 0.5],
  [14, 3, 1.0, 0.7, 0.9],
  [-18, -4, 1.3, 0.9, 1.1],
  [-7, -9, 0.8, 0.5, 0.7],
]

// the height texture covers this rectangle of the world (x, z, width, depth)
export const BOUNDS = [-4800, -3600, 9600, 14400]
export const H_MIN = -600
export const H_RANGE = 5800

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

const vec2 CAMP_XZ = vec2(${CAMP.x}.0, ${CAMP.z}.0);
const vec3 PERCH = vec3(${PERCH.map((v) => v.toFixed(2)).join(', ')});
// the height texture covers this rectangle of the world (x, z, width, depth);
// beyond it the terrain is mirrored, and fog hides the repeat
const vec4 BOUNDS = vec4(${BOUNDS.join('.0, ')}.0);
const float H_MIN = ${H_MIN}.0, H_RANGE = ${H_RANGE}.0;
`


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

float base(vec2 p) {
  float e = erosion(p / 1700.0 + vec2(3.1, 7.4), ${tier === 'lite' ? 8 : 10});
  float rg = ridged(p / 2300.0 + vec2(1.7, 4.2), ${tier === 'lite' ? 6 : 7});
  float dx = abs(p.x - valleyX(p.y));
  float z = p.y;
  // the summit: a pyramid of four faces; its ridges run along the axes, so
  // one comes straight down toward the valley and the camera
  vec2 q = p * vec2(0.85, 1.0);
  float pyr = max(abs(q.x - q.y), abs(q.x + q.y)) * 0.7071;
  float r = mix(length(q), pyr, 0.6) * (1.0 - 0.18 * rg) + 140.0 * noise(p / 600.0);
  float peak = 4300.0 * pow(max(0.0, 1.0 - r / 3100.0), 1.55) * (0.78 + 0.32 * rg);
  // the valley floor runs from the foot of the peak down to the lake
  float t = smoothstep(500.0, 5800.0, z);
  float floorH = mix(1500.0, -70.0, t) + 260.0 * smoothstep(7900.0, 9200.0, z);
  float halfW = mix(330.0, 1450.0, smoothstep(0.0, 6000.0, z));
  float walls = smoothstep(halfW * 0.3, halfW * 1.5, dx + 160.0 * e);
  // the walls drop away toward the lake, so the summit stands clear behind it
  float sides = walls * (700.0 + 1250.0 * rg + 220.0 * e) * mix(0.8, 1.0, t) * mix(1.0, 0.5, smoothstep(3500.0, 7200.0, z));
  float h = floorH + sides + e * mix(150.0, 45.0, t);
  float hh = max(h, peak + e * 160.0 * smoothstep(0.0, 1500.0, peak));
  // the lake basin, an irregular oval
  vec2 lk = vec2((p.x - valleyX(z)) / 1250.0, (z - 6950.0) / 1500.0);
  float basin = smoothstep(1.0, 0.72, length(lk) + 0.18 * noise(p / 520.0));
  return mix(hh, -55.0 + e * 20.0, basin);
}

float terrain(vec2 p) {
  float hh = base(p);
  // the summit camp: a levelled shelf of snow on the ridge, at the ridge's
  // own height there
  float cd = length(p - CAMP_XZ) + noise(p / 9.0) * 4.0;
  if (cd < 34.0) hh = mix(hh, base(CAMP_XZ) + noise(p / 7.0) * 0.4, smoothstep(30.0, 16.0, cd));
  // base camp: a flat gravel beach behind the climber, running up gently
  // from the water instead of the steep bank
  float bm = 1.0 - smoothstep(0.55, 1.0, length((p - PERCH.xz) / vec2(110.0, 90.0)));
  bm *= smoothstep(PERCH.z - 6.0, PERCH.z + 3.0, p.y);
  float beach = PERCH.y + (p.y - PERCH.z) * 0.045 + noise(p / 6.0) * 0.25 + noise(p / 23.0) * 0.6;
  hh = mix(hh, beach, bm);
  return hh;
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
uniform sampler2D uDetail;  // tiling snow grain, the same as the close-up's
uniform float uDetailA;     // 0 until it has loaded
out vec4 o;
${COMMON}
const vec3 SUN = normalize(vec3(-0.66, 0.68, 0.3));
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
// the beach behind the climber, evaluated exactly: the height texture is too
// coarse to shade it smoothly from a few metres away
float beachMask(vec2 xz) {
  return (1.0 - smoothstep(0.32, 0.48, length((xz - PERCH.xz) / vec2(110.0, 90.0)))) * smoothstep(PERCH.z - 1.0, PERCH.z + 2.5, xz.y);
}
float beachH(vec2 xz) {
  return PERCH.y + (xz.y - PERCH.z) * 0.045 + noise(xz / 6.0) * 0.25 + noise(xz / 23.0) * 0.6;
}
vec2 beachGrad(vec2 xz) {
  return vec2(0.0, 0.045) + noised(xz / 6.0).yz * (0.25 / 6.0) + noised(xz / 23.0).yz * (0.6 / 23.0);
}

float texHeight(vec2 xz) {
  vec2 uv = (xz - BOUNDS.xy) / BOUNDS.zw * SIZE - 0.5;
  vec2 f = fract(uv);
  ivec2 i = ivec2(floor(uv));
  float a = texel(i), b = texel(i + ivec2(1, 0)), c = texel(i + ivec2(0, 1)), d = texel(i + ivec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// cubic B-spline over 4x4 texels: smooth to the second derivative, so normals
// taken from it show no texel grid even on the steepest faces
float smoothHeight(vec2 xz) {
  vec2 uv = (xz - BOUNDS.xy) / BOUNDS.zw * SIZE - 0.5;
  vec2 f = fract(uv);
  ivec2 i = ivec2(floor(uv)) - 1;
  vec2 f2 = f * f, f3 = f2 * f;
  vec4 wx = vec4(1.0 - 3.0 * f.x + 3.0 * f2.x - f3.x, 4.0 - 6.0 * f2.x + 3.0 * f3.x, 1.0 + 3.0 * f.x + 3.0 * f2.x - 3.0 * f3.x, f3.x) / 6.0;
  vec4 wy = vec4(1.0 - 3.0 * f.y + 3.0 * f2.y - f3.y, 4.0 - 6.0 * f2.y + 3.0 * f3.y, 1.0 + 3.0 * f.y + 3.0 * f2.y - 3.0 * f3.y, f3.y) / 6.0;
  float h = 0.0;
  for (int y = 0; y < 4; y++) {
    vec4 row = vec4(texel(i + ivec2(0, y)), texel(i + ivec2(1, y)), texel(i + ivec2(2, y)), texel(i + ivec2(3, y)));
    h += dot(row, wx) * wy[y];
  }
  return h;
}

float height(vec2 xz) {
  float h = texHeight(xz);
  if (xz.y > PERCH.z - 1.0 && abs(xz.x - PERCH.x) < 55.0) h = mix(h, beachH(xz), beachMask(xz));
  return h;
}

float march(vec3 ro, vec3 rd, float tmax, int steps) {
  float t = 1.0, tp = 1.0;
  for (int i = 0; i < 300; i++) {
    if (i >= steps) break;
#ifdef LITE
    if (i >= 80) break;
#endif
    vec3 p = ro + rd * t;
    float h = p.y - height(p.xz);
    if (t > tmax) break;
    if (h < 0.002 * t) {
      // refine between the last two samples, so hits don't snap to the step
      // grid (that shows as bands on ground seen at a grazing angle)
      float a = tp, b = t;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - height(q.xz) < 0.002 * m) b = m; else a = m;
      }
      return b;
    }
    tp = t;
#ifdef LITE
    t += max(0.8, h * mix(0.4, 0.6, smoothstep(300.0, 3000.0, t)));
#else
    // shorter steps close by: on steep faces the height above the ground
    // overstates the distance to it, and long steps skip through ridges
    t += max(0.3, h * mix(0.22, 0.45, smoothstep(300.0, 3000.0, t)));
#endif
    if (p.y > 4900.0 && rd.y > 0.0) return tmax + 1.0;
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
  vec3 n;
#ifndef LITE
  if (t < 5000.0) n = normalize(vec3(smoothHeight(p.xz - e.xy) - smoothHeight(p.xz + e.xy), 2.0 * eps, smoothHeight(p.xz - e.yx) - smoothHeight(p.xz + e.yx)));
  else
#endif
  n = normalize(vec3(height(p.xz - e.xy) - height(p.xz + e.xy), 2.0 * eps, height(p.xz - e.yx) - height(p.xz + e.yx)));
  float bm = p.z > PERCH.z - 1.0 && abs(p.x - PERCH.x) < 55.0 ? beachMask(p.xz) : 0.0;
  if (bm > 0.0) {
    // pebbles and ripples in the gravel, close up
    vec2 g = beachGrad(p.xz) + noised(p.xz / 0.45).yz * (0.06 / 0.45) * keep(0.45, t) + noised(p.xz / 1.6).yz * (0.12 / 1.6) * keep(1.6, t);
    return normalize(mix(n, normalize(vec3(-g.x, 1.0, -g.y)), bm));
  }
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
    if (res < 0.01 || p.y > 4900.0) break;
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

// ---- the summit route and camp ------------------------------------------
const vec2 ROUTE[${ROUTE.length}] = vec2[](${ROUTE.map(([x, z]) => `vec2(${x}.0, ${z}.0)`).join(', ')});
const int NT = ${TENTS.length};
const vec2 TENT_C[NT] = vec2[](${TENTS.map(([x, z]) => `vec2(${CAMP.x + x}.0, ${CAMP.z + z}.0)`).join(', ')});
const vec3 TENT_R[NT] = vec3[](${TENTS.map((t) => `vec3(${t.slice(2, 5).map((v) => v.toFixed(2)).join(', ')})`).join(', ')});
const vec3 TENT_COL[NT] = vec3[](${TENTS.map((t) => `vec3(${t[5].map((v) => v.toFixed(2)).join(', ')})`).join(', ')});

// signed distance across the route, and distance along it from the camp
vec2 routeAt(vec2 q) {
  float best = 1e9, along = 0.0, acc = 0.0, side = 1.0;
  for (int i = 0; i < ${ROUTE.length - 1}; i++) {
    vec2 a = ROUTE[i], ab = ROUTE[i + 1] - a;
    float len = length(ab);
    float k = clamp(dot(q - a, ab) / (len * len), 0.0, 1.0);
    vec2 d = q - a - ab * k;
    float dl = length(d);
    if (dl < best) { best = dl; along = acc + k * len; side = ab.x * d.y - ab.y * d.x < 0.0 ? -1.0 : 1.0; }
    acc += len;
  }
  return vec2(best * side, along);
}

// boot prints, left and right, pressed into the snow along the route; from
// further away they merge into a thin trodden line
float bootPrints(vec2 q, float t) {
  vec2 r = routeAt(q);
  if (abs(r.x) > 1.2) return 0.0;
  float k = floor(r.y / 0.42);
  float side = mod(k, 2.0) * 2.0 - 1.0;
  vec2 lp = vec2(r.y - (k + 0.5) * 0.42 + 0.04 * hash12(vec2(k, 7.0)), r.x - side * 0.13 + 0.05 * (hash12(vec2(k, 3.0)) - 0.5));
  float w = 0.055 + 0.02 * smoothstep(-0.15, 0.15, lp.x);   // wider at the toe
  float boot = 1.0 - smoothstep(0.6, 1.0, length(lp / vec2(0.17, w)));
  float line = (1.0 - smoothstep(0.15, 0.45, abs(r.x))) * 0.35;
  return mix(line * keep(0.5, t), boot, keep(0.12, t));
}

float tentShadow(vec2 q) {
  float s = 1.0;
  for (int i = 0; i < NT; i++) {
    vec2 c = TENT_C[i] - SUN.xz / SUN.y * TENT_R[i].y * 0.5;
    s *= 1.0 - 0.5 * (1.0 - smoothstep(0.85, 1.3, length((q - c) / TENT_R[i].xz)));
    s *= 1.0 - 0.25 * (1.0 - smoothstep(1.0, 1.35, length((q - TENT_C[i]) / TENT_R[i].xz)));
  }
  return s;
}

// the tents: the upper halves of ellipsoids; returns the hit distance
float tents(vec3 ro, vec3 rd, out vec3 n, out vec3 alb, out vec3 lp) {
  float best = 1e9;
  for (int i = 0; i < NT; i++) {
    vec3 c = vec3(TENT_C[i].x, height(TENT_C[i]) - 0.3, TENT_C[i].y);
    vec3 o = (ro - c) / TENT_R[i];
    vec3 d = rd / TENT_R[i];
    float a = dot(d, d), b = dot(o, d), cc = dot(o, o) - 1.0;
    float disc = b * b - a * cc;
    if (disc < 0.0) continue;
    float th = (-b - sqrt(disc)) / a;
    vec3 hp = o + d * th;
    if (th <= 0.0 || th >= best || hp.y < 0.0) continue;
    best = th;
    n = normalize(hp / TENT_R[i]);
    alb = TENT_COL[i];
    lp = hp;
  }
  return best;
}

vec3 shadeTent(vec3 n, vec3 alb, vec3 lp) {
  // two crossing poles, and a darker, snow-dusted skirt at the base
  float pole = 1.0 - smoothstep(0.0, 0.07, abs(abs(lp.x) - abs(lp.z)));
  alb *= (1.0 - 0.4 * pole) * (0.7 + 0.3 * smoothstep(0.0, 0.25, lp.y));
  alb = mix(alb, vec3(0.9), 0.35 * (1.0 - smoothstep(0.0, 0.12, lp.y)));
  float dif = max(dot(n, SUN), 0.0);
  return alb * (SUN_COL * dif * 1.45 + SKY_COL * (0.55 + 0.4 * n.y) * 0.6);
}

const int NB = ${BOULDERS.length};
const vec2 BOULDER_C[NB] = vec2[](${BOULDERS.map(([x, z]) => `vec2(${(PERCH[0] + x).toFixed(1)}, ${(PERCH[2] + z).toFixed(1)})`).join(', ')});
const vec3 BOULDER_R[NB] = vec3[](${BOULDERS.map((b) => `vec3(${b.slice(2).map((v) => v.toFixed(2)).join(', ')})`).join(', ')});

// boulders: rough rocks, ellipsoids broken up with noise and sphere-traced
// inside their bounds; half sunk into the beach or standing in the shallows
float sdRock(vec3 q, vec3 r, float seed) {
  float k = min(r.x, min(r.y, r.z));
  vec3 w = q / k;
  float d = (length(q / r) - 1.0) * k;
  d += k * 0.16 * noise(w.xz * 1.3 + w.y * 0.9 + seed);
  d += k * 0.07 * noise(w.zx * 3.1 - w.y * 2.2 + seed * 1.7);
  // flatter, broken faces rather than a smooth dome
  d = max(d, q.y - r.y * 0.72);
  return d;
}
vec3 boulderC(int i) {
  return vec3(BOULDER_C[i].x, height(BOULDER_C[i]) - BOULDER_R[i].y * 0.3, BOULDER_C[i].y);
}
float boulders(vec3 ro, vec3 rd, out vec3 n) {
  float best = 1e9;
  int hit = -1;
  for (int i = 0; i < NB; i++) {
    vec3 c = boulderC(i);
    vec3 R = BOULDER_R[i] * 1.25;
    vec3 o = (ro - c) / R;
    vec3 d = rd / R;
    float a = dot(d, d), b = dot(o, d), cc = dot(o, o) - 1.0;
    float disc = b * b - a * cc;
    if (disc < 0.0) continue;
    float t0 = max(0.0, (-b - sqrt(disc)) / a), t1 = (-b + sqrt(disc)) / a;
    if (t1 <= 0.0 || t0 >= best) continue;
    float t = t0;
    for (int j = 0; j < 40; j++) {
      float h = sdRock(ro + rd * t - c, BOULDER_R[i], float(i) * 7.3);
      if (h < 0.004) { if (t < best) { best = t; hit = i; } break; }
      t += h * 0.7;
      if (t > t1) break;
    }
  }
  if (hit >= 0) {
    vec3 c = boulderC(hit);
    vec3 q = ro + rd * best - c;
    vec2 e = vec2(0.01, -0.01);
    float sd = float(hit) * 7.3;
    n = normalize(e.xyy * sdRock(q + e.xyy, BOULDER_R[hit], sd) + e.yyx * sdRock(q + e.yyx, BOULDER_R[hit], sd) +
                  e.yxy * sdRock(q + e.yxy, BOULDER_R[hit], sd) + e.xxx * sdRock(q + e.xxx, BOULDER_R[hit], sd));
  }
  return best;
}

vec3 shadeBoulder(vec3 n, vec3 wp, float t) {
  float k = noise(wp.xz * 2.7 + wp.y * 1.9) * 0.6 + noise(wp.xz * 9.0 - wp.y * 6.0) * 0.4 * keep(0.12, t);
  vec3 alb = mix(vec3(0.24, 0.23, 0.22), vec3(0.47, 0.45, 0.42), 0.5 + 0.5 * k);
  alb = mix(alb, vec3(0.30, 0.33, 0.24), 0.35 * smoothstep(0.2, 0.7, noise(wp.xz * 1.3 + 4.0)) * smoothstep(0.3, 0.9, n.y));   // lichen
  alb *= mix(0.55, 1.0, smoothstep(0.0, 0.35, wp.y));   // wet at the waterline
  float dif = max(dot(n, SUN), 0.0);
  float occ = 0.6 + 0.4 * smoothstep(-0.4, 0.8, n.y);
  return alb * (SUN_COL * dif * 1.5 + SKY_COL * (0.5 + 0.45 * n.y) * 0.62 * occ);
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
  float snow = smoothstep(snowLine - 0.1, snowLine + 0.1, n.y + 0.18 * noise(p.xz / 90.0) + 0.08 * noise(p.xz / 23.0) + 0.06 * detail);
  // the beach the climber stands on: pale gravel, no snow
  float shore = (1.0 - smoothstep(60.0, 110.0, length(p.xz - PERCH.xz))) * smoothstep(-1.0, 0.4, h);
  snow *= 1.0 - shore;
  snow = max(snow, (1.0 - shore) * smoothstep(0.88, 0.98, n.y) * smoothstep(70.0, 8.0, h) * smoothstep(-0.05, 0.3, noise(p.xz / 420.0) + 0.1 * detail));
  float forest = smoothstep(1250.0, 1050.0, h) * smoothstep(0.62, 0.8, n.y) * smoothstep(-0.15, 0.25, noise(p.xz / 260.0)) * smoothstep(8.0, 30.0, h);
  forest *= 1.0 - snow;
  vec3 pine = vec3(0.045, 0.085, 0.075) * (0.7 + 0.6 * noise(p.xz / 3.0) * keep(3.0, t));
  vec3 alb = mix(rock, pine, forest);
  float pebble = noise(p.xz / 0.35) * keep(0.35, t) * 0.5 + noise(p.xz / 1.3) * keep(1.3, t) * 0.35 + noise(p.xz / 5.0) * 0.3;
  vec3 gravel = mix(vec3(0.46, 0.43, 0.39), vec3(0.66, 0.63, 0.58), 0.5 + 0.5 * pebble);
  gravel *= mix(0.62, 1.0, smoothstep(0.0, 0.5, h));   // wet at the waterline
  alb = mix(alb, gravel, shore);
  alb = mix(alb, vec3(0.93, 0.95, 0.97), snow);
  // close up, real snow grain instead of a flat white
  float grain = uDetailA * smoothstep(160.0, 15.0, t) * snow;
  if (grain > 0.0) {
    vec3 g1 = texture(uDetail, p.xz / 2.4).rgb * 2.0;
    vec3 g2 = texture(uDetail, M2 * p.xz / 7.5).rgb * 2.0;
    alb *= mix(vec3(1.0), g1 * mix(vec3(1.0), g2, 0.5), 0.55 * grain);
  }

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
  if (shore > 0.0) {
    for (int i = 0; i < NB; i++) {
      vec2 c = BOULDER_C[i] - SUN.xz / SUN.y * BOULDER_R[i].y * 0.45;
      col *= 1.0 - 0.4 * (1.0 - smoothstep(0.7, 1.4, length((p.xz - c) / BOULDER_R[i].xz)));
      col *= 1.0 - 0.3 * (1.0 - smoothstep(0.9, 1.25, length((p.xz - BOULDER_C[i]) / BOULDER_R[i].xz)));
    }
  }
  if (p.y > 2900.0) {
    // the footprints up to the summit, and the tents' shadows on the snow
    col *= mix(vec3(1.0), vec3(0.42, 0.52, 0.72), bootPrints(p.xz, t) * snow);
    col *= tentShadow(p.xz);
  }
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
    d *= mix(0.1, 1.0, clamp(smoothstep(90.0, 420.0, abs(p.x + 40.0)) + 1.0 - smoothstep(300.0, 900.0, p.z), 0.0, 1.0));   // keep the summit in view from the lake
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
    vec3 body = mix(vec3(0.16, 0.40, 0.40), vec3(0.03, 0.16, 0.19), depth);
    col = mix(body * (0.6 + 0.4 * max(dot(n, SUN), 0.0)), refl, clamp(fres + 0.25, 0.0, 1.0));
  } else if (t < tmax) {
    col = shade(ro + rd * t, rd, t);
  } else {
    col = skyColor(rd);
  }
  // the tents, tested from just short of the camp so the maths stays precise
  vec3 campP = vec3(CAMP_XZ.x, height(CAMP_XZ), CAMP_XZ.y);
  if (length(campP - ro) < 3000.0) {
    float lead = max(0.0, dot(campP - ro, rd) - 40.0);
    vec3 tn, ta, tl;
    float tt = tents(ro + rd * lead, rd, tn, ta, tl) + lead;
    if (tt < tHit) { col = shadeTent(tn, ta, tl); tHit = tt; }
  }
  if (length(PERCH - ro) < 600.0) {
    vec3 bn;
    float lead = max(0.0, dot(PERCH - ro, rd) - 60.0);
    float tb = boulders(ro + rd * lead, rd, bn) + lead;
    if (tb < tHit) { col = shadeBoulder(bn, ro + rd * tb, tb); tHit = tb; }
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

const lerp = (a, b, t) => a + (b - a) * t
const ramp01 = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)))
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)

// The camera always faces the summit (looking up the valley, toward -z) and
// never turns. It starts straight above the last footprints, pulls back off
// the summit ridge past the camp, then backs down the valley, through the
// cloud, over the glacier, the forest and the lake, and at last drifts back
// over the climber's head so he comes into view standing on the shore.
//
// The footprints start on the camp shelf, among the tents, and lead up the
// ridge to the top. The pull-back from them: the distance from them grows
// exponentially, so it reads as one steady zoom out.
const PRINT_SPOT = [18.6, 4172, 158.2]
// the exact snow height under the prints (it differs a little per tier)
export function setPrintGround(y) {
  PRINT_SPOT[1] = y
}
export const PRINT_XZ = [PRINT_SPOT[0], PRINT_SPOT[2]]
const PULL = { u0: 0.42, u1: 1, r0: 16 }
// after that, a spline through [u, x, y, z, pitch, hold]; the camera comes
// to rest on a key marked hold
const PATH = [
  [1, 45, 4250, 650, 0.08],
  [2, 150, 3000, 1650, 0.1],
  [3, 250, 2250, 2800, 0.06],
  [4, 230, 1450, 4050, 0.04],
  [5, 110, 720, 5600, 0.03],
  [6, 10, 170, 7450, 0.03],
  // skimming in low over the water, just over his head, then backing away
  // from him so he rises into view and the whole lake opens up around him
  [6.5, PERCH[0], 4.4, PERCH[2] - 4, 0.0, 1],
  [7, PERCH[0] - 1.5, 3.6, PERCH[2] + 7.5, 0.06, 1],
]

// Hermite spline with tangents for the unevenly spaced keys
function spline(u) {
  const n = PATH.length
  let i = 0
  while (i < n - 2 && u > PATH[i + 1][0]) i++
  const K = (k) => PATH[Math.min(n - 1, Math.max(0, k))]
  const a = K(i)
  const b = K(i + 1)
  const t = ramp01(u, a[0], b[0])
  // limited so a short last leg never overshoots (Fritsch-Carlson)
  const tan = (k, c) => {
    if (K(k)[5]) return 0
    const p = K(k - 1)
    const q = K(k + 1)
    const m = ((q[c] - p[c]) / (q[0] - p[0])) * (b[0] - a[0])
    const d = b[c] - a[c]
    return m * d <= 0 ? 0 : Math.sign(m) * Math.min(Math.abs(m), 2.1 * Math.abs(d))
  }
  const t2 = t * t
  const t3 = t2 * t
  return [1, 2, 3, 4].map((c) => (2 * t3 - 3 * t2 + 1) * a[c] + (t3 - 2 * t2 + t) * tan(i, c) + (-2 * t3 + 3 * t2) * b[c] + (t3 - t2) * tan(i + 1, c))
}

// Camera for continuous stop index u (0 .. 7).
export function worldCamera(u, portrait = false) {
  let pos
  let pitch
  if (u < PULL.u1) {
    const t = ramp01(u, PULL.u0, PULL.u1)
    const end = spline(PULL.u1)
    const off = [end[0] - PRINT_SPOT[0], end[1] - PRINT_SPOT[1], end[2] - PRINT_SPOT[2]]
    const r1 = Math.hypot(...off)
    const r = PULL.r0 * Math.pow(r1 / PULL.r0, t)
    // direction from the prints: straight up at first, swinging back to the end
    const e = smoother(Math.min(1, t * 1.15))
    const dir = [(off[0] / r1) * e, lerp(1, off[1] / r1, e), (off[2] / r1) * e]
    const dl = Math.hypot(...dir)
    pos = dir.map((v, k) => PRINT_SPOT[k] + (v / dl) * r)
    // keep looking at the prints at first, then settle on the stop's pitch
    const look = Math.atan2(PRINT_SPOT[1] - pos[1], Math.hypot(PRINT_SPOT[0] - pos[0], PRINT_SPOT[2] - pos[2]))
    pitch = lerp(Math.max(-1.52, look), end[3], smoother(ramp01(t, 0.35, 1)))
  } else {
    const s = spline(u)
    pos = [s[0], s[1], s[2]]
    pitch = s[3]
    // on tall screens finish straight behind him, so he stays in frame
    if (portrait) pos[0] = lerp(pos[0], PERCH[0], smoother(ramp01(u, 6.5, 7)))
  }
  return orientTo(pos, Math.PI, pitch)
}

function orientTo(pos, yaw, pitch) {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const fwd = [sy * cp, sp, cy * cp]
  const right = [cy, 0, -sy]
  const up = [fwd[1] * right[2] - fwd[2] * right[1], fwd[2] * right[0] - fwd[0] * right[2], fwd[0] * right[1] - fwd[1] * right[0]]
  return { pos, fwd, right, up }
}
