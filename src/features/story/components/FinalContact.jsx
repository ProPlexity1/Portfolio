import { motion, useTransform } from 'framer-motion'
import { Button } from '../../../components/ui/Button'
import { FINAL_REVEAL } from '../storyConfig'

export default function FinalContact({ progress, finalOpen }) {
  const opacity = useTransform(progress, [0.915, FINAL_REVEAL], [0, 1])
  const y = useTransform(progress, [0.915, FINAL_REVEAL], [34, 0])
  const scale = useTransform(progress, [0.915, FINAL_REVEAL], [0.96, 1])

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name') || 'there'
    window.location.href = `mailto:ukasha@example.com?subject=Project inquiry from ${encodeURIComponent(name)}&body=${encodeURIComponent(form.get('details') || '')}`
  }

  return (
    <motion.div
      id="final-contact-panel"
      style={{ opacity, y, scale }}
      className={`absolute left-1/2 top-[46%] z-40 w-[min(920px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 sm:top-1/2 ${finalOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="glass-panel max-h-[calc(100dvh-132px)] overflow-auto rounded-[2rem] p-4 sm:p-7 lg:p-8">
        <div className="content-layer grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Project Inquiry</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:mt-4 sm:text-5xl">Let&apos;s Build Something Great Together</h2>
            <p className="mt-3 text-sm leading-7 text-muted sm:mt-5 sm:text-base sm:leading-8">Need a website, SaaS platform, dashboard or custom web application? Let&apos;s discuss your project.</p>
            <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-xs font-semibold text-emerald-200 sm:mt-7 sm:p-4 sm:text-sm">
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
              Available For Freelance Projects
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-2.5 sm:gap-3">
            <input name="name" required placeholder="Name" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <input type="email" name="email" required placeholder="Email" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <textarea name="details" required rows="4" placeholder="Project Details" className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/35 sm:py-3.5" />
            <Button type="submit" className="mt-1 w-full" showArrow>Send Message</Button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
