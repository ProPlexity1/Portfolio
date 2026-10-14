import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const RIDGE = 'M0 120 L70 88 L112 98 L168 52 L206 70 L250 18 L292 62 L330 46 L396 104 L460 82 L520 120'

// Counts up while the photo and fonts load, then lifts away like a curtain.
export default function Preloader({ onDone }) {
  const [open, setOpen] = useState(true)
  const num = useRef(null)
  const fill = useRef(null)

  useEffect(() => {
    let raf = 0
    let shown = 0
    let target = 12
    let finished = false
    const start = performance.now()

    // the <picture> in Stage makes the real request (AVIF or WebP); wait for that one
    const img = document.querySelector('.world-img')
    const loadPhoto = img ? img.decode().catch(() => {}) : Promise.resolve()
    const assets = Promise.all([loadPhoto.then(() => (target = 82)), document.fonts?.ready.then(() => (target = Math.max(target, 40)))])
    const minTime = new Promise((r) => setTimeout(r, 1100))
    Promise.race([Promise.all([assets, minTime]), new Promise((r) => setTimeout(r, 6000))]).then(() => {
      target = 100
      finished = true
    })

    const tick = (t) => {
      const elapsed = (t - start) / 1000
      const soft = Math.min(target, target === 100 ? 100 : 12 + elapsed * 30)
      shown += (soft - shown) * 0.12
      if (finished && shown > 99.4) shown = 100
      if (num.current) num.current.textContent = String(Math.round(shown)).padStart(2, '0')
      if (fill.current) fill.current.style.transform = `scaleX(${shown / 100})`
      if (shown >= 100) {
        setOpen(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {open && (
        <motion.div
          className="preloader"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-label="Loading"
        >
          <svg viewBox="0 0 520 130" className="w-[min(78vw,520px)] text-snow" fill="none" aria-hidden="true">
            <motion.path
              d={RIDGE}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.path d="M250 18V2l12 4.5-12 4.5" stroke="#6fd1c9" strokeWidth="1.5" strokeLinejoin="round" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} />
          </svg>
          <div className="mt-8 flex w-[min(78vw,520px)] items-end justify-between font-mono text-xs text-mist">
            <span>Reaching the summit</span>
            <span>
              <span ref={num} className="text-snow">00</span>%
            </span>
          </div>
          <span className="preloader-bar">
            <span ref={fill} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
