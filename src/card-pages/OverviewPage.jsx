import { Code2 } from 'lucide-react'
import { terminalLines } from '../data/portfolio'
import { premiumEase } from '../lib/animations'
import { motion } from 'framer-motion'

function DashboardStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

export default function OverviewPage() {
  return (
    <div className="content-layer flex h-full flex-col justify-between p-4 sm:p-8">
      <div>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ukasha Bin Khalil</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Full Stack Developer</h2>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.08] p-3 text-primary shadow-[0_0_26px_rgba(0,240,255,0.12)]">
            <Code2 className="size-6" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
          <DashboardStat label="Projects" value="2+" />
          <DashboardStat label="Stack" value="React + Laravel" />
          <DashboardStat label="Status" value="Available" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#020511]/70 p-3 font-mono text-[0.68rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:mt-5 sm:p-4 sm:text-sm">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-300/80" />
          <span className="size-2.5 rounded-full bg-emerald-300/80" />
        </div>
        <div className="space-y-3">
          {terminalLines.map(([command, response], index) => (
            <motion.div
              key={command}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.12, duration: 0.4, ease: premiumEase }}
            >
              <p className="text-primary/90">{command}</p>
              <p className={index === terminalLines.length - 1 ? 'terminal-caret mt-1 text-foreground/90' : 'mt-1 text-foreground/90'}>{response}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
