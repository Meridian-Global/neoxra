import { DemoSection } from '../components/landing/DemoSection'
import { FounderSection } from '../components/landing/FounderSection'
import { HeroSection } from '../components/landing/HeroSection'
import { StepsSection } from '../components/landing/StepsSection'
import { WhySection } from '../components/landing/WhySection'

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-20 px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
        <HeroSection />
        <DemoSection />
        <StepsSection />
        <WhySection />
        <FounderSection />
      </div>
    </main>
  )
}
