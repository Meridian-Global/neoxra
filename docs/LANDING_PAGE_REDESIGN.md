# Neoxra Landing Page Redesign Specification

---

## 1. Analysis: Current vs Target

### What the target reference does right (that we lack)

**Hero section:** The target uses a split layout — bold headline + product mockups floating on the right (Instagram carousel, SEO article, Threads post, Facebook post all visible simultaneously). This immediately proves the product value. Our current hero is text-only with an inline text callout about the orchestra metaphor — zero visual proof.

**Visual depth:** The target uses ambient glow effects behind cards, gradient borders, subtle radial gradients on the background, and layered depth with shadows. Our current page is flat dark cards with thin borders — feels like a developer tool, not a premium SaaS.

**Social proof:** The target has a stats bar (4 platforms, 80% time saved, 300% efficiency, 10K+ users) with icons. We have nothing — no numbers, no trust signals, no credibility markers.

**Platform identity:** The target gives each platform its own color (Instagram = pink/magenta, SEO = green, Threads = purple, Facebook = blue). Each platform card has a colored left border and platform icon. Our current cards are all the same color — they look interchangeable.

**CTA strength:** The target has a gradient-filled CTA button in the hero ("免費開始使用") with friction-reducing copy below ("無需信用卡 · 3分鐘快速開始"). Our buttons are plain outlined text with no urgency or friction reduction.

### What our current page does right (keep these)

- **Clean bilingual COPY system** — the en/zh-TW pattern is solid
- **"Why Not Just Use ChatGPT?"** — this is a strong differentiation section. Keep the content, upgrade the visual treatment
- **Orchestra metaphor** — good concept, but needs visual expression, not a text block
- **Output showcase** (Instagram + Article side-by-side) — good idea, needs much richer execution

---

## 2. Design System

### Color Palette

```
/* Dark Theme (Primary) */
--bg-page:           #0a0a0f;          /* near-black with blue tint */
--bg-section:        #0f1019;          /* slightly lighter for alternating sections */
--bg-card:           #14151f;          /* card surfaces */
--bg-card-hover:     #1a1b2e;          /* card hover state */
--bg-elevated:       #1e1f33;          /* modals, dropdowns */

/* Borders */
--border-subtle:     rgba(255,255,255,0.06);
--border-default:    rgba(255,255,255,0.10);
--border-bold:       rgba(255,255,255,0.16);

/* Text */
--text-primary:      #f0f0f5;
--text-secondary:    #9ca3af;          /* gray-400 */
--text-tertiary:     #6b7280;          /* gray-500 */

/* Accent: Amber/Orange (primary brand) */
--accent-primary:    #f59e0b;          /* amber-500 */
--accent-hover:      #fbbf24;          /* amber-400 */
--accent-subtle:     rgba(245,158,11,0.15);
--accent-glow:       rgba(245,158,11,0.20);

/* Accent: Purple (secondary, for depth) */
--purple-accent:     #8b5cf6;          /* violet-500 */
--purple-subtle:     rgba(139,92,246,0.15);
--purple-glow:       rgba(139,92,246,0.12);

/* Platform Colors */
--platform-instagram: #e1306c;         /* Instagram pink */
--platform-seo:       #10b981;         /* emerald-500 */
--platform-threads:   #8b5cf6;         /* violet-500 */
--platform-facebook:  #3b82f6;         /* blue-500 */

/* Gradients */
--gradient-hero:     linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
--gradient-card:     linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(139,92,246,0.08) 100%);
--gradient-cta-bg:   linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
--gradient-glow:     radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(245,158,11,0.06), transparent 40%);
```

### Typography

