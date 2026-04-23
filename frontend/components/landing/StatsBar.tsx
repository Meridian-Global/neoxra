import { Clock, TrendingUp, Users, Zap } from 'lucide-react'

type StatItem = {
  value: string
  label: string
}

type StatsBarProps = {
  stats: [StatItem, StatItem, StatItem, StatItem] | StatItem[]
}

const ICONS = [Zap, Clock, TrendingUp, Users] as const

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <section className="border-y border-white/6 bg-[#0f1019]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = ICONS[index] ?? Zap
          return (
            <div key={`${stat.value}-${stat.label}`} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nxr-orange/10 text-nxr-orange">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-nxr-text md:text-2xl">{stat.value}</div>
                <div className="text-xs text-nxr-text-muted">{stat.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
