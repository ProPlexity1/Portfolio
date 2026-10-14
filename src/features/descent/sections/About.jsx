import { motion, useInView, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { facts } from '../content'
import { Rise } from '../ui'

const STATEMENT =
  "I'm Ukasha. I plan the route before I write the first line, build with React and Laravel, and stay with a project until it holds up under real use."
const LIT = new Set(['route', 'React', 'Laravel', 'real', 'use.'])

function Word({ word, i, n, progress }) {
  const opacity = useTransform(progress, [i / n, (i + 1.5) / n], [0.16, 1])
  return (
    <motion.span style={{ opacity }} className={LIT.has(word) ? 'text-glacier' : undefined}>
      {word}{' '}
    </motion.span>
  )
}

// Typewriter for the fact values, starts when the block is on screen.
function Typed({ text, start, delay }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!start) return
    let i = 0
    let iv
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i++
        setShown(i)
        if (i >= text.length) clearInterval(iv)
      }, 32)
    }, delay)
    return () => {
      clearTimeout(t)
      clearInterval(iv)
    }
  }, [start, text, delay])
  return (
    <span aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      {start && shown < text.length && <span className="caret" aria-hidden="true" />}
    </span>
  )
}

export default function About() {
  const ref = useRef(null)
  const factsRef = useRef(null)
  const reduce = useReducedMotionConfig()
  const factsIn = useInView(factsRef, { once: true, amount: 0.6 })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'center 0.45'] })
  const words = STATEMENT.split(' ')

  return (
    <section id="about" className="section flex min-h-[150svh] flex-col justify-center py-[24svh]">
      <div className="shell">
        <div ref={ref} className="max-w-[44rem] py-6">
          <p className="statement" aria-label={STATEMENT}>
            <span aria-hidden="true">
              {reduce ? STATEMENT : words.map((w, i) => <Word key={i} word={w} i={i} n={words.length} progress={scrollYProgress} />)}
            </span>
          </p>
          <Rise as="dl" className="facts mt-10" ref={factsRef}>
            {facts.map(([k, v], i) => (
              <div key={k} className="contents">
                <dt>
                  <span className="text-glacier">$</span> {k}
                </dt>
                <dd>{reduce ? v : <Typed text={v} start={factsIn} delay={i * 420} />}</dd>
              </div>
            ))}
          </Rise>
        </div>
      </div>
    </section>
  )
}
