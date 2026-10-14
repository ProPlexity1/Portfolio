import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../art'
import { CTA, STOPS } from '../content'
import { altitude, subscribe } from '../engine'
import { flyToId, flyToStop } from '../scroller'

const fmt = (n) => n.toLocaleString('en-US')

export default function Hud() {
  const altRefs = useRef([])
  const rail = useRef(null)
  const marker = useRef(null)
  const bar = useRef(null)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    let lastAlt = -1
    let lastActive = -1
    return subscribe((st) => {
      const a = altitude(st.u)
      if (a !== lastAlt) {
        altRefs.current.forEach((el) => el && (el.textContent = fmt(a)))
        lastAlt = a
      }
      // the rail lists every stop except the ridge, which belongs to the summit
      const p = Math.max(0, st.u - 1) / (STOPS.length - 2)
      if (marker.current) marker.current.style.transform = `translate3d(0,${(p * 100).toFixed(3)}%,0)`
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`
      const active = st.u < 1.5 ? 0 : Math.round(st.u)
      if (active !== lastActive && rail.current) {
        rail.current.querySelectorAll('[data-stop]').forEach((el) => el.toggleAttribute('data-active', +el.dataset.stop === active))
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
            <span ref={(el) => (altRefs.current[0] = el)}>5,180</span> m
          </span>
          <button type="button" onClick={() => flyToId('contact')} className="btn btn-primary btn-sm hidden sm:inline-flex">
            {CTA.contact}
          </button>
          <button type="button" className="icon-btn lg:hidden" aria-label="Open route menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <span className="hud-progress lg:hidden" aria-hidden="true">
          <span ref={bar} />
        </span>
      </header>

      <nav ref={rail} className="rail" aria-label="Sections">
        <p className="rail-alt" aria-hidden="true">
          <span ref={(el) => (altRefs.current[1] = el)}>5,180</span>
          <small>m</small>
        </p>
        <div className="rail-track">
          <span className="rail-line" />
          <span className="rail-marker-wrap">
            <span ref={marker} className="rail-marker">
              <i />
            </span>
          </span>
          <ol>
            {STOPS.map((s, i) => s.rail !== false && (
              <li key={s.id}>
                <button type="button" data-stop={i} onClick={() => go(i)}>
                  <span className="rail-tick" />
                  <span className="rail-label">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

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
