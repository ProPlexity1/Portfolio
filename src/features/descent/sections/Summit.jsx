import { motion, useReducedMotionConfig } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { CTA, STOPS } from '../content'
import { flyToId, flyToStop } from '../scroller'
import { EASE } from '../engine'
import { Kinetic } from '../ui'

export default function Summit({ ready }) {
  const reduce = useReducedMotionConfig()
  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1, delay, ease: EASE },
  })

  return (
    <section id="summit" className="section relative flex min-h-[100svh] items-end pb-10 sm:pb-14 lg:pb-16">
      <div className="shell grid w-full gap-8 lg:grid-cols-[1fr_minmax(0,25rem)] lg:items-end">
        <div>
          <motion.p className="eyebrow" {...rise(0.5)}>
            Full stack developer
          </motion.p>
          <h1 className="hero-name mt-4">
            <Kinetic text="Ukasha" className="block" play={ready} delay={0.15} stagger={0.05} />
            <Kinetic text="Bin Khalil" className="block text-snow/70" play={ready} delay={0.45} stagger={0.04} />
          </h1>
        </div>
        <div className="max-w-md lg:pb-3">
          <motion.p className="text-base leading-relaxed text-snow/80 sm:text-lg" {...rise(0.9)}>
            I build websites, SaaS products and dashboards that work properly from day one.
          </motion.p>
          <motion.div className="mt-6 flex flex-wrap gap-3" {...rise(1.05)}>
            <button type="button" className="btn btn-primary" onClick={() => flyToId('contact')}>
              {CTA.contact}
              <ArrowRight className="size-4" strokeWidth={2} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => flyToStop(STOPS.findIndex((s) => s.id === 'work'))}>
              {CTA.work}
              <ArrowDown className="size-4" strokeWidth={2} />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
