import { motion, useReducedMotionConfig } from 'framer-motion'
import { siJsonwebtokens, siLaravel, siPostgresql, siReact, siTailwindcss } from 'simple-icons'
import { BlurIn, Rise } from '../ui'

// Gear tags clipped to a rope, like a packing list. `drop` is the string length.
const KIT = [
  { icon: siReact, name: 'React', role: 'Interfaces', drop: 18 },
  { icon: siLaravel, name: 'Laravel', role: 'APIs and back ends', drop: 54 },
  { icon: siPostgresql, name: 'PostgreSQL', role: 'Data that holds up', drop: 30 },
  { icon: siTailwindcss, name: 'Tailwind CSS', role: 'Styling at speed', drop: 62 },
  { icon: siJsonwebtokens, name: 'JWT', role: 'Secure sign-in', drop: 24 },
]

function Tag({ item, i }) {
  const reduce = useReducedMotionConfig()
  return (
    <motion.li
      className="tag-wrap"
      // the rope sags, so each tag hangs from a slightly different height
      style={{ '--drop': `${item.drop}px`, '--rope': `${(6 + 80 * ((i + 0.5) / KIT.length) * (1 - (i + 0.5) / KIT.length)).toFixed(1)}px` }}
      initial={reduce ? false : { rotate: i % 2 ? 16 : -16, opacity: 0, y: -24 }}
      whileInView={{ rotate: 0, opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ type: 'spring', stiffness: 90, damping: 7, mass: 0.9, delay: 0.15 + i * 0.12 }}
      whileHover={reduce ? undefined : { rotate: [0, -6, 4, -2, 0], transition: { duration: 1.1 } }}
    >
      <span className="tag-string" aria-hidden="true" />
      <div className="tag">
        <span className="tag-hole" aria-hidden="true" />
        <svg viewBox="0 0 24 24" className="size-9" fill="currentColor" aria-hidden="true">
          <path d={item.icon.path} />
        </svg>
        <p className="mt-4 font-display text-xl leading-tight">{item.name}</p>
        <p className="mt-1 text-sm text-snow/65">{item.role}</p>
      </div>
    </motion.li>
  )
}

export default function Stack() {
  return (
    <section id="stack" className="section flex min-h-[140svh] flex-col justify-center py-[18svh]">
      <div className="shell">
        <div className="max-w-[34rem] lg:ml-auto lg:mr-[4%]">
          <BlurIn className="h2">The kit I carry</BlurIn>
          <Rise as="p" delay={0.15} className="mt-4 max-w-[40ch] text-snow/75">
            A small, proven stack I know end to end, from database to interface. Everything else is picked for the job.
          </Rise>
        </div>
        <div className="kit mt-14 lg:ml-[22%]">
          <svg className="rope" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 6 Q500 46 1000 6" />
          </svg>
          <ul className="kit-row" aria-label="Tools I use">
            {KIT.map((item, i) => (
              <Tag key={item.name} item={item} i={i} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
