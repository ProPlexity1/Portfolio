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
// where the climber cutout sits in the photo (world px)
const CLIMBER = { x: 510, y: 925, w: 445, h: 931 }

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
  const grade = useRef(null)
  const name = useRef(null)
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
    let nameW = 0
    document.fonts?.ready.then(() => (nameW = 0))

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

      if (renderer) {
        renderer.render({
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

      // climber: the same pixels as the photo, locked on top so the name can pass behind him
      const bc = ramp(u, LAST - 0.5, LAST)
      set(climber.current, 'transform', `translate3d(${(tx + CLIMBER.x * s + back[0]).toFixed(2)}px,${(ty + CLIMBER.y * s + back[1]).toFixed(2)}px,0) scale(${s.toFixed(5)})`)

      // base camp: the name sits behind the climber, sized to the photo; vignette lifts
      if (!nameW && name.current.offsetWidth) nameW = name.current.offsetWidth
      const nk = nameW ? (Math.min(IMG_W * s, vw) * 0.92) / nameW : 1
      const nx = tx + 735 * s + back[0]
      const ny = ty + 1150 * s + back[1]
      set(name.current, 'opacity', bc.toFixed(3))
      set(name.current, 'transform', `translate3d(${nx.toFixed(1)}px,${(ny + (1 - bc) * vh * 0.08).toFixed(1)}px,0) scale(${nk.toFixed(4)}) translate(-50%,-50%)`)
      set(grade.current, 'opacity', (1 - bc).toFixed(3))
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
      return introRunning || settling || macroA > 0.01
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
          // wide screens frame the whole photo at the end: load the generated surroundings after start
          if (window.innerWidth / window.innerHeight > 1.05) {
            loadImage('/media/plate-wide.avif').then((img) => {
              renderer.setWide(img)
              request()
            }).catch(() => {})
          }
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

      <div ref={name} className="stage-name">
        Ukasha
      </div>

      <div ref={climber} className="climber">
        <picture>
          <source srcSet="/media/climber-2x.avif" type="image/avif" />
          <img src="/media/climber-2x.webp" alt="" decoding="async" className="climber-img" />
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
