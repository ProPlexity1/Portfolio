import { motion, useTransform } from 'framer-motion'
import { cardPages } from '../pages'

export default function ScrollIndicator({ progress, velocity, activeIndex, onJump }) {
  const scaleY = useTransform(progress, [0, 1], [0.02, 1])
  const glow = useTransform(velocity, [0, 1], ['0 0 24px rgba(0,240,255,0.45)', '0 0 46px rgba(0,240,255,0.9)'])
  const railScale = useTransform(velocity, [0, 1], [1, 1.08])

  return (
    <div className="fixed right-3 top-1/2 z-[60] hidden -translate-y-1/2 sm:block lg:right-4">
      <motion.div className="glass-panel relative h-64 w-3.5 overflow-visible rounded-full p-1 lg:h-80 lg:w-4" style={{ scale: railScale }}>
        <motion.span
          className="absolute inset-x-1 top-1 origin-top rounded-full bg-gradient-to-b from-primary via-primary/70 to-secondary"
          style={{ scaleY, boxShadow: glow }}
        />
        <div className="content-layer absolute inset-y-4 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-3">
          {cardPages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              data-cursor="button"
              onClick={() => onJump(index)}
              className={`size-2.5 rounded-full border transition-all duration-300 active:scale-125 ${index === activeIndex ? 'scale-150 border-primary bg-primary shadow-[0_0_18px_rgba(0,240,255,0.8)]' : 'border-white/25 bg-white/20 hover:border-primary/70'}`}
              aria-label={`Jump to ${page.label}`}
            />
          ))}
        </div>
        <div className="absolute -left-20 top-1/2 hidden -translate-y-1/2 -rotate-90 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-primary/70 lg:block">
          Scroll
        </div>
      </motion.div>
    </div>
  )
}
