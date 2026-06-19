import { useEffect } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function useDeviceTilt(enabled) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const rotateX = useSpring(rawX, { stiffness: 90, damping: 24, mass: 0.7 })
  const rotateY = useSpring(rawY, { stiffness: 90, damping: 24, mass: 0.7 })

  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const handleOrientation = (event) => {
      const beta = event.beta ?? 0
      const gamma = event.gamma ?? 0
      rawX.set(clamp((beta - 45) / 18, -2.2, 2.2) * -1)
      rawY.set(clamp(gamma / 18, -2.4, 2.4))
    }

    const handlePointerMove = (event) => {
      const x = event.clientX / window.innerWidth - 0.5
      const y = event.clientY / window.innerHeight - 0.5
      rawX.set(y * -2)
      rawY.set(x * 2)
    }

    window.addEventListener('deviceorientation', handleOrientation, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [enabled, rawX, rawY])

  return { rotateX, rotateY }
}
