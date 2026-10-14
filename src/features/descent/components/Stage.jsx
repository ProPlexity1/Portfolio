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
  const climber = useRef(null)
  const svg = useRef(null)
  const head = useRef(null)
  const flag = useRef(null)
  const dim = useRef(null)
  const name = useRef(null)
  const wisps = useRef(null)
  const bankA = useRef(null)
  const bankB = useRef(null)

  useEffect(() => {
    const summitDist = trail.stopLen[0]
    let renderer = null
    let depthPx = null // 75x100 copy of the depth map, for the focus plane
    let raf = 0
    let introStart = -1
    let introHead = summitDist - 32
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let latest = state

    const depthAt = (x, y) => {
      if (!depthPx) return 0.3
      const i = Math.round(clamp(y / IMG_H) * 99) * 75 + Math.round(clamp(x / IMG_W) * 74)
      return depthPx[i * 4] / 255
    }

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
        introHead = summitDist - 32 + 32 * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
      }
      const dist = Math.max(introHead, headDistance(u, trail.stopLen))
      // close-up fades out before its edges come on screen
      const cover = Math.min((MACRO[2] * s) / vw, (MACRO[3] * s) / vh)
      const macroA = mode === 'gl' ? clamp((cover - 0.6) / 0.6) : 0

      // pointer drifts toward its target so the look-around eases in and out
      pointer.x += (pointer.tx - pointer.x) * 0.08
      pointer.y += (pointer.ty - pointer.y) * 0.08
      const settling = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.002

      if (renderer) {
        const i = Math.min(LAST - 1, Math.floor(u))
        const t = clamp(u - i)
        const a = STOPS[i].cam
        const b = STOPS[i + 1].cam
        let amp = Math.sin(Math.PI * t) * (u >= LAST || i === 0 ? 0 : 1)
        if (i === LAST - 1) amp *= 1 - ramp(t, 0.15, 0.5)
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dl = Math.hypot(dx, dy) || 1
        const look = u < LAST - 0.6 ? 1 : 0
        const par = [(-dx / dl) * 70 * amp / s - (pointer.x * 16 * look) / s, (-dy / dl) * 70 * amp / s - (pointer.y * 10 * look) / s]
        const zi = portrait ? 1 : 0
        const dolly = 0.1 * amp * Math.sign(Math.log(b.z[zi] / a.z[zi]))
        const center = [(vw / 2 - tx) / s, (vh / 2 - ty) / s]
        const L = [-0.5 + pointer.x * 0.3, -0.6 + pointer.y * 0.3, 0.62]
        const ll = Math.hypot(...L)
        renderer.render({
          s, tx, ty, par, dolly, center,
          focus: depthAt(center[0], center[1]),
          macro: MACRO,
          macroA,
          head: dist,
          light: L.map((v) => v / ll),
          time: now / 1000,
        })
      } else if (mode === 'css') {
        set(world.current, 'transform', `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`)
        revealCss(dist)
      }

      // SVG overlay (flag, trail head) follows the camera through its viewBox
      svg.current.setAttribute('viewBox', `${(-tx / s).toFixed(2)} ${(-ty / s).toFixed(2)} ${(vw / s).toFixed(2)} ${(vh / s).toFixed(2)}`)
      // the flag only reads as a flag once the camera is far enough out
      set(flag.current, 'opacity', clamp((3 - s) / 0.9).toFixed(3))
      const [hx, hy] = trail.pointAt(dist)
      head.current.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) scale(${(0.6 + clamp((hy - 400) / 1400) * 1.6).toFixed(2)})`)
      set(head.current, 'opacity', u > 1.04 && u < LAST - 0.04 ? '1' : '0')

      // base camp: dim the world, put the name behind the climber
      const tf = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`
      const bc = ramp(u, LAST - 0.6, LAST)
      set(climber.current, 'transform', tf)
      set(climber.current, 'visibility', u > LAST - 0.65 ? 'visible' : 'hidden')
      set(dim.current, 'opacity', (bc * 0.62).toFixed(3))
      const cx = tx + 735 * s
      const cy = ty + (portrait ? 1180 : 1130) * s
      set(name.current, 'opacity', bc.toFixed(3))
      set(name.current, 'transform', `translate3d(${cx.toFixed(1)}px,${(cy + (1 - bc) * vh * 0.12).toFixed(1)}px,0) translate(-50%,-50%)`)

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
      return introRunning || settling || macroA > 0.01
    }

    const loop = (now) => {
      raf = 0
      const again = frame(now)
      if (again) raf = requestAnimationFrame(loop)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    const off = subscribe((st) => {
      latest = st
      request()
    })

    // ---- WebGL setup ----
    let ro
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
      request()
    }
    if (mode === 'gl') {
      try {
        renderer = createRenderer(canvas.current, trail)
      } catch {
        renderer = null
      }
      if (!renderer) {
        setMode('css')
        return () => off()
      }
      state.gl = true
      const resize = () => {
        renderer.resize(canvas.current.clientWidth, canvas.current.clientHeight, Math.min(window.devicePixelRatio || 1, 2))
        request()
      }
      ro = new ResizeObserver(resize)
      ro.observe(canvas.current)
      resize()
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) window.addEventListener('pointermove', onPointer, { passive: true })
      canvas.current.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        state.gl = false
        setMode('css')
      })

      const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2) > 1800
      const photoSrc = big ? '/media/descent-3000.avif' : '/media/descent-2048.avif'
      Promise.all([
        loadImage(photoSrc).catch(() => loadImage('/media/descent-1500.webp')).then((img) => renderer.setPhoto(img)),
        loadImage('/media/depth.webp').then((img) => {
          renderer.setDepth(img)
          const c = document.createElement('canvas')
          c.width = 75
          c.height = 100
          const ctx = c.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0, 75, 100)
          depthPx = ctx.getImageData(0, 0, 75, 100).data
        }),
        loadImage('/media/snow-macro.avif').catch(() => loadImage('/media/snow-macro.webp')).then((img) => renderer.setSnow(img)),
        loadImage('/media/boot-atlas.webp').then((img) => renderer.setAtlas(img)),
      ])
        .then(() => {
          canvas.current?.classList.add('ready')
          stage.resolve()
          request()
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

      <svg ref={svg} className="trail" preserveAspectRatio="none" viewBox={`0 0 ${IMG_W} ${IMG_H}`}>
        <defs>
          <FootprintSymbol />
        </defs>
        <g ref={flag} className="summit-flag" transform="translate(741 421)">
          <path d="M0 0V-24" stroke="#0b1d22" strokeWidth="1.3" strokeLinecap="round" />
          <path className="flag-cloth" d="M0-24C4-25 8-22 12-23.5L11-17C7-15.5 4-18.5 0-17.5Z" fill="#6fd1c9" />
        </g>
        {mode === 'css' && (
          <g className="fp-layer">
            {trail.prints.map((p, i) => (
              <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(1)}) scale(${(p.k * p.side).toFixed(3)} ${p.k.toFixed(3)})`}>
                <use href="#boot" className="fp" x="-6" y="-12" width="12" height="24" />
              </g>
            ))}
          </g>
        )}
        <g ref={head} opacity="0" className="trail-head">
          <circle r="9" className="trail-head-ring" />
          <circle r="3.2" fill="#6fd1c9" />
        </g>
      </svg>

      <div ref={dim} className="stage-dim" />
      <div ref={name} className="stage-name">
        Ukasha
      </div>

      <div ref={climber} className="world world-climber">
        <picture>
          <source srcSet="/media/climber.avif" type="image/avif" />
          <img src="/media/climber.webp" width="445" height="931" alt="" decoding="async" loading="lazy" style={{ left: 510, top: 925 }} />
        </picture>
      </div>

      <div ref={wisps} className="wisps">
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-a" />
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-b" />
      </div>
      <img ref={bankA} src="/media/cloud-bank.svg" alt="" className="bank" />
      <img ref={bankB} src="/media/cloud-bank.svg" alt="" className="bank" />
      <Snowfall />
      <div className="grade" />
      <div className="grain" />
    </div>
  )
}
