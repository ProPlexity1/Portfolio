import { projects } from '../data/portfolio'

export default function ProjectsPage() {
  return (
    <div className="content-layer flex h-full flex-col p-4 sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Projects</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Featured product builds.</h2>
        <p className="mt-2 text-xs leading-5 text-muted sm:mt-3 sm:text-sm sm:leading-6">Client and SaaS work presented inside the same connected card journey.</p>
      </div>
      <div className="grid flex-1 gap-4">
        {projects.map((project) => {
          const Icon = project.icon
          return (
            <article key={project.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">Project {project.number}</span>
                  <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:mt-2 sm:text-xl">{project.title}</h3>
                </div>
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary"><Icon className="size-5" /></div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{project.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.stack.map((item) => <span key={item} className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[0.68rem] font-medium text-foreground/85">{item}</span>)}
              </div>
              <div className="mt-3 h-12 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#020511]/60 p-2 sm:mt-4 sm:h-16 sm:p-3">
                <div className="grid h-full grid-cols-4 gap-2">{[1, 2, 3, 4].map((item) => <span key={item} className="rounded-xl bg-gradient-to-br from-primary/18 to-white/[0.04]" />)}</div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
