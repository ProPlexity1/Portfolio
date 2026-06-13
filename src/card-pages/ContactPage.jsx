import { Button } from '../components/ui/Button'

export default function ContactPage() {
  return (
    <div className="content-layer flex h-full flex-col p-4 sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Contact</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Let&apos;s build something great together.</h2>
        <p className="mt-2 text-xs leading-5 text-muted sm:mt-3 sm:text-sm sm:leading-6">Need a website, SaaS platform, dashboard or custom web application? Start the conversation here.</p>
      </div>
      <div className="mt-6 grid flex-1 gap-3">
        <input readOnly placeholder="Name" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground/70 outline-none" />
        <input readOnly placeholder="Email" className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground/70 outline-none" />
        <textarea readOnly rows="4" placeholder="Project details" className="resize-none rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-foreground/70 outline-none" />
        <Button href="#contact" className="mt-1 w-full" showArrow>Open Project Form</Button>
      </div>
    </div>
  )
}
