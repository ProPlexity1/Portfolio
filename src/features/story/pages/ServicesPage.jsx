import { services } from '../data/portfolio'

export default function ServicesPage() {
  return (
    <div className="content-layer flex h-full flex-col p-4 sm:p-7">
      <div className="mb-4 sm:mb-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary sm:text-xs">Services</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Business-ready software services.</h2>
        <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6">Four focused ways to turn an idea or business workflow into polished software.</p>
      </div>
      <div className="grid flex-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {services.map((service, index) => {
          const Icon = service.icon
          return (
            <div key={service.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                <div className="grid size-9 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary sm:size-10"><Icon className="size-4 sm:size-5" /></div>
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">0{index + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground sm:text-base">{service.title}</h3>
              <p className="mt-1.5 text-[0.7rem] leading-5 text-muted sm:mt-2 sm:text-xs">{service.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
