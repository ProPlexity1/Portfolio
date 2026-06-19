import { ArrowRight } from 'lucide-react'
import { cn, magneticPointer, resetMagneticPointer } from '../../lib/utils'

const variants = {
  primary: 'bg-primary text-[#021018] shadow-[0_0_34px_rgba(0,240,255,0.22)] hover:shadow-[0_0_46px_rgba(0,240,255,0.32)]',
  secondary: 'border border-white/10 bg-white/[0.045] text-foreground hover:bg-white/[0.075] hover:border-white/15',
  ghost: 'text-muted hover:text-foreground hover:bg-white/[0.045]',
}

export function Button({ children, className, variant = 'primary', href, showArrow = false, magnetic = true, ...props }) {
  const Component = href ? 'a' : 'button'

  return (
    <Component
      href={href}
      data-cursor="button"
      data-magnetic={magnetic ? 'true' : undefined}
      onMouseMove={magnetic ? magneticPointer : undefined}
      onMouseLeave={magnetic ? resetMagneticPointer : undefined}
      className={cn(
        'group relative inline-flex touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold transition-[transform,box-shadow,background,border,color] duration-300 ease-out will-change-transform active:scale-[0.96] active:shadow-[0_0_44px_rgba(0,240,255,0.34)]',
        'before:absolute before:inset-0 before:rounded-full before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.34),transparent)] before:translate-x-[-130%] before:transition-transform before:duration-700 hover:before:translate-x-[130%]',
        variants[variant],
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {showArrow && <ArrowRight className="relative z-10 size-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
    </Component>
  )
}
