export interface DemoScenario {
  name: string
  idea: string
  industry: 'legal' | 'tech' | 'health' | 'real_estate' | 'general'
  audience: string
  voiceProfile: string
  goal: 'traffic' | 'authority' | 'conversion' | 'education'
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    name: 'Legal：車禍理賠',
    idea: '車禍理賠流程：事故後如何保存證據、申請保險理賠，並避免太早簽和解書',
    industry: 'legal',
    audience: '正在處理車禍理賠的一般民眾',
    voiceProfile: 'law_firm',
    goal: 'conversion',
  },
  {
    name: 'Tech：AI 內容策略',
    idea: 'AI content strategy for small teams：如何把一個想法延展成多平台內容，而不增加團隊負擔',
    industry: 'tech',
    audience: '早期新創創辦人與小型行銷團隊',
    voiceProfile: 'default',
    goal: 'authority',
  },
  {
    name: 'Personal brand：Building in public',
    idea: 'building in public：創辦人如何分享產品進度，建立信任，而不是只發成功故事',
    industry: 'general',
    audience: '正在建立個人品牌的創作者與創業者',
    voiceProfile: 'default',
    goal: 'traffic',
  },
]
