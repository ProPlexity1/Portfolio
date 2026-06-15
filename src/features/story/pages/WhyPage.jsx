import { reasons } from '../data/portfolio'

export default function WhyPage() {
  return (
    <div className="content-layer flex h-full flex-col p-4 sm:p-7">
      <div className="mb-4 sm:mb-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary sm:text-xs">Why Work With Me</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">A partner who thinks beyond code.</h2>
        <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">The work is engineered around communication, stability and measurable business outcomes.</p>
      </div>
      <div className="grid flex-1 gap-3 sm:gap-4">
        {reasons.map((reason) => {
          const Icon = reason.icon
          return (
            <div key={reason.title} className="flex gap-3 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-3 sm:gap-4 sm:p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary sm:size-11"><Icon className="size-4 sm:size-5" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground sm:text-base">{reason.title}</h3>
                <p className="mt-1 text-[0.7rem] leading-5 text-muted sm:mt-1.5 sm:text-xs">{reason.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
