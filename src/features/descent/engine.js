// Tiny frame bus. Scroll is read once per frame in Descent.jsx and pushed to every
// visual layer here, so nothing scroll-driven ever goes through React state.
import { STOPS, TRAIL } from './content'

export const EASE = [0.16, 1, 0.3, 1]
export const IMG_W = 1500
export const IMG_H = 2000
const LAST = STOPS.length - 1

export const state = {
  u: 0, // continuous stop index, 0 = summit close-up, last = base camp
  vw: 1,
  vh: 1,
  portrait: false,
  anchors: STOPS.map(() => 0),
  ready: false,
  reduced: false,
  gl: false, // WebGL stage running (enables the close-up)
}

if (import.meta.env?.DEV) window.__descent = state

// Resolves once the stage has what it needs for the first frame.
export const stage = {}
stage.ready = new Promise((resolve) => (stage.resolve = resolve))

const subs = new Set()
export function subscribe(fn) {
  subs.add(fn)
  fn(state)
  return () => subs.delete(fn)
}
export function emit() {
  subs.forEach((fn) => fn(state))
}

export const lerp = (a, b, t) => a + (b - a) * t
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)
// 0 → 1 → 0 bump between a and b
export const bump = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI))
export const ramp = (u, a, b) => clamp((u - a) / (b - a))

export function uFromScroll(y, anchors) {
  if (y <= anchors[0]) return 0
  for (let i = 0; i < LAST; i++) {
    if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i])
  }
  return LAST
}

// Camera: eased glide between stops, zoom interpolated in log space with a small
// drone-style pull-back mid-flight. Returns a transform for the 1500x2000 world.
export function camera(u, vw, vh, portrait) {
  const i = Math.min(LAST - 1, Math.floor(u))
  const t = smoother(clamp(u - i))
  const cam = (k) => (!state.gl && STOPS[k].fallback) || STOPS[k].cam
  const a = cam(i)
  const b = cam(i + 1)
  const zi = portrait ? 1 : 0
  const x = lerp(a.x, b.x, t)
  const y = lerp(a.y, b.y, t)
  let z = Math.exp(lerp(Math.log(a.z[zi]), Math.log(b.z[zi]), t))
  z *= 1 - 0.08 * Math.sin(Math.PI * t) * (u >= LAST ? 0 : 1)
  const cover = Math.max(vw / IMG_W, vh / IMG_H)
  const s = cover * Math.max(1, z)
  const tx = clamp(vw / 2 - x * s, vw - IMG_W * s, 0)
  const ty = clamp(vh / 2 - y * s, vh - IMG_H * s, 0)
  return { s, tx, ty }
}

export function altitude(u) {
  const i = Math.min(LAST - 1, Math.floor(u))
  return Math.round(lerp(STOPS[i].alt, STOPS[i + 1].alt, clamp(u - i)))
}

// ---- Trail geometry (computed once) ----
function catmull(points, steps = 18) {
  const out = []
  const idx = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    idx[i] = out.length
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (k) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
      out.push([f(0), f(1)])
    }
  }
  idx[points.length - 1] = out.length
  out.push(points[points.length - 1])
  return { out, idx }
}

export function buildTrail() {
  const pts = TRAIL.map((p) => (Array.isArray(p) ? p : p.p))
  const { out, idx } = catmull(pts)
  const len = [0]
  for (let i = 1; i < out.length; i++) len[i] = len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1])
  const total = len[len.length - 1]

  const stopLen = []
  TRAIL.forEach((p, i) => {
    if (!Array.isArray(p)) [].concat(p.stop).forEach((k) => (stopLen[k] = len[idx[i]]))
  })

  // footprints: smaller and denser up high, bigger near the camera
  const prints = []
  let d = 0
  let side = 1
  let j = 1
  while (d < total) {
    while (j < len.length - 1 && len[j] < d) j++
    const k = clamp((d - len[j - 1]) / Math.max(0.001, len[j] - len[j - 1]))
    const x = lerp(out[j - 1][0], out[j][0], k)
    const y = lerp(out[j - 1][1], out[j][1], k)
    const dx = out[j][0] - out[j - 1][0]
    const dy = out[j][1] - out[j - 1][1]
    const ang = Math.atan2(dy, dx)
    const size = lerp(5.5, 21, clamp((y - 400) / 1420))
    const nx = -Math.sin(ang) * side * size * 0.34
    const ny = Math.cos(ang) * side * size * 0.34
    prints.push({ x: x + nx, y: y + ny, r: (ang * 180) / Math.PI + 90, k: (size / 22) * 0.8, side, d })
    side = -side
    d += size * 1.6
  }

  const pointAt = (dist) => {
    let lo = 0
    let hi = len.length - 1
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (len[m] < dist) lo = m + 1
      else hi = m
    }
    const b = Math.max(1, lo)
    const kk = clamp((dist - len[b - 1]) / Math.max(0.001, len[b] - len[b - 1]))
    return [lerp(out[b - 1][0], out[b][0], kk), lerp(out[b - 1][1], out[b][1], kk)]
  }

  return { prints, stopLen, total, pointAt }
}

export function headDistance(u, stopLen) {
  const i = Math.min(LAST - 1, Math.floor(u))
  return lerp(stopLen[i], stopLen[i + 1], smoother(clamp(u - i)))
}
