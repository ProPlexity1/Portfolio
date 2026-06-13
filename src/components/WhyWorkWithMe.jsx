import { motion } from 'framer-motion'
import { MessageSquareText, ShieldCheck, Target } from 'lucide-react'
import { fadeUp, scaleIn, staggerContainer, viewport } from '../lib/animations'
import { resetCardPointer, setCardPointer } from '../lib/utils'

const reasons = [
  {
    icon: MessageSquareText,
    title: 'Reliable Communication',
    description: 'Clear updates and professional collaboration throughout every project.',
  },
  {
    icon: ShieldCheck,
    title: 'Modern Technology',
    description: 'Built using current tools and best practices.',
  },
  {
    icon: Target,
    title: 'Business Focused',
    description: 'Solutions designed around real business needs.',
  },
]

export function WhyCardContent() {
  return (
    <div className="content-layer flex h-full flex-col p-5 sm:p-7">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Why Work With Me</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">A partner who thinks beyond code.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">The work is engineered around communication, stability and measurable business outcomes.</p>
      </div>
      <div className="grid flex-1 gap-4">
        {reasons.map((reason) => {
          const Icon = reason.icon
          return (
            <div key={reason.title} className="flex gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{reason.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted">{reason.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WhyWorkWithMe() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="section-shell">
        <motion.div variants={staggerContainer()} initial="hidden" whileInView="visible" viewport={viewport} className="mx-auto max-w-3xl text-center">
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Why Work With Me</motion.p>
          <motion.h2 variants={fadeUp} className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            A development partner who thinks beyond code.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-base leading-8 text-muted">
            I focus on clean execution, fast feedback loops and software decisions that support your business goals.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.14, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <motion.article
                key={reason.title}
                variants={scaleIn}
                data-cursor="card"
                onMouseMove={setCardPointer}
                onMouseLeave={resetCardPointer}
                whileHover={{ y: -8 }}
                className="glass-panel overflow-hidden rounded-[1.8rem] p-6"
              >
                <div className="content-layer">
                  <div className="grid size-13 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.075] text-primary shadow-[0_0_28px_rgba(0,240,255,0.12)]">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-7 text-xl font-semibold tracking-tight text-foreground">{reason.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">{reason.description}</p>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
