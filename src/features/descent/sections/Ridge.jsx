import { BlurIn } from '../ui'

// The pull-back from the close-up lands here: the whole summit in view.
export default function Ridge() {
  return (
    <section id="ridge" className="section flex min-h-[130svh] items-end pb-[22svh]">
      <div className="shell">
        <BlurIn as="p" className="statement max-w-[17ch]">
          Every build starts up here, with a clear view of where it has to go.
        </BlurIn>
      </div>
    </section>
  )
}
