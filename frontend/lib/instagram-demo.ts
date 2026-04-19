import type { InstagramResult } from './instagram-types'

export const INSTAGRAM_SAMPLE_RESULT = {
  style_analysis: {
    tone_keywords: ['clear', 'founder-focused', 'practical'],
    structural_patterns: ['hook first', 'short paragraphs', 'strong takeaway'],
    vocabulary_notes: 'Uses simple business language, concrete workflow changes, and low-hype framing.',
  },
  content: {
    caption:
      "Most small teams don't need more headcount first. They need fewer repeated decisions.\n\nOne founder we worked with thought the bottleneck was execution speed. It wasn't. It was that the same 3 people kept re-explaining priorities, rewriting context, and reviewing the same work twice.\n\nThe fix wasn't a bigger team. It was a better system for turning one source of truth into usable content, guidance, and next steps across channels.\n\nThat's where AI actually helps: not by replacing judgment, but by reducing repetition so your best people spend more time deciding and less time re-explaining.\n\nIf your team feels slow, ask this first: where are you repeating context instead of reusing it?\n\n#Startups #AIWorkflow #ContentSystems #Founders",
    hook_options: [
      "Small teams rarely break because of ambition. They break because the same context gets recreated every day.",
      "If your team feels slow, the problem may not be speed. It may be repetition.",
      "Most founders think they need more output. What they really need is less duplicated work.",
    ],
    hashtags: ['#Startups', '#AIWorkflow', '#ContentSystems', '#Founders'],
    carousel_outline: [
      { title: 'The hidden bottleneck', body: 'Small teams lose momentum when the same context gets rewritten over and over.' },
      { title: 'What this looks like', body: 'Repeated review loops, repeated explanations, repeated decisions on work that was already close.' },
      { title: 'What changes', body: 'One source idea becomes reusable platform-ready content instead of being recreated for every channel.' },
      { title: 'Why AI helps', body: 'It reduces repetition, speeds adaptation, and gives your team more room for judgment.' },
      { title: 'What to ask', body: 'Where is your team repeating context instead of reusing it?' },
    ],
    reel_script:
      "Open on a team juggling docs, Slack, and drafts. Cut to repeated review loops. Close on: 'The real bottleneck isn't output. It's repeated context.'",
  },
  scorecard: {
    hook_strength: 8,
    cta_clarity: 8,
    hashtag_relevance: 8,
    platform_fit: 9,
    tone_match: 8,
    originality: 8,
    average: 8.2,
  },
  critique:
    'Strong fallback demo output: practical, easy to narrate live, and clearly positioned as strategic content rather than generic AI copy.',
} satisfies InstagramResult
