import { useEffect, useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { ArrowRight, CheckCircle2, Code2, Database, Server, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { fadeUp, premiumEase, staggerContainer } from '../../../lib/animations'
import { CENTERING_END } from '../storyConfig'
import { techStack } from '../data/portfolio'

const roles = ['Full Stack Developer', 'SaaS Builder', 'Laravel & React Specialist', 'Business Solutions Developer']

function RoleRotator() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setIndex((current) => (current + 1) % roles.length), 2200)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="relative mt-7 h-10 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:w-fit">
      <motion.span
        key={roles[index]}
        initial={{ y: 18, opacity: 0, filter: 'blur(8px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: premiumEase }}
        className="flex items-center gap-2"
      >
        <Sparkles className="size-4" /> {roles[index]}
      </motion.span>
    </div>
  )
}

export default function IntroPanel({ progress }) {
  const x = useTransform(progress, [0, 0.1, CENTERING_END], [0, -64, -230])
  const opacity = useTransform(progress, [0, 0.09, CENTERING_END], [1, 0.72, 0])
  const filter = useTransform(progress, [0, CENTERING_END], ['blur(0px)', 'blur(16px)'])
  const mobileOpacity = useTransform(progress, [0, 0.06], [1, 0])
  const mobileY = useTransform(progress, [0, 0.06], [0, -20])

  return (
    <>
      <motion.div
        style={{ x, opacity, filter }}
        variants={staggerContainer()}
        initial="hidden"
        animate="visible"
        className="absolute left-0 top-1/2 z-10 hidden w-[min(620px,calc(100vw-32px))] -translate-y-1/2 pr-6 lg:block"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-[0_0_28px_rgba(0,240,255,0.08)]">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_14px_rgba(0,240,255,0.9)]" />
          Open for Client Work
        </motion.div>

        <motion.h1 variants={fadeUp} className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-6xl xl:text-7xl">
          Custom Websites.
          <br />
          <span className="premium-gradient-text">Scalable SaaS.</span>
          <br />
          Built For Growth.
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
          I help businesses and startups build modern websites, custom dashboards and scalable SaaS applications.
        </motion.p>

        <motion.div variants={fadeUp}><RoleRotator /></motion.div>

        <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="#projects" showArrow>View Projects</Button>
          <Button href="#contact" variant="secondary" showArrow>Hire Me</Button>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-8 flex max-w-xl flex-wrap gap-2.5">
          {techStack.map((item, index) => {
            const icons = [Code2, Server, Database, Sparkles, CheckCircle2, ArrowRight]
            const Icon = icons[index]
            return (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-foreground/85 backdrop-blur-xl">
                <Icon className="size-3.5 text-primary/85" /> {item}
              </span>
            )
          })}
        </motion.div>
      </motion.div>

      <motion.div style={{ opacity: mobileOpacity, y: mobileY }} className="absolute inset-x-4 top-24 z-10 lg:hidden">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> Open for Client Work
        </div>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-foreground">
          Custom Websites. <span className="premium-gradient-text">Scalable SaaS.</span>
        </h1>
      </motion.div>
    </>
  )
}
