import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const WRONG_CHARS = '!@#$%^&*()QWERTY'
const randomWrongChar = () => WRONG_CHARS[Math.floor(Math.random() * WRONG_CHARS.length)]

export default function TypewriterText({ text, active = true, showCursor = false, onDone }) {
  const [displayText, setDisplayText] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) return

    const timeouts = new Set()
    const schedule = (cb, ms) => {
      const id = setTimeout(cb, ms)
      timeouts.add(id)
    }

    let current = ''
    let index = 0

    const typeChar = () => {
      if (index >= text.length) {
        setDisplayText(text)
        setDone(true)
        onDone?.()
        return
      }

      const targetChar = text[index]
      const shouldGlitch = Math.random() > 0.6 && targetChar !== ' '

      if (shouldGlitch) {
        current += randomWrongChar()
        setDisplayText(current)

        schedule(() => {
          current = current.slice(0, -1)
          setDisplayText(current)

          schedule(() => {
            if (Math.random() > 0.5) {
              current += randomWrongChar()
              setDisplayText(current)

              schedule(() => {
                current = current.slice(0, -1)
                setDisplayText(current)
                schedule(() => {
                  current += targetChar
                  setDisplayText(current)
                  index++
                  schedule(typeChar, 50 + Math.random() * 80)
                }, 80)
              }, 120)
            } else {
              current += targetChar
              setDisplayText(current)
              index++
              schedule(typeChar, 50 + Math.random() * 80)
            }
          }, 80)
        }, 100 + Math.random() * 120)
      } else {
        current += targetChar
        setDisplayText(current)
        index++
        schedule(typeChar, 40 + Math.random() * 70)
      }
    }

    typeChar()
    return () => timeouts.forEach(clearTimeout)
  }, [active, text])

  return (
    <span>
      {displayText}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
        >
          {done ? '|' : '_'}
        </motion.span>
      )}
    </span>
  )
}