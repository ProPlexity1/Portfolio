import { motion, useTransform } from 'framer-motion'
import { cardPages } from '../pages'

export default function ScrollIndicator({ progress, activeIndex, onJump }) {
  const scaleY = useTransform(progress, [0, 1], [0.02, 1])

  return (
    <div className="fixed right-4 top-1/2 z-[60] hidden -translate-y-1/2 lg:block">
      <div className="glass-panel relative h-80 w-4 overflow-visible rounded-full p-1">
        <motion.span className="absolute inset-x-1 top-1 origin-top rounded-full bg-gradient-to-b from-primary via-primary/70 to-secondary shadow-[0_0_24px_rgba(0,240,255,0.45)]" style={{ scaleY }} />
        <div className="content-layer absolute inset-y-4 left-1/2 flex -translate-x-1/2 flex-col justify-between">
          {cardPages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              data-cursor="button"
              onClick={() => onJump(index)}
              className={`size-2.5 rounded-full border transition-all duration-300 ${index === activeIndex ? 'scale-150 border-primary bg-primary shadow-[0_0_18px_rgba(0,240,255,0.8)]' : 'border-white/25 bg-white/20 hover:border-primary/70'}`}
              aria-label={`Jump to ${page.label}`}
            />
          ))}
        </div>
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-primary/70">
          Scroll
        </div>
      </div>
    </div>
  )
}
