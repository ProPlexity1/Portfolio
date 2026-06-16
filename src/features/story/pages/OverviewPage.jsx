import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Code2 } from 'lucide-react'
import { terminalLines } from '../data/portfolio'
import TypewriterText from '../components/TypewriterText'

// ─── Count Up Hook ───────────────────────────────────────────────────────────
function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = null
    const numeric = parseInt(target)
    const suffix = target.replace(String(numeric), '')

    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(eased * numeric) + suffix)
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [inView, target, duration])

  return { count, ref }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function Stat({ label, value }) {
  const isNumeric = /\d/.test(value)
  const { count, ref } = useCountUp(value, 1000)

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 sm:p-2.5">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-muted sm:text-[0.6rem]">{label}</p>
      <p className="mt-1 text-[0.7rem] font-semibold text-foreground sm:mt-1.5 sm:text-sm">
        {isNumeric ? count : value}
      </p>
    </div>
  )
}

// ─── Terminal Scan Line ───────────────────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      initial={{ top: '0%', opacity: 0 }}
      animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 3.2,
        ease: 'linear',
        repeat: Infinity,
        repeatDelay: 2.5,
        times: [0, 0.05, 0.95, 1],
      }}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const totalPhases = terminalLines.length * 2

export default function OverviewPage() {
  const [phase, setPhase] = useState(0)

  const advance = () => setPhase(p => Math.min(p + 1, totalPhases))

  return (
    <div className="content-layer flex h-full flex-col justify-between p-3 sm:p-5">

      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">
              Ukasha Bin Khalil
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Full Stack Developer
            </h2>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] p-3 text-primary">
            <Code2 className="size-5 sm:size-6" />
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-5 sm:gap-2.5">
          <Stat label="Projects" value="2+" />
          <Stat label="Stack" value="React + Laravel" />
          <Stat label="Status" value="Available" />
        </div>
      </div>

      {/* ── Terminal ── */}
      <div className="relative mt-3 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020511]/70 p-2.5 font-mono text-[0.65rem] sm:mt-4 sm:p-4 sm:text-[0.75rem] h-[50%] sm:h-[80%]">
        <ScanLine />

        {/* Traffic lights */}
        <div className="mb-3 flex items-center gap-1.5 sm:mb-4">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-300/80" />
          <span className="size-2.5 rounded-full bg-emerald-300/80" />
        </div>

        {/* Lines */}
        <div className="space-y-2.5 sm:space-y-3">
          {terminalLines.map(([command, response], index) => {
            const cmdPhase = index * 2
            const resPhase = index * 2 + 1
            const isLastLine = index === terminalLines.length - 1

            return (
              <motion.div
                key={command}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= cmdPhase ? 1 : 0 }}
                transition={{ duration: 0.1 }}
              >
                {/* Command */}
                <p className="text-primary/90">
                  {phase >= cmdPhase ? (
                    <TypewriterText
                      text={command}
                      active={phase === cmdPhase}
                      onDone={advance}
                    />
                  ) : null}
                </p>

                {/* Response */}
                {phase > cmdPhase && (
                  <p className="mt-1 text-foreground/90">
                    <TypewriterText
                      text={response}
                      active={phase === resPhase}
                      showCursor={isLastLine}
                      onDone={advance}
                    />
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

    </div>
  )
}