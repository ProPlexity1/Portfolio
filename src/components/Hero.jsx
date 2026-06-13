import { useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, CheckCircle2, Code2, Database, Server, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { cardPages } from '../card-pages'
import { techStack } from '../data/portfolio'
import { fadeUp, premiumEase, staggerContainer } from '../lib/animations'
import { resetCardPointer, setCardPointer } from '../lib/utils'

const roles = ['Full Stack Developer', 'SaaS Builder', 'Laravel & React Specialist', 'Business Solutions Developer']

const CENTERING_END = 0.18
const FLIP_START = 0.16
const FLIP_END = 0.82
const SHATTER_START = 0.9
const FINAL_REVEAL = 0.945

const crackPaths = [
  { d: 'M258 8 L238 84 L260 156 L219 236 L244 318 L212 470', range: [0.845, 0.915] },
  { d: 'M238 84 L184 128 L156 184 L90 222', range: [0.858, 0.935] },
  { d: 'M260 156 L321 191 L359 258 L425 318 L494 376', range: [0.872, 0.955] },
  { d: 'M219 236 L158 269 L112 342 L54 394', range: [0.888, 0.968] },
  { d: 'M321 191 L388 153 L456 163', range: [0.902, 0.98] },
  { d: 'M244 318 L305 373 L334 448 L398 512', range: [0.918, 1] },
]

const fragments = [
  { x: -190, y: -130, rotate: -24, clip: 'polygon(0 0, 35% 0, 28% 42%, 0 58%)', width: 220, height: 260 },
  { x: -72, y: -178, rotate: -8, clip: 'polygon(32% 0, 68% 0, 58% 47%, 28% 42%)', width: 210, height: 250 },
  { x: 166, y: -142, rotate: 22, clip: 'polygon(66% 0, 100% 0, 100% 48%, 58% 47%)', width: 220, height: 260 },
  { x: -216, y: 42, rotate: -30, clip: 'polygon(0 58%, 28% 42%, 44% 100%, 0 100%)', width: 230, height: 270 },
  { x: -18, y: 132, rotate: 7, clip: 'polygon(28% 42%, 58% 47%, 66% 100%, 44% 100%)', width: 210, height: 260 },
  { x: 204, y: 70, rotate: 28, clip: 'polygon(58% 47%, 100% 48%, 100% 100%, 66% 100%)', width: 230, height: 270 },
  { x: -126, y: 206, rotate: -16, clip: 'polygon(22% 14%, 84% 30%, 62% 100%, 0 72%)', width: 170, height: 150 },
  { x: 110, y: 218, rotate: 18, clip: 'polygon(12% 0, 100% 18%, 82% 86%, 0 100%)', width: 180, height: 150 },
]

const particles = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  size: 2 + (index % 4),
  delay: (index % 7) * 0.18,
  duration: 4.5 + (index % 6) * 0.55,
  opacity: 0.18 + (index % 5) * 0.055,
}))

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return isDesktop
}

function RoleRotator() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % roles.length), 2200)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="relative mt-7 h-10 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:w-fit">
      <motion.span
        key={roles[index]}
        initial={{ y: 18, opacity: 0, filter: 'blur(8px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: premiumEase }}
        className="flex items-center gap-2"
      >
        <Sparkles className="size-4" /> {roles[index]}
      </motion.span>
    </div>
  )
}

function FallingEnvironment({ progress }) {
  const fieldYFast = useTransform(progress, [0, 1], [0, 1200])
  const fieldYSlow = useTransform(progress, [0, 1], [0, 520])
  const gridY = useTransform(progress, [0, 1], [0, 360])
  const speedOpacity = useTransform(progress, [0, 0.16, 0.86, 1], [0, 0.65, 0.82, 0.2])
  const vignetteOpacity = useTransform(progress, [0, 0.2, 0.86, 1], [0.22, 0.45, 0.62, 0.38])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-[-20%] top-[-35%] h-[180%] opacity-40"
        style={{ y: gridY }}
      >
        <div className="h-full w-full bg-[linear-gradient(rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.08)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ y: fieldYSlow, opacity: speedOpacity }}
      >
        <div className="absolute left-[8%] top-[-20%] h-72 w-px rotate-12 bg-gradient-to-b from-transparent via-primary/35 to-transparent blur-[0.5px]" />
        <div className="absolute left-[28%] top-[12%] h-96 w-px rotate-12 bg-gradient-to-b from-transparent via-white/20 to-transparent blur-[0.5px]" />
        <div className="absolute right-[25%] top-[-12%] h-80 w-px rotate-12 bg-gradient-to-b from-transparent via-secondary/35 to-transparent blur-[0.5px]" />
        <div className="absolute right-[7%] top-[25%] h-[32rem] w-px rotate-12 bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-[0.5px]" />
      </motion.div>

      <motion.div aria-hidden="true" className="absolute inset-0" style={{ y: fieldYFast, opacity: speedOpacity }}>
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute rounded-full bg-primary shadow-[0_0_18px_rgba(0,240,255,0.65)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
            }}
            animate={{ y: [-20, 160], opacity: [0, particle.opacity, 0] }}
            transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: 'linear' }}
          />
        ))}
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,8,22,0.22)_48%,rgba(5,8,22,0.74)_100%)]"
        style={{ opacity: vignetteOpacity }}
      />
    </div>
  )
}

