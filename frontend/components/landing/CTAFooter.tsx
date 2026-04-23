import Link from 'next/link'

type CTAFooterProps = {
  title: string
  subtitle: string
  button: string
  trust: string
}

export default function CTAFooter({ title, subtitle, button, trust }: CTAFooterProps) {
  return (
    <section className="bg-nxr-bg py-24" id="cta-footer">
      <div className="mx-auto max-w-[900px] px-6">
        <div className="rounded-3xl border border-nxr-orange/10 bg-gradient-to-br from-nxr-orange/20 via-nxr-orange/10 to-nxr-purple/10 p-12 text-center shadow-2xl shadow-nxr-orange/10">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-nxr-text md:text-4xl">{title}</h2>
          <p className="mt-4 text-base text-white/75 md:text-lg">{subtitle}</p>
          <Link
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-nxr-orange transition hover:bg-orange-50 hover:shadow-glow-orange"
            href="/generate"
          >
            {button}
          </Link>
          <p className="mt-4 text-sm text-white/60">{trust}</p>
        </div>
      </div>
    </section>
  )
}
