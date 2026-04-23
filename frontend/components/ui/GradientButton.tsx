import type { ReactNode } from 'react'
import Link from 'next/link'

type GradientButtonProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

const SIZE_CLASSES: Record<NonNullable<GradientButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-3.5 text-base',
}

const VARIANT_CLASSES: Record<NonNullable<GradientButtonProps['variant']>, string> = {
  primary:
    'bg-[image:var(--gradient-cta)] text-black font-semibold hover:bg-[image:var(--gradient-cta-hover)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]',
  ghost:
    'border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-bold)] hover:bg-[var(--bg-elevated)]',
}

export function GradientButton({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: GradientButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <Link aria-disabled={disabled} className={classes} href={href} onClick={disabled ? (e) => e.preventDefault() : undefined}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  )
}
