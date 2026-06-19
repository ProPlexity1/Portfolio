import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const MAX_ITEMS = 18

export default function TouchInteractionLayer({ enabled }) {
  const [ripples, setRipples] = useState([])
  const [trails, setTrails] = useState([])

  useEffect(() => {
    if (!enabled) return undefined
    let id = 0

    const addTrail = (x, y, kind = 'trail') => {
      const next = { id: id += 1, x, y, kind }
      setTrails((items) => [...items.slice(-MAX_ITEMS), next])
      window.setTimeout(() => {
        setTrails((items) => items.filter((item) => item.id !== next.id))
      }, 820)
    }

    const addRipple = (x, y, size = 150) => {
      const next = { id: id += 1, x, y, size }
      setRipples((items) => [...items.slice(-8), next])
      window.setTimeout(() => {
        setRipples((items) => items.filter((item) => item.id !== next.id))
      }, 900)
    }

    const handlePointerDown = (event) => {
      if (event.pointerType === 'mouse') return
      addRipple(event.clientX, event.clientY, event.target.closest?.('.glass-panel') ? 190 : 130)
      addTrail(event.clientX, event.clientY, 'touch')
    }

    const handlePointerMove = (event) => {
      if (event.pointerType === 'mouse') return
      addTrail(event.clientX, event.clientY)
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[980] overflow-hidden">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full border border-primary/35 bg-[radial-gradient(circle,rgba(0,240,255,0.24),rgba(124,58,237,0.12)_42%,transparent_68%)] mix-blend-screen"
            style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size, marginLeft: -ripple.size / 2, marginTop: -ripple.size / 2 }}
            initial={{ scale: 0.15, opacity: 0.8 }}
            animate={{ scale: 1.45, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
        {trails.map((trail) => (
          <motion.span
            key={trail.id}
            className="absolute size-2 rounded-full bg-primary shadow-[0_0_18px_rgba(0,240,255,0.8)]"
            style={{ left: trail.x - 4, top: trail.y - 4 }}
            initial={{ scale: trail.kind === 'touch' ? 1.8 : 0.8, opacity: 0.58 }}
            animate={{ scale: 0, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
