import { clamp, state } from './engine'

let lenis = null
export const setLenis = (instance) => {
  lenis = instance
}
export const getLenis = () => lenis

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function flyTo(y) {
  if (lenis) {
    const duration = clamp(Math.abs(y - window.scrollY) / 2200, 1.1, 3.4)
    lenis.scrollTo(y, { duration, easing: easeInOut })
  } else {
    window.scrollTo({ top: y, behavior: state.reduced ? 'auto' : 'smooth' })
  }
}

export const flyToStop = (i) => flyTo(state.anchors[i])

export function flyToId(id) {
  const el = document.getElementById(id)
  if (el) flyTo(el.getBoundingClientRect().top + window.scrollY)
}
