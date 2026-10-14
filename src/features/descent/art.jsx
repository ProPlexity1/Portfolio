import { motion } from 'framer-motion'

const draw = (delay = 0, duration = 1.4) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, amount: 0.4 },
  transition: { pathLength: { duration, delay, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.2, delay } },
})

export function LogoMark({ className = '' }) {
  return (
    <svg viewBox="0 0 30 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 22 11.5 6l4.5 7.5L19.5 9 28 22" />
      <path d="m8.4 11.3 3.1 2 2.6-2.4" opacity=".55" />
      <path d="M11.5 6V1l4.2 1.6-4.2 1.6" />
    </svg>
  )
}

// Boot print, heel toward +y. Drawn at roughly 10x22 units.
export function FootprintSymbol() {
  return (
    <symbol id="boot" viewBox="-6 -12 12 24" overflow="visible">
      <path d="M-3.6-2.5C-4.4-7-3-11.2 0-11.2S4.6-7.6 3.9-3C3.5-.3 2.6 1.6 0 1.6S-3.2.4-3.6-2.5Z" />
      <path d="M-2.9 5.8C-2.9 3.9-1.6 3 .1 3S3 4 3 5.9 1.9 10.8.1 10.8-2.9 7.9-2.9 5.8Z" />
    </symbol>
  )
}

function ring(cx, cy, r, k, wobble) {
  const pts = []
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * Math.PI * 2
    const rr = r * (1 + wobble * (0.5 * Math.sin(3 * t + k * 0.7) + 0.3 * Math.sin(5 * t + k * 1.3) + 0.2 * Math.cos(2 * t - k)))
    pts.push(`${(cx + Math.cos(t) * rr).toFixed(1)},${(cy + Math.sin(t) * rr * 0.78).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}
const CONTOURS = Array.from({ length: 11 }, (_, k) => ring(300, 210, 26 + k * 24, k, 0.08 + k * 0.006))

// Topographic contour field, used as a texture behind content.
export function Contours({ className = '' }) {
  return (
    <svg viewBox="0 0 600 420" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {CONTOURS.map((d, i) => (
        <path key={i} d={d} opacity={0.18 + (i % 3 === 0 ? 0.22 : 0)} />
      ))}
    </svg>
  )
}

// Isometric stock crates + a rising trend line.
function cube(x, y, s) {
  const h = s * 0.58
  return [
    `M${x} ${y}l${s} ${h * 0.5}l${s} ${-h * 0.5}l${-s} ${-h * 0.5}Z`,
    `M${x} ${y}v${s}l${s} ${h * 0.5}v${-s}`,
    `M${x + 2 * s} ${y}v${s}l${-s} ${h * 0.5}`,
  ]
}
const CRATES = [cube(70, 150, 44), cube(158, 150, 44), cube(114, 106, 44)].flat()

export function StorixArt({ className = '' }) {
  return (
    <svg viewBox="0 0 320 240" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {CRATES.map((d, i) => (
        <motion.path key={i} d={d} {...draw(0.08 * i, 0.9)} />
      ))}
      <motion.path d="M30 86 82 64l38 14 46-34 44 10 56-32" className="text-glacier" stroke="currentColor" strokeWidth="2" {...draw(0.6, 1.2)} />
      <motion.circle cx="266" cy="22" r="5" className="text-glacier" fill="currentColor" stroke="none" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.7, type: 'spring', stiffness: 260, damping: 14 }} />
    </svg>
  )
}

// Open book with lines of text and a rising arc.
export function ScholarsArt({ className = '' }) {
  const lines = [0, 1, 2, 3, 4]
  return (
    <svg viewBox="0 0 320 240" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M100 108a60 60 0 0 1 120 0" className="text-glacier" stroke="currentColor" strokeWidth="2" {...draw(0.2, 1.1)} />
      <motion.path d="M160 214c-26-16-62-20-110-14V92c48-6 84-2 110 14Z" {...draw(0, 1.2)} />
      <motion.path d="M160 214c26-16 62-20 110-14V92c-48-6-84-2-110 14Z" {...draw(0.1, 1.2)} />
      {lines.map((l) => (
        <motion.path key={`l${l}`} d={`M68 ${116 + l * 16}c26-3 50-1 74 7`} opacity=".55" {...draw(0.7 + l * 0.08, 0.6)} />
      ))}
      {lines.map((l) => (
        <motion.path key={`r${l}`} d={`M252 ${116 + l * 16}c-26-3-50-1-74 7`} opacity=".55" {...draw(0.75 + l * 0.08, 0.6)} />
      ))}
    </svg>
  )
}

const SOCIAL_PATHS = {
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
}

export function SocialIcon({ id, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={SOCIAL_PATHS[id]} />
    </svg>
  )
}

export function CheckTick({ delay = 0 }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-glacier" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="m3 8.5 3.2 3L13 4.5" {...draw(delay, 0.45)} />
    </svg>
  )
}
