import { motion, useReducedMotionConfig } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { CheckTick, ScholarsArt, StorixArt } from '../art'
import { inProgress, projects } from '../content'
import { EASE } from '../engine'
import { BlurIn, Rise } from '../ui'

const ART = { storix: StorixArt, scholars: ScholarsArt }

// Border lights up under the pointer. Writes CSS vars only, no React state.
const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--px', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--py', `${e.clientY - r.top}px`)
}

export default function Work() {
  const reduce = useReducedMotionConfig()
  return (
    <section id="work" className="section flex min-h-[170svh] flex-col justify-center py-[20svh]">
      <div className="shell">
        <BlurIn className="h2">Selected work</BlurIn>
        <div className="mt-10 grid gap-6 lg:gap-8">
          {projects.map((p, i) => {
            const Art = ART[p.id]
            return (
              <motion.article
                key={p.id}
                onPointerMove={spotlight}
                className={`panel project ${i === 1 ? 'lg:ml-[18%]' : 'lg:mr-[18%]'}`}
                initial={reduce ? false : { opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1, ease: EASE }}
              >
                <div className="project-art">
                  <Art className="w-full max-w-[9.5rem] text-snow/85 md:max-w-[18rem]" />
                </div>
                <div className="flex flex-col p-5 sm:p-8">
                  <p className="font-mono text-xs text-mist">{p.kind}</p>
                  <h3 className="mt-2 font-display text-3xl sm:text-4xl">{p.title}</h3>
                  <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-snow/75 sm:text-base">{p.description}</p>
                  <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:mt-6">
                    {p.features.map((f, fi) => (
                      <li key={f} className="flex items-center gap-2 text-[0.8rem] text-snow/85 sm:gap-2.5 sm:text-sm">
                        <CheckTick delay={0.4 + fi * 0.15} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-1">
                    <ul className="flex flex-wrap gap-2" aria-label="Built with">
                      {p.stack.map((t) => (
                        <li key={t} className="chip">
                          {t}
                        </li>
                      ))}
                    </ul>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="visit">
                        Visit site
                        <ArrowUpRight className="size-4" strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>

        <Rise as="h3" className="mt-16 font-display text-2xl sm:text-3xl">
          Still on the climb
        </Rise>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {inProgress.map((p, i) => (
            <motion.article
              key={p.id}
              className="wip"
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
            >
              {/* the route is still being cut: a dashed outline that keeps moving */}
              <svg className="wip-outline" aria-hidden="true">
                <rect x="1" y="1" rx="19" ry="19" />
              </svg>
              <p className="building">
                <span className="building-dot" />
                In the build
              </p>
              <h4 className="mt-4 font-display text-2xl sm:text-3xl">{p.title}</h4>
              <p className="mt-1 font-mono text-xs text-mist">{p.kind}</p>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-snow/75">{p.description}</p>
              <svg className="wip-route" viewBox="0 0 220 60" aria-hidden="true">
                <path className="ahead" d="M4 52 C40 50 46 30 78 32 S120 46 142 26 178 8 214 10" pathLength="1" />
                <path className="done" d="M4 52 C40 50 46 30 78 32 S120 46 142 26 178 8 214 10" pathLength="1" />
                <circle cx="142" cy="26" r="4" />
              </svg>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
