import { MotionConfig, useReducedMotionConfig, useScroll } from 'framer-motion'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, useState } from 'react'
import Hud from './components/Hud'
import Preloader from './components/Preloader'
import Stage from './components/Stage'
import { STOPS } from './content'
import { emit, state, uFromScroll } from './engine'
import { getLenis, setLenis } from './scroller'
import About from './sections/About'
import Approach from './sections/Approach'
import { Basecamp, Contact } from './sections/Basecamp'
import Services from './sections/Services'
import Stack from './sections/Stack'
import Ridge from './sections/Ridge'
import Summit from './sections/Summit'
import Work from './sections/Work'

// ?motion=full ignores the OS reduced-motion setting (handy for testing)
const FORCE_MOTION = new URLSearchParams(window.location.search).get('motion') === 'full'
if (FORCE_MOTION) document.documentElement.classList.add('force-motion')

export default function Descent() {
  return (
    <MotionConfig reducedMotion={FORCE_MOTION ? 'never' : 'user'}>
      <Experience />
    </MotionConfig>
  )
}

function Experience() {
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotionConfig()
  const { scrollY } = useScroll()

  // Measure the viewport and where each stop sits in the document.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const stage = document.querySelector('.stage')
    const coarse = matchMedia('(pointer: coarse)').matches
    let lastW = 0
    const measure = () => {
      const vw = window.innerWidth
      // on phones the URL bar changes the height mid-scroll; only react to width
      if (!(coarse && vw === lastW) || !state.vh) state.vh = stage.clientHeight
      lastW = vw
      state.vw = vw
      state.portrait = vw / state.vh < 0.9
      const ih = window.innerHeight
      let prev = 0
      state.anchors = STOPS.map((s, i) => {
        if (i === 0) return 0
        const el = document.getElementById(s.id)
        const y = Math.max(prev + 1, el.offsetTop + el.offsetHeight / 2 - ih / 2)
        prev = y
        return y
      })
      state.u = uFromScroll(window.scrollY, state.anchors)
      emit()
    }
    let raf = 0
    const queue = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    measure()
    const ro = new ResizeObserver(queue)
    ro.observe(document.body)
    window.addEventListener('resize', queue)

    const off = scrollY.on('change', (y) => {
      state.u = uFromScroll(y, state.anchors)
      emit()
    })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', queue)
      cancelAnimationFrame(raf)
      off()
    }
  }, [scrollY])

  // Smooth wheel scrolling. Touch keeps native momentum.
  useEffect(() => {
    state.reduced = !!reduced
    if (reduced) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9 })
    setLenis(lenis)
    // Lenis moves the page inside its own frame; follow it right there so the
    // stage and the content update together instead of one frame apart
    lenis.on('scroll', ({ scroll }) => {
      state.u = uFromScroll(scroll, state.anchors)
      emit()
    })
    if (!state.ready) lenis.stop()
    return () => {
      lenis.destroy()
      setLenis(null)
    }
  }, [reduced])

  const start = () => {
    document.documentElement.classList.remove('is-loading')
    state.ready = true
    getLenis()?.start()
    setReady(true)
    emit()
  }

  return (
    <>
      <Stage />
      <Preloader onDone={start} />
      <Hud />
      <main className="relative">
        <Summit ready={ready} />
        <Ridge />
        <About />
        <Services />
        <Work />
        <Approach />
        <Stack />
        <Basecamp />
        <Contact />
      </main>
    </>
  )
}