```
/* Font stack */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Scale (desktop) */
--text-hero:         56px / 1.05 / -0.03em / 800 weight
--text-h2:           36px / 1.15 / -0.02em / 700 weight
--text-h3:           24px / 1.3  / -0.01em / 700 weight
--text-body-lg:      18px / 1.6  / 0       / 400 weight
--text-body:         15px / 1.7  / 0       / 400 weight
--text-small:        13px / 1.5  / 0       / 500 weight
--text-badge:        11px / 1.0  / 0.08em  / 600 weight (uppercase)

/* Mobile scale */
--text-hero-mobile:  36px / 1.1  / -0.02em / 800 weight
--text-h2-mobile:    28px / 1.2  / -0.02em / 700 weight
```

### Spacing

```
--space-section:     120px;    /* between major sections (desktop) */
--space-section-sm:  80px;     /* mobile */
--space-inner:       48px;     /* inside section, between heading and content */
--space-card-gap:    24px;     /* between grid cards */
--space-card-pad:    32px;     /* inside cards */
```

### Component Patterns

**Card with glow border:**
```css
.card-glow {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.card-glow:hover {
  border-color: var(--border-bold);
  transform: translateY(-2px);
}
/* Ambient glow on hover */
.card-glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(245,158,11,0.3), rgba(139,92,246,0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s;
}
.card-glow:hover::before { opacity: 1; }
```

**Primary CTA button:**
```css
.btn-primary {
  background: var(--gradient-cta-bg);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  padding: 14px 32px;
  border-radius: 10px;
  border: none;
  box-shadow: 0 0 20px rgba(245,158,11,0.25);
  transition: all 0.15s;
}
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(245,158,11,0.4);
  transform: translateY(-1px);
}
```

**Platform card with colored accent:**
```css
.platform-card {
  border-left: 3px solid var(--platform-color);
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
}
```

---

## 3. Page Structure — Section by Section

### Section 0: Navigation Bar

**Purpose:** Brand identity, primary navigation, CTA exposure.

**Layout:** Fixed top bar, max-width 1200px centered.
```
[Logo: Neoxra]   [Generate All (button)]  [Products ▾]  [Use Cases ▾]  [Pricing]   [EN/繁中]  [Login]  [Get Started (accent)]
```

**Key changes from current:**
- "Generate All" gets a small filled accent button in the nav (this is the primary product action)
- Products dropdown: Instagram Studio, SEO Articles, Threads, Facebook
- Use Cases dropdown: Law Firms, Content Agencies, Creators
- Language toggle + dark/light toggle grouped right
- "Get Started" = filled amber button, distinct from other nav items

**Tailwind structure:**
```html
<nav class="fixed top-0 w-full z-50 border-b border-white/6 bg-[#0a0a0f]/80 backdrop-blur-xl">
  <div class="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
    <!-- Left: Logo + nav links -->
    <!-- Right: Language toggle, login, CTA button -->
  </div>
</nav>
```

---

### Section 1: Hero

**Purpose:** Instantly communicate what Neoxra does, show the product visually, drive first CTA click.

**Layout:** Two-column split (55% text left, 45% product visuals right). Stacks vertically on mobile.

**Left column:**
```
[Badge] ✦ AI 內容交響樂團 / ✦ AI Content Orchestra

[Hero headline]
把想法變成流量 / Turn Ideas Into Traffic
(with "流量/Traffic" in gradient amber-to-orange text)

[Subheadline]
一個想法，四個平台，直接發布。
/ One idea. Four platforms. Ready to publish.

[Body text - 2 lines max]
Neoxra 將一個想法轉化為 Instagram 輪播、SEO 文章、
Threads 貼文與 Facebook 內容，結構完整、格式就緒、可直接上線。

[CTA buttons]
[免費開始使用 (filled amber)]  [預約 Demo (outlined)]

[Trust line]
✓ 無需信用卡  ✓ 3 分鐘快速開始  ✓ 支援繁中
```

**Right column:**
Floating product mockup composition — 4 overlapping preview cards arranged in a staggered layout:
- Instagram carousel card (front, slightly left, largest)
- SEO article card (back right, slightly higher)
- Threads post card (bottom left, partially behind Instagram)
- Facebook post card (bottom right, partially behind SEO)

Each mockup card has:
- Platform label badge (e.g., "Instagram 輪播")
- Real content preview (Chinese text from the law firm demo)
- Subtle shadow and border glow matching platform color
- Slight rotation (2-3°) for depth

**Background:** Radial gradient glow centered behind the mockup composition:
```css
background: radial-gradient(
  800px circle at 70% 40%,
  rgba(245,158,11,0.08),
  rgba(139,92,246,0.04) 40%,
  transparent 70%
);
```

**Tailwind structure:**
```html
<section class="relative pt-32 pb-20 overflow-hidden">
  <!-- Background glow -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-amber-500/[0.06] blur-3xl"></div>
    <div class="absolute top-1/3 right-1/3 w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-3xl"></div>
  </div>

  <div class="relative max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1fr_0.8fr] gap-12 items-center">
    <!-- Left: text -->
    <div>
      <span class="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-400 tracking-wide">
        ✦ AI Content Orchestra
      </span>
      <h1 class="mt-6 text-[56px] font-extrabold leading-[1.05] tracking-[-0.03em]">
        Turn Ideas Into
        <span class="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Traffic</span>
      </h1>
      <p class="mt-4 text-xl font-semibold text-white/90">
        One idea. Four platforms. Ready to publish.
      </p>
      <p class="mt-4 text-base text-gray-400 max-w-lg leading-relaxed">
        Neoxra turns a single idea into Instagram carousels, SEO articles, Threads posts, and Facebook content — structured, formatted, and built to perform.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="/generate" class="btn-primary">Get Started Free</a>
        <a href="mailto:..." class="btn-secondary">Book a Demo</a>
      </div>
      <div class="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
        <span>✓ No credit card</span>
        <span>✓ 3-minute setup</span>
        <span>✓ 繁體中文 supported</span>
      </div>
    </div>

    <!-- Right: floating product mockups -->
    <div class="relative h-[500px] hidden lg:block">
      <!-- 4 overlapping platform preview cards positioned absolutely -->
    </div>
  </div>
</section>
```

---

### Section 2: Stats Bar (Social Proof)

**Purpose:** Build immediate credibility with numbers.

**Layout:** Horizontal 4-column grid with icon + number + label per stat. Full-width bar with subtle top/bottom borders.

**Content:**
```
⚡ 4 平台內容     🕐 節省 80% 時間     📈 提升 300% 效率     👥 10,000+ 用戶
   一次生成            從構想到發布          內容產出速度           專業團隊信賴
```

**EN:**
```
⚡ 4 Platforms     🕐 80% Time Saved    📈 300% More Output   👥 10,000+ Users
   One generation     Idea to publish      Content velocity       Trusted by pros
```

**Visual:** Each stat has a 40x40 icon container with amber/purple subtle background. Numbers in white bold 24px, labels in gray-400 13px.

**Tailwind structure:**
```html
<section class="border-y border-white/6 bg-[#0f1019]">
  <div class="max-w-[1200px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
        <!-- icon -->
      </div>
      <div>
        <div class="text-2xl font-bold text-white">4 Platforms</div>
        <div class="text-xs text-gray-500">One generation</div>
      </div>
    </div>
    <!-- repeat for each stat -->
  </div>
</section>
```

**Note for Hogan:** If 10,000+ users is aspirational, change to something defensible: "1 paying client" is more credible for YC than a fake number. Consider: "First Client Live · 95% Gross Margin · $0.17/package · 4 Platforms" — these are real numbers from the system design.

---

### Section 3: Product Showcase (Visual Proof)

**Purpose:** Show REAL output side-by-side — prove the product works.

**Layout:** Two-column grid. Left = Instagram output card. Right = SEO article output card. Each is a tall card with platform badge, real content preview, and "generated by Neoxra" note.

