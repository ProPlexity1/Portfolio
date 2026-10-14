import { useEffect, useMemo, useRef, useState } from 'react'
import { FootprintSymbol } from '../art'
import { STOPS } from '../content'
import { buildTrail, bump, camera, clamp, headDistance, IMG_H, IMG_W, ramp, stage, state, subscribe } from '../engine'
import { createRenderer, loadImage } from '../gl/renderer'
import lqip from '../lqip'
import Snowfall from './Snowfall'

const LAST = STOPS.length - 1
// close-up snow patch around the last steps to the summit (world px, matches snow-macro aspect)
const MACRO = [688, 402.8, 70, 58.33]
// the climber in the descent photo (world px)
const CLIMBER = { cx: 735, cy: 1390, h: 931 }
// the final panorama and the climber inside it (its own pixels)
const FIN = { w: 2000, h: 762, x: 952.3, y: 412.7, cw: 150.7, ch: 306.3 }

const set = (el, key, value) => {
  if (el && el.__last?.[key] !== value) {
    el.__last = { ...el.__last, [key]: value }
    el.style[key] = value
  }
}

export default function Stage() {
  const trail = useMemo(() => buildTrail(), [])
  const [mode, setMode] = useState('gl')
  const canvas = useRef(null)
  const world = useRef(null)
  const finale = useRef(null)
  const finName = useRef(null)
  const svg = useRef(null)
  const grade = useRef(null)
  const shade = useRef(null)
  const shadeR = useRef(null)
  const wisps = useRef(null)
  const bankA = useRef(null)
  const bankB = useRef(null)

  useEffect(() => {
    const summitDist = trail.stopLen[0]
    let renderer = null
    let raf = 0
    let introStart = -1
    const INTRO = 18 // the climber's last few steps, pressed in on load
    let introHead = summitDist - INTRO
    let lastU = -1
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let latest = state
    let finale_ = {}

    // ---- CSS fallback: SVG footprints, revealed by class ----
    const fps = mode === 'css' ? svg.current.querySelectorAll('.fp') : []
    let shown = 0
    const revealCss = (dist) => {
      let n = 0
      while (n < trail.prints.length && trail.prints[n].d <= dist) n++
      for (let i = Math.min(shown, n); i < Math.max(shown, n); i++) fps[i].classList.toggle('on', i < n)
      shown = n
    }

    const frame = (now) => {
      const st = latest
      const { vw, vh, u, portrait } = st
      const { s, tx, ty } = camera(u, vw, vh, portrait)

      if (st.ready && introStart < 0) introStart = now
      if (introStart >= 0) {
        const k = st.reduced ? 1 : clamp((now - introStart - 350) / 2800)
        introHead = summitDist - INTRO + INTRO * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
      }
      const dist = Math.max(introHead, headDistance(u, trail.stopLen))
      // close-up fades out before its edges come on screen
      const cover = Math.min((MACRO[2] * s) / vw, (MACRO[3] * s) / vh)
      const macroA = mode === 'gl' ? clamp((cover - 0.6) / 0.6) : 0
      // footprints only live in the snow close-up; on the photo they read as fake
      const printA = mode === 'gl' ? clamp(macroA * 1.6) : 1 - ramp(u, 0.1, 0.5)

      // pointer eases toward its target
      pointer.x += (pointer.tx - pointer.x) * 0.07
      pointer.y += (pointer.ty - pointer.y) * 0.07
      const settling = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.002

      // the whole scene (photo + climber) drifts together with the pointer; the
      // climber never moves against the photo, so nothing tears or slides
      const back = mode === 'css' ? [0, 0] : [-pointer.x * 10, -pointer.y * 6]   // css px
      // cover framing for the soft fill beside the photo on wide screens
      const fs = Math.max(vw / IMG_W, vh / IMG_H) * 1.04
      const fill = [fs, vw / 2 - (IMG_W / 2) * fs, vh / 2 - (IMG_H / 2) * fs]

      // finale: the panorama clears in around the climber (drawn in WebGL, so it is
      // smooth and in step with the scroll), pinned to where he stands in the descent
      // photo, then settles into its full-screen framing
      const fk = Math.max(vw / FIN.w, vh / FIN.h)
      const fw = FIN.w * fk
      const fh = FIN.h * fk
      const pcx = FIN.x + FIN.cw / 2
      const pcy = FIN.y + FIN.ch / 2
      const bx = clamp(vw / 2 - pcx * fk, vw - fw, 0)
      const by = (vh - fh) / 2
      const reveal = ramp(u, LAST - 0.55, LAST - 0.18)
      const finAmt = ramp(u, LAST - 0.55, LAST - 0.45)
      const settle = 1 - Math.pow(1 - ramp(u, LAST - 0.3, LAST - 0.02), 3)
      const m0 = (CLIMBER.h * s) / (FIN.ch * fk)
      const m = Math.exp(Math.log(m0) * (1 - settle))
      const ox = tx + CLIMBER.cx * s - (bx + pcx * fk * m0)
      const oy = ty + CLIMBER.cy * s - (by + pcy * fk * m0)
      const mm = Math.max(1, m)
      const fx = clamp(bx + ox * (1 - settle), vw - fw * mm, 0) + back[0]
      const fy = clamp(by + oy * (1 - settle), vh - fh * mm, 0) + back[1]
      const pxs = fx + pcx * fk * mm
      const pys = fy + pcy * fk * mm
      const r0 = FIN.ch * fk * mm * 0.55
      const radius = r0 + Math.pow(reveal, 1.5) * Math.hypot(vw, vh) * 1.2
      finale_ = { fin: [fx, fy, fk * mm], reveal: [pxs, pys, radius, 60 + radius * 0.28], finAmt: renderer?.hasFinale() ? finAmt : 0 }

      if (renderer) {
        renderer.render({
          ...finale_,
          s,
          tx,
          ty,
          shift: [back[0] / s, back[1] / s],
          fill,
          macro: MACRO,
          macroA,
          head: dist,
          printA,
          time: now / 1000,
        })
      } else if (mode === 'css') {
        set(world.current, 'transform', `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`)
        revealCss(dist)
        svg.current.setAttribute('viewBox', `${(-tx / s).toFixed(2)} ${(-ty / s).toFixed(2)} ${(vw / s).toFixed(2)} ${(vh / s).toFixed(2)}`)
        set(svg.current, 'opacity', printA.toFixed(3))
      }

      // DOM layer on top carries only the name and the climber cutout (same pixels as
      // the panorama) so the name can pass behind him once the panorama has settled
      const done = ramp(u, LAST - 0.08, LAST - 0.02)
      set(finale.current, 'width', `${fw.toFixed(1)}px`)
      set(finale.current, 'height', `${fh.toFixed(1)}px`)
      set(finale.current, 'opacity', (mode === 'css' ? finAmt : done).toFixed(3))
      set(finale.current, 'visibility', (mode === 'css' ? finAmt : done) > 0 ? 'visible' : 'hidden')
      set(finale.current, 'transform', `translate3d(${fx.toFixed(2)}px,${fy.toFixed(2)}px,0) scale(${mm.toFixed(5)})`)
      const na = ramp(u, LAST - 0.06, LAST)
      set(finName.current, 'opacity', na.toFixed(3))
      set(finName.current, 'transform', `translate(-50%,${(-50 + (1 - na) * 18).toFixed(2)}%)`)
      set(grade.current, 'opacity', (1 - reveal).toFixed(3))
      // reading shade behind section copy: off on the close-up and at base camp
      // which side the copy sits on, blended between stops
      const i = Math.min(LAST - 1, Math.floor(u))
      const t = clamp(u - i)
      const right = (k) => (STOPS[k].side === 'right' ? 1 : 0)
      const r = right(i) + (right(i + 1) - right(i)) * t
      const shadeA = ramp(u, 0.75, 1.2) * (1 - ramp(u, LAST - 0.6, LAST - 0.2))
      set(shade.current, 'opacity', (shadeA * (1 - r)).toFixed(3))
      set(shadeR.current, 'opacity', (shadeA * r).toFixed(3))

      // weather: the first cloud bank hides the hand-off from close-up to photo
      set(wisps.current, 'opacity', (ramp(u, 0.55, 0.95) * (1 - ramp(u, 1.2, 2.1))).toFixed(3))
      set(wisps.current, 'transform', `translate3d(0,${(-(u - 1) * 22).toFixed(2)}vh,0)`)
      const ka = ramp(u, 0.25, 1.0)
      set(bankA.current, 'opacity', (bump(u, 0.25, 1.0) * 0.95).toFixed(3))
      set(bankA.current, 'transform', `translate3d(0,${(70 - ka * 170).toFixed(2)}vh,0) scale(${(1.6 - ka * 0.6).toFixed(3)})`)
      const kb = ramp(u, 1.25, 2.2)
      set(bankB.current, 'opacity', (bump(u, 1.25, 2.2) * 0.78).toFixed(3))
      set(bankB.current, 'transform', `translate3d(0,${(80 - kb * 180).toFixed(2)}vh,0) scaleX(-1)`)

      const introRunning = introStart >= 0 && now - introStart < 3300
      const misting = finale_.finAmt > 0 && reveal < 1
      return introRunning || settling || macroA > 0.01 || misting
    }

    const loop = (now) => {
      raf = 0
      if (frame(now)) raf = requestAnimationFrame(loop)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    // draw in the same frame the scroll changed, so the background never trails the page
    const off = subscribe((st) => {
      latest = st
      if (st.u === lastU && raf) return
      lastU = st.u
      if (frame(performance.now())) request()
    })

    let ro
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
      request()
    }
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !state.reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true })
    }

    if (mode === 'gl') {
      try {
        renderer = createRenderer(canvas.current, trail)
      } catch {
        renderer = null
      }
      if (!renderer) {
        setMode('css')
        return () => {
          off()
          window.removeEventListener('pointermove', onPointer)
        }
      }
      state.gl = true
      const resize = () => {
        const cw = canvas.current.clientWidth
        const ch = canvas.current.clientHeight
        // cap the pixel count so big or dense screens stay smooth
        renderer.resize(cw, ch, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.6e6 / (cw * ch))))
        request()
      }
      ro = new ResizeObserver(resize)
      ro.observe(canvas.current)
      resize()
      canvas.current.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        state.gl = false
        setMode('css')
      })

      const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2) > 1800
      Promise.all([
        loadImage(big ? '/media/plate-3000.avif' : '/media/plate-2048.avif')
          .catch(() => loadImage('/media/descent-1500.webp'))
          .then((img) => renderer.setPhoto(img)),
        loadImage('/media/snow-macro.avif').catch(() => loadImage('/media/snow-macro.webp')).then((img) => renderer.setSnow(img)),
        loadImage('/media/boot-atlas.avif').catch(() => loadImage('/media/boot-atlas.webp')).then((img) => renderer.setAtlas(img)),
        loadImage('/media/snow-detail.webp').then((img) => renderer.setDetail(img)),
      ])
        .then(() => {
          canvas.current?.classList.add('ready')
          stage.resolve()
          request()
          // the final panorama is not needed until the end of the page
          loadImage('/media/finale.avif')
            .catch(() => loadImage('/media/finale.webp'))
            .then((img) => {
              renderer.setFinale(img)
              request()
            })
            .catch(() => {})
        })
        .catch(() => {
          state.gl = false
          setMode('css')
        })
    } else {
      state.gl = false
      stage.resolve()
    }

    return () => {
      off()
      ro?.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [trail, mode])

  return (
    <div className="stage" aria-hidden="true">
      {mode === 'gl' ? (
        <canvas ref={canvas} className="gl" />
      ) : (
        <div ref={world} className="world" style={{ backgroundImage: `url(${lqip})` }}>
          <img
            src="/media/descent-1500.webp"
            width={IMG_W}
            height={IMG_H}
            alt=""
            decoding="async"
            className="world-img"
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
          />
        </div>
      )}

      {mode === 'css' && (
        <svg ref={svg} className="trail" preserveAspectRatio="none" viewBox={`0 0 ${IMG_W} ${IMG_H}`}>
          <defs>
            <FootprintSymbol />
          </defs>
          {trail.prints.map((p, i) => (
            <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(1)}) scale(${(p.k * p.side).toFixed(3)} ${p.k.toFixed(3)})`}>
              <use href="#boot" className="fp" x="-6" y="-12" width="12" height="24" />
            </g>
          ))}
        </svg>
      )}

      {/* finale: the panorama, the name, then the climber cut out of it on top */}
      <div ref={finale} className="finale">
        {mode === 'css' && (
          <picture>
            <source srcSet="/media/finale.avif" type="image/avif" />
            <img src="/media/finale.webp" alt="" decoding="async" loading="lazy" className="finale-img" />
          </picture>
        )}
        <div ref={finName} className="finale-name" style={{ left: `${((FIN.x + FIN.cw / 2) / FIN.w) * 100}%`, top: `${((FIN.y + FIN.ch * 0.3) / FIN.h) * 100}%` }}>
          Ukasha
        </div>
        <picture>
          <source srcSet="/media/finale-climber.avif" type="image/avif" />
          <img
            src="/media/finale-climber.webp"
            alt=""
            decoding="async"
            loading="lazy"
            className="finale-climber"
            style={{ left: `${(FIN.x / FIN.w) * 100}%`, top: `${(FIN.y / FIN.h) * 100}%`, width: `${(FIN.cw / FIN.w) * 100}%`, height: `${(FIN.ch / FIN.h) * 100}%` }}
          />
        </picture>
      </div>

      <div ref={shade} className="stage-shade" />
      <div ref={shadeR} className="stage-shade stage-shade-right" />

      <div ref={wisps} className="wisps">
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-a" />
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-b" />
      </div>
      <img ref={bankA} src="/media/cloud-bank.svg" alt="" className="bank" />
      <img ref={bankB} src="/media/cloud-bank.svg" alt="" className="bank" />
      <Snowfall />
      <div ref={grade} className="grade" />
      <div className="grain" />
    </div>
  )
}
