import type { InstagramFormPreset } from '../components/InstagramForm'
import type { AppLanguage } from '../components/LanguageProvider'
import type { InstagramResult } from './instagram-types'

export interface LegalDemoScenario extends InstagramFormPreset {
  strategy: string
  platformOutcomes: string[]
}

export interface LegalVoicePreset {
  id: 'trusted-counsel' | 'plain-english' | 'executive-brief'
  label: string
  description: string
  instructions: string
}

export function getLegalDemoValueProp(language: AppLanguage) {
  return language === 'zh-TW'
    ? 'Neoxra 把一個法律主題轉成清楚、可發佈、可信任的多平台內容，讓團隊更快對外溝通。'
    : 'Neoxra turns one legal topic into clear, platform-ready thought leadership your team can review, trust, and publish fast.'
}

export function getLegalDemoPresets(language: AppLanguage): readonly LegalDemoScenario[] {
  if (language === 'zh-TW') {
    return [
      {
        label: 'AI 法律教育',
        topic: '律所如何使用 AI 做客戶教育，同時維持專業與風險意識',
        templateText:
          '語氣專業、清楚、值得信任。先點出客戶常見誤解，再用白話解釋真正的法律問題，最後給一個實際下一步。避免過度承諾，也避免把 AI 講得太神。',
        goal: 'authority',
        strategy: '把 AI 從 buzzword 轉成可信的客戶教育工具，強調清楚與風險意識，而不是自動化噱頭。',
        platformOutcomes: [
          'Instagram：用 myth-versus-reality 輪播做客戶教育',
          'LinkedIn：建立律所專業觀點與可信度',
          'Threads：用簡短討論串說清楚哪些流程適合、哪些不適合交給 AI',
        ],
      },
      {
        label: '合約迷思',
        topic: '創業者最常相信的合約迷思，以及它如何變成可避免的風險',
        templateText:
          '採用專業服務型語氣。先講一個創業者常見迷思，再說明它為什麼不完整或錯誤，給一個具體後果，最後用白話提出建議。',
        goal: 'save',
        strategy: '把法律建議轉成創業者看得懂的風險敘事：一個迷思、一個商業後果、一個修正動作。',
        platformOutcomes: [
          'Instagram：輪播拆解迷思與風險',
          'LinkedIn：把法律風險翻譯成商業語言',
          'Threads：快速的 myth-versus-reality 討論串',
        ],
      },
      {
        label: '新創檢查清單',
        topic: '多數新創都拖到太晚才處理的法律檢查清單',
        templateText:
          '以可信顧問語氣呈現。用 checklist 結構、重點清楚、帶實務感與可信 CTA，不要太 alarmist，但要有迫切性。',
        goal: 'engagement',
        strategy: '把抽象法律流程包裝成創業者能立刻採取行動的營運清單。',
        platformOutcomes: [
          'Instagram：可收藏與分享的 checklist 輪播',
          'LinkedIn：營運角度切入的預防型法律內容',
          'Threads：快速列出團隊最常延後處理的法律問題',
        ],
      },
      {
        label: '雇傭法提醒',
        topic: '中小企業在下一次招募前應該知道的雇傭法重點',
        templateText:
          '用白話教育型語氣，冷靜、實用、易讀。聚焦一個可避免的錯誤、一個合規觀念轉變，以及一個本週就能做的動作。',
        goal: 'authority',
        strategy: '把雇傭法翻譯成老闆能直接理解的決策提醒，讓律所聽起來實務又可靠。',
        platformOutcomes: [
          'Instagram：給 SMB 老闆的實用招募風險輪播',
          'LinkedIn：以預防性合規為核心的專業貼文',
          'Threads：輕量但可信的招募法律提醒串',
        ],
      },
    ] as const
  }

  return [
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
}

export function getLegalVoicePresets(language: AppLanguage): readonly LegalVoicePreset[] {
  if (language === 'zh-TW') {
    return [
      {
        id: 'trusted-counsel',
        label: '可信法律顧問',
        description: '冷靜、可信、像合作夥伴。適合法律與專業服務品牌。',
        instructions:
          '用可信法律顧問的語氣寫作：冷靜、精準、白話、以可信度為優先。避免過度誇張、避免俚語，重點是清楚與穩定。',
      },
      {
        id: 'plain-english',
        label: '白話教育型',
        description: '把法律風險翻譯成創業者、營運者與 SMB 老闆聽得懂的語言。',
        instructions:
          '使用白話法律教育語氣。把法律概念翻譯成人能理解的實用語言，不要太學術，也不要過度簡化。重點是有用與可執行。',
      },
      {
        id: 'executive-brief',
        label: '高階簡報型',
        description: '更精煉、更策略，適合高階主管與專業服務決策者。',
        instructions:
          '用精煉且高層次的語氣。先講商業影響，再講法律重點，讓內容感覺策略、可信、可決策。',
      },
    ] as const
  }

  return [
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
}

export function getLegalGoldenScenario(language: AppLanguage) {
  if (language === 'zh-TW') {
    return {
      label: '創業者合約迷思',
      topic: '創業者最常相信的合約迷思，以及它如何變成可避免的風險',
      transformation:
        'Neoxra 把抽象的法律提醒，轉成一個可以被創業者快速理解的教育內容：一個迷思、一個商業風險、一個白話修正，以及一個可立即採取的動作。',
      platformOutcomes: [
        'Instagram：輪播拆解迷思與風險，方便收藏與分享',
        'LinkedIn：用商業語言建立專業權威',
        'Threads：簡短 myth-versus-reality 討論串',
      ],
      result: {
        style_analysis: {
          tone_keywords: ['可信', '白話', '創業者導向'],
          structural_patterns: ['迷思先行', '風險解釋', '實用下一步'],
          vocabulary_notes: '避免法律術語，透過具體後果與商業影響維持專業感。',
        },
        content: {
          caption:
            "最容易讓新創付出代價的合約迷思之一是：『看起來很 standard，就可以快速簽。』\n\n很多創業者踩雷的地方，不是戲劇性的條款，而是那些被忽略的細節：自動續約、過寬的 IP 條款、模糊的終止權、責任上限寫得不合理。\n\n真正的解法不是把每份合約都當成法條考試，而是知道哪些條款會真的影響你的現金流、控制權與風險。\n\n如果你的團隊把每份合約都當作 standard，你可能比自己以為的，承擔了更多商業風險。\n\n下次簽名前，先問一個問題：如果合作關係出了問題，這份協議裡哪一條真的會影響結果？\n\n#新創 #合約 #法律營運 #創業者",
          hook_options: [
            '「standard」這個字，可能比你想像中更容易讓新創付出代價。',
            '如果你的團隊沒有壓力測試關鍵條款，你不是在加速，而是在預支風險。',
            '多數新創的合約錯誤，都發生在大家以為沒什麼特別的那一刻。',
          ],
          hashtags: ['#新創', '#合約', '#法律營運', '#創業者'],
          carousel_outline: [
            { title: '迷思', body: '看起來 standard，就可以快速簽。' },
            { title: '現實', body: '常見條款一樣可能造成現金、控制權與 IP 風險。' },
            { title: '風險在哪', body: '自動續約、責任上限、終止權與權利歸屬。' },
            { title: '成熟團隊怎麼做', body: '先抓出真正影響風險與槓桿的 2-3 個條款。' },
            { title: '商業影響', body: '更快的審閱、更少的意外、更好的談判位置。' },
          ],
          reel_script:
            "開場：創業者說『這只是 standard contract。』接著切到自動續約、責任上限、IP 條款被標示。結尾：『Standard 不等於安全，只代表它很常見。』",
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
          '很適合律所 demo：可信、具體、實務，不會過度嚇人，同時能把律所定位成策略型顧問。',
      } satisfies InstagramResult,
    } as const
  }

  return {
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
}
