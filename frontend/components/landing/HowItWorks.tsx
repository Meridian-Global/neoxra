import { Target, Bot, Package } from 'lucide-react'

type Step = {
  title: string
  description: string
}

type HowItWorksProps = {
  title: string
  subtitle: string
  steps: [Step, Step, Step] | Step[]
}

const STEP_ICONS = [Target, Bot, Package] as const
const STEP_GRADIENTS = [
  'var(--gradient-icon-1)',
  'var(--gradient-icon-2)',
  'var(--gradient-icon-3)',
] as const

export default function HowItWorks({ title, subtitle, steps }: HowItWorksProps) {
  return (
    <section className="bg-[var(--bg-elevated-2)] py-24" id="how-it-works">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-secondary)] md:text-lg">{subtitle}</p>
        <div className="relative mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-[image:var(--gradient-card-border)] opacity-70 lg:block" />
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Target
            const gradient = STEP_GRADIENTS[index] ?? STEP_GRADIENTS[0]
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center transition-all hover:-translate-y-0.5 hover:border-[var(--border-bold)]"
              >
                <div
                  className="absolute left-1/2 top-0 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-[var(--shadow-glow)]"
                  style={{ background: gradient }}
                >
                  {index + 1}
                </div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: gradient }}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