**Key changes from current:**
- Instagram card shows actual carousel slides in a 2×2 mini-grid (not just text)
- Each carousel slide has the dark card treatment with slide number
- Article card shows SEO title, heading outline with left accent borders, and opening paragraph
- Both cards have platform-colored top border (pink for IG, green for SEO)
- Add a subtle "Generated from: '車禍理賠流程'" label above both cards
- Below both cards: "以上內容由 Neoxra 自動產出，未經人工修改" note

**This section is already close in the current design.** Main upgrades: richer card styling, platform colors, and the carousel mini-grid.

**Tailwind structure:**
```html
<section class="py-24 bg-[#0a0a0f]">
  <div class="max-w-[1200px] mx-auto px-6">
    <p class="text-center text-lg font-medium text-amber-400 mb-12">
      Every brand needs content across five platforms. Almost no team can keep up.
    </p>
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Instagram output card -->
      <div class="rounded-2xl border border-white/10 bg-[#14151f] p-6 shadow-lg
                  border-t-2 border-t-[#e1306c]">
        <!-- Header: title + platform badge -->
        <!-- Mini carousel grid (2x2) -->
        <!-- Caption preview -->
      </div>
      <!-- Article output card -->
      <div class="rounded-2xl border border-white/10 bg-[#14151f] p-6 shadow-lg
                  border-t-2 border-t-[#10b981]">
        <!-- Header: title + platform badge -->
        <!-- SEO title, outline, opening paragraph -->
      </div>
    </div>
    <p class="mt-6 text-center text-sm text-gray-500">
      Content generated by Neoxra without manual editing.
    </p>
  </div>
</section>
```

---

### Section 4: How It Works — "Your Content Orchestra"

**Purpose:** Explain the system using the orchestra metaphor. Make it visual, not textual.

**Layout:** Section heading + subheading + 3-step horizontal flow with connecting line.

**Heading:**
```
內容交響樂團如何運作 / How Your Content Orchestra Works
你是指揮，AI 代理人是專精樂手。你給方向，他們同步執行。
/ You're the conductor. AI agents are the musicians. You direct, they perform in sync.
```

**3 Steps (connected with a horizontal dotted line + amber dots):**
```
Step 1                        Step 2                         Step 3
🎯 輸入想法                    🎵 AI 樂手協作                  📦 獲得完整內容包
Input your idea               AI musicians collaborate       Get your content package

輸入一個核心想法或主題，         各專精代理人同步創作，           結構完整、格式就緒，
選擇目標受眾與內容目標。         為不同平台量身打造內容。         可直接發布的內容系統。
```

**Visual treatment:**
- Each step is a card (200px wide) with a 48x48 icon in an amber/purple gradient circle
- Steps connected by a horizontal line with small circles at each connection point
- Step numbers: "1", "2", "3" in small amber badges on the connecting line
- Cards have subtle gradient border on hover

**Tailwind structure:**
```html
<section class="py-24 bg-[#0f1019]">
  <div class="max-w-[1200px] mx-auto px-6 text-center">
    <h2 class="text-4xl font-bold tracking-tight">How Your Content Orchestra Works</h2>
    <p class="mt-4 text-gray-400 text-lg">
      You're the conductor. AI agents are the musicians. You direct, they perform in sync.
    </p>
    <div class="mt-16 relative flex items-start justify-center gap-8 max-w-3xl mx-auto">
      <!-- Connecting line (absolute positioned) -->
      <div class="absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-amber-500/30 via-amber-500/60 to-amber-500/30"></div>

      <!-- Step cards -->
      <div class="relative flex-1 text-center">
        <div class="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
          🎯
        </div>
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-400">1</div>
        <h3 class="mt-5 text-lg font-bold">Input Your Idea</h3>
        <p class="mt-2 text-sm text-gray-400">
          Enter your topic, choose your audience and content goal.
        </p>
      </div>
      <!-- Repeat for steps 2, 3 -->
    </div>
  </div>
</section>
```

---

### Section 5: Feature Grid — "Not Just Content. Traffic."

**Purpose:** Differentiate from "just another AI writer." Explain WHY this generates traffic, not just text.

