import { motion, useTransform } from 'framer-motion'
import { glassShards, SHATTER_START } from '../storyConfig'

const crackPaths = [
  { d: 'M258 8 L238 84 L260 156 L219 236 L244 318 L212 470', range: [0.845, 0.915] },
  { d: 'M238 84 L184 128 L156 184 L90 222', range: [0.858, 0.935] },
  { d: 'M260 156 L321 191 L359 258 L425 318 L494 376', range: [0.872, 0.955] },
  { d: 'M219 236 L158 269 L112 342 L54 394', range: [0.888, 0.968] },
  { d: 'M321 191 L388 153 L456 163', range: [0.902, 0.98] },
  { d: 'M244 318 L305 373 L334 448 L398 512', range: [0.918, 1] },
]

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
      filter="url(#crack-glow)"
    />
  )
}

export function CrackOverlay({ progress }) {
  const opacity = useTransform(progress, [0.82, 0.89, 1], [0, 1, 0.35])

  return (
    <motion.svg style={{ opacity }} className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 512 560" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="crack-glow" x="-60%" y="-60%" width="220%" height="220%">
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

export function ForegroundShard({ shard, progress }) {
  const x = useTransform(progress, [SHATTER_START, 1], [0, shard.x * 0.42])
  const y = useTransform(progress, [SHATTER_START, 1], [0, shard.y * 0.42])
  const rotate = useTransform(progress, [SHATTER_START, 1], [0, shard.rotate])
  const opacity = useTransform(progress, [0.86, SHATTER_START, 0.975, 1], [0, 0.95, 0.55, 0.2])
  const scale = useTransform(progress, [SHATTER_START, 1], [1, 0.96])

  return <motion.div aria-hidden="true" className="glass-panel pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[2rem]" style={{ x, y, rotate, scale, opacity, clipPath: shard.clip }} />
}

function BackgroundShard({ shard, progress, index }) {
  const x = useTransform(progress, [0.88, 1], [0, shard.x])
  const y = useTransform(progress, [0.88, 1], [0, shard.y])
  const rotate = useTransform(progress, [0.88, 1], [0, shard.rotate])
  const opacity = useTransform(progress, [0.86, 0.92, 1], [0, 0.18 + (index % 4) * 0.035, 0.24 + (index % 3) * 0.04])
  const scale = useTransform(progress, [0.88, 1], [0.72, 1])

  return (
    <motion.div
      aria-hidden="true"
      className="glass-panel pointer-events-none absolute overflow-hidden rounded-[1.4rem]"
      style={{
        left: `calc(50% - ${shard.width / 2}px)`,
        top: `calc(50% - ${shard.height / 2}px)`,
        width: shard.width,
        height: shard.height,
        x,
        y,
        rotate,
        scale,
        opacity,
        clipPath: shard.clip,
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

export function BrokenShardField({ progress }) {
  const opacity = useTransform(progress, [0.86, 0.94], [0, 1])

  return (
    <motion.div style={{ opacity }} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {glassShards.map((shard, index) => <BackgroundShard key={`${shard.clip}-bg`} shard={shard} progress={progress} index={index} />)}
    </motion.div>
  )
}

export function BreakFlash({ progress }) {
  const opacity = useTransform(progress, [0.86, 0.895, 0.94], [0, 0.72, 0])
  const scale = useTransform(progress, [0.86, 0.94], [0.65, 1.45])

  return <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[35] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[80px]" style={{ opacity, scale }} />
}

export function ImpactSurface({ progress }) {
  const opacity = useTransform(progress, [0.78, 0.86, 0.98], [0, 1, 0.4])
  const scaleX = useTransform(progress, [0.78, 0.89], [0.18, 1])
  const pulseOpacity = useTransform(progress, [0.84, 0.895, 0.98], [0, 0.8, 0.2])
  const pulseScale = useTransform(progress, [0.84, 0.98], [0.45, 1.35])

  return (
    <motion.div
      aria-hidden="true"
      style={{ opacity }}
      className="pointer-events-none absolute inset-x-0 bottom-[8vh] z-[18] mx-auto h-px w-[min(760px,calc(100vw-36px))]"
    >
      <motion.div style={{ scaleX }} className="h-px origin-center bg-gradient-to-r from-transparent via-primary/80 to-transparent shadow-[0_0_42px_rgba(0,240,255,0.55)]" />
      <motion.div style={{ opacity: pulseOpacity, scale: pulseScale }} className="absolute left-1/2 top-1/2 h-28 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/14 blur-3xl" />
    </motion.div>
  )
}
