import { useEffect, useRef } from 'react'
import { ramp, subscribe } from '../engine'

// Wind-blown snow near the summit. The loop only runs while it is visible.
export default function Snowfall() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let flakes = []
    let raf = 0
    let alpha = 1
    let last = 0
    let reduced = false

    const resize = () => {
      const dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(160, (w * h) / 9000))
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        v: Math.random() * 40 + 25,
        drift: Math.random() * Math.PI * 2,
      }))
    }

    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016)
      last = t
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#f2f7f7'
      for (const f of flakes) {
        f.drift += dt * 0.8
        f.y += f.v * dt
        f.x += (Math.sin(f.drift) * 14 + 46) * dt * (f.r * 0.6)
        if (f.y > h + 4) f.y = -4
        if (f.x > w + 4) f.x = -4
        ctx.globalAlpha = alpha * (0.35 + f.r * 0.3)
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = alpha > 0.01 ? requestAnimationFrame(tick) : 0
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const off = subscribe((st) => {
      reduced = st.reduced
      alpha = 1 - ramp(st.u, 0.2, 1.6)
      canvas.style.opacity = alpha
      if (!reduced && alpha > 0.01 && !raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    })
    return () => {
      off()
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} className="snow" />
}