**Heading:**
```
不只是生成內容，而是創造流量
/ Not Just Content Generation. Traffic Creation.
```

**Layout:** 4-column grid of feature cards.

**Cards:**

| Icon | Title | Description |
|------|-------|-------------|
| 🎯 | 精準平台適配 / Platform-Native | 每個平台都有專屬格式與內容策略，最大化觸及與互動。/ Each platform gets its own format and content strategy. |
| 📐 | 結構完整 / Structured Output | 標題、內文、標籤、CTA、視覺建議，一應俱全。/ Title, body, hashtags, CTA, visual suggestions — all included. |
| ✅ | 直接發布 / Publish-Ready | 不需要編輯，不用調整，複製貼上即可上線。/ No editing needed. Copy, paste, publish. |
| 📈 | 帶來真實流量 / Drives Real Traffic | 專業 SEO 與社群演算法優化，讓內容被更多人看到。/ SEO optimization and social algorithm awareness built in. |

**Visual treatment:** Each card has a 48x48 icon in a subtle gradient circle (amber/purple), title in white bold, description in gray-400. Cards have `card-glow` hover effect.

**Tailwind structure:**
```html
<section class="py-24 bg-[#0a0a0f]">
  <div class="max-w-[1200px] mx-auto px-6 text-center">
    <h2 class="text-4xl font-bold tracking-tight">Not Just Content. Traffic.</h2>
    <div class="mt-12 grid md:grid-cols-2 xl:grid-cols-4 gap-6">
      <div class="rounded-2xl border border-white/8 bg-[#14151f] p-8 text-left hover:border-white/16 transition-all">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">🎯</div>
        <h3 class="mt-5 text-lg font-bold">Platform-Native</h3>
        <p class="mt-3 text-sm text-gray-400 leading-relaxed">
          Each platform gets its own format, strategy, and optimization.
        </p>
      </div>
      <!-- repeat for other 3 cards -->
    </div>
  </div>
</section>
```

---

### Section 6: Why Not ChatGPT? (Differentiation)

**Purpose:** Address the #1 comparison every visitor makes. Kill it directly.

**Layout:** Centered callout card with subtle amber border glow. Not a full section — a compact, punchy card.

**Content:**
```
[Title] Why Not Just Use ChatGPT?

ChatGPT gives you text. Neoxra gives you a content package.

Each output is platform-native: Instagram has carousel slides with visual structure,
SEO articles have heading hierarchy and meta descriptions,
Threads posts respect the 500-character limit.

And every output matches your brand voice — consistently, across every platform, every time.
```

**Visual treatment:** Single card, centered, max-width 800px. Subtle gradient border (amber → purple). Background slightly lighter than page. No icon — just sharp copy.

**Tailwind structure:**
```html
<section class="py-16 bg-[#0f1019]">
  <div class="max-w-3xl mx-auto px-6">
    <div class="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-purple-500/[0.04] p-10 text-center">
      <h2 class="text-2xl font-bold">Why Not Just Use ChatGPT?</h2>
      <p class="mt-6 text-gray-300 leading-relaxed">
        ChatGPT gives you text. <span class="text-white font-semibold">Neoxra gives you a content package.</span>
      </p>
      <p class="mt-4 text-gray-400 text-sm leading-relaxed max-w-xl mx-auto">
        Each output is platform-native: Instagram has carousel slides with visual structure,
        SEO articles have heading hierarchy and meta descriptions,
        Threads posts respect the 500-character limit.
        Every output matches your brand voice — consistently, across every platform, every time.
      </p>
    </div>
  </div>
</section>
```

---

### Section 7: Platform Grid — "One Engine, Multiple Platforms"

**Purpose:** Show all 4 supported platforms with platform-specific visual identity.

**Heading:**
```
一個引擎，多平台輸出
/ One Engine, Multiple Platforms

同一個核心想法，在不同平台發揮最大影響力
/ Same core idea, maximum impact on every platform
```

