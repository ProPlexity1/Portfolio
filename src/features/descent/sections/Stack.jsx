import { siJsonwebtokens, siLaravel, siPostgresql, siReact, siTailwindcss } from 'simple-icons'
import { BlurIn, Rise } from '../ui'

const TOOLS = [
  [siReact, 'React'],
  [siLaravel, 'Laravel'],
  [siPostgresql, 'PostgreSQL'],
  [siTailwindcss, 'Tailwind CSS'],
  [siJsonwebtokens, 'JWT'],
]

function Logo({ icon, label, copy }) {
  return (
    <li className="logo" aria-hidden={copy || undefined}>
      <svg viewBox="0 0 24 24" className="size-8 sm:size-10" fill="currentColor" aria-hidden="true">
        <path d={icon.path} />
      </svg>
      <span>{label}</span>
    </li>
  )
}

export default function Stack() {
  // two copies so the strip can loop without a seam
  const row = [...TOOLS, ...TOOLS]
  return (
    <section id="stack" className="section flex min-h-[130svh] flex-col justify-center py-[20svh]">
      <div className="shell">
        <div className="max-w-[34rem] lg:ml-auto lg:mr-[6%]">
          <BlurIn className="h2">The kit I carry</BlurIn>
          <Rise as="p" delay={0.15} className="mt-4 max-w-[40ch] text-snow/75">
            A small, proven stack I know end to end, from database to interface.
          </Rise>
        </div>
      </div>
      <Rise className="marquee mt-12" delay={0.2}>
        <ul className="marquee-track">
          {row.map(([icon, label], i) => (
            <Logo key={i} icon={icon} label={label} copy={i >= TOOLS.length} />
          ))}
          {row.map(([icon, label], i) => (
            <Logo key={`b${i}`} icon={icon} label={label} copy />
          ))}
        </ul>
      </Rise>
    </section>
  )
}
