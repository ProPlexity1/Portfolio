import { motion, useReducedMotionConfig } from 'framer-motion'
import { EASE } from './engine'

const VIEW = { once: true, amount: 0.35 }

// Rise: fade in while moving up.
export function Rise({ as = 'div', delay = 0, y = 28, className, children, ...rest }) {
  const reduce = useReducedMotionConfig()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// Kinetic type: letters stretch up from squashed, one after another.
// `play` lets the hero start on cue instead of on view.
export function Kinetic({ text, as = 'span', className, delay = 0, stagger = 0.035, play }) {
  const reduce = useReducedMotionConfig()
  const Tag = motion[as]
  const words = text.split(' ')
  let n = 0
  const variants = {
    hidden: { opacity: 0, y: '0.35em', scaleY: 0.2 },
    shown: (i) => ({ opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.75, delay: delay + i * stagger, ease: [0.22, 1.2, 0.36, 1] } }),
  }
  const trigger = play === undefined ? { whileInView: 'shown', viewport: VIEW } : { animate: play ? 'shown' : 'hidden' }
  return (
    <Tag className={className} aria-label={text} initial={reduce ? 'shown' : 'hidden'} {...trigger}>
      {words.map((w, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden="true">
          {[...w].map((ch, ci) => (
            <motion.span key={ci} custom={n++} variants={variants} className="inline-block origin-bottom will-change-transform">
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  )
}

// Blur-in for section headings.
export function BlurIn({ as = 'h2', className, children, delay = 0 }) {
  const reduce = useReducedMotionConfig()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, filter: 'blur(14px)', y: 16 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={VIEW}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}
