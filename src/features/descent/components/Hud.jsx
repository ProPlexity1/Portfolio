import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../art'
import { CTA, STOPS } from '../content'
import { altitude, subscribe } from '../engine'
import { flyToId, flyToStop } from '../scroller'

const fmt = (n) => n.toLocaleString('en-US')
const BASE = STOPS[STOPS.length - 1].alt
const STEPS = 30 // boot prints along the rail trail (before clearing checkpoints)
const CHECKS = STOPS.filter((st) => st.rail !== false).length - 1

// hiking boot sole: one outline with the tread cut out of it (even-odd fill),
// chevron lugs under the forefoot and block lugs under the heel
const BOOT = [
  'M-3.9-6C-4.4-10-2.2-11.8.2-11.8 2.8-11.8 4.4-9.6 4.2-6 4.1-3.5 3.2-1.5 2.6.5 2.3 1.6 2.9 2.8 3.1 4.5 3.4 7.6 2.1 11-.1 11-2.4 11-3.4 8-3.2 5-3.1 3-2.4 1.5-2.6 0-2.9-2-3.7-3.8-3.9-6Z',
  ...[-9.4, -7.4, -5.4, -3.4].map((y) => `M-2.7 ${y + 1.1}L.2 ${y}L3 ${y + 1.1}V${y + 1.9}L.2 ${y + 0.8}L-2.7 ${y + 1.9}Z`),
  ...[[-1.9, 4.6], [0.5, 4.6], [-1.9, 7.1], [0.5, 7.1]].map(([x, y]) => `M${x} ${y}h1.5v1.6h-1.5Z`),
].join('')

// A wandering line of boot prints: uneven stride, sway and angle, like a real
// walker. Seeded so it is the same on every visit.
function walk(n, seed) {
  let x = seed
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647) * 2 - 1
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const side = i % 2 ? 1 : -1
    const sway = Math.sin(t * Math.PI * 3.2 + 0.7) * 3.5 + Math.sin(t * Math.PI * 7.3) * 1.2
    const heading = Math.cos(t * Math.PI * 3.2 + 0.7) * 14
    return {
      y: Math.min(1, Math.max(0, t + rnd() * 0.009)),
      x: sway * 0.8 + side * (3.6 + rnd() * 0.8),
      r: heading * 0.7 + side * 6 + rnd() * 8,
      k: 0.9 + rnd() * 0.12,
      side,
    }
  })
}
// keep the X marks clear: no print right on top of a checkpoint
const PRINTS = walk(STEPS, 4271).filter((p) => Array.from({ length: CHECKS + 1 }, (_, k) => k / CHECKS).every((c) => Math.abs(p.y - c) > 0.04))

// Footprints that get stamped into the rail as you scroll; they replace the scrollbar.
function Steps({ className }) {
  return (
    <span className={`steps ${className}`} aria-hidden="true">
      {PRINTS.map((p, i) => (
        <span
          key={i}
          className="step"
          style={{ top: `${p.y * 100}%`, '--x': `${p.x.toFixed(2)}px`, '--r': `${p.r.toFixed(1)}deg`, '--k': p.k.toFixed(3) }}
        >
          <svg viewBox="-6 -12 12 24">
            <path d={BOOT} fillRule="evenodd" transform={p.side > 0 ? 'scale(-1 1)' : undefined} />
          </svg>
          <i className="puff" />
        </span>
      ))}
    </span>
  )
}

// Checkpoint: an X scratched in once the walker gets there.
function Cross() {
  return (
    <svg viewBox="0 0 12 12" className="cross" aria-hidden="true">
      <circle cx="6" cy="6" r="1.4" className="cross-dot" />
      <path d="M2.5 2.5 9.5 9.5" pathLength="1" />
      <path d="M9.5 2.5 2.5 9.5" pathLength="1" />
    </svg>
  )
}

