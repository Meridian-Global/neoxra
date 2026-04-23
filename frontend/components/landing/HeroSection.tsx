import Link from 'next/link'
import GlowOrb from './GlowOrb'
import MockupCards from './MockupCards'

type HeroCopy = {
  badge: string
  titlePrefix: string
  titleHighlight: string
  tagline: string
  body: string
  primaryCta: string
  secondaryCta: string
  trustSignals: string[]
  mockup: {
    instagramLabel: string
    instagramTitle: string
    instagramSubtitle: string
    seoLabel: string
    seoTitle: string
    seoDescription: string
    threadsLabel: string
    threadsBody: string
    facebookLabel: string
    facebookBody: string
  }
}

export default function HeroSection({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <GlowOrb color="orange" position={{ left: '-8%', top: '12%' }} size={460} />
      <GlowOrb color="purple" position={{ right: '-4%', top: '18%' }} size={520} />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 lg:grid-cols-[1fr_0.88fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-nxr-orange/30 bg-nxr-orange/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-nxr-orange">
            {copy.badge}
          </span>
          <h1 className="mt-6 text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] text-nxr-text sm:text-[44px] lg:text-[56px] lg:tracking-[-0.03em]">
            {copy.titlePrefix}{' '}
            <span className="bg-gradient-to-r from-nxr-orange to-amber-400 bg-clip-text text-transparent">
              {copy.titleHighlight}
            </span>
          </h1>
          <p className="mt-4 text-lg font-semibold text-white/90 sm:text-xl">{copy.tagline}</p>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-nxr-text-secondary">{copy.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-nxr-orange px-8 py-3.5 text-base font-semibold text-black shadow-glow-orange transition hover:-translate-y-0.5 hover:bg-orange-400 hover:[animation:glow_1.4s_ease-in-out_infinite]"
              href="/generate"
            >
              {copy.primaryCta}
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-8 py-3.5 text-base font-semibold text-nxr-text transition hover:border-white/20 hover:bg-white/[0.03]"
              href="/demo/legal"
            >
              {copy.secondaryCta}
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-nxr-text-muted">
            {copy.trustSignals.map((signal) => (
              <span key={signal}>✓ {signal}</span>
            ))}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <MockupCards copy={copy.mockup} />
        </div>
      </div>
    </section>
  )
}
