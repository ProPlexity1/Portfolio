import { useState } from 'react'
import { useMotionValueEvent } from 'framer-motion'
import Navbar from '../../components/navigation/Navbar'
import CustomCursor from '../../components/cursor/CustomCursor'
import { cardPages } from './pages'
import { useStoryProgress } from './hooks/useStoryProgress'
import { FLIP_END, FLIP_START, FINAL_REVEAL } from './storyConfig'
import StoryBackground from './components/StoryBackground'
import IntroPanel from './components/IntroPanel'
import StoryCard from './components/StoryCard'
import ScrollIndicator from './components/ScrollIndicator'
import FinalContact from './components/FinalContact'
import FinalFooter from './components/FinalFooter'
import { BreakFlash, BrokenShardField, ImpactSurface } from './components/ShatterEffects'

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export default function PortfolioExperience() {
  const { progress, jumpToPage } = useStoryProgress()
  const [activeIndex, setActiveIndex] = useState(0)
  const [finalOpen, setFinalOpen] = useState(false)

  useMotionValueEvent(progress, 'change', (latest) => {
    const flipProgress = clamp((latest - FLIP_START) / (FLIP_END - FLIP_START))
    setActiveIndex(Math.min(cardPages.length - 1, Math.round(flipProgress * (cardPages.length - 1))))
    setFinalOpen(latest > FINAL_REVEAL)
  })

  return (
    <div className="noise relative h-dvh overflow-hidden bg-background text-foreground antialiased">
      <div className="global-spotlight" />
      <div className="grid-orb" />
      <CustomCursor />
      <Navbar />
      <ScrollIndicator progress={progress} activeIndex={activeIndex} onJump={jumpToPage} />

      <main id="top" className="relative h-dvh overflow-hidden pt-6">
        <StoryBackground progress={progress} />

        <div className="section-shell relative z-10 h-full">
          <IntroPanel progress={progress} />
        </div>

        <ImpactSurface progress={progress} />
        <StoryCard progress={progress} finalOpen={finalOpen} />
        <BrokenShardField progress={progress} />
        <BreakFlash progress={progress} />
        <FinalContact progress={progress} finalOpen={finalOpen} />
        <FinalFooter progress={progress} />
      </main>
    </div>
  )
}
