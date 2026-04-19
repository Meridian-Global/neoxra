import type { InstagramFormPreset } from '../components/InstagramForm'
import type { InstagramResult } from './instagram-types'

export interface LegalDemoScenario extends InstagramFormPreset {
  strategy: string
  platformOutcomes: string[]
}

export const LEGAL_DEMO_VALUE_PROP =
  'Neoxra turns one legal topic into clear, platform-ready thought leadership your team can review, trust, and publish fast.'

export const LEGAL_DEMO_PRESETS: readonly LegalDemoScenario[] = [
  {
    label: 'AI legal education',
    topic: 'How law firms can use AI to educate clients without sounding generic or risky',
    templateText:
      'Professional, clear, and trust-building. Open with a common client misunderstanding, explain the real issue in plain English, and close with one practical next step. Avoid hype and avoid making legal promises.',
    goal: 'authority',
    strategy:
      'Turn AI from a buzzword into a credibility asset by framing it as safer, clearer client education rather than generic automation.',
    platformOutcomes: [
      'Instagram: myth-versus-reality carousel for client education',
      'LinkedIn: authority post about safe AI-enabled legal communication',
      'Threads: short explainer on what firms should and should not automate',
    ],
  },
  {
    label: 'Contract myths',
    topic: 'Common contract myths that get startup founders into avoidable trouble',
    templateText:
      'Use an expert-service tone. Start with a myth founders repeat, explain why it is incomplete or wrong, give one concrete consequence, then end with a plain-English recommendation.',
    goal: 'save',
    strategy:
      'Reframe legal advice into a founder-facing risk narrative: one myth, one hidden business consequence, one corrective action.',
    platformOutcomes: [
      'Instagram: carousel-led myth breakdown with a clear founder CTA',
      'LinkedIn: authority post framing the risk in business terms',
      'Threads: short myth-versus-reality sequence that invites discussion',
    ],
  },
  {
    label: 'Startup checklist',
    topic: 'The legal checklist most startups ignore until it becomes expensive',
    templateText:
      'Trusted advisor voice. Structure it like a short checklist with sharp takeaways, practical framing, and a credible CTA. Keep it useful for founders without sounding alarmist.',
    goal: 'engagement',
    strategy:
      'Package legal process into a founder-friendly checklist that feels operational and urgent, not abstract or intimidating.',
    platformOutcomes: [
      'Instagram: checklist carousel founders can save and share',
      'LinkedIn: operational post on preventable legal gaps',
      'Threads: quick-fire list of issues teams delay too long',
    ],
  },
  {
    label: 'Employment tips',
    topic: 'Employment law tips small business owners should know before their next hire',
    templateText:
      'Plain-English educator voice. Make it calm, practical, and easy to scan. Focus on one preventable mistake, one compliance mindset shift, and one action owners can take this week.',
    goal: 'authority',
    strategy:
      'Translate employment law into simple owner decisions so the firm sounds practical, reassuring, and commercially aware.',
    platformOutcomes: [
      'Instagram: practical hiring-risk carousel for SMB owners',
      'LinkedIn: advisory post on preventive compliance habits',
      'Threads: approachable series on early hiring mistakes',
    ],
  },
] as const

export const LEGAL_VOICE_PRESETS = [
  {
    id: 'trusted-counsel',
    label: 'Trusted Counsel',
    description: 'Calm, credible, and partner-like. Best for law firms and advisory brands.',
    instructions:
      'Write like a trusted legal advisor: calm, precise, plain-English, and credibility-first. Avoid hype, avoid slang, and prefer confident clarity over cleverness.',
  },
  {
    id: 'plain-english',
    label: 'Plain-English Educator',
    description: 'Explains legal risk clearly for founders, operators, and SMB owners.',
    instructions:
      'Use accessible legal education language. Translate legal concepts into plain English without sounding simplistic. Emphasize clarity, usefulness, and practical actions.',
  },
  {
    id: 'executive-brief',
    label: 'Executive Brief',
    description: 'More strategic and concise for expert-service and executive audiences.',
    instructions:
      'Use a concise executive tone. Lead with business impact, keep the structure tight, and make the advice feel strategic and trustworthy.',
  },
] as const

export const LEGAL_GOLDEN_SCENARIO = {
  label: 'Founder contract myth',
  topic: 'Common contract myths that get startup founders into avoidable trouble',
  transformation:
    'Neoxra reframes the topic from a generic warning into a strategic education asset: one myth, one business risk, one plain-English correction, and one action founders can take immediately.',
  platformOutcomes: [
    'Instagram: carousel-led myth breakdown with a clear founder-facing CTA',
    'LinkedIn: authority post that frames the risk in business terms',
    'Threads: short myth-versus-reality sequence that invites discussion',
  ],
  result: {
    style_analysis: {
      tone_keywords: ['credible', 'plain-English', 'founder-focused'],
      structural_patterns: ['myth-first hook', 'risk explanation', 'practical next step'],
      vocabulary_notes: 'Avoids legalese, keeps authority through specificity and consequence framing.',
    },
    content: {
      caption:
        "One of the most expensive startup myths is: 'If it looks standard, I can sign it fast.'\n\nMost founder contract mistakes are not dramatic. They're quiet. Auto-renewals nobody noticed. IP clauses that are too broad. Termination language that leaves too much open.\n\nThe fix is not reading every sentence like a lawyer. It's knowing which terms change leverage, cash flow, and risk before you sign.\n\nIf your team treats every contract as 'standard,' you're probably approving more business risk than you think.\n\nBefore the next signature, ask one question: what clause in this agreement would actually matter if the relationship went wrong?\n\n#Startups #Contracts #LegalOps #Founders",
      hook_options: [
        "The word 'standard' has probably cost startups more than they realize.",
        "If your team signs 'standard' contracts without pressure-testing the terms, you're not moving fast. You're borrowing risk.",
        "Most startup contract mistakes happen before anyone thinks something is unusual.",
      ],
      hashtags: ['#Startups', '#Contracts', '#LegalOps', '#Founders'],
      carousel_outline: [
        { title: 'Myth', body: "If it looks standard, we can sign it fast." },
        { title: 'Reality', body: 'Standard language can still create real cash, control, and IP risk.' },
        { title: 'Where risk hides', body: 'Renewal terms, liability caps, termination rights, and ownership language.' },
        { title: 'What smart teams do', body: 'Identify the 2-3 clauses that matter most before every signature.' },
        { title: 'Business impact', body: 'Faster review, fewer surprises, and better leverage in the deals that matter.' },
      ],
      reel_script:
        "Open on a founder saying 'It’s just a standard contract.' Cut to highlighted clauses: renewal, liability, IP. Close with: 'Standard doesn’t mean safe. It means familiar.'",
    },
    scorecard: {
      hook_strength: 9,
      cta_clarity: 8,
      hashtag_relevance: 8,
      platform_fit: 9,
      tone_match: 9,
      originality: 8,
      average: 8.5,
    },
    critique:
      'Strong legal-services demo scenario: credible, practical, and specific without sounding alarmist. It positions the firm as a strategic advisor rather than a generic explainer.',
  } satisfies InstagramResult,
} as const
