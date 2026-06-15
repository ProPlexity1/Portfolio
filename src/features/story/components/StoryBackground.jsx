import { motion, useTransform } from 'framer-motion'

const particles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  size: 2 + (index % 4),
  delay: (index % 7) * 0.18,
  duration: 4.5 + (index % 6) * 0.55,
  opacity: 0.16 + (index % 5) * 0.055,
}))

export default function StoryBackground({ progress }) {
  const fieldYFast = useTransform(progress, [0, 1], [0, 1200])
  const fieldYSlow = useTransform(progress, [0, 1], [0, 520])
  const gridY = useTransform(progress, [0, 1], [0, 360])
  const speedOpacity = useTransform(progress, [0, 0.16, 0.86, 1], [0, 0.65, 0.82, 0.2])
  const vignetteOpacity = useTransform(progress, [0, 0.2, 0.86, 1], [0.22, 0.45, 0.62, 0.38])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div aria-hidden="true" className="absolute inset-x-[-20%] top-[-35%] h-[180%] opacity-40" style={{ y: gridY }}>
        <div className="h-full w-full bg-[linear-gradient(rgba(0,240,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.08)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      </motion.div>

      <motion.div aria-hidden="true" className="absolute inset-0" style={{ y: fieldYSlow, opacity: speedOpacity }}>
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
            style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size, opacity: particle.opacity }}
            animate={{ y: [-20, 160], opacity: [0, particle.opacity, 0] }}
            transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: 'linear' }}
          />
        ))}
      </motion.div>

      <motion.div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,8,22,0.22)_48%,rgba(5,8,22,0.74)_100%)]" style={{ opacity: vignetteOpacity }} />
    </div>
  )
}
