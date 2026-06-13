import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Mail, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { fadeUp, staggerContainer } from '../lib/animations'

const crackPaths = [
  { d: 'M260 0 L236 88 L258 158 L216 236 L242 320', range: [0.18, 0.46] },
  { d: 'M238 88 L188 126 L156 182', range: [0.28, 0.56] },
  { d: 'M258 158 L320 190 L358 258 L424 318', range: [0.36, 0.72] },
  { d: 'M216 236 L158 268 L112 342 L54 394', range: [0.48, 0.82] },
  { d: 'M320 190 L388 152 L456 162', range: [0.58, 0.92] },
  { d: 'M242 320 L304 372 L334 448 L398 512', range: [0.66, 1] },
]

const fragments = [
  { x: -95, y: -70, r: -18, clip: 'polygon(0 0, 52% 0, 35% 45%, 0 62%)' },
  { x: 74, y: -90, r: 16, clip: 'polygon(52% 0, 100% 0, 100% 50%, 35% 45%)' },
  { x: -120, y: 24, r: -25, clip: 'polygon(0 62%, 35% 45%, 48% 100%, 0 100%)' },
  { x: 112, y: 40, r: 22, clip: 'polygon(35% 45%, 100% 50%, 100% 100%, 48% 100%)' },
  { x: 0, y: -116, r: 8, clip: 'polygon(35% 45%, 52% 0, 100% 50%, 48% 100%)' },
]

function CrackPath({ path, index, progress }) {
  const pathLength = useTransform(progress, path.range, [0, 1])
  const opacity = useTransform(progress, [path.range[0], path.range[0] + 0.08, 1], [0, 0.75, 1])

  return (
    <motion.path
      d={path.d}
      style={{ pathLength, opacity }}
      stroke={index % 2 ? 'rgba(0,240,255,0.78)' : 'rgba(248,250,252,0.72)'}
      strokeWidth={index > 3 ? 1.1 : 1.55}
      strokeLinecap="round"
      filter="url(#crack-glow)"
    />
  )
}

function CrackSvg({ progress }) {
  return (
    <svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 512 560" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="crack-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {crackPaths.map((path, index) => (
        <CrackPath key={path.d} path={path} index={index} progress={progress} />
      ))}
    </svg>
  )
}

function GlassFragment({ fragment, index, progress }) {
  const x = useTransform(progress, [0.74, 1], [0, fragment.x])
  const y = useTransform(progress, [0.74, 1], [0, fragment.y])
  const rotate = useTransform(progress, [0.74, 1], [0, fragment.r])
  const opacity = useTransform(progress, [0.72, 0.86, 1], [0, 0.88, 0])

  return (
    <motion.div
      className="glass-panel absolute inset-0 overflow-hidden rounded-[2rem]"
      style={{ x, y, rotate, opacity, clipPath: fragment.clip }}
    >
      <div className="content-layer p-8">
        <div className="h-4 w-36 rounded-full bg-primary/30" />
        <div className="mt-8 h-12 w-4/5 rounded-2xl bg-white/10" />
        <div className="mt-4 h-24 rounded-3xl bg-white/[0.06]" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => <span key={`${index}-${item}`} className="h-20 rounded-2xl bg-white/[0.055]" />)}
        </div>
      </div>
    </motion.div>
  )
}

