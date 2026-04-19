import type { AppLanguage } from '../components/LanguageProvider'
import type { InstagramResult } from './instagram-types'

export function getInstagramSampleResult(language: AppLanguage) {
  if (language === 'zh-TW') {
    return {
      style_analysis: {
        tone_keywords: ['清楚', '創業者導向', '實用'],
        structural_patterns: ['hook first', '短段落', '明確 takeaway'],
        vocabulary_notes: '用簡單的商業語言說明流程改變，避免過度 hype。',
      },
      content: {
        caption:
          "多數小團隊真正缺的，不是更多人，而是更少重複決策。\n\n有位創辦人原本以為團隊卡住是因為執行速度不夠。後來才發現，真正的瓶頸是同樣的 3 個人不斷重講優先順序、重寫背景、重看同一批內容。\n\n解法不是立刻擴編，而是建立一個更好的系統，讓一份核心想法可以快速被轉成多平台可用的內容、說法與下一步。\n\nAI 真正有幫助的地方，不是取代判斷，而是減少重複工作，讓最重要的人把時間花在判斷，而不是一直重講。\n\n如果你的團隊覺得慢，先問這個問題：你們現在花多少時間在重複背景，而不是重用背景？\n\n#新創 #AI工作流 #內容系統 #創業者",
        hook_options: [
          '小團隊真正拖慢進度的，通常不是野心，而是背景資訊一再被重建。',
          '如果你的團隊覺得慢，問題可能不是速度，而是重複。',
          '很多創辦人以為需要更多產出，但真正需要的是更少重複工作。',
        ],
        hashtags: ['#新創', '#AI工作流', '#內容系統', '#創業者'],
        carousel_outline: [
          { title: '真正的瓶頸', body: '小團隊變慢，往往不是做太少，而是同樣的背景一直被重講。' },
          { title: '這會怎麼發生', body: '重複 review、重複說明、重複對齊明明已經接近完成的工作。' },
          { title: '改變在哪裡', body: '一份核心想法不再被各平台重做，而是被快速適配。' },
          { title: 'AI 的價值', body: '減少重複、加快適配，讓團隊把時間留給判斷。' },
          { title: '該問的問題', body: '你的團隊現在是在重複背景，還是在重用背景？' },
        ],
        reel_script:
          '開場是團隊同時打開 docs、Slack、草稿。接著切到一樣的 review loop。結尾：真正的瓶頸不是產出，而是背景資訊被重複建立。',
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
        '很適合 demo 的 sample output：實用、容易現場解說，也清楚表達 Neoxra 是策略型內容系統，而不是泛用文字生成器。',
    } satisfies InstagramResult
  }

  return {
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
}
