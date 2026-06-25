import { Mail, MessageSquareText, Rocket } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

const contactSteps = [
  { icon: MessageSquareText, title: 'Share the goal', description: 'Tell me what you need built and what the project should achieve.' },
  { icon: Rocket, title: 'Plan the build', description: 'We define scope, screens, features and a clear delivery path.' },
  { icon: Mail, title: 'Start clean', description: 'You get direct communication and a focused development process.' },
]

export default function ContactPage() {
  return (
    <div className="content-layer flex min-h-full flex-col p-4 sm:p-7">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary sm:text-xs">Contact</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Ready to turn the idea into software?</h2>
        <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">Websites, SaaS platforms, dashboards and custom systems built with a practical process.</p>
      </div>

      <div className="mt-5 grid flex-1 gap-2.5 sm:mt-6 sm:gap-3">
        {contactSteps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 sm:gap-4 sm:p-4">
              <div className="grid size-9 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary sm:size-10">
                <Icon className="size-4 sm:size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground sm:text-base">{step.title}</h3>
                <p className="mt-1 text-[0.7rem] leading-5 text-muted sm:text-xs">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <Button href="#contact" className="mt-4 w-full" showArrow>Open Project Form</Button>
    </div>
  )
}
