import { BarChart3, CheckCircle, Rocket, Target } from 'lucide-react'

type Feature = {
  title: string
  description: string
}

type FeaturesProps = {
  title: string
  items: [Feature, Feature, Feature, Feature] | Feature[]
}

const FEATURE_ICONS = [Target, BarChart3, CheckCircle, Rocket] as const
const FEATURE_GRADIENTS = [
  'var(--gradient-icon-1)',
  'var(--gradient-icon-2)',
  'var(--gradient-icon-3)',
  'var(--gradient-icon-4)',
] as const

export default function Features({ title, items }: FeaturesProps) {
  return (
    <section className="bg-[var(--bg)] py-24" id="features">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">{title}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = FEATURE_ICONS[index] ?? Target
            const gradient = FEATURE_GRADIENTS[index] ?? FEATURE_GRADIENTS[0]
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--border-bold)] hover:bg-[var(--bg-elevated-2)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: gradient }}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
