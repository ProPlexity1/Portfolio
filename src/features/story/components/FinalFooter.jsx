import { motion, useTransform } from 'framer-motion'

export default function FinalFooter({ progress }) {
  const opacity = useTransform(progress, [0.935, 0.975], [0, 1])
  const y = useTransform(progress, [0.935, 0.975], [44, 0])

  return (
    <motion.footer style={{ opacity, y }} className="pointer-events-none absolute inset-x-4 bottom-3 z-50 sm:bottom-5">
      <div className="glass-panel mx-auto max-w-5xl overflow-hidden rounded-full px-4 py-3 sm:px-5">
        <div className="content-layer flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Ukasha Bin Khalil</p>
            <p className="hidden text-muted sm:block">Full Stack Developer</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 font-semibold text-emerald-200">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
            <span className="hidden sm:inline">Available For Freelance Projects</span>
            <span className="sm:hidden">Available</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
