import type { ReactNode } from 'react'

type GradientIconBoxProps = {
  gradient: string
  icon: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
} as const

function isGradientValue(value: string) {
  return value.startsWith('var(') || value.includes('gradient')
}

export function GradientIconBox({ gradient, icon, size = 'md' }: GradientIconBoxProps) {
  const sizeClass = SIZE_CLASSES[size]
  const className = [
    'inline-flex items-center justify-center rounded-xl text-white',
    sizeClass,
    isGradientValue(gradient) ? '' : gradient,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={className}
      style={isGradientValue(gradient) ? { background: gradient } : undefined}
    >
      {icon}
    </span>
  )
}