export default function Hud() {
  const altRefs = useRef([])
  const rail = useRef(null)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    let lastAlt = -1
    let lastActive = -1
    let lastOn = -1
    return subscribe((st) => {
      // descent meter: metres left to base camp, down to zero
      const a = altitude(st.u) - BASE
      if (a !== lastAlt) {
        altRefs.current.forEach((el) => el && (el.textContent = fmt(a)))
        lastAlt = a
      }
      // the rail lists every stop except the ridge, which belongs to the summit
      const p = Math.min(1, Math.max(0, st.u - 1) / (STOPS.length - 2))
      // a print is stamped once the walker has passed its spot on the trail
      let on = 0
      while (on < PRINTS.length && st.u > 0.2 && PRINTS[on].y <= p + 0.005) on++
      if (on !== lastOn) {
        document.querySelectorAll('.steps').forEach((el) => el.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('on', i < on)))
        lastOn = on
      }
      const active = st.u < 1.5 ? 0 : Math.round(st.u)
      if (active !== lastActive) {
        document.querySelectorAll('[data-stop]').forEach((el) => {
          el.toggleAttribute('data-active', +el.dataset.stop === active)
          el.toggleAttribute('data-reached', +el.dataset.stop <= active)
        })
        lastActive = active
      }
    })
  }, [])

  useEffect(() => {
    if (!menu) return
    const onKey = (e) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  const go = (i) => {
    setMenu(false)
    flyToStop(i)
  }

  return (
    <>
      <header className="hud-top">
        <button type="button" onClick={() => flyToStop(0)} className="brand" aria-label="Back to the summit">
          <LogoMark className="h-6 w-7" />
          <span>Ukasha</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="alt-chip lg:hidden" aria-hidden="true">
            <span ref={(el) => (altRefs.current[0] = el)}>{fmt(STOPS[0].alt - BASE)}</span> m to go
          </span>
          <button type="button" onClick={() => flyToId('contact')} className="btn btn-primary btn-sm hidden sm:inline-flex">
            {CTA.contact}
          </button>
          <button type="button" className="icon-btn lg:hidden" aria-label="Open route menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className="rail-shade hidden lg:block" aria-hidden="true" />
      <nav ref={rail} className="rail" aria-label="Sections">
        <p className="rail-alt" aria-hidden="true">
          <span ref={(el) => (altRefs.current[1] = el)}>{fmt(STOPS[0].alt - BASE)}</span>
          <small>m to go</small>
        </p>
        <div className="rail-track">
          <Steps className="steps-rail" />
          <ol>
            {STOPS.map((s, i) => s.rail !== false && (
              <li key={s.id}>
                <button type="button" data-stop={i} onClick={() => go(i)}>
                  <span className="rail-tick">
                    <Cross />
                  </span>
                  <span className="rail-label">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* phones: a slim trail on the right edge with a checkpoint per stop */}
      <div className="trail-m lg:hidden" aria-hidden="true">
        <Steps className="steps-m" />
        {STOPS.map((s, i) => s.rail !== false && (
          <span key={s.id} className="trail-m-cp" data-stop={i} style={{ top: `${(Math.max(0, i - 1) / (STOPS.length - 2)) * 100}%` }}>
            <Cross />
          </span>
        ))}
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div className="sheet-backdrop lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Route"
              className="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-xl">The route down</p>
                <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)}>
                  <X className="size-5" strokeWidth={1.75} />
                </button>
              </div>
              <ol className="mt-5 grid gap-1">
                {STOPS.map((s, i) => s.rail !== false && (
                  <motion.li key={s.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.035 }}>
                    <button type="button" onClick={() => go(i)} className="sheet-link">
                      <span>{s.label}</span>
                      <span className="font-mono text-xs text-mist">{fmt(s.alt)} m</span>
                    </button>
                  </motion.li>
                ))}
              </ol>
              <button type="button" className="btn btn-primary mt-5 w-full justify-center" onClick={() => { setMenu(false); flyToId('contact') }}>
                {CTA.contact}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
