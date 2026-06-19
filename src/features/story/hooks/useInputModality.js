import { useEffect, useState } from 'react'

function getInitialModality() {
  if (typeof window === 'undefined') {
    return { isTouch: false, isCoarse: false, isDesktop: false, isWideDesktop: false }
  }

  return {
    isTouch: window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
    isCoarse: window.matchMedia('(pointer: coarse)').matches,
    isDesktop: window.matchMedia('(min-width: 1024px)').matches,
    isWideDesktop: window.matchMedia('(min-width: 1280px)').matches,
  }
}

export function useInputModality() {
  const [modality, setModality] = useState(getInitialModality)

  useEffect(() => {
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const wideDesktopQuery = window.matchMedia('(min-width: 1280px)')

    const sync = () => {
      setModality({
        isTouch: coarseQuery.matches || navigator.maxTouchPoints > 0,
        isCoarse: coarseQuery.matches,
        isDesktop: desktopQuery.matches,
        isWideDesktop: wideDesktopQuery.matches,
      })
    }

    sync()
    coarseQuery.addEventListener('change', sync)
    desktopQuery.addEventListener('change', sync)
    wideDesktopQuery.addEventListener('change', sync)
    return () => {
      coarseQuery.removeEventListener('change', sync)
      desktopQuery.removeEventListener('change', sync)
      wideDesktopQuery.removeEventListener('change', sync)
    }
  }, [])

  return modality
}
