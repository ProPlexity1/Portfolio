import { motion, useReducedMotionConfig } from 'framer-motion'
import { Contours } from '../art'
import { services } from '../content'
import { EASE } from '../engine'
import { BlurIn } from '../ui'

export default function Services() {
  const reduce = useReducedMotionConfig()
  return (
    <section id="services" className="section flex min-h-[150svh] flex-col justify-center py-[20svh]">
      <div className="shell">
        <div className="w-full max-w-[46rem]">
          <BlurIn className="h2">What I build</BlurIn>
          <motion.div
            className="bento mt-8"
            initial={reduce ? false : 'hidden'}
            whileInView="shown"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ shown: { transition: { staggerChildren: 0.09 } } }}
          >
            {services.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.article
                  key={s.title}
                  className={`panel tile ${i === 0 ? 'tile-hero' : ''}`}
                  variants={{
                    hidden: { opacity: 0, y: 36, scale: 0.97 },
                    shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE } },
                  }}
                >
                  {i === 0 && <Contours className="tile-contours" />}
                  <span className="tile-icon">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <h3 className="mt-auto pt-8 font-display text-xl sm:text-2xl">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-snow/70">{s.description}</p>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
