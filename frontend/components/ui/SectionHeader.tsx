type SectionHeaderProps = {
  title: string
  subtitle?: string
  centered?: boolean
}

export function SectionHeader({ title, subtitle, centered = false }: SectionHeaderProps) {
  return (
    <div className={centered ? 'text-center' : ''}>
      <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
