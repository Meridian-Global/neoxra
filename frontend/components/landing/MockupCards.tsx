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
      <div className="absolute left-10 top-14 z-30 w-[290px] rotate-[-6deg] rounded-2xl border border-white/10 bg-nxr-card p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-nxr-ig/10 px-3 py-1 text-[11px] font-semibold text-nxr-ig">{copy.instagramLabel}</span>
          <span className="text-xs font-medium text-nxr-text-muted">1/5</span>
        </div>
        <div className="mt-7 rounded-xl border border-nxr-border bg-[#161625] p-5">
          <h3 className="text-2xl font-bold leading-tight text-nxr-text">{copy.instagramTitle}</h3>
          <p className="mt-4 text-sm leading-6 text-nxr-text-secondary">{copy.instagramSubtitle}</p>
          <div className="mt-7 flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={[
                  'h-2 rounded-full',
                  index === 0 ? 'w-6 bg-nxr-ig' : 'w-2 bg-white/15',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 w-[280px] rotate-[7deg] rounded-2xl border border-white/10 bg-nxr-card p-5 shadow-2xl shadow-black/30">
        <span className="rounded-full bg-nxr-seo/10 px-3 py-1 text-[11px] font-semibold text-nxr-seo">{copy.seoLabel}</span>
        <h3 className="mt-5 text-lg font-bold leading-snug text-nxr-text">{copy.seoTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-nxr-text-secondary">{copy.seoDescription}</p>
        <div className="mt-5 space-y-2">
          <div className="h-2 rounded-full bg-white/10" />
          <div className="h-2 w-5/6 rounded-full bg-white/10" />
          <div className="h-2 w-3/4 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="absolute bottom-8 left-0 z-10 w-[250px] rotate-[5deg] rounded-2xl border border-white/10 bg-nxr-card p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nxr-threads/15 text-sm font-semibold text-nxr-threads">
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-nxr-text">Neoxra</p>
            <p className="text-xs text-nxr-text-muted">{copy.threadsLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-nxr-text-secondary">{copy.threadsBody}</p>
        <div className="mt-4 flex gap-4 text-xs text-nxr-text-muted">
          <span>♡ 34</span>
          <span>💬 12</span>
          <span>↻ 8</span>
        </div>
      </div>

      <div className="absolute bottom-0 right-10 z-20 w-[270px] rotate-[-4deg] rounded-2xl border border-white/10 bg-nxr-card p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nxr-fb/15 text-sm font-semibold text-nxr-fb">
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-nxr-text">Neoxra</p>
            <p className="text-xs text-nxr-text-muted">{copy.facebookLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-nxr-text-secondary">{copy.facebookBody}</p>
        <div className="mt-4 flex gap-2 text-base">
          <span>👍</span>
          <span>🔥</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  )
}