function IntroPanel({ progress }) {
  const x = useTransform(progress, [0, 0.1, CENTERING_END], [0, -64, -230])
  const opacity = useTransform(progress, [0, 0.09, CENTERING_END], [1, 0.72, 0])
  const filter = useTransform(progress, [0, CENTERING_END], ['blur(0px)', 'blur(16px)'])

  return (
    <motion.div
      style={{ x, opacity, filter }}
      variants={staggerContainer()}
      initial="hidden"
      animate="visible"
      className="absolute left-0 top-1/2 z-10 hidden w-[min(620px,calc(100vw-32px))] -translate-y-1/2 pr-6 lg:block"
    >
      <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-[0_0_28px_rgba(0,240,255,0.08)]">
        <span className="size-2 rounded-full bg-primary shadow-[0_0_14px_rgba(0,240,255,0.9)]" />
        Open for Client Work
      </motion.div>

      <motion.h1 variants={fadeUp} className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-6xl xl:text-7xl">
        Custom Websites.
        <br />
        <span className="premium-gradient-text">Scalable SaaS.</span>
        <br />
        Built For Growth.
      </motion.h1>

      <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
        I help businesses and startups build modern websites, custom dashboards and scalable SaaS applications.
      </motion.p>

      <motion.div variants={fadeUp}>
        <RoleRotator />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="#projects" showArrow>View Projects</Button>
        <Button href="#contact" variant="secondary" showArrow>Hire Me</Button>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 flex max-w-xl flex-wrap gap-2.5">
        {techStack.map((item, index) => {
          const icons = [Code2, Server, Database, Sparkles, CheckCircle2, ArrowRight]
          const Icon = icons[index]
          return (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-foreground/85 backdrop-blur-xl">
              <Icon className="size-3.5 text-primary/85" /> {item}
            </span>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

function MobileIntro({ progress }) {
  const opacity = useTransform(progress, [0, 0.06], [1, 0])
  const y = useTransform(progress, [0, 0.06], [0, -20])

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-4 top-24 z-10 lg:hidden">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
        <span className="size-1.5 rounded-full bg-primary" /> Open for Client Work
      </div>
      <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-foreground">
        Custom Websites. <span className="premium-gradient-text">Scalable SaaS.</span>
      </h1>
    </motion.div>
  )
}

function CardPage({ page }) {
  const Page = page.component
  return (
    <motion.div
      key={page.id}
      initial={{ opacity: 0, scale: 0.985, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.38, ease: premiumEase }}
      className="h-full"
    >
      <Page />
    </motion.div>
  )
}

function CrackPath({ path, index, progress }) {
  const pathLength = useTransform(progress, path.range, [0, 1])
  const opacity = useTransform(progress, [path.range[0], path.range[0] + 0.035, 1], [0, 0.95, 0.5])

  return (
    <motion.path
      d={path.d}
      style={{ pathLength, opacity }}
      stroke={index % 2 ? 'rgba(0,240,255,0.9)' : 'rgba(248,250,252,0.78)'}
      strokeWidth={index > 3 ? 1.15 : 1.65}
      strokeLinecap="round"
      filter="url(#crack-glow-redo)"
    />
  )
}

function CrackOverlay({ progress }) {
  const opacity = useTransform(progress, [0.82, 0.89, 1], [0, 1, 0.35])

  return (
    <motion.svg style={{ opacity }} className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 512 560" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="crack-glow-redo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {crackPaths.map((path, index) => <CrackPath key={path.d} path={path} index={index} progress={progress} />)}
    </motion.svg>
  )
}

function GlassFragment({ fragment, progress }) {
  const x = useTransform(progress, [SHATTER_START, 1], [0, fragment.x * 0.42])
  const y = useTransform(progress, [SHATTER_START, 1], [0, fragment.y * 0.42])
  const rotate = useTransform(progress, [SHATTER_START, 1], [0, fragment.rotate])
  const opacity = useTransform(progress, [0.86, SHATTER_START, 0.975, 1], [0, 0.95, 0.55, 0.2])
  const scale = useTransform(progress, [SHATTER_START, 1], [1, 0.96])

  return (
    <motion.div
      aria-hidden="true"
      className="glass-panel pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[2rem]"
      style={{ x, y, rotate, scale, opacity, clipPath: fragment.clip }}
    />
  )
}

function BackgroundShard({ fragment, progress, index }) {
  const x = useTransform(progress, [0.88, 1], [0, fragment.x])
  const y = useTransform(progress, [0.88, 1], [0, fragment.y])
  const rotate = useTransform(progress, [0.88, 1], [0, fragment.rotate])
  const opacity = useTransform(progress, [0.86, 0.92, 1], [0, 0.18 + (index % 4) * 0.035, 0.24 + (index % 3) * 0.04])
  const scale = useTransform(progress, [0.88, 1], [0.72, 1])

  return (
    <motion.div
      aria-hidden="true"
      className="glass-panel pointer-events-none absolute left-1/2 top-1/2 overflow-hidden rounded-[1.4rem]"
      style={{
        width: fragment.width,
        height: fragment.height,
        x,
        y,
        rotate,
        scale,
        opacity,
        clipPath: fragment.clip,
        filter: 'blur(0.2px)',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,240,255,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(124,58,237,0.07))]" />
      <div className="content-layer p-4 opacity-55">
        <div className="h-3 w-24 rounded-full bg-primary/35" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => <span key={item} className="h-10 rounded-xl bg-white/[0.07]" />)}
        </div>
        <div className="mt-4 space-y-2">
          <span className="block h-2 w-4/5 rounded-full bg-white/10" />
          <span className="block h-2 w-2/3 rounded-full bg-white/10" />
        </div>
      </div>
    </motion.div>
  )
}

function BrokenShardField({ progress }) {
  const opacity = useTransform(progress, [0.86, 0.94], [0, 1])

  return (
    <motion.div style={{ opacity }} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {fragments.map((fragment, index) => (
        <BackgroundShard key={`${fragment.clip}-bg`} fragment={fragment} progress={progress} index={index} />
      ))}
    </motion.div>
  )
}

function BreakFlash({ progress }) {
  const opacity = useTransform(progress, [0.86, 0.895, 0.94], [0, 0.72, 0])
  const scale = useTransform(progress, [0.86, 0.94], [0.65, 1.45])

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-[35] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[80px]"
      style={{ opacity, scale }}
    />
  )
}

function ProgressRail({ activeIndex }) {
  return (
    <div className="pointer-events-none absolute -bottom-11 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-2 lg:flex">
      {cardPages.map((page, index) => (
        <div key={page.id} className="group relative">
          <span className={`block h-1.5 rounded-full transition-all duration-500 ${index === activeIndex ? 'w-12 bg-primary shadow-[0_0_18px_rgba(0,240,255,0.55)]' : 'w-4 bg-white/15'}`} />
          <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {page.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function StoryScrollbar({ progress, activeIndex, onJump }) {
  const scaleY = useTransform(progress, [0, 1], [0.02, 1])

  return (
    <div className="fixed right-4 top-1/2 z-[60] hidden -translate-y-1/2 lg:block">
      <div className="glass-panel relative h-80 w-4 overflow-visible rounded-full p-1">
        <motion.span
          className="absolute inset-x-1 top-1 origin-top rounded-full bg-gradient-to-b from-primary via-primary/70 to-secondary shadow-[0_0_24px_rgba(0,240,255,0.45)]"
          style={{ scaleY }}
        />
        <div className="content-layer absolute inset-y-4 left-1/2 flex -translate-x-1/2 flex-col justify-between">
          {cardPages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              data-cursor="button"
              onClick={() => onJump(index)}
              className={`size-2.5 rounded-full border transition-all duration-300 ${index === activeIndex ? 'scale-150 border-primary bg-primary shadow-[0_0_18px_rgba(0,240,255,0.8)]' : 'border-white/25 bg-white/20 hover:border-primary/70'}`}
              aria-label={`Jump to ${page.label}`}
            />
          ))}
        </div>
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-primary/70">
          Scroll
        </div>
      </div>
    </div>
  )
}

function StoryCard({ progress, activeIndex, finalOpen }) {
  const isDesktop = useIsDesktop()

  // Pointer tilt source values
  const pointerRotateX = useMotionValue(0)
  const pointerRotateY = useMotionValue(0)

  // Smooth springs for pointer tilt
  const tiltX = useSpring(pointerRotateX, { stiffness: 190, damping: 22 })
  const tiltY = useSpring(pointerRotateY, { stiffness: 190, damping: 22 })

  const totalFlips = cardPages.length - 1
  const [segment, setSegment] = useState(0)
  const segmentRef = useRef(0)
  const isFlippingRef = useRef(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const flipTimeout = useRef(null)

  const targetRotation = useMotionValue(0)
  const rotateY = useSpring(targetRotation, { stiffness: 300, damping: 36, mass: 0.42 })

  useMotionValueEvent(progress, 'change', (latest) => {
    const flipProgress = clamp((latest - FLIP_START) / (FLIP_END - FLIP_START))
    const newSegment = Math.min(totalFlips - 1, Math.floor(flipProgress * totalFlips))

    if (newSegment !== segmentRef.current) {
      segmentRef.current = newSegment
      isFlippingRef.current = true
      setSegment(newSegment)
      setIsFlipping(true)

      // Hard-snap ALL tilt to zero — no easing, no bleed
      pointerRotateX.set(0)
      pointerRotateY.set(0)
      tiltX.set(0)
      tiltY.set(0)

      clearTimeout(flipTimeout.current)
      flipTimeout.current = setTimeout(() => {
        isFlippingRef.current = false
        setIsFlipping(false)
      }, 500)
    }

    targetRotation.set(newSegment * 180)
  })

  const initialX = isDesktop ? 310 : 0
  const cardX = useTransform(progress, [0, CENTERING_END, 1], [initialX, 0, 0])
  const cardScale = isDesktop ? 1 : 0.82
  const cardOpacity = useTransform(progress, [0, 0.93, 0.985, 1], [1, 1, 0.28, 0])
  const glowOpacity = useTransform(progress, [0, CENTERING_END, 0.7, 0.9, 1], [0.16, 0.4, 0.48, 0.76, 0.18])

  const frontIndex = segment % 2 === 0 ? segment : segment + 1
  const backIndex = segment % 2 === 0 ? segment + 1 : segment

  const handleMove = (event) => {
    if (finalOpen || isFlippingRef.current) return
    setCardPointer(event)
    const rect = event.currentTarget.getBoundingClientRect()
    pointerRotateX.set(((event.clientY - rect.top) / rect.height - 0.5) * -5)
    pointerRotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 5)
  }

  const handleLeave = (event) => {
    resetCardPointer(event)
    pointerRotateX.set(0)
    pointerRotateY.set(0)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="relative w-[min(530px,calc(100vw-32px))]"
          style={{ x: cardX, scale: cardScale }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-8 -z-10 rounded-[2.5rem] bg-primary blur-[76px]"
            style={{ opacity: glowOpacity }}
          />
          <ProgressRail activeIndex={activeIndex} />

          {/*
            KEY FIX: One single preserve-3d element holds ALL transforms:
            - rotateY = flip spring
            - rotateX = pointer tilt (same element, no matrix nesting)
            - rotateZ = wobble (gated during flip)
            Front and back faces are DIRECT children — no intermediate wrapper.
            This eliminates the nested-preserve-3d Y-bleed entirely.
          */}
          <motion.div
            data-cursor="card"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className={`preserve-3d group relative h-[min(600px,calc(100dvh-164px))] min-h-[500px] rounded-[2rem] will-change-transform max-sm:h-[min(500px,calc(100dvh-150px))] max-sm:min-h-[420px] ${finalOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{
              rotateY,
              rotateX: tiltX,
              opacity: cardOpacity,
            }}
            animate={
              isFlipping || finalOpen
                ? { rotateZ: 0, scale: 1 }
                : { rotateZ: [0, 0.18, 0, -0.14, 0], scale: [1, 1.003, 1, 1.002, 1] }
            }
            transition={
              isFlipping || finalOpen
                ? { duration: 0.15, ease: 'easeOut' }
                : { duration: 8, repeat: Infinity, ease: 'easeInOut' }
            }
            whileHover={{ scale: finalOpen ? 1 : 1.012 }}
          >
            {/* FRONT FACE — direct child, no wrapper */}
            <div
              className="glass-panel backface-hidden absolute inset-0 overflow-hidden rounded-[2rem] transition-shadow duration-500 group-hover:shadow-[0_32px_110px_rgba(0,0,0,0.48),0_0_70px_rgba(0,240,255,0.22)]"
              style={{
                // Thickness: cyan edge glow on the right side simulates card depth during flip
                boxShadow: '4px 0 12px rgba(0,240,255,0.18), -4px 0 12px rgba(124,58,237,0.14)',
              }}
            >
              <div className="absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 size-60 rounded-full bg-secondary/14 blur-3xl" />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-[-20%] z-20 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-70"
                animate={{ x: ['-170%', '430%'] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
              />
              <CardPage page={cardPages[frontIndex]} />
            </div>

            {/* BACK FACE — direct child, no wrapper */}
            <div
              className="glass-panel backface-hidden absolute inset-0 overflow-hidden rounded-[2rem] transition-shadow duration-500 group-hover:shadow-[0_32px_110px_rgba(0,0,0,0.48),0_0_70px_rgba(0,240,255,0.22)]"
              style={{
                transform: 'rotateY(180deg)',
                boxShadow: '4px 0 12px rgba(0,240,255,0.18), -4px 0 12px rgba(124,58,237,0.14)',
              }}
            >
              <div className="absolute -right-20 bottom-8 size-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute left-8 top-0 size-44 rounded-full bg-secondary/14 blur-3xl" />
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-[-20%] z-20 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/14 to-transparent opacity-70"
                animate={{ x: ['-170%', '430%'] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
              />
              <CardPage page={cardPages[backIndex]} />
            </div>

            <CrackOverlay progress={progress} />
            {fragments.map((fragment) => (
              <GlassFragment key={fragment.clip} fragment={fragment} progress={progress} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function FinalFooter({ progress }) {
  const opacity = useTransform(progress, [0.935, 0.975], [0, 1])
  const y = useTransform(progress, [0.935, 0.975], [44, 0])

  return (
    <motion.footer
      style={{ opacity, y }}
      className="pointer-events-none absolute inset-x-4 bottom-3 z-50 sm:bottom-5"
    >
      <div className="glass-panel mx-auto max-w-5xl overflow-hidden rounded-full px-4 py-3 sm:px-5">
        <div className="content-layer flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Ukasha Bin Khalil</p>
            <p className="hidden text-muted sm:block">Full Stack Developer</p>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {['Projects', 'Services', 'About', 'Contact'].map((item) => (
              <span key={item} className="rounded-full px-3 py-1.5 text-muted">{item}</span>
            ))}
          </nav>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 font-semibold text-emerald-200">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
            <span className="hidden sm:inline">Available For Freelance Projects</span>
            <span className="sm:hidden">Available</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}

function FinalContact({ progress, finalOpen }) {
  const opacity = useTransform(progress, [0.915, FINAL_REVEAL], [0, 1])
  const y = useTransform(progress, [0.915, FINAL_REVEAL], [34, 0])
  const scale = useTransform(progress, [0.915, FINAL_REVEAL], [0.96, 1])

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name') || 'there'
    window.location.href = `mailto:ukasha@example.com?subject=Project inquiry from ${encodeURIComponent(name)}&body=${encodeURIComponent(form.get('details') || '')}`
  }

  return (
    <motion.div
      id="final-contact-panel"
      style={{ opacity, y, scale }}
      className={`absolute left-1/2 top-[46%] z-40 w-[min(920px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 sm:top-1/2 ${finalOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="glass-panel max-h-[calc(100dvh-132px)] overflow-auto rounded-[2rem] p-4 sm:p-7 lg:p-8">
        <div className="content-layer grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Project Inquiry</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:mt-4 sm:text-5xl">Let&apos;s Build Something Great Together</h2>
            <p className="mt-3 text-sm leading-7 text-muted sm:mt-5 sm:text-base sm:leading-8">Need a website, SaaS platform, dashboard or custom web application? Let&apos;s discuss your project.</p>
            <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-xs font-semibold text-emerald-200 sm:mt-7 sm:p-4 sm:text-sm">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
              Available For Freelance Projects
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-2.5 sm:gap-3">
            <input name="name" required placeholder="Name" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <input type="email" name="email" required placeholder="Email" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <textarea name="details" required rows="4" placeholder="Project Details" className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <Button type="submit" className="mt-1 w-full" showArrow>Send Message</Button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}

export default function Hero() {
  const storyRef = useRef(null)
  const progressValue = useMotionValue(0)
  const progressRef = useRef(0)
  const touchStartY = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [finalOpen, setFinalOpen] = useState(false)
  const progress = useSpring(progressValue, { stiffness: 82, damping: 30, mass: 0.55 })

  const setProgressTo = useCallback((value) => {
    const next = clamp(value)
    progressRef.current = next
    progressValue.set(next)
  }, [progressValue])

  const jumpToPage = useCallback((index) => {
    if (index === 0) return setProgressTo(0)
    const pageProgress = FLIP_START + (index / (cardPages.length - 1)) * (FLIP_END - FLIP_START)
    setProgressTo(pageProgress)
  }, [setProgressTo])

  useMotionValueEvent(progressValue, 'change', (latest) => {
    progressRef.current = latest
  })

  useMotionValueEvent(progress, 'change', (latest) => {
    const flipProgress = clamp((latest - FLIP_START) / (FLIP_END - FLIP_START))
    setActiveIndex(Math.min(cardPages.length - 1, Math.round(flipProgress * (cardPages.length - 1))))
    setFinalOpen(latest > FINAL_REVEAL)
  })

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const updateByDelta = (delta) => {
      setProgressTo(progressRef.current + delta)
    }

    const handleWheel = (event) => {
      if (event.ctrlKey) return
      event.preventDefault()
      const modeMultiplier = event.deltaMode === 1 ? 0.018 : 0.00072
      updateByDelta(event.deltaY * modeMultiplier)
    }

    const handleKeyDown = (event) => {
      const keyDelta = {
        ArrowDown: 0.075,
        PageDown: 0.14,
        ' ': 0.12,
        ArrowUp: -0.075,
        PageUp: -0.14,
        Home: 'home',
        End: 'end',
      }[event.key]

      if (keyDelta === undefined) return
      event.preventDefault()
      if (keyDelta === 'home') return setProgressTo(0)
      if (keyDelta === 'end') return setProgressTo(1)
      updateByDelta(keyDelta)
    }

    const handleTouchStart = (event) => {
      touchStartY.current = event.touches[0]?.clientY ?? null
    }

    const handleTouchMove = (event) => {
      if (touchStartY.current === null) return
      event.preventDefault()
      const currentY = event.touches[0]?.clientY ?? touchStartY.current
      const delta = touchStartY.current - currentY
      touchStartY.current = currentY
      updateByDelta(delta * 0.0023)
    }

    const handleClick = (event) => {
      const link = event.target.closest?.('a[href^="#"]')
      if (!link) return
      const hash = new URL(link.href).hash
      const map = {
        '#top': 0,
        '#about': FLIP_START + (1 / (cardPages.length - 1)) * (FLIP_END - FLIP_START),
        '#services': FLIP_START + (2 / (cardPages.length - 1)) * (FLIP_END - FLIP_START),
        '#projects': FLIP_START + (3 / (cardPages.length - 1)) * (FLIP_END - FLIP_START),
        '#why': FLIP_START + (4 / (cardPages.length - 1)) * (FLIP_END - FLIP_START),
        '#contact': 1,
      }
      if (map[hash] === undefined) return
      event.preventDefault()
      setProgressTo(map[hash])
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
  }, [setProgressTo])

  return (
    <section id="top" ref={storyRef} className="relative h-screen overflow-hidden pt-6">
      <StoryScrollbar progress={progress} activeIndex={activeIndex} onJump={jumpToPage} />

      <div className="relative h-screen overflow-hidden py-20 sm:py-24">
        <FallingEnvironment progress={progress} />
        <div className="section-shell relative z-10 h-full">
          <IntroPanel progress={progress} />
          <MobileIntro progress={progress} />
        </div>
        <StoryCard progress={progress} activeIndex={activeIndex} finalOpen={finalOpen} />
        <BrokenShardField progress={progress} />
        <BreakFlash progress={progress} />
        <FinalContact progress={progress} finalOpen={finalOpen} />
        <FinalFooter progress={progress} />
      </div>
    </section>
  )
}
