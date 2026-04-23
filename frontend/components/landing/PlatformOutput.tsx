import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { SiThreads } from 'react-icons/si'
import GoogleColorLogo from '../GoogleColorLogo'

type PlatformCard = {
  name: string
  description: string
  cta: string
  href: string
}

type PlatformOutputProps = {
  title: string
  subtitle: string
  cards: [PlatformCard, PlatformCard, PlatformCard, PlatformCard] | PlatformCard[]
}

const BRAND_STYLES = [
  { gradient: 'var(--gradient-ig)', linkGradient: 'var(--gradient-ig)', renderIcon: () => <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-instagram text-white"><FaInstagram className="h-5 w-5" /></div> },
  { gradient: 'var(--gradient-seo)', linkGradient: 'var(--gradient-seo)', renderIcon: () => <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elevated-2)]"><GoogleColorLogo className="h-5 w-5" /></div> },
  { gradient: '#000000', linkGradient: 'linear-gradient(135deg, #000000 0%, #000000 100%)', renderIcon: () => <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><SiThreads className="h-5 w-5" /></div> },
  { gradient: 'var(--gradient-fb)', linkGradient: 'var(--gradient-fb)', renderIcon: () => <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--platform-facebook)] text-white"><FaFacebookF className="h-5 w-5" /></div> },
] as const

export default function PlatformOutput({ title, subtitle, cards }: PlatformOutputProps) {
  return (
    <section className="bg-[var(--bg)] py-24" id="platform-output">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">{title}</h2>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">{subtitle}</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const style = BRAND_STYLES[index] ?? BRAND_STYLES[0]
            return (
              <Link
                key={card.name}
                className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 pl-7 transition-all hover:-translate-y-0.5 hover:border-[var(--border-bold)] hover:bg-[var(--bg-elevated-2)]"
                href={card.href}
              >
                <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: style.gradient }} />
                {style.renderIcon()}
                <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">{card.name}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: style.linkGradient }}
                  >
                    {card.cta}
                  </span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
