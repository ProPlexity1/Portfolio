import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUp, Check } from 'lucide-react'
import { useState } from 'react'
import { CONTACT_EMAIL, CTA, steps } from '../content'
import { flyToStop } from '../scroller'
import { EASE } from '../engine'
import { BlurIn, Rise } from '../ui'

export function Basecamp() {
  return (
    <section id="basecamp" className="section flex min-h-[110svh] items-end pb-[14svh]">
      <div className="shell">
        <Rise as="p" className="max-w-[26ch] font-display text-xl leading-snug text-snow sm:text-2xl lg:ml-[52%]">
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

function ContactForm() {
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const next = {}
    FIELDS.forEach((f) => {
      const el = form.elements[f.name]
      if (!el.value.trim() || !el.checkValidity()) next[f.name] = f.error
    })
    setErrors(next)
    if (Object.keys(next).length) {
      form.elements[Object.keys(next)[0]].focus()
      return
    }
    const data = new FormData(form)
    const subject = `Project enquiry from ${data.get('name')}`
    const body = `${data.get('details')}\n\n${data.get('name')}\n${data.get('email')}`
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
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
      <button type="submit" className="btn btn-primary mt-1 w-full justify-center sm:w-auto sm:justify-self-start">
        {CTA.contact}
        <ArrowRight className="size-4" strokeWidth={2} />
      </button>
      <AnimatePresence>
        {sent && (
          <motion.p role="status" className="flex items-center gap-2 text-sm text-glacier" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Check className="size-4" strokeWidth={2} />
            Your email app should open with the message ready to send.
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
          </div>
          <ContactForm />
        </motion.div>

        <footer className="mt-10 flex flex-col-reverse items-start justify-between gap-6 border-t border-snow/10 pt-8 text-sm text-snow/60 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Ukasha Bin Khalil</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