function ShatterCard({ progress }) {
  const cardOpacity = useTransform(progress, [0, 0.7, 0.88, 1], [1, 1, 0.34, 0])
  const cardScale = useTransform(progress, [0, 0.78, 1], [1, 1.025, 0.96])
  const crackOpacity = useTransform(progress, [0.08, 0.34, 0.86, 1], [0, 0.38, 1, 0.25])
  const glowOpacity = useTransform(progress, [0.68, 0.92, 1], [0, 0.72, 1])

  return (
    <div className="relative min-h-[530px]">
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-[80px]"
        style={{ opacity: glowOpacity }}
      />

      {fragments.map((fragment, index) => (
        <GlassFragment key={fragment.clip} fragment={fragment} index={index} progress={progress} />
      ))}

      <motion.div style={{ opacity: cardOpacity, scale: cardScale }} className="glass-panel absolute inset-0 overflow-hidden rounded-[2rem]">
        <motion.div className="absolute inset-0" style={{ opacity: crackOpacity }}>
          <CrackSvg progress={progress} />
        </motion.div>
        <div className="absolute -left-16 -top-16 size-56 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-20 right-8 size-64 rounded-full bg-primary/14 blur-3xl" />
        <div className="content-layer flex h-full flex-col justify-between p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="size-3.5" /> Final Step
            </div>
            <h3 className="mt-6 max-w-md text-4xl font-semibold tracking-[-0.045em] text-foreground">Break through the ordinary website experience.</h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">
              The glass gives way to the most important part: a direct conversation about your project.
            </p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Availability</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-xs font-semibold text-emerald-200">Open</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.span className="block h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ scaleX: progress, transformOrigin: 'left' }} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function ContactCardContent() {
  return (
    <div className="content-layer flex h-full flex-col p-5 sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Contact</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">Let&apos;s build something great together.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Need a website, SaaS platform, dashboard or custom web application? Start the conversation here.</p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const name = form.get('name') || 'there'
          window.location.href = `mailto:ukasha@example.com?subject=Project inquiry from ${encodeURIComponent(name)}&body=${encodeURIComponent(form.get('details') || '')}`
        }}
        className="mt-6 grid flex-1 gap-3"
      >
        <input name="name" required placeholder="Name" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35" />
        <input type="email" name="email" required placeholder="Email" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35" />
        <textarea name="details" required rows="4" placeholder="Project details" className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35" />
        <Button type="submit" className="mt-1 w-full" showArrow>Send Message</Button>
      </form>
    </div>
  )
}

export default function ContactSection() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 82%', 'end 42%'] })
  const formOpacity = useTransform(scrollYProgress, [0.58, 0.86], [0, 1])
  const formY = useTransform(scrollYProgress, [0.58, 0.86], [40, 0])
  const formScale = useTransform(scrollYProgress, [0.58, 0.86], [0.97, 1])

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name') || 'there'
    window.location.href = `mailto:ukasha@example.com?subject=Project inquiry from ${encodeURIComponent(name)}&body=${encodeURIComponent(form.get('details') || '')}`
  }

  return (
    <section id="final-contact" ref={ref} className="relative py-24 sm:py-32">
      <div className="section-shell grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <ShatterCard progress={scrollYProgress} />

        <motion.div style={{ opacity: formOpacity, y: formY, scale: formScale }}>
          <motion.div variants={staggerContainer()} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }} className="mb-8">
            <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Contact</motion.p>
            <motion.h2 variants={fadeUp} className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Let&apos;s Build Something Great Together
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-8 text-muted">
              Need a website, SaaS platform, dashboard or custom web application? Let&apos;s discuss your project.
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="glass-panel overflow-hidden rounded-[2rem] p-5 sm:p-7">
            <div className="content-layer grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-foreground/90">
                Name
                <input
                  name="name"
                  required
                  placeholder="Your name"
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary/35 focus:shadow-[0_0_0_4px_rgba(0,240,255,0.08)]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-foreground/90">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@company.com"
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary/35 focus:shadow-[0_0_0_4px_rgba(0,240,255,0.08)]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-foreground/90">
                Project Details
                <textarea
                  name="details"
                  required
                  rows="5"
                  placeholder="Tell me what you want to build..."
                  className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary/35 focus:shadow-[0_0_0_4px_rgba(0,240,255,0.08)]"
                />
              </label>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" className="w-full sm:w-auto" showArrow>
                  Send Message
                </Button>
                <a data-cursor="button" href="mailto:ukasha@example.com" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted transition hover:text-primary">
                  <Mail className="size-4" /> Direct email
                </a>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  )
}
