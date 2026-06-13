import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [variant, setVariant] = useState('default')
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const dotX = useSpring(mouseX, { stiffness: 800, damping: 42, mass: 0.28 })
  const dotY = useSpring(mouseY, { stiffness: 800, damping: 42, mass: 0.28 })
  const ringX = useSpring(mouseX, { stiffness: 260, damping: 28, mass: 0.65 })
  const ringY = useSpring(mouseY, { stiffness: 260, damping: 28, mass: 0.65 })

  useEffect(() => {
    const media = window.matchMedia('(min-width: 769px) and (pointer: fine)')
    const syncEnabled = () => setEnabled(media.matches)
    syncEnabled()
    media.addEventListener('change', syncEnabled)
    return () => media.removeEventListener('change', syncEnabled)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    const handleMove = (event) => {
      mouseX.set(event.clientX)
      mouseY.set(event.clientY)
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`)
      document.documentElement.style.setProperty('--my', `${event.clientY}px`)
    }

    const handleOver = (event) => {
      const target = event.target.closest?.('[data-cursor], a, button, input, textarea')
      if (!target) return setVariant('default')
      if (target.dataset.cursor === 'card') return setVariant('card')
      if (target.dataset.cursor === 'button' || target.matches('a, button')) return setVariant('button')
      if (target.matches('input, textarea')) return setVariant('input')
      return setVariant('default')
    }

    const handleOut = (event) => {
      if (!event.relatedTarget || !event.relatedTarget.closest?.('[data-cursor], a, button, input, textarea')) {
        setVariant('default')
      }
    }

    window.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerover', handleOver)
    document.addEventListener('pointerout', handleOut)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerover', handleOver)
      document.removeEventListener('pointerout', handleOut)
    }
  }, [enabled, mouseX, mouseY])

  if (!enabled) return null

  const size = variant === 'button' ? 46 : variant === 'card' ? 60 : variant === 'input' ? 34 : 24
  const opacity = variant === 'default' ? 0.78 : 0.94

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_rgba(0,240,255,0.9)]"
        style={{ x: dotX, y: dotY }}
        animate={{ width: variant === 'input' ? 3 : 7, height: variant === 'input' ? 28 : 7, opacity }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[999] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35 bg-primary/[0.025] mix-blend-screen backdrop-blur-[1px]"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: size,
          height: size,
          opacity: variant === 'default' ? 0.5 : 0.78,
          boxShadow: variant === 'card' ? '0 0 34px rgba(0,240,255,0.2)' : '0 0 22px rgba(0,240,255,0.12)',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      />
    </>
  )
}
