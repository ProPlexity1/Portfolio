import { useEffect, useRef, useState } from 'react'
import { STOPS } from '../content'
import { bump, clamp, lerp, ramp, smoother, stage, state, subscribe } from '../engine'
import Snowfall from './Snowfall'

const LAST = STOPS.length - 1

// The scene is one photograph: the lake, the forest and the peak in cloud, with
// him on the rock (scene px, 8000x3048). Scrolling moves a camera through it,
// from the peak down to the whole view. Plates are exported by
// scripts/plates/export.py; `box` is the part of the scene each one covers.
const SCENE = { w: 8000, h: 3048 }
const PLATES = {
  wide: { src: '/media/scene-wide', box: [0, 0, 8000, 3048], size: [4000, 1524] },
  wideSm: { src: '/media/scene-wide-sm', box: [0, 0, 8000, 3048], size: [2560, 975] },
  tall: { src: '/media/scene-tall', box: [3000, 0, 2300, 3048], size: [1840, 2438] },
  tallSm: { src: '/media/scene-tall-sm', box: [3000, 0, 2300, 3048], size: [1150, 1524] },
}
// full-resolution tile of the peak for the close-up at the top
const PEAK = { src: '/media/peak', box: [3450, 380, 1700, 1320], size: [1700, 1320] }

// Camera keyframes along the scroll (u = stop index): where it looks (cx, cy)
// and how much of the scene's height it shows. Down from the peak, the view
// opens until it ends on the whole photograph.
const KEYS = [
  { u: 0, cx: 4300, cy: 840, vh: 920 },
  { u: 1, cx: 4290, cy: 960, vh: 1350 },
  { u: 2.5, cx: 4250, cy: 1280, vh: 1900 },
  { u: 4.5, cx: 4200, cy: 1640, vh: 2450 },
  { u: LAST, cx: 4150, cy: 1524, vh: 3048 },
]

function cameraAt(u) {
  let i = 0
  while (i < KEYS.length - 2 && u > KEYS[i + 1].u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = smoother(clamp((u - a.u) / (b.u - a.u)))
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    vh: Math.exp(lerp(Math.log(a.vh), Math.log(b.vh), t)),
  }
}

const pickPlate = (vw, vh, dpr) => {
  const portrait = vw / vh < 0.9
  const big = vh * Math.min(dpr, 2) > 1300
  return portrait ? (big ? PLATES.tall : PLATES.tallSm) : big ? PLATES.wide : PLATES.wideSm
}

const set = (el, key, value) => {
  if (el && el.__last?.[key] !== value) {
    el.__last = { ...el.__last, [key]: value }
    el.style[key] = value
  }
}

// Each image is laid out at its own pixel size divided by the device pixel
// ratio, so the browser rasterises it 1:1, and only ever moved and scaled on the
// GPU. Returns the transform that maps it into the current view.
function place(el, img, view, dpr) {
  const [bx, by, bw] = img.box
  const cssW = img.size[0] / dpr
  const k = (view.s * bw) / cssW
  const x = (bx - view.x0) * view.s
  const y = (by - view.y0) * view.s
  set(el, 'transform', `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${k.toFixed(5)})`)
}

function Picture({ img, dpr, refEl, className, onReady }) {
  return (
    <picture>
      <source srcSet={`${img.src}.avif`} type="image/avif" />
      <img
        ref={refEl}
        src={`${img.src}.webp`}
        alt=""
        decoding="async"
        fetchPriority="high"
        className={className}
        style={{ width: `${img.size[0] / dpr}px`, height: `${img.size[1] / dpr}px` }}
        onLoad={onReady}
      />
    </picture>
  )
}

