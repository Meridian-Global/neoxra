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

export default function Features({ title, items }: FeaturesProps) {
  return (
    <section className="bg-nxr-bg py-24" id="features">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-nxr-text md:text-4xl">{title}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = FEATURE_ICONS[index] ?? Target
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-white/8 bg-nxr-card p-8 text-left transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-nxr-card-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-nxr-orange/15 to-nxr-purple/15 text-nxr-orange">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-nxr-text">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-nxr-text-secondary">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
