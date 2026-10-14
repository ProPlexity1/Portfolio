import { useEffect, useMemo, useRef } from 'react'
import { FootprintSymbol } from '../art'
import { buildTrail, bump, camera, clamp, headDistance, IMG_H, IMG_W, ramp, subscribe } from '../engine'
import lqip from '../lqip'
import Snowfall from './Snowfall'

const set = (el, key, value) => {
  if (el && el.__last?.[key] !== value) {
    el.__last = { ...el.__last, [key]: value }
    el.style[key] = value
  }
}

export default function Stage() {
  const trail = useMemo(() => buildTrail(), [])
  const world = useRef(null)
  const climber = useRef(null)
  const svg = useRef(null)
  const head = useRef(null)
  const dim = useRef(null)
  const name = useRef(null)
  const wisps = useRef(null)
  const bankA = useRef(null)
  const bankB = useRef(null)
  const shown = useRef(0) // number of footprints currently visible
  const intro = useRef('waiting') // waiting -> walking -> done

  useEffect(() => {
    const prints = svg.current.querySelectorAll('.fp')
    const summitDist = trail.stopLen[0]
    const summitCount = trail.prints.findIndex((p) => p.d > summitDist)

    const reveal = (count, stagger = 0) => {
      const from = shown.current
      if (count > from) {
        for (let i = from; i < count; i++) {
          prints[i].style.transitionDelay = stagger ? `${(i - from) * stagger}s` : ''
          prints[i].classList.add('on')
        }
      } else {
        for (let i = count; i < from; i++) {
          prints[i].style.transitionDelay = ''
          prints[i].classList.remove('on')
        }
      }
      shown.current = count
    }

    let introTimer
    const frame = (st) => {
      const { vw, vh, u, portrait } = st
      const { s, tx, ty } = camera(u, vw, vh, portrait)
      const tf = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`
      set(world.current, 'transform', tf)
      set(climber.current, 'transform', tf)
      svg.current.setAttribute('viewBox', `${(-tx / s).toFixed(2)} ${(-ty / s).toFixed(2)} ${(vw / s).toFixed(2)} ${(vh / s).toFixed(2)}`)

      // footprints: intro walk to the summit, then follow scroll
      if (st.ready && intro.current === 'waiting') {
        intro.current = 'walking'
        reveal(summitCount, st.reduced ? 0 : 0.16)
        introTimer = setTimeout(() => {
          intro.current = 'done'
          frame(st)
        }, st.reduced ? 0 : summitCount * 160 + 500)
      }
      if (intro.current === 'done') {
        const dist = headDistance(u, trail.stopLen)
        let n = summitCount
        while (n < trail.prints.length && trail.prints[n].d <= dist) n++
        if (n !== shown.current) reveal(n)
        const [hx, hy] = trail.pointAt(dist)
        head.current.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) scale(${(0.6 + clamp((hy - 400) / 1400) * 1.6).toFixed(2)})`)
        set(head.current, 'opacity', u > 0.04 && u < 5.96 ? '1' : '0')
      }

      // base camp: dim the world, put the name behind the climber
      const bc = ramp(u, 5.25, 6)
      set(climber.current, 'visibility', u > 4.5 ? 'visible' : 'hidden')
      set(dim.current, 'opacity', (bc * 0.62).toFixed(3))
      const cx = tx + 735 * s
      const cy = ty + (portrait ? 1180 : 1130) * s
      set(name.current, 'opacity', bc.toFixed(3))
      set(name.current, 'transform', `translate3d(${cx.toFixed(1)}px,${(cy + (1 - bc) * vh * 0.12).toFixed(1)}px,0) translate(-50%,-50%)`)

      // weather
      set(wisps.current, 'opacity', (1 - ramp(u, 0, 1.15)).toFixed(3))
      set(wisps.current, 'transform', `translate3d(0,${(-u * 22).toFixed(2)}vh,0)`)
      const a = ramp(u, 0.12, 1.08)
      set(bankA.current, 'opacity', (bump(u, 0.12, 1.08) * 0.95).toFixed(3))
      set(bankA.current, 'transform', `translate3d(0,${(70 - a * 170).toFixed(2)}vh,0)`)
      const b = ramp(u, 1.2, 2.15)
      set(bankB.current, 'opacity', (bump(u, 1.2, 2.15) * 0.78).toFixed(3))
      set(bankB.current, 'transform', `translate3d(0,${(80 - b * 180).toFixed(2)}vh,0) scaleX(-1)`)
    }

    const off = subscribe(frame)
    return () => {
      off()
      clearTimeout(introTimer)
    }
  }, [trail])

  return (
    <div className="stage" aria-hidden="true">
      <div ref={world} className="world" style={{ backgroundImage: `url(${lqip})` }}>
        <picture>
          <source srcSet="/media/descent-1500.avif" type="image/avif" />
          <img
            src="/media/descent-1500.webp"
            width={IMG_W}
            height={IMG_H}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="world-img"
            onLoad={(e) => e.currentTarget.classList.add('loaded')}
          />
        </picture>
      </div>

      <svg ref={svg} className="trail" preserveAspectRatio="none" viewBox={`0 0 ${IMG_W} ${IMG_H}`}>
        <defs>
          <FootprintSymbol />
        </defs>
        <g className="summit-flag" transform="translate(741 421)">
          <path d="M0 0V-24" stroke="#0b1d22" strokeWidth="1.3" strokeLinecap="round" />
          <path className="flag-cloth" d="M0-24C4-25 8-22 12-23.5L11-17C7-15.5 4-18.5 0-17.5Z" fill="#6fd1c9" />
          <ellipse cx="0" cy="0.6" rx="4" ry="1.1" fill="#183843" opacity=".5" />
        </g>
        <g className="fp-layer">
          {trail.prints.map((p, i) => (
            <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(1)}) scale(${(p.k * (p.side > 0 ? 1 : -1)).toFixed(3)} ${p.k.toFixed(3)})`}>
              <use href="#boot" className="fp" x="-6" y="-12" width="12" height="24" />
            </g>
          ))}
        </g>
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
