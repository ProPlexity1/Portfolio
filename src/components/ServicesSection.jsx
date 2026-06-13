import { motion } from 'framer-motion'
import { BarChart3, Globe2, PlugZap, Rocket } from 'lucide-react'
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/animations'
import { resetCardPointer, setCardPointer } from '../lib/utils'

const services = [
  {
    icon: Globe2,
    title: 'Business Websites',
    description: 'Fast, responsive websites designed to help businesses grow online.',
  },
  {
    icon: Rocket,
    title: 'SaaS Development',
    description: 'Scalable software platforms built for startups and businesses.',
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboards',
    description: 'Management systems with analytics, reporting and automation.',
  },
  {
    icon: PlugZap,
    title: 'API Integration',
    description: 'Connect systems and automate workflows.',
  },
]

export function ServicesCardContent() {
  return (
    <div className="content-layer flex h-full flex-col p-5 sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Services</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">Business-ready software services.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Four focused ways to turn an idea or business workflow into polished software.</p>
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        {services.map((service, index) => {
          const Icon = service.icon
          return (
            <div key={service.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
                  <Icon className="size-5" />
                </div>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">0{index + 1}</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{service.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted">{service.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ServicesSection() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="section-shell">
        <motion.div variants={staggerContainer()} initial="hidden" whileInView="visible" viewport={viewport} className="max-w-3xl">
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Services</motion.p>
          <motion.h2 variants={fadeUp} className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            Software services designed for serious business growth.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-base leading-8 text-muted">
            From launch-ready websites to custom SaaS platforms, every service is built with performance, clarity and long-term maintainability in mind.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        >
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <motion.article
                key={service.title}
                variants={scaleIn}
                data-cursor="card"
                onMouseMove={setCardPointer}
                onMouseLeave={resetCardPointer}
                whileHover={{ y: -10, scale: 1.015 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel group min-h-[270px] overflow-hidden rounded-[1.8rem] p-6"
              >
                <div className="content-layer flex h-full flex-col justify-between">
                  <div>
                    <div className="mb-7 inline-grid size-13 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary shadow-[0_0_26px_rgba(0,240,255,0.12)] transition-transform duration-300 group-hover:scale-105">
                      <Icon className="size-6" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Service 0{index + 1}</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{service.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted">{service.description}</p>
                  </div>
                  <div className="mt-7 h-px w-full bg-gradient-to-r from-primary/40 via-white/10 to-transparent" />
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