**Layout:** 4-column grid. Each card has:
- Platform icon (real logo or styled icon) in a circle with platform color
- Platform name (bold)
- One-line description
- "Learn more →" link in platform color
- Left border in platform color (3px)

**Cards:**

| Platform | Color | Description |
|----------|-------|-------------|
| Instagram 輪播 | #e1306c (pink) | 視覺化內容，吸引滑動與互動 / Visual content that stops the scroll |
| SEO 文章 | #10b981 (green) | 深度內容，提升搜尋排名 / Deep content that ranks on search |
| Threads 貼文 | #8b5cf6 (purple) | 快速對話，引發討論與分享 / Conversational content that sparks discussion |
| Facebook 內容 | #3b82f6 (blue) | 建立社群信任，促進轉換 / Community trust and conversion |

**Tailwind structure:**
```html
<section class="py-24 bg-[#0a0a0f]">
  <div class="max-w-[1200px] mx-auto px-6">
    <h2 class="text-4xl font-bold tracking-tight">One Engine, Multiple Platforms</h2>
    <p class="mt-3 text-gray-400 text-lg">Same idea, maximum impact everywhere.</p>
    <div class="mt-12 grid md:grid-cols-2 xl:grid-cols-4 gap-5">

      <!-- Instagram card -->
      <a href="/instagram" class="group rounded-xl border border-white/8 border-l-[3px] border-l-[#e1306c] bg-[#14151f] p-6 hover:border-white/16 transition-all hover:-translate-y-0.5">
        <div class="w-10 h-10 rounded-xl bg-[#e1306c]/10 flex items-center justify-center">
          <!-- IG icon -->
        </div>
        <h3 class="mt-4 text-lg font-bold">Instagram</h3>
        <p class="mt-2 text-sm text-gray-400">carousel + caption + hooks + hashtags</p>
        <div class="mt-5 text-sm font-semibold text-[#e1306c] group-hover:underline">
          了解更多 →
        </div>
      </a>

      <!-- Repeat for SEO, Threads, Facebook with respective colors -->
    </div>
  </div>
</section>
```

---

### Section 8: Use Cases

**Purpose:** Show vertical applicability. Prove this isn't just for one type of business.

**Layout:** 3-column grid.

**Cards:**

| Vertical | Status | Description |
|----------|--------|-------------|
| 法律事務所 / Law Firms | Live (link to /demo/legal) | 把法律知識變成能被看見、被搜尋、被詢問的內容資產 |
| 內容行銷團隊 / Content Agencies | Coming soon | 白牌多客戶內容生成，不需重建流程 |
| 自媒體創作者 / Creators | Coming soon | 把一個主題延展成多平台可發布的內容包 |

**Visual:** Live cards have colored left border (amber) and are links. "Coming soon" cards have a badge and are dimmed slightly.

---

### Section 9: Final CTA

**Purpose:** Convert remaining visitors.

**Layout:** Full-width card with gradient background (amber), large heading, primary button, trust line.

**Content:**
```
準備好把想法變成流量了嗎？
/ Ready to Turn Ideas Into Traffic?

加入數千個專業團隊，讓 Neoxra 成為你的內容交響樂團。
/ Join the teams that let Neoxra orchestrate their content.

[免費開始使用 (white button on amber bg)]
✓ 無需信用卡 · 3 分鐘設定完成
```

**Tailwind structure:**
```html
<section class="py-24 bg-[#0a0a0f]">
  <div class="max-w-[900px] mx-auto px-6">
    <div class="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-12 text-center shadow-2xl shadow-amber-500/20">
      <h2 class="text-3xl font-bold text-white tracking-tight">
        Ready to Turn Ideas Into Traffic?
      </h2>
      <p class="mt-4 text-amber-100/80">
        Join the teams that let Neoxra orchestrate their content.
      </p>
      <a href="/generate" class="mt-8 inline-flex items-center justify-center rounded-xl bg-white text-amber-600 font-semibold px-8 py-3.5 text-base hover:bg-amber-50 transition shadow-lg">
        Get Started Free
      </a>
      <p class="mt-4 text-sm text-amber-100/60">
        ✓ No credit card · 3 minutes to set up
      </p>
    </div>
  </div>
</section>
```

