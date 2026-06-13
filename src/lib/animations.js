export const premiumEase = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: premiumEase },
  },
}

export const fadeIn = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: premiumEase },
  },
}

export const staggerContainer = (delayChildren = 0.08, staggerChildren = 0.08) => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren,
      staggerChildren,
    },
  },
})

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 20, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: premiumEase },
  },
}

export const viewport = { once: true, amount: 0.24, margin: '0px 0px -80px 0px' }
