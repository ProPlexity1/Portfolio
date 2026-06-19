import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'

const links = [
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4 sm:px-4"
      >
        <nav className="glass-panel w-[min(980px,calc(100vw-20px))] rounded-full px-2.5 py-2 sm:w-[min(980px,calc(100vw-28px))] sm:px-3">
          <div className="content-layer flex items-center justify-between gap-2 sm:gap-3">
            <a href="#top" onClick={close} data-cursor="button" className="group flex items-center gap-2 rounded-full px-1.5 py-1 sm:px-3 sm:py-2">
              <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-sm font-black tracking-tight text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors group-hover:border-primary/30 group-hover:text-primary">
                UBK
              </span>
              <span className="hidden text-sm font-semibold text-foreground sm:inline">Ukasha</span>
            </a>

            <div className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-black/10 p-1 md:flex">
              {links.map((link) => (
                <a key={link.href} href={link.href} data-cursor="button" className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button href="#contact" className="hidden px-4 py-2.5 text-sm sm:inline-flex" showArrow>
                Hire Me
              </Button>
              <button
                type="button"
                data-cursor="button"
                onClick={() => setOpen((value) => !value)}
                className="inline-grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-foreground transition active:scale-95 md:hidden"
                aria-label="Toggle menu"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-2xl md:hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel mx-4 mt-24 overflow-hidden rounded-[2rem] p-5"
            >
              <div className="content-layer space-y-3">
                {links.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-lg font-semibold text-foreground active:scale-[0.98]"
                  >
                    {link.label}
                    <span className="size-2 rounded-full bg-primary shadow-[0_0_16px_rgba(0,240,255,0.8)]" />
                  </motion.a>
                ))}
                <Button href="#contact" onClick={close} className="mt-3 w-full" showArrow>
                  Hire Me
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
