import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function setCardPointer(event) {
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  element.style.setProperty('--card-x', `${x}%`)
  element.style.setProperty('--card-y', `${y}%`)
  element.style.setProperty('--card-spotlight', '0.9')
}

export function resetCardPointer(event) {
  const element = event.currentTarget
  element.style.setProperty('--card-spotlight', '0.45')
}

export function magneticPointer(event, strength = 0.28) {
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const relX = event.clientX - (rect.left + rect.width / 2)
  const relY = event.clientY - (rect.top + rect.height / 2)
  element.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`
}

export function resetMagneticPointer(event) {
  event.currentTarget.style.transform = 'translate(0px, 0px)'
}
