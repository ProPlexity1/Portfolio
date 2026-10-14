import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUp, Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SocialIcon } from '../art'
import { CONTACT_EMAIL, CTA, SOCIALS, steps } from '../content'
import { flyToStop } from '../scroller'
import { EASE } from '../engine'
import { BlurIn, Rise } from '../ui'

export function Basecamp() {
  return (
    <section id="basecamp" className="section flex min-h-[110svh] items-end pb-[14svh]">
      <div className="shell lg:flex">
        <Rise as="p" className="max-w-[22ch] font-display text-xl leading-snug text-snow sm:text-2xl lg:ml-auto lg:text-right [text-shadow:0_2px_24px_rgb(7_19_24/0.75)]">
          Off the screen, this is usually where you will find me.
        </Rise>
      </div>
    </section>
  )
}

const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name', error: 'Tell me who I am talking to.' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', error: 'I need a valid email to reply.' },
  { name: 'details', label: 'Project details', textarea: true, error: 'A sentence or two about the project helps.' },
]

const MAX = { name: 100, email: 254, details: 5000 }

function ContactForm() {
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | sending | sent | failed | limited
  const shownAt = useRef(0)
  useEffect(() => {
    shownAt.current = Date.now()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (state === 'sending') return
    const form = e.currentTarget
    const next = {}
    FIELDS.forEach((f) => {
      const el = form.elements[f.name]
      if (!el.value.trim() || !el.checkValidity()) next[f.name] = f.error
    })
    if (!next.details && form.elements.details.value.trim().length < 10) next.details = FIELDS[2].error
    setErrors(next)
    if (Object.keys(next).length) {
      form.elements[Object.keys(next)[0]].focus()
      return
    }
    const data = new FormData(form)
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          details: data.get('details'),
          company: data.get('company'), // hidden trap field, empty for people
          elapsed: Date.now() - shownAt.current,
        }),
      })
      if (res.ok) {
        setState('sent')
        form.reset()
        return
      }
      if (res.status === 422) {
        const { fields = {} } = await res.json().catch(() => ({}))
        setErrors(fields)
        setState('idle')
        return
      }
      setState(res.status === 429 ? 'limited' : 'failed')
    } catch {
      setState('failed')
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      {/* off-screen trap: people never see or fill this, bots usually do */}
      <div className="trap" aria-hidden="true">
        <label htmlFor="f-company">Company</label>
        <input id="f-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {FIELDS.map((f) => {
        const Field = f.textarea ? 'textarea' : 'input'
        const err = errors[f.name]
        return (
          <div key={f.name} className="grid gap-2">
            <label htmlFor={`f-${f.name}`} className="text-sm text-snow/85">
              {f.label}
            </label>
            <Field
              id={`f-${f.name}`}
              name={f.name}
              type={f.type}
              rows={f.textarea ? 4 : undefined}
              maxLength={MAX[f.name]}
              autoComplete={f.autoComplete}
              required
              aria-invalid={!!err}
              aria-describedby={err ? `e-${f.name}` : undefined}
              onInput={() => err && setErrors((x) => ({ ...x, [f.name]: undefined }))}
              className="field"
            />
            <AnimatePresence>
              {err && (
                <motion.p id={`e-${f.name}`} className="text-sm text-[#ffb4a8]" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {err}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )
      })}
      <button type="submit" disabled={state === 'sending'} className="btn btn-primary mt-1 w-full justify-center disabled:opacity-70 sm:w-auto sm:justify-self-start">
        {state === 'sending' ? 'Sending' : CTA.contact}
        {state === 'sending' ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : <ArrowRight className="size-4" strokeWidth={2} />}
      </button>
      <AnimatePresence mode="wait">
        {state === 'sent' && (
          <motion.p key="sent" role="status" className="flex items-center gap-2 text-sm text-glacier" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check className="size-4" strokeWidth={2} />
            Got it. I will reply to your email soon.
          </motion.p>
        )}
        {(state === 'failed' || state === 'limited') && (
          <motion.p key="err" role="alert" className="text-sm text-[#ffb4a8]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state === 'limited' ? 'That is a few messages in a short time. ' : 'That did not go through. '}
            Email me directly at{' '}
            <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

export function Contact() {
  return (
    <section id="contact" className="section relative pb-10 pt-[12svh]">
      <div className="shell">
        <motion.div
          className="panel panel-solid grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:p-14"
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <div>
            <p className="available">
              <span className="available-dot" />
              Available for freelance projects
            </p>
            <BlurIn className="h2 mt-5">Let's build something that holds up</BlurIn>
            <p className="mt-4 max-w-[42ch] text-snow/75">Need a website, SaaS platform or dashboard? Tell me what you are planning and we will take it from there.</p>
            <ol className="mt-8 grid gap-5">
              {steps.map((s, i) => (
                <Rise as="li" key={s.title} delay={0.1 + i * 0.1} className="flex gap-4">
                  <span className="step-mark" aria-hidden="true">
                    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d={['M3 16 10 4l7 12Z', 'M3 16 8 8l3 4 2-3 4 7Z', 'M10 3v14M10 3l6 2.5L10 8'][i]} strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-display text-lg">{s.title}</h3>
                    <p className="text-sm text-snow/65">{s.description}</p>
                  </div>
                </Rise>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              {SOCIALS.map((s) => (
                <a key={s.id} href={s.href} target="_blank" rel="noreferrer" className="social" aria-label={s.label}>
                  <SocialIcon id={s.id} />
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          </div>
          <ContactForm />
        </motion.div>

        <footer className="mt-10 flex flex-col-reverse items-start justify-between gap-6 border-t border-snow/10 pt-8 text-sm text-snow/60 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Ukasha Bin Khalil</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {SOCIALS.map((s) => (
              <a key={s.id} href={s.href} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-2">
                <SocialIcon id={s.id} className="size-4" />
                {s.label}
              </a>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="link">
              {CONTACT_EMAIL}
            </a>
            <button type="button" className="link inline-flex items-center gap-1.5" onClick={() => flyToStop(0)}>
              Back to the summit
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}