---

### Section 10: Footer

**Layout:** Simple, minimal. Brand etymology line + copyright.

```
Neo (new) + Orchestra. You conduct. AI performs. Traffic follows.
Neoxra © 2026 · Meridian Global LLC
```

---

## 4. Conversion Improvements

### CTA Placement (4 touchpoints)
1. **Nav bar:** "Get Started" button always visible
2. **Hero:** Primary "Get Started Free" + secondary "Book a Demo"
3. **Platform grid:** Each platform card links to its studio page
4. **Final CTA:** Full-width amber gradient card

### Trust Signals
- Stats bar immediately after hero (even aspirational numbers are better than nothing)
- "Generated by Neoxra without manual editing" below showcase
- "No credit card" + "3 minutes" friction reducers at both CTA points
- Law firm as live use case (real customer proof)

### Visual Clarity
- Platform colors create instant recognition (pink = IG, green = SEO, etc.)
- Gradient text on "Traffic" in hero draws the eye to the key value word
- Orchestra metaphor is now visual (3-step flow) instead of a text block
- "Why not ChatGPT?" is a focused callout, not buried in page flow

### Cognitive Load Reduction
- Each section has ONE clear purpose
- Feature grid uses icons instead of paragraphs
- Stats use numbers instead of sentences
- CTA copy is action-oriented, not descriptive

---

## 5. Component Breakdown for Engineering

### New Components to Create

```
frontend/components/landing/
├── NavBar.tsx              # Fixed nav with CTA, dropdowns, language toggle
├── HeroSection.tsx         # Split layout: text + floating product mockups
├── StatsBar.tsx            # 4-stat horizontal bar
├── ProductShowcase.tsx     # Instagram + SEO output side-by-side
├── OrchestraSteps.tsx      # 3-step connected flow
├── FeatureGrid.tsx         # 4-card feature grid
├── ChatGPTComparison.tsx   # Differentiation callout card
├── PlatformGrid.tsx        # 4-platform cards with color coding
├── UseCaseGrid.tsx         # 3-vertical cards
├── FinalCTA.tsx            # Gradient CTA card
├── Footer.tsx              # Brand etymology + copyright
└── ProductMockup.tsx       # Floating multi-platform preview composition
```

### Shared UI Components

```
frontend/components/ui/
├── GlowCard.tsx            # Card with gradient border hover effect
├── PlatformBadge.tsx       # Small colored badge (e.g., "Instagram")
├── GradientText.tsx        # Text with gradient color fill
├── StatItem.tsx            # Icon + number + label
├── StepCard.tsx            # Numbered step with icon and description
└── CTAButton.tsx           # Primary/secondary button variants
```

### CSS Additions (globals.css or tailwind config)

```css
/* Add to tailwind.config.ts → theme.extend */
colors: {
  'platform-instagram': '#e1306c',
  'platform-seo': '#10b981',
  'platform-threads': '#8b5cf6',
  'platform-facebook': '#3b82f6',
},
backgroundImage: {
  'gradient-hero': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'gradient-card': 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(139,92,246,0.08) 100%)',
  'gradient-cta': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
},
boxShadow: {
  'glow-amber': '0 0 20px rgba(245,158,11,0.25)',
  'glow-purple': '0 0 20px rgba(139,92,246,0.20)',
},
```

---

## 6. Codex Implementation Prompt

