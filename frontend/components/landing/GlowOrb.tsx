type GlowOrbProps = {
  color: 'orange' | 'purple'
  position: Partial<Record<'top' | 'right' | 'bottom' | 'left', string>>
  size: number
}

export default function GlowOrb({ color, position, size }: GlowOrbProps) {
  const background =
    color === 'orange'
      ? 'radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 38%, transparent 72%)'
      : 'radial-gradient(circle, color-mix(in srgb, var(--secondary) 18%, transparent) 0%, color-mix(in srgb, var(--secondary) 8%, transparent) 38%, transparent 72%)'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full opacity-[0.08] blur-[120px] dark:opacity-[0.15]"
      style={{ ...position, background, height: `${size}px`, width: `${size}px` }}
    />
  )
}
