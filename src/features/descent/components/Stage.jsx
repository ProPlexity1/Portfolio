import { useEffect, useMemo, useRef, useState } from 'react'
import { FootprintSymbol } from '../art'
import { STOPS } from '../content'
import { buildTrail, bump, camera, clamp, headDistance, IMG_H, IMG_W, ramp, stage, state, subscribe } from '../engine'
import { createRenderer, loadImage } from '../gl/renderer'
import { PERCH, worldCamera } from '../gl/world'
import lqip from '../lqip'
import Snowfall from './Snowfall'

const LAST = STOPS.length - 1
// close-up snow patch around the last steps to the summit (photo px, matches snow-macro aspect)
const MACRO = [688, 402.8, 70, 58.33]
// the climber on his rock, cut from the original photo, stood on the lake rock
// in the 3D world. `height` is the cutout's real-world height in metres.
const FG = { aspect: 1500 / 1069, personX: 0.488, chestY: 0.3, height: 2.1 }
// vertical field of view: 50 degrees, opening to 64 on the final view so the
// lake, the valley and the summit all fit around him
const fovAt = (u, last) => Math.tan(((50 + 14 * Math.min(1, Math.max(0, (u - (last - 0.45)) / 0.45))) * Math.PI) / 360)

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
  const svg = useRef(null)
  const fg = useRef(null)
  const name = useRef(null)
  const shade = useRef(null)
  const shadeR = useRef(null)
  const grade = useRef(null)
  const wisps = useRef(null)
  const bank = useRef(null)

  useEffect(() => {
    const summitDist = trail.stopLen[0]
    let renderer = null
    let raf = 0
    let introStart = -1
    const INTRO = 18 // the climber's last few steps, pressed in on load
    let introHead = summitDist - INTRO
    let lastU = -1
    let latest = state
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let nameW = 0
    let view = null // last world camera, used to place the climber in the scene
    document.fonts?.ready.then(() => (nameW = 0))

    // world resolution adapts to the device: drop while frames are slow,
    // climb back when there is headroom, and sharpen once scrolling stops
    // phones and small machines start in the lite tier; desktops start full
    // and step down to lite themselves if they cannot keep up
    const coarse = matchMedia('(pointer: coarse)').matches
    const weak = coarse || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4
    // ?tier=lite|full forces a tier (for testing)
    const forced = new URLSearchParams(window.location.search).get('tier')
    const startTier = forced === 'lite' || forced === 'full' ? forced : weak ? 'lite' : 'full'
    let MAX_SCALE = weak ? 0.5 : 1
    let MIN_SCALE = weak ? 0.28 : 0.5
    let scale = weak ? 0.4 : 0.8
    let floorHits = 0
    let lastFrame = 0
    let slow = 0
    let idleTimer = 0
    let idle = false

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
      const printA = mode === 'gl' ? clamp(macroA * 1.6) : 1 - ramp(u, 0.1, 0.5)

      pointer.x += (pointer.tx - pointer.x) * 0.07
      pointer.y += (pointer.ty - pointer.y) * 0.07
      const settling = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) > 0.002

      if (renderer) {
        // the 3D camera: path position plus a real look-around from the pointer
        const cam = worldCamera(Math.max(1, u), 0, portrait)
        // a gentle look-around: a few metres up high, almost nothing up close
        const amp = 6 - 5.75 * ramp(u, LAST - 1, LAST)
        const off = [pointer.x * amp, -pointer.y * amp * 0.5]
        const pos = cam.pos.map((v, k) => v + cam.right[k] * off[0] + cam.up[k] * off[1])
        // adapt resolution from the measured frame interval while moving
        if (lastFrame && !idle) {
          const dt = now - lastFrame
          // only sustained slowness lowers the resolution; one hiccup does not
          if (dt > 30) slow = Math.min(slow + 1, 10)
          else if (dt < 18) slow = Math.max(slow - 1, -8)
          if (slow >= 8) {
            if (scale <= MIN_SCALE + 1e-3 && renderer.tier() === 'full' && ++floorHits >= 3) {
              // still slow at the lowest resolution: switch to the lite tier
              renderer.setTier('lite')
              MAX_SCALE = 0.6
              MIN_SCALE = 0.28
              scale = 0.45
            }
            scale = Math.max(MIN_SCALE, scale * 0.9)
            slow = 0
          } else if (slow <= -8) {
            scale = Math.min(MAX_SCALE, scale * 1.1)
            slow = 0
          }
        }
        lastFrame = now
        view = { ...cam, pos }
        renderer.render({
          s,
          tx,
          ty,
          macro: MACRO,
          macroA,
          head: dist,
          printA,
          time: now / 1000,
          world: { ...cam, pos, fov: fovAt(u, LAST) },
          worldScale: idle ? MAX_SCALE : scale,
          quality: idle ? 1 : weak ? 0.3 : 0.8,
        })
      } else if (mode === 'css') {
        set(world.current, 'transform', `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`)
        revealCss(dist)
        svg.current.setAttribute('viewBox', `${(-tx / s).toFixed(2)} ${(-ty / s).toFixed(2)} ${(vw / s).toFixed(2)} ${(vh / s).toFixed(2)}`)
        set(svg.current, 'opacity', printA.toFixed(3))
      }

      // ---- base camp: the climber stands on the lake rock in the 3D world ----
      // project his feet through the same camera as the world, so distance sets
      // his size and the look-around moves him with true parallax
      let shownFg = false
      if (view && u > LAST - 1.6) {
        const v = [PERCH[0] - view.pos[0], PERCH[1] - 0.15 - view.pos[1], PERCH[2] - view.pos[2]]
        const z = v[0] * view.fwd[0] + v[1] * view.fwd[1] + v[2] * view.fwd[2]
        if (z > 0.5) {
          const x = v[0] * view.right[0] + v[1] * view.right[1] + v[2] * view.right[2]
          const y = v[0] * view.up[0] + v[1] * view.up[1] + v[2] * view.up[2]
          const k = vh / 2 / (z * fovAt(u, LAST))   // px per metre at that distance
          const sx = vw / 2 + x * k
          const sy = vh / 2 - y * k
          const fh = FG.height * k
          const fw = fh * FG.aspect
          set(fg.current, 'width', `${fw.toFixed(2)}px`)
          set(fg.current, 'height', `${fh.toFixed(2)}px`)
          set(fg.current, 'transform', `translate3d(${(sx - fw * FG.personX).toFixed(2)}px,${(sy - fh).toFixed(2)}px,0)`)
          // fades in out of the haze as the camera turns to face him
          set(fg.current, 'opacity', ramp(u, LAST - 1.5, LAST - 1.15).toFixed(3))
          shownFg = true
          // the name stands behind him once he is close
          if (!nameW && name.current.offsetWidth) nameW = name.current.offsetWidth
          const pad = vw >= 1024 ? 200 : vw * 0.04   // keep clear of the rail on desktop
          const nwid = Math.min(vw * 0.86, fw * 1.7, vw - pad - vw * 0.04)
          const nk = nameW ? nwid / nameW : 1
          const na = ramp(u, LAST - 0.12, LAST)
          const ny = sy - fh + fh * FG.chestY + (1 - na) * vh * 0.06
          const nx = clamp(sx, nwid / 2 + pad, vw - nwid / 2 - vw * 0.04)
          set(name.current, 'opacity', na.toFixed(3))
          set(name.current, 'transform', `translate3d(${nx.toFixed(1)}px,${ny.toFixed(1)}px,0) scale(${nk.toFixed(4)}) translate(-50%,-50%)`)
        }
      }
      set(fg.current, 'visibility', shownFg ? 'visible' : 'hidden')
      if (!shownFg) set(name.current, 'opacity', '0')

      // reading shade behind section copy, on whichever side the copy sits
      const i = Math.min(LAST - 1, Math.floor(u))
      const t = clamp(u - i)
      const right = (k) => (STOPS[k].side === 'right' ? 1 : 0)
      const r = right(i) + (right(i + 1) - right(i)) * t
      const shadeA = ramp(u, 0.75, 1.2) * (1 - ramp(u, LAST - 0.6, LAST - 0.2))
      set(shade.current, 'opacity', (shadeA * (1 - r)).toFixed(3))
      set(shadeR.current, 'opacity', (shadeA * r).toFixed(3))
      set(grade.current, 'opacity', (1 - 0.6 * ramp(u, LAST - 0.5, LAST)).toFixed(3))

      // weather: a cloud bank hides the hand-off from the close-up to the world
      set(wisps.current, 'opacity', (ramp(u, 0.55, 0.95) * (1 - ramp(u, 1.1, 1.6))).toFixed(3))
      set(wisps.current, 'transform', `translate3d(0,${(-(u - 1) * 22).toFixed(2)}vh,0)`)
      const ka = ramp(u, 0.25, 1.0)
      set(bank.current, 'opacity', (bump(u, 0.25, 1.0) * 0.95).toFixed(3))
      set(bank.current, 'transform', `translate3d(0,${(70 - ka * 170).toFixed(2)}vh,0) scale(${(1.6 - ka * 0.6).toFixed(3)})`)

      const introRunning = introStart >= 0 && now - introStart < 3300
      // keep animating only for the intro walk and pointer easing (and the snow
      // glints on desktop); idle phones draw nothing
      return introRunning || settling || (!weak && macroA > 0.01)
    }

    // dev only: time the world render on the GPU (ms per frame) at a given scale
    if (import.meta.env.DEV) {
      window.__benchWorld = (n = 20, sc = 0.5) => {
        if (!renderer) return null
        const keep = [scale, idle]
        scale = sc
        idle = false
        renderer.finish()
        const t0 = performance.now()
        for (let k = 0; k < n; k++) frame(performance.now())
        renderer.finish()
        ;[scale, idle] = keep
        return (performance.now() - t0) / n
      }
    }

    const loop = (now) => {
      raf = 0
      if (frame(now)) raf = requestAnimationFrame(loop)
    }
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    // once scrolling stops, draw one sharper frame
    const markMoving = () => {
      idle = false
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        idle = true
        lastFrame = 0
        request()
      }, 140)
    }

    // draw in the same frame the scroll changed, so the background never trails the page
    const off = subscribe((st) => {
      latest = st
      if (st.u === lastU && raf) return
      lastU = st.u
      markMoving()
      if (frame(performance.now())) request()
    })

    let ro
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
      markMoving()
      request()
    }
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !state.reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true })
    }

    if (mode === 'gl') {
      try {
        renderer = createRenderer(canvas.current, trail, startTier)
      } catch (e) {
        console.warn('[stage] falling back to the photo:', e)
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
        renderer.resize(cw, ch, Math.min(window.devicePixelRatio || 1, weak ? 1.6 : 2, Math.sqrt((weak ? 1.4e6 : 3.6e6) / (cw * ch))))
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

      Promise.all([
        loadImage('/media/snow-macro.avif').catch(() => loadImage('/media/snow-macro.webp')).then((img) => renderer.setSnow(img)),
        loadImage('/media/boot-atlas.avif').catch(() => loadImage('/media/boot-atlas.webp')).then((img) => renderer.setAtlas(img)),
        loadImage('/media/snow-detail.webp').then((img) => renderer.setDetail(img)),
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
      clearTimeout(idleTimer)
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

      <div ref={name} className="finale-name">
        Ukasha
      </div>
      <picture>
        <source srcSet="/media/basecamp-fg.avif" type="image/avif" />
        <img ref={fg} src="/media/basecamp-fg.webp" alt="" decoding="async" loading="lazy" className="basecamp-fg" />
      </picture>

      <div ref={shade} className="stage-shade" />
      <div ref={shadeR} className="stage-shade stage-shade-right" />

      <div ref={wisps} className="wisps">
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-a" />
        <img src="/media/cloud-wisp.svg" alt="" className="wisp wisp-b" />
      </div>
      <img ref={bank} src="/media/cloud-bank.svg" alt="" className="bank" />
      <Snowfall />
      <div ref={grade} className="grade" />
      <div className="grain" />
    </div>
  )
}