```
## Goal
Redesign the Neoxra landing page to match a premium dark-theme SaaS style with amber/purple accents,
product mockups in the hero, and platform-specific color coding.

## Context
- Repo: neoxra (frontend)
- File: frontend/app/page.tsx — the main landing page
- The page already has a bilingual COPY system (en/zh-TW) with useLanguage() hook
- Components are in frontend/components/landing/
- Design tokens are in tailwind.config.ts and CSS variables in globals.css
- Reference: docs/LANDING_PAGE_REDESIGN.md contains the full design spec

## What to build

### Phase 1: Design System Setup
1. Update tailwind.config.ts with new colors (platform-instagram, platform-seo, etc.),
   gradients, and box shadows as specified in the design doc.
2. Add CSS variables to globals.css for --bg-page, --bg-card, --accent-glow, etc.
3. Create shared UI components:
   - frontend/components/ui/GlowCard.tsx (card with gradient border hover)
   - frontend/components/ui/GradientText.tsx (text with gradient fill)
   - frontend/components/ui/CTAButton.tsx (primary amber / secondary outlined variants)

### Phase 2: Hero Section Rebuild
1. Rewrite frontend/components/landing/HeroSection.tsx
2. Split layout: 55/45 text + product mockups
3. Add gradient text on "Traffic" / "流量"
4. Add amber badge "✦ AI Content Orchestra"
5. Add friction reducers below CTA buttons
6. Create ProductMockup.tsx — 4 overlapping platform preview cards
7. Add background radial glow (amber + purple, positioned behind mockups)

### Phase 3: New Sections
1. Create StatsBar.tsx — 4 stats with icons
2. Rewrite OrchestraSteps.tsx (was StepsSection.tsx) — 3 connected steps
3. Create FeatureGrid.tsx — 4 feature cards
4. Create ChatGPTComparison.tsx — differentiation callout
5. Rewrite PlatformGrid section — add platform colors and icons
6. Rewrite FinalCTA section — gradient amber background

### Phase 4: Page Assembly
1. Update frontend/app/page.tsx to use new components in order:
   NavBar → Hero → StatsBar → ProductShowcase → OrchestraSteps →
   FeatureGrid → ChatGPTComparison → PlatformGrid → UseCases → FinalCTA → Footer
2. Update COPY objects with new text for both en and zh-TW
3. Update platform grid: SEO and Facebook are now live (not "coming soon")

## Constraints
- Keep the bilingual COPY pattern (Record<'en' | 'zh-TW', LocalizedCopy>)
- Keep useLanguage() hook usage
- Dark theme only for now (light theme is a future task)
- Use Tailwind CSS only — no external CSS libraries
- All components must be responsive (mobile-first, stack vertically)
- Do NOT change any backend code
- Do NOT change other pages

## Key Visual Rules
- Background: #0a0a0f base, #0f1019 for alternating sections
- Cards: #14151f with border-white/8, rounded-2xl
- Accent: amber-500 (#f59e0b) primary, violet-500 (#8b5cf6) secondary
- Platform colors: Instagram=#e1306c, SEO=#10b981, Threads=#8b5cf6, Facebook=#3b82f6
- Glow effects: use blur-3xl divs with low-opacity background colors
- Hero headline "Traffic" / "流量" in gradient-to-r from-amber-400 to-orange-500
- Primary CTA: bg-gradient amber, white text, shadow-glow-amber
- Cards hover: translateY(-2px), border brightens

## Testing
- Verify page renders correctly at 1440px, 1024px, 768px, 375px widths
- Verify language toggle switches all text
- Verify all links work (/generate, /instagram, /seo, /threads, /facebook, /demo/legal)
- Verify no hydration errors in Next.js

## Output
Summarize: all files created/modified, component hierarchy, how to verify visually.
```

---

## 7. Priority Order

1. **Phase 1 (30 min):** Design tokens in tailwind config + shared UI components
2. **Phase 2 (2 hrs):** Hero section rebuild — this is the highest-impact change
3. **Phase 3 (2 hrs):** New sections (stats bar, feature grid, ChatGPT comparison)
4. **Phase 4 (1 hr):** Page assembly, COPY updates, link fixes

Total estimated: ~5-6 hours of focused frontend work.
