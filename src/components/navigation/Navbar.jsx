import { motion } from 'framer-motion'
import { Button } from '../ui/Button'

const links = [
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <nav className="glass-panel w-[min(980px,calc(100vw-28px))] rounded-full px-3 py-2">
        <div className="content-layer flex items-center justify-between gap-3">
          <a href="#top" data-cursor="button" className="group flex items-center gap-2 rounded-full px-2 py-1.5 sm:px-3 sm:py-2">
            <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-sm font-black tracking-tight text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors group-hover:border-primary/30 group-hover:text-primary">
              UBK
            </span>
            <span className="hidden text-sm font-semibold text-foreground sm:inline">Ukasha</span>
          </a>

          <div className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-black/10 p-1 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-cursor="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <Button href="#contact" className="px-4 py-2.5 text-sm" showArrow>
            Hire Me
          </Button>
        </div>
      </nav>
    </motion.header>
  )
}
