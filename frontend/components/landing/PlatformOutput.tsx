import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { SiGoogle, SiThreads } from 'react-icons/si'

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
  { border: 'border-l-nxr-ig', icon: FaInstagram, iconClass: 'text-nxr-ig' },
  { border: 'border-l-nxr-seo', icon: SiGoogle, iconClass: 'text-nxr-seo' },
  { border: 'border-l-nxr-threads', icon: SiThreads, iconClass: 'text-nxr-threads' },
  { border: 'border-l-nxr-fb', icon: FaFacebookF, iconClass: 'text-nxr-fb' },
] as const

export default function PlatformOutput({ title, subtitle, cards }: PlatformOutputProps) {
  return (
    <section className="bg-nxr-bg py-24" id="platform-output">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="text-[28px] font-bold tracking-[-0.02em] text-nxr-text md:text-4xl">{title}</h2>
        <p className="mt-3 text-lg text-nxr-text-secondary">{subtitle}</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const style = BRAND_STYLES[index] ?? BRAND_STYLES[0]
            const Icon = style.icon
            return (
              <Link
                key={card.name}
                className={`group rounded-xl border border-white/8 border-l-[3px] ${style.border} bg-nxr-card p-6 transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-nxr-card-hover`}
                href={card.href}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${style.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-nxr-text">{card.name}</h3>
                <p className="mt-2 text-sm text-nxr-text-secondary">{card.description}</p>
                <div className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${style.iconClass}`}>
                  {card.cta}
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