export default function Stage() {
  const [layout] = useState(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    return { dpr, plate: pickPlate(window.innerWidth, window.innerHeight, dpr) }
  })
  const plate = useRef(null)
  const peak = useRef(null)
  const shade = useRef(null)
  const shadeR = useRef(null)
  const grade = useRef(null)
  const wisps = useRef(null)

  useEffect(() => {
    const { dpr } = layout
    const box = layout.plate.box
    let raf = 0
    let latest = state
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

    const frame = () => {
      const { vw, vh, u } = latest
      const cam = cameraAt(u)
      // a very gentle look-around, less once the whole view is in frame
      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06
      const look = 0.012 * (1 - 0.6 * ramp(u, LAST - 1, LAST))
      // never show past the plate's edges: shrink the view if the screen is
      // wider than the plate allows, then keep the view inside it
      let viewH = Math.min(cam.vh, box[3])
      if (viewH * (vw / vh) > box[2]) viewH = box[2] / (vw / vh)
      const viewW = viewH * (vw / vh)
      const cx = clamp(cam.cx + pointer.x * viewW * look, box[0] + viewW / 2, box[0] + box[2] - viewW / 2)
      const cy = clamp(cam.cy + pointer.y * viewH * look, box[1] + viewH / 2, box[1] + box[3] - viewH / 2)
      const view = { x0: cx - viewW / 2, y0: cy - viewH / 2, s: vh / viewH }

      place(plate.current, layout.plate, view, dpr)
      // the sharp peak tile carries the close-up, then hands over to the plate
      const peakA = 1 - ramp(viewH, 1500, 2000)
      if (peakA > 0) place(peak.current, PEAK, view, dpr)
      set(peak.current, 'opacity', peakA.toFixed(3))
      set(peak.current, 'visibility', peakA > 0 ? 'visible' : 'hidden')

      // reading shade behind section copy, on whichever side the copy sits
      const i = Math.min(LAST - 1, Math.floor(u))
      const t = clamp(u - i)
      const right = (k) => (STOPS[k].side === 'right' ? 1 : 0)
      const r = right(i) + (right(i + 1) - right(i)) * t
      const shadeA = ramp(u, 0.75, 1.2) * (1 - ramp(u, LAST - 0.6, LAST - 0.2))
      set(shade.current, 'opacity', (shadeA * (1 - r)).toFixed(3))
      set(shadeR.current, 'opacity', (shadeA * r).toFixed(3))
      set(grade.current, 'opacity', (1 - 0.6 * ramp(u, LAST - 0.5, LAST)).toFixed(3))
      // mist drifts past on the way down from the peak
      set(wisps.current, 'opacity', (bump(u, 0.2, 1.6) * 0.4).toFixed(3))
      set(wisps.current, 'transform', `translate3d(0,${(-(u - 0.9) * 40).toFixed(2)}vh,0)`)

      return Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.001
    }

    const loop = () => {
      raf = 0
      if (frame()) raf = requestAnimationFrame(loop)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    // draw in the same frame the scroll changed, so the scene never trails the page
    const off = subscribe((st) => {
      latest = st
      if (frame()) request()
    })

    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
      request()
    }
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine && !state.reduced) window.addEventListener('pointermove', onPointer, { passive: true })

    // the preloader waits until both images are decoded, so scrolling only moves them
    const decoded = (el) => (el.complete ? el.decode?.() ?? Promise.resolve() : new Promise((res) => el.addEventListener('load', res, { once: true })).then(() => el.decode?.()))
    Promise.all([decoded(plate.current), decoded(peak.current)])
      .catch(() => {})
      .then(() => {
        plate.current?.classList.add('loaded')
        peak.current?.classList.add('loaded')
        stage.resolve()
        request()
      })

    return () => {
      off()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [layout])

  return (
    <div className="stage" aria-hidden="true">
      <Picture img={layout.plate} dpr={layout.dpr} refEl={plate} className="plate" />
      <Picture img={PEAK} dpr={layout.dpr} refEl={peak} className="plate plate-peak" />

      <div ref={shade} className="stage-shade" />
      <div ref={shadeR} className="stage-shade stage-shade-right" />

      <div ref={wisps} className="wisps">
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-a" />
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-b" />
      </div>
      <Snowfall />
      <div ref={grade} className="grade" />
      <div className="grain" />
    </div>
  )
}
