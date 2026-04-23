type MockupCopy = {
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

export default function MockupCards({ copy }: { copy: MockupCopy }) {
  return (
    <div className="relative h-[520px] w-full">
      <div className="absolute left-10 top-14 z-30 w-[290px] rotate-[-6deg] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-gradient-instagram px-3 py-1 text-[11px] font-semibold text-white">{copy.instagramLabel}</span>
          <span className="text-xs font-medium text-[var(--text-tertiary)]">1/5</span>
        </div>
        <div className="mt-7 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated-2)] p-5">
          <h3 className="text-2xl font-bold leading-tight text-[var(--text-primary)]">{copy.instagramTitle}</h3>
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.instagramSubtitle}</p>
          <div className="mt-7 flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={[
                  'h-2 rounded-full',
                  index === 0 ? 'w-6 bg-gradient-instagram' : 'w-2 bg-[var(--bg-elevated-2)]',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 w-[280px] rotate-[7deg] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[11px] font-semibold text-[var(--platform-seo)]">{copy.seoLabel}</span>
        <h3 className="mt-5 text-lg font-bold leading-snug text-[var(--text-primary)]">{copy.seoTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy.seoDescription}</p>
        <div className="mt-5 space-y-2">
          <div className="h-2 rounded-full bg-[var(--bg-elevated-2)]" />
          <div className="h-2 w-5/6 rounded-full bg-[var(--bg-elevated-2)]" />
          <div className="h-2 w-3/4 rounded-full bg-[var(--bg-elevated-2)]" />
        </div>
      </div>

      <div className="absolute bottom-8 left-0 z-10 w-[250px] rotate-[5deg] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Neoxra</p>
            <p className="text-xs text-[var(--text-tertiary)]">{copy.threadsLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.threadsBody}</p>
        <div className="mt-4 flex gap-4 text-xs text-[var(--text-tertiary)]">
          <span>♡ 34</span>
          <span>💬 12</span>
          <span>↻ 8</span>
        </div>
      </div>

      <div className="absolute bottom-0 right-10 z-20 w-[270px] rotate-[-4deg] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--platform-facebook)] text-sm font-semibold text-white">
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Neoxra</p>
            <p className="text-xs text-[var(--text-tertiary)]">{copy.facebookLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.facebookBody}</p>
        <div className="mt-4 flex gap-2 text-base">
          <span>👍</span>
          <span>🔥</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  )
}
