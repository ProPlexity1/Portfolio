import { useCallback, useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { cardPages } from '../pages'
import { FLIP_END, FLIP_START, MOBILE_FLIP_END, MOBILE_FLIP_START } from '../storyConfig'

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function isWideDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
}

function timelineBounds() {
  return isWideDesktop()
    ? { start: FLIP_START, end: FLIP_END }
    : { start: MOBILE_FLIP_START, end: MOBILE_FLIP_END }
}

function progressForPage(index) {
  if (index <= 0) return 0
  const { start, end } = timelineBounds()
  return start + (index / (cardPages.length - 1)) * (end - start)
}

function progressForHash(hash) {
  const map = {
    '#top': 0,
    '#about': progressForPage(1),
    '#services': progressForPage(2),
    '#projects': progressForPage(3),
    '#why': progressForPage(4),
    '#contact': 1,
  }
  return map[hash]
}

function isInteractiveScrollable(target) {
  return Boolean(target.closest?.('input, textarea, select, [data-internal-scroll="true"]'))
}

export function useStoryProgress() {
  const rawProgress = useMotionValue(0)
  const velocity = useMotionValue(0)
  const progressRef = useRef(0)
  const touchY = useRef(null)
  const lastDeltaAt = useRef(0)
  const velocityTimer = useRef(null)
  const progress = useSpring(rawProgress, { stiffness: 86, damping: 30, mass: 0.55 })
  const scrollVelocity = useSpring(velocity, { stiffness: 120, damping: 22, mass: 0.45 })

  const setProgress = useCallback((value) => {
    const next = clamp(value)
    progressRef.current = next
    rawProgress.set(next)
  }, [rawProgress])

  const updateByDelta = useCallback((delta) => {
    const now = performance.now()
    const dt = Math.max(now - lastDeltaAt.current, 16)
    lastDeltaAt.current = now
    velocity.set(clamp(Math.abs(delta) / dt * 42, 0, 1))
    window.clearTimeout(velocityTimer.current)
    velocityTimer.current = window.setTimeout(() => velocity.set(0), 160)
    setProgress(progressRef.current + delta)
  }, [setProgress, velocity])

  const jumpToPage = useCallback((index) => {
    setProgress(progressForPage(index))
  }, [setProgress])

  const jumpRelative = useCallback((direction) => {
    const { start, end } = timelineBounds()
    const flipProgress = clamp((progressRef.current - start) / (end - start))
    const current = Math.min(cardPages.length - 1, Math.round(flipProgress * (cardPages.length - 1)))
    jumpToPage(clamp(current + direction, 0, cardPages.length - 1))
  }, [jumpToPage])

  useEffect(() => rawProgress.on('change', (value) => {
    progressRef.current = value
  }), [rawProgress])

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const handleWheel = (event) => {
      if (event.ctrlKey || isInteractiveScrollable(event.target)) return
      event.preventDefault()
      const multiplier = event.deltaMode === 1 ? 0.018 : 0.00072
      updateByDelta(event.deltaY * multiplier)
    }

    const handleKeyDown = (event) => {
      const action = {
        ArrowDown: 0.075,
        PageDown: 0.14,
        ' ': 0.12,
        ArrowUp: -0.075,
        PageUp: -0.14,
        Home: 'home',
        End: 'end',
      }[event.key]

      if (action === undefined) return
      event.preventDefault()
      if (action === 'home') return setProgress(0)
      if (action === 'end') return setProgress(1)
      return updateByDelta(action)
    }

    const handleTouchStart = (event) => {
      touchY.current = event.touches[0]?.clientY ?? null
    }

    const handleTouchMove = (event) => {
      if (touchY.current === null || isInteractiveScrollable(event.target)) return
      event.preventDefault()
      const currentY = event.touches[0]?.clientY ?? touchY.current
      const delta = touchY.current - currentY
      touchY.current = currentY
      updateByDelta(delta * 0.0024)
    }

    const handleClick = (event) => {
      const link = event.target.closest?.('a[href^="#"]')
      if (!link) return
      const hash = new URL(link.href).hash
      const targetProgress = progressForHash(hash)
      if (targetProgress === undefined) return
      event.preventDefault()
      setProgress(targetProgress)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('click', handleClick)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('click', handleClick)
    }
  }, [setProgress, updateByDelta])

  return { progress, rawProgress, scrollVelocity, setProgress, jumpToPage, jumpRelative }
}
