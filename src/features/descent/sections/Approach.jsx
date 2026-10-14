import { motion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { reasons } from '../content'
import { BlurIn } from '../ui'

// Each reason lights up in turn as the list passes the middle of the screen.
function Reason({ r, i, n, progress }) {
  const a = i / n
  const b = (i + 1) / n
  const opacity = useTransform(progress, [a - 0.12, a + 0.04, b + 0.1], [0.32, 1, 1])
  const x = useTransform(progress, [a - 0.12, a + 0.04], [-18, 0])
  const line = useTransform(progress, [a - 0.05, b], [0, 1])
  const Icon = r.icon
  return (
    <motion.li style={{ opacity, x }} className="reason">
      <span className="reason-icon">
        <Icon className="size-5" strokeWidth={1.6} />
      </span>
      <div>
        <h3 className="font-display text-xl sm:text-2xl">{r.title}</h3>
        <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-snow/70 sm:text-base">{r.description}</p>
      </div>
      <motion.span className="reason-line" style={{ scaleX: line }} />
    </motion.li>
  )
}

export default function Approach() {
  const ref = useRef(null)
  const reduce = useReducedMotionConfig()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.5'] })
  return (
    <section id="approach" className="section flex min-h-[150svh] flex-col justify-center py-[20svh]">
      <div className="shell">
        <div className="scrim-left max-w-[40rem] py-4">
          <BlurIn className="h2">Built like the route depends on it</BlurIn>
          <ol ref={ref} className="mt-10 grid gap-8">
            {reasons.map((r, i) =>
              reduce ? (
                <li key={r.title} className="reason">
                  <span className="reason-icon">
                    <r.icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl">{r.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-snow/70 sm:text-base">{r.description}</p>
                  </div>
                </li>
              ) : (
                <Reason key={r.title} r={r} i={i} n={reasons.length} progress={scrollYProgress} />
              ),
            )}
          </ol>
        </div>
      </div>
    </section>
  )
}
