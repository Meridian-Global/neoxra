type GlowOrbProps = {
  color: 'orange' | 'purple'
  position: Partial<Record<'top' | 'right' | 'bottom' | 'left', string>>
  size: number
}

export default function GlowOrb({ color, position, size }: GlowOrbProps) {
  const background =
    color === 'orange'
      ? 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0.12) 38%, transparent 72%)'
      : 'radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(168,85,247,0.12) 38%, transparent 72%)'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full opacity-15 blur-[120px]"
      style={{ ...position, background, height: `${size}px`, width: `${size}px` }}
    />
  )
}
