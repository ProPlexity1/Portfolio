import { motion } from 'framer-motion'

const links = [
  { label: 'Projects', href: '#projects' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Footer() {
  return (
    <footer className="relative pb-10 pt-8">
      <div className="section-shell">
        <div className="soft-divider mb-8" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel overflow-hidden rounded-[1.6rem] px-5 py-5"
        >
          <div className="content-layer flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-foreground">Ukasha Bin Khalil</p>
              <p className="mt-1 text-sm text-muted">Full Stack Developer</p>
            </div>

            <nav className="flex flex-wrap gap-2 md:justify-center">
              {links.map((link) => (
                <a key={link.href} data-cursor="button" href={link.href} className="rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/[0.05] hover:text-foreground">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-sm font-semibold text-emerald-200 md:justify-end">
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.9)]" />
              Available For Freelance Projects
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
