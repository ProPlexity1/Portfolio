import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, GraduationCap, PackageCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { fadeUp, staggerContainer, viewport } from '../lib/animations'
import { resetCardPointer, setCardPointer } from '../lib/utils'

const projects = [
  {
    number: '01',
    title: 'The Scholars',
    icon: GraduationCap,
    stack: ['Laravel', 'Tailwind CSS'],
    description: 'Educational platform built from scratch for a real client.',
    features: ['Responsive Design', 'Modern UI', 'Optimized Performance'],
    accent: 'from-primary/20 to-secondary/20',
    layout: 'education',
  },
  {
    number: '02',
    title: 'Flowventory',
    icon: PackageCheck,
    stack: ['React', 'PostgreSQL', 'JWT Authentication'],
    description: 'Inventory management SaaS designed to simplify stock tracking and business operations.',
    features: ['Authentication', 'Inventory Tracking', 'Dashboard Analytics', 'Role Management'],
    accent: 'from-secondary/24 to-primary/16',
    layout: 'inventory',
  },
]

function ScreenshotPlaceholder({ project }) {
  const bars = project.layout === 'education'
    ? ['w-4/5', 'w-2/3', 'w-3/4', 'w-1/2']
    : ['w-11/12', 'w-3/5', 'w-4/5', 'w-2/3']

  return (
    <div className="relative min-h-[310px] overflow-hidden rounded-[1.65rem] border border-white/[0.08] bg-[#030713]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${project.accent}`} />
      <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative rounded-2xl border border-white/[0.08] bg-black/35 p-3 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-yellow-300/80" />
            <span className="size-2.5 rounded-full bg-green-300/80" />
          </div>
          <span className="h-2 w-24 rounded-full bg-white/10" />
        </div>

        <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <span key={item} className="block h-8 rounded-lg bg-white/[0.055]" />
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <span key={item} className="h-20 rounded-xl border border-white/[0.06] bg-white/[0.055]" />
              ))}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              {bars.map((bar, index) => (
                <span key={bar + index} className={`mb-3 block h-3 rounded-full bg-gradient-to-r from-primary/50 to-white/10 ${bar}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectsCardContent() {
  return (
    <div className="content-layer flex h-full flex-col p-5 sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Projects</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">Featured product builds.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Client and SaaS work presented inside the same connected card journey.</p>
      </div>
      <div className="grid flex-1 gap-4">
        {projects.map((project) => {
          const Icon = project.icon
          return (
            <article key={project.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">Project {project.number}</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{project.title}</h3>
                </div>
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{project.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span key={item} className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[0.68rem] font-medium text-foreground/85">{item}</span>
                ))}
              </div>
              <div className="mt-4 h-16 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#020511]/60 p-3">
                <div className="grid h-full grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((item) => <span key={item} className="rounded-xl bg-gradient-to-br from-primary/18 to-white/[0.04]" />)}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default function ProjectsSection() {
  return (
    <section id="projects" className="relative py-24 sm:py-32">
      <div className="section-shell">
        <motion.div variants={staggerContainer()} initial="hidden" whileInView="visible" viewport={viewport} className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Projects</motion.p>
            <motion.h2 variants={fadeUp} className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              Featured builds with real-world business utility.
            </motion.h2>
          </div>
          <motion.p variants={fadeUp} className="max-w-sm text-sm leading-7 text-muted">
            A focused showcase of client and SaaS work, presented as high-signal product experiences rather than generic thumbnails.
          </motion.p>
        </motion.div>

        <div className="mt-14 space-y-8">
          {projects.map((project, index) => {
            const Icon = project.icon
            return (
              <motion.article
                key={project.title}
                initial={{ opacity: 0, y: 70, scale: 0.97, filter: 'blur(14px)' }}
                whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                data-cursor="card"
                onMouseMove={setCardPointer}
                onMouseLeave={resetCardPointer}
                className="glass-panel group overflow-hidden rounded-[2rem] p-4 sm:p-6"
              >
                <div className={`content-layer grid gap-7 ${index % 2 === 1 ? 'lg:grid-cols-[0.96fr_1.04fr]' : 'lg:grid-cols-[1.04fr_0.96fr]'}`}>
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <ScreenshotPlaceholder project={project} />
                  </div>

                  <div className="flex flex-col justify-between p-2 sm:p-4">
                    <div>
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          Project {project.number}
                        </div>
                        <div className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
                          <Icon className="size-5" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">{project.title}</h3>
                      <p className="mt-4 max-w-xl text-base leading-8 text-muted">{project.description}</p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {project.stack.map((item) => (
                          <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-foreground/85">
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-7 grid gap-3 sm:grid-cols-2">
                        {project.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-3 text-sm text-foreground/90">
                            <CheckCircle2 className="size-4 text-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 flex items-center gap-4">
                      <Button href="#contact" variant="secondary">
                        Discuss similar project
                      </Button>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary opacity-80 transition-opacity group-hover:opacity-100">
                        Case style overview <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
