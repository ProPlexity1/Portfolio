import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from 'framer-motion'
import { resetCardPointer, setCardPointer } from '../../../lib/utils'
import { FLIP_END, FLIP_START, glassShards } from '../storyConfig'
import { cardPages } from '../pages'
import { CrackOverlay, ForegroundShard } from './ShatterEffects'

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function CardPage({ page }) {
  const Page = page.component
  return <Page />
}

function BottomUpBreakOverlay({ progress }) {
  const opacity = useTransform(progress, [0.8, 0.88, 1], [0, 0.95, 0.22])
  const scaleY = useTransform(progress, [0.8, 0.91], [0, 1])
  const glowOpacity = useTransform(progress, [0.82, 0.89, 0.95], [0, 0.85, 0])

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-2/3 origin-bottom bg-[linear-gradient(0deg,rgba(0,240,255,0.28),rgba(124,58,237,0.12)_42%,transparent)]"
        style={{ opacity, scaleY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 bottom-0 z-30 h-24 rounded-full bg-primary/30 blur-[34px]"
        style={{ opacity: glowOpacity }}
      />
    </>
  )
}

function FallSpeedLines({ progress }) {
  const opacity = useTransform(progress, [0.12, 0.3, 0.82, 0.95], [0, 0.38, 0.72, 0.15])
  const y = useTransform(progress, [0, 1], [-120, 260])

  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute inset-[-18%] z-0" style={{ opacity, y }}>
      <div className="absolute left-2 top-0 h-3/4 w-px rotate-12 bg-gradient-to-b from-transparent via-primary/35 to-transparent" />
      <div className="absolute left-12 top-16 h-2/3 w-px rotate-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      <div className="absolute right-8 top-8 h-3/4 w-px rotate-12 bg-gradient-to-b from-transparent via-secondary/35 to-transparent" />
      <div className="absolute right-20 top-28 h-1/2 w-px rotate-12 bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
    </motion.div>
  )
}

export default function StoryCard({ progress, finalOpen }) {
  const pointerRotateY = useMotionValue(0)
  const pointerY = useSpring(pointerRotateY, { stiffness: 190, damping: 20 })
  const flipControls = useAnimationControls()
  const flipId = useRef(0)
  const [activePage, setActivePage] = useState(0)
  const [renderedPage, setRenderedPage] = useState(0)
  const [direction, setDirection] = useState(1)

  useMotionValueEvent(progress, 'change', (latest) => {
    const flipProgress = clamp((latest - FLIP_START) / (FLIP_END - FLIP_START))
    const next = Math.min(cardPages.length - 1, Math.round(flipProgress * (cardPages.length - 1)))
    setActivePage((current) => {
      if (next !== current) setDirection(next > current ? 1 : -1)
      return next
    })
  })

  useEffect(() => {
    if (activePage === renderedPage) return undefined

    const id = flipId.current + 1
    flipId.current = id
    const dir = direction >= 0 ? 1 : -1

    const runFlip = async () => {
      await flipControls.start({
        rotateY: dir * 92,
        rotateX: 2,
        scale: 0.986,
        filter: 'brightness(0.84)',
        transition: { duration: 0.25, ease: [0.55, 0.06, 0.68, 0.19] },
      })

      if (flipId.current !== id) return
      setRenderedPage(activePage)
      flipControls.set({ rotateY: -dir * 92, rotateX: -2 })

      await flipControls.start({
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        filter: 'brightness(1)',
        transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
      })
    }

    runFlip()
    return undefined
  }, [activePage, direction, flipControls, renderedPage])

  // Horizontal entrance + deliberate final impact only. Regular flips always resolve to the front.
  const cardX = useTransform(progress, [0, 0.16, 1], [310, 0, 0])
  const impactY = useTransform(progress, [0, 0.78, 0.875, 0.92, 1], [0, 0, 86, 132, 154])
  const impactScale = useTransform(progress, [0, 0.78, 0.9, 1], [1, 1, 1.018, 0.94])
  const impactRotateZ = useTransform(progress, [0, 0.78, 0.875, 0.92, 1], [0, 0, -1.8, 0.7, 0])
  const cardOpacity = useTransform(progress, [0, 0.9, 0.985, 1], [1, 1, 0.28, 0])
  const glowOpacity = useTransform(progress, [0, 0.16, 0.7, 0.89, 1], [0.14, 0.32, 0.36, 0.78, 0.12])

  const handleMove = (event) => {
    if (finalOpen) return
    setCardPointer(event)
    const rect = event.currentTarget.getBoundingClientRect()
    pointerRotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 4)
  }

  const handleLeave = (event) => {
    resetCardPointer(event)
    pointerRotateY.set(0)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center overflow-hidden">
      <motion.div
        className="story-card-frame perspective-1200 relative"
        style={{ x: cardX, y: impactY, scale: impactScale, rotateZ: impactRotateZ }}
      >
        <FallSpeedLines progress={progress} />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[90px]"
          style={{ opacity: glowOpacity }}
        />

        <motion.div
          animate={flipControls}
          initial={{ rotateY: 0, rotateX: 0, scale: 1, filter: 'brightness(1)' }}
          className="relative h-full w-full will-change-transform"
          style={{ opacity: cardOpacity, transformPerspective: 1200, transformOrigin: '50% 50%' }}
        >
          <motion.div
            data-cursor="card"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className={`glass-panel group relative h-full w-full overflow-hidden rounded-[2rem] will-change-transform ${finalOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{ rotateY: pointerY, transformPerspective: 1200, transformOrigin: '50% 50%' }}
          >
            <div className="absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 size-60 rounded-full bg-secondary/14 blur-3xl" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-[-20%] z-20 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-70"
              animate={{ x: ['-170%', '430%'] }}
              transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
            />

            <div className="absolute inset-0 z-10 overflow-hidden rounded-[2rem]">
              <motion.div
                key={cardPages[renderedPage].id}
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0"
              >
                <CardPage page={cardPages[renderedPage]} />
              </motion.div>
            </div>

            <BottomUpBreakOverlay progress={progress} />
            <CrackOverlay progress={progress} />
            {glassShards.map((shard) => <ForegroundShard key={shard.clip} shard={shard} progress={progress} />)}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
