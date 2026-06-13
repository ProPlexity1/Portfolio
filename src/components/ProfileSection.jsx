import { CheckCircle2, Layers3 } from 'lucide-react'

const specialties = [
  'Business Websites',
  'Inventory Systems',
  'Admin Dashboards',
  'SaaS Applications',
  'API Integrations',
]

const stack = ['React', 'Laravel', 'PostgreSQL', 'Tailwind CSS']

export default function ProfileSection() {
  return (
    <div className="content-layer flex h-full flex-col justify-between p-6 sm:p-8">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.075] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <Layers3 className="size-3.5" /> Developer Profile
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Software built around business outcomes.</h2>
        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
          I build custom software solutions for businesses, from modern websites to complete SaaS platforms.
        </p>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Specialized In</p>
          <div className="space-y-2.5">
            {specialties.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-foreground/90">
                <CheckCircle2 className="size-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current Stack</p>
          <div className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <span key={item} className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs font-medium text-foreground/90">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
              Available For Freelance Projects
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
