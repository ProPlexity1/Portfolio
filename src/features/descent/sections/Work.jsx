import { motion, useReducedMotionConfig } from 'framer-motion'
import { CheckTick, ScholarsArt, StorixArt } from '../art'
import { projects } from '../content'
import { EASE } from '../engine'
import { BlurIn } from '../ui'

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
                  <ul className="mt-6 flex flex-wrap gap-2 pt-1" aria-label="Built with">
                    {p.stack.map((t) => (
                      <li key={t} className="chip">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
