import { useEffect } from 'react'
import CustomCursor from './components/CustomCursor'
import Navbar from './components/Navbar'
import Hero from './components/Hero'

export default function App() {
  useEffect(() => {
    const updateSpotlight = (event) => {
      document.documentElement.style.setProperty('--mx', `${event.clientX}px`)
      document.documentElement.style.setProperty('--my', `${event.clientY}px`)
    }
    window.addEventListener('pointermove', updateSpotlight, { passive: true })
    return () => window.removeEventListener('pointermove', updateSpotlight)
  }, [])

  return (
    <div className="noise h-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="global-spotlight" />
      <div className="grid-orb" />
      <CustomCursor />
      <Navbar />
      <main className="relative z-10 h-screen overflow-hidden">
        <Hero />
      </main>
    </div>
  )
}
