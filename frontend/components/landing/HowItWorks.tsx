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

export default function HowItWorks({ title, subtitle, steps }: HowItWorksProps) {
  return (
    <section className="bg-[#0f1019] py-24" id="how-it-works">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-nxr-text md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-nxr-text-secondary md:text-lg">{subtitle}</p>
        <div className="relative mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-nxr-orange/30 via-nxr-orange/60 to-nxr-orange/30 lg:block" />
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Target
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-white/8 bg-nxr-card p-8 text-center transition-all hover:-translate-y-0.5 hover:border-white/16"
              >
                <div className="absolute left-1/2 top-0 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-nxr-orange/40 bg-nxr-orange/20 text-[10px] font-bold text-nxr-orange">
                  {index + 1}
                </div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-nxr-orange/20 to-nxr-purple/20 text-nxr-orange">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-nxr-text">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-nxr-text-secondary">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
