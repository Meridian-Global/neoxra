# Neoxra System Design
## "One idea → Multi-platform publishable content"

---

# 1. SYSTEM ARCHITECTURE

## Overview

```
┌─────────────┐
│   INPUT      │  Raw idea + context
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PLANNER    │  Single Claude API call → Structured Brief
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│            GENERATION LAYER                  │
│                                              │
│  ┌───────────┐ ┌─────────┐ ┌───────────┐   │
│  │ Instagram  │ │  SEO    │ │  Threads  │   │
│  │  Agent     │ │  Agent  │ │   Agent   │   │
│  └─────┬─────┘ └────┬────┘ └─────┬─────┘   │
│        │             │            │          │
└────────┼─────────────┼────────────┼─────────┘
         │             │            │
         ▼             ▼            ▼
┌─────────────────────────────────────────────┐
│           OUTPUT FORMATTER                   │
│                                              │
│  JSON → Markdown preview                     │
│  JSON → HTML carousel render                 │
│  JSON → WordPress-ready HTML                 │
│  JSON → Copy-paste Threads text              │
└─────────────────────────────────────────────┘
```

## Implementation Reality

This entire system is **6 Python files + prompts**:

```
neoxra/
├── pipeline/
│   ├── run.py              # CLI entry: idea → all outputs
│   ├── planner.py          # Planner agent (1 API call)
│   ├── instagram_agent.py  # Instagram generation (1 API call)
│   ├── seo_agent.py        # SEO article generation (1 API call)
│   ├── threads_agent.py    # Threads generation (1 API call)
│   └── facebook_agent.py   # Reuses Instagram output + light transform
├── prompts/
│   ├── planner.txt
│   ├── instagram.txt
│   ├── seo.txt
│   ├── threads.txt
│   └── facebook.txt
├── output/
│   ├── formatter.py        # JSON → renderable formats
│   └── templates/
│       └── carousel.html   # HTML template for Instagram carousel
├── voice_profiles/
│   └── default.yaml
├── schemas/
│   └── output_schemas.py   # Pydantic models for strict output
└── run.py                  # Entry point
```

## How It Works (One Execution)

```
$ python run.py --idea "5 mistakes law firms make on social media" --industry "legal" --audience "managing partners"

Step 1: Planner receives idea → returns Brief JSON
Step 2: Brief fans out to 3 agents (parallel async calls)
Step 3: Each agent returns structured JSON
Step 4: Formatter renders outputs
Step 5: Files saved to /output/run_2026-04-21/
```

Total API calls per run: **4** (planner + 3 agents).
Total time: ~15-25 seconds (parallel generation).
Total cost: ~$0.15-0.30 per run.

## Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Language | Python | Fast to write, Claude SDK native |
| Framework | None (raw scripts) | No time for FastAPI yet |
| LLM | Claude Sonnet via API | Best structured output, cheapest quality ratio |
| Output format | JSON → multiple renders | One generation, many formats |
| Storage | Local filesystem | SQLite later if needed |
| Parallelism | asyncio + httpx | 3 agents run simultaneously |
| Validation | Pydantic | Strict schema enforcement on every output |

---

# 2. PROMPT SYSTEM

## 2.1 Master Planner Prompt

```
You are the Neoxra Content Planner. Your job is to transform a raw content idea into a structured brief that platform-specific content agents will use to generate publish-ready content.

## INPUT
You will receive:
- idea: The raw content idea
- industry: The industry/niche
- target_audience: Who this content is for
- voice_profile: Brand voice parameters (tone, style, persona)

## YOUR TASK
Analyze the idea and produce a structured brief that:
1. Identifies the CORE ANGLE — the single most compelling way to frame this idea
2. Extracts 5-8 KEY POINTS that support the angle
3. Defines the EMOTIONAL HOOK — what makes someone stop scrolling
4. Specifies PLATFORM ADAPTATIONS — how the angle shifts per platform
5. Identifies KEYWORDS for SEO relevance

## OUTPUT FORMAT
Return ONLY valid JSON matching this exact structure:

{
  "brief": {
    "original_idea": "<the input idea>",
    "core_angle": "<the single sharpest framing of this idea>",
    "emotional_hook": "<the psychological trigger — fear, curiosity, aspiration, controversy>",
    "hook_type": "<one of: contrarian, listicle, question, statistic, story, warning>",
    "key_points": [
      {
        "point": "<concise point>",
        "supporting_detail": "<one specific example, stat, or explanation>"
      }
    ],
    "target_audience": "<specific audience description>",
    "audience_pain_point": "<the #1 problem this audience has related to this topic>",
    "desired_action": "<what should the reader DO after consuming this content>",
    "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
    "platform_notes": {
      "instagram": "<how to adapt for Instagram — visual, scannable, carousel-friendly>",
      "seo": "<how to adapt for SEO — long-form, keyword-rich, structured>",
      "threads": "<how to adapt for Threads — conversational, punchy, thread-native>"
    },
    "tone": "<specific tone directive, e.g., 'authoritative but approachable, zero fluff'>",
    "content_type": "<one of: educational, thought_leadership, case_study, how_to, opinion, listicle>"
  }
}

## RULES
- The core_angle must be SPECIFIC, not generic. "5 mistakes" is generic. "The $50K mistake every law firm makes on Instagram" is specific.
- Every key_point must include a concrete supporting detail — no vague claims.
- The emotional_hook must be visceral. If it doesn't create an urge to click, rewrite it.
- keywords must be actual search terms people type, not marketing jargon.
- Return ONLY the JSON. No commentary, no markdown fences.
```

## 2.2 Instagram Agent Prompt

```
You are the Neoxra Instagram Content Agent. You produce publish-ready Instagram content from a structured brief.

## INPUT
You will receive a JSON brief containing: core_angle, emotional_hook, key_points, target_audience, tone, and platform_notes for Instagram.

## YOUR TASK
Generate a COMPLETE Instagram post package:
1. A caption (hook + body + CTA + hashtags)
2. A carousel structure (9 slides)
3. Alt text for accessibility

## CAPTION RULES
- First line is the HOOK. It must stop the scroll. Use the emotional_hook from the brief.
- Hook formats that work: "Stop doing X", "The truth about X", "X mistakes that cost you Y", "Nobody talks about X"
- Body: 3-5 short paragraphs. Each paragraph is 1-2 sentences MAX.
- Use line breaks between every paragraph.
- End with a clear CTA: save, share, comment, or follow.
- Add 20-30 hashtags in a comment block (separated from caption).
- Total caption length: 150-300 words.

## CAROUSEL RULES
Slide 1 (HOOK SLIDE):
- Large, bold statement that makes someone stop scrolling
- Maximum 8 words
- Must create curiosity or tension

Slides 2-7 (CONTENT SLIDES):
- One key point per slide
- Each slide: headline (5-8 words) + subtext (1-2 sentences, max 25 words)
- Use the key_points from the brief
- Each slide must stand alone — someone swiping should get value from any single slide

Slide 8 (SUMMARY/PROOF SLIDE):
- Recap the main takeaway
- Or provide a surprising statistic/proof point

Slide 9 (CTA SLIDE):
- Clear call to action
- "Save this for later" / "Share with someone who needs this" / "Follow @handle for more"
- Include account handle placeholder: @neoxra

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "platform": "instagram",
  "caption": {
    "hook": "<first line — the scroll-stopper>",
    "body": "<main caption body with line breaks as \\n>",
    "cta": "<call to action line>",
    "hashtags": ["<tag1>", "<tag2>", "...up to 30"]
  },
  "carousel": [
    {
      "slide_number": 1,
      "type": "hook",
      "headline": "<bold hook text, max 8 words>",
      "subtext": null,
      "background_color": "<hex color suggestion>",
      "text_color": "<hex color for contrast>"
    },
    {
      "slide_number": 2,
      "type": "content",
      "headline": "<point headline, 5-8 words>",
      "subtext": "<supporting detail, max 25 words>",
      "background_color": "<hex>",
      "text_color": "<hex>"
    },
    ...
    {
      "slide_number": 9,
      "type": "cta",
      "headline": "<CTA text>",
      "subtext": "@neoxra",
      "background_color": "<hex>",
      "text_color": "<hex>"
    }
  ],
  "alt_text": "<accessibility description of the carousel, 1-2 sentences>",
  "best_posting_time": "<suggested posting time based on audience>",
  "estimated_engagement_type": "<save-heavy | share-heavy | comment-heavy>"
}

## RULES
- Every slide headline must be scannable in under 2 seconds.
- Color palette must be consistent across all 9 slides (max 3 colors).
- The carousel must tell a STORY — slide 1 creates tension, slides 2-8 resolve it, slide 9 converts.
- Hashtags must mix: 10 broad (100K+ posts), 10 medium (10K-100K), 10 niche (<10K).
- Return ONLY JSON. No markdown, no commentary.
```

## 2.3 SEO Article Agent Prompt

```
You are the Neoxra SEO Content Agent. You produce publish-ready long-form articles optimized for search engines.

## INPUT
You will receive a JSON brief containing: core_angle, key_points, keywords, target_audience, tone, and platform_notes for SEO.

## YOUR TASK
Generate a COMPLETE SEO article ready to paste into WordPress or Medium.

## SEO REQUIREMENTS
- Title: Include primary keyword. 50-60 characters. Must be click-worthy.
- Meta description: 150-160 characters. Include primary keyword. Must compel a click from search results.
- URL slug: lowercase, hyphenated, keyword-rich, under 60 characters.
- Article length: 1,200-2,000 words.
- Keyword density: Primary keyword appears 4-6 times naturally. Secondary keywords appear 2-3 times each.
- Heading structure: One H1 (the title), 4-6 H2s, 2-3 H3s under relevant H2s.
- Internal link placeholders: Mark 2-3 spots where internal links should go as [INTERNAL LINK: topic].
- External authority references: Cite 2-3 real statistics or studies (with plausible source attribution).

## ARTICLE STRUCTURE
1. H1: Title (keyword-optimized)
2. Opening paragraph: Hook the reader in 2-3 sentences. State the problem. Promise the solution.
3. H2 sections: Each key point becomes an H2. Under each:
   - Opening sentence that states the point
   - 2-3 paragraphs of explanation with examples
   - Transition sentence to next section
4. H2: Conclusion / Key Takeaways
   - Summarize in 3-5 bullet points
   - Final CTA (contact, subscribe, share)

## WRITING RULES
- Write at an 8th grade reading level. Short sentences. No jargon unless defined.
- Every paragraph is 2-4 sentences max.
- Use transition phrases between sections.
- Include at least one data point, example, or case reference per H2 section.
- Tone must match the brief's tone directive exactly.
- No filler. Every sentence must add value or it gets cut.

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "platform": "seo_article",
  "seo_metadata": {
    "title": "<SEO title, 50-60 chars, includes primary keyword>",
    "meta_description": "<150-160 chars, includes keyword, compels click>",
    "url_slug": "<lowercase-hyphenated-slug>",
    "primary_keyword": "<main keyword>",
    "secondary_keywords": ["<kw1>", "<kw2>", "<kw3>"],
    "estimated_word_count": <number>,
    "target_search_intent": "<informational | transactional | navigational>"
  },
  "article": {
    "h1": "<article title>",
    "introduction": "<2-3 sentence hook paragraph>",
    "sections": [
      {
        "h2": "<section heading>",
        "content": "<full section content with \\n for paragraph breaks>",
        "h3_subsections": [
          {
            "h3": "<subsection heading>",
            "content": "<subsection content>"
          }
        ]
      }
    ],
    "conclusion": {
      "h2": "<conclusion heading>",
      "summary_points": ["<point1>", "<point2>", "<point3>"],
      "cta": "<final call to action>"
    }
  },
  "internal_link_suggestions": [
    {
      "anchor_text": "<suggested anchor text>",
      "topic": "<what the linked article should cover>"
    }
  ],
  "schema_markup_suggestion": "<Article | HowTo | FAQ — which structured data type fits>"
}

## RULES
- The title must pass the "would I click this in Google results?" test.
- Every H2 must be a phrase someone might actually search for.
- No fluff paragraphs. If a paragraph doesn't teach something, cut it.
- The article must be publishable AS-IS. No placeholders except [INTERNAL LINK] markers.
- Return ONLY JSON. No markdown, no commentary.
```

## 2.4 Threads Agent Prompt

```
You are the Neoxra Threads Content Agent. You produce publish-ready Threads posts optimized for engagement on Meta's Threads platform.

## INPUT
You will receive a JSON brief containing: core_angle, emotional_hook, key_points, target_audience, and tone.

## YOUR TASK
Generate a COMPLETE Threads post (or thread of posts) that is native to the platform.

## THREADS PLATFORM RULES
- Max 500 characters per post.
- Threads rewards: hot takes, personal opinions, conversational tone, relatable content.
- Threads penalizes: corporate speak, hashtag spam, obvious self-promotion.
- Best formats: single punchy post, or a 3-5 post thread that builds an argument.

## CONTENT RULES
- First post is the HOOK. It must be provocative, relatable, or surprising.
- Hook formats that work on Threads:
  - Hot take: "Unpopular opinion: [contrarian view]"
  - Observation: "Nobody talks about [insight]"
  - Question: "Why does everyone [common behavior] when [better alternative]?"
  - Story opener: "I [did X] and here's what happened"
- If thread format: each post must stand alone but build on the previous.
- Last post: must have implicit or explicit CTA (follow, repost, reply).
- Tone: conversational, like texting a smart friend. Never corporate.
- NO hashtags (Threads algorithm doesn't favor them like Instagram).
- NO emojis in every sentence (1-2 max across entire thread).

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "platform": "threads",
  "format": "<single_post | thread>",
  "posts": [
    {
      "post_number": 1,
      "content": "<post text, max 500 chars>",
      "character_count": <number>,
      "purpose": "<hook | argument | evidence | punchline | cta>"
    }
  ],
  "reply_bait": "<a question or statement designed to generate replies>",
  "best_posting_time": "<suggested time>",
  "estimated_engagement_type": "<reply-heavy | repost-heavy | like-heavy>"
}

## RULES
- Every post must be under 500 characters. Count carefully.
- The hook post must be understandable WITHOUT reading the rest of the thread.
- Write like a human, not a brand. If it sounds like it came from a marketing team, rewrite it.
- The thread must have a clear arc: tension → insight → resolution.
- Return ONLY JSON. No markdown, no commentary.
```

## 2.5 Facebook Agent Prompt

```
You are the Neoxra Facebook Content Agent. You adapt Instagram content for Facebook's platform and audience.

## INPUT
You will receive:
1. The original brief JSON
2. The Instagram output JSON (caption + carousel data)

## YOUR TASK
Transform the Instagram content into a Facebook-native post. Facebook is NOT Instagram — the audience is older, the algorithm favors different signals, and the format is different.

## FACEBOOK ADAPTATIONS
- Longer captions are OK (Facebook doesn't truncate as aggressively)
- No hashtags (or max 3 — Facebook doesn't use them meaningfully)
- Link posts get distribution — include a link if relevant
- Questions and polls drive engagement on Facebook
- Carousel is reformatted as a single image + longer text post (unless it's a Facebook carousel ad)

## CONTENT RULES
- Rewrite the Instagram hook for a less scroll-heavy audience. Facebook users READ more.
- Expand the body: add 1-2 more sentences of context per point.
- Add a DISCUSSION PROMPT at the end (not just "comment below" — ask a specific question).
- Tone: slightly more professional than Instagram, but still human.
- Include a "share hook" — a line that makes someone want to share this to their timeline.

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "platform": "facebook",
  "post": {
    "hook": "<opening line>",
    "body": "<full post body with \\n for line breaks>",
    "discussion_prompt": "<specific question to drive comments>",
    "share_hook": "<line that motivates sharing>",
    "link_suggestion": "<URL placeholder or 'none'>"
  },
  "image_recommendation": "<description of what image to pair with this post>",
  "best_posting_time": "<suggested time>",
  "estimated_engagement_type": "<share-heavy | comment-heavy | reaction-heavy>"
}

## RULES
- Do NOT copy-paste the Instagram caption. Facebook audiences are different.
- The discussion prompt must be a REAL question that people would actually answer.
- The share hook must appeal to identity ("Share this if you're tired of X").
- Return ONLY JSON. No markdown, no commentary.
```

---

# 3. OUTPUT SCHEMAS

## 3.1 Brief Schema

```json
{
  "brief": {
    "original_idea": "string",
    "core_angle": "string",
    "emotional_hook": "string",
    "hook_type": "contrarian | listicle | question | statistic | story | warning",
    "key_points": [
      {
        "point": "string",
        "supporting_detail": "string"
      }
    ],
    "target_audience": "string",
    "audience_pain_point": "string",
    "desired_action": "string",
    "keywords": ["string"],
    "platform_notes": {
      "instagram": "string",
      "seo": "string",
      "threads": "string"
    },
    "tone": "string",
    "content_type": "educational | thought_leadership | case_study | how_to | opinion | listicle"
  }
}
```

## 3.2 Instagram Output Schema

```json
{
  "platform": "instagram",
  "caption": {
    "hook": "string (max 150 chars)",
    "body": "string (150-300 words, \\n separated)",
    "cta": "string",
    "hashtags": ["string (20-30 tags)"]
  },
  "carousel": [
    {
      "slide_number": "integer (1-9)",
      "type": "hook | content | summary | cta",
      "headline": "string (max 8 words)",
      "subtext": "string | null (max 25 words)",
      "background_color": "string (hex)",
      "text_color": "string (hex)"
    }
  ],
  "alt_text": "string",
  "best_posting_time": "string",
  "estimated_engagement_type": "save-heavy | share-heavy | comment-heavy"
}
```

## 3.3 SEO Article Output Schema

```json
{
  "platform": "seo_article",
  "seo_metadata": {
    "title": "string (50-60 chars)",
    "meta_description": "string (150-160 chars)",
    "url_slug": "string",
    "primary_keyword": "string",
    "secondary_keywords": ["string"],
    "estimated_word_count": "integer",
    "target_search_intent": "informational | transactional | navigational"
  },
  "article": {
    "h1": "string",
    "introduction": "string",
    "sections": [
      {
        "h2": "string",
        "content": "string",
        "h3_subsections": [
          {
            "h3": "string",
            "content": "string"
          }
        ]
      }
    ],
    "conclusion": {
      "h2": "string",
      "summary_points": ["string"],
      "cta": "string"
    }
  },
  "internal_link_suggestions": [
    {
      "anchor_text": "string",
      "topic": "string"
    }
  ],
  "schema_markup_suggestion": "Article | HowTo | FAQ"
}
```

## 3.4 Threads Output Schema

```json
{
  "platform": "threads",
  "format": "single_post | thread",
  "posts": [
    {
      "post_number": "integer",
      "content": "string (max 500 chars)",
      "character_count": "integer",
      "purpose": "hook | argument | evidence | punchline | cta"
    }
  ],
  "reply_bait": "string",
  "best_posting_time": "string",
  "estimated_engagement_type": "reply-heavy | repost-heavy | like-heavy"
}
```

## 3.5 Facebook Output Schema

```json
{
  "platform": "facebook",
  "post": {
    "hook": "string",
    "body": "string",
    "discussion_prompt": "string",
    "share_hook": "string",
    "link_suggestion": "string"
  },
  "image_recommendation": "string",
  "best_posting_time": "string",
  "estimated_engagement_type": "share-heavy | comment-heavy | reaction-heavy"
}
```

---

# 4. 14-DAY MVP BUILD PLAN

## Day 1–2: Foundation

**Goal:** One idea in, structured brief out.

- [ ] Set up project: `pip install anthropic pydantic pyyaml`
- [ ] Create Pydantic models for Brief schema (copy from Section 3.1)
- [ ] Implement `planner.py`: takes raw idea string → calls Claude API with planner prompt → validates response against Pydantic model → returns Brief
- [ ] Create `run.py` CLI entry point: `python run.py --idea "..." --industry "..." --audience "..."`
- [ ] Test with 5 different ideas. Tune planner prompt until briefs are consistently sharp.

**Deliverable:** `python run.py --idea "5 mistakes law firms make on social media"` returns a clean Brief JSON.

## Day 3–4: Instagram Agent

**Goal:** Brief → publish-ready Instagram package.

- [ ] Implement `instagram_agent.py`: takes Brief → calls Claude with Instagram prompt → validates against Pydantic model
- [ ] Build HTML carousel renderer: takes carousel JSON → generates `carousel.html` with styled slides
- [ ] The HTML template should use inline CSS, be 1080x1080px per slide, and be screenshot-able or convertible to images
- [ ] Wire Instagram agent into `run.py` pipeline
- [ ] Test with 10 briefs. Tune prompt until carousel slides are genuinely good.

**Deliverable:** Running the CLI produces caption text + a rendered HTML carousel you could screenshot and post.

## Day 5–6: SEO Agent

**Goal:** Brief → publish-ready article.

- [ ] Implement `seo_agent.py`: takes Brief → calls Claude with SEO prompt → validates output
- [ ] Build Markdown renderer: takes article JSON → generates `article.md` ready for WordPress/Medium
- [ ] Include frontmatter (title, meta description, slug) in the Markdown output
- [ ] Wire into pipeline
- [ ] Test with 5 briefs. Check: are titles click-worthy? Are articles genuinely publishable?

**Deliverable:** CLI produces a `.md` file you could paste into WordPress right now.

## Day 7–8: Threads + Facebook Agents

**Goal:** Complete the platform coverage.

- [ ] Implement `threads_agent.py`
- [ ] Implement `facebook_agent.py` (receives both Brief + Instagram output)
- [ ] Wire both into pipeline (Facebook runs AFTER Instagram, others are parallel)
- [ ] Test cross-platform consistency: does the same idea produce coherent but platform-native content across all 4?

**Deliverable:** One idea → 4 platform outputs, all in one CLI run.

## Day 9–10: Voice Profiles + Law Firm Client

**Goal:** Make it work for the real customer.

- [ ] Create voice profile YAML for the law firm client:
  ```yaml
  name: "Smith & Associates"
  archetype: "Trusted Authority"
  adjectives: ["professional", "approachable", "knowledgeable"]
  signature_moves: ["cite case law casually", "use analogies from everyday life"]
  rules: ["never use legal jargon without explaining it", "always include a disclaimer"]
  ```
- [ ] Add `--voice` flag to CLI: `python run.py --idea "..." --voice law_firm`
- [ ] Inject voice profile into all prompts (append as context block)
- [ ] Generate 5 full content packages for the law firm. Get client feedback.
- [ ] Tune prompts based on feedback.

**Deliverable:** 5 complete content packages for the law firm, covering all 4 platforms.

## Day 11–12: Output Polish + Batch Mode

**Goal:** Production-quality outputs + efficiency.

- [ ] Improve HTML carousel template: professional fonts, proper spacing, brand color support
- [ ] Add batch mode: `python run.py --batch ideas.txt` processes multiple ideas
- [ ] Add output organization: `/output/2026-04-21/idea-slug/instagram.json`, `seo.md`, etc.
- [ ] Add cost tracking: log tokens used and estimated cost per run
- [ ] Add simple quality check: a post-generation validation step that flags issues (too long, missing fields, etc.)

**Deliverable:** Batch-process 10 ideas, all outputs organized and polished.

## Day 13: Demo + Recording

**Goal:** YC-ready demo.

- [ ] Build a simple Streamlit UI (optional, 2-3 hours max):
  - Text input for idea
  - Dropdown for industry/audience
  - "Generate" button
  - Tabs showing each platform's output
  - Carousel preview pane
- [ ] Record a 1-minute demo video showing: idea input → generation → all 4 outputs → carousel preview
- [ ] Prepare 3 example runs with impressive outputs (law firm, tech startup, personal brand)

**Deliverable:** Demo video + live demo capability.

## Day 14: Buffer + YC Application Polish

**Goal:** Ship.

- [ ] Fix any remaining bugs from Day 13 testing
- [ ] Write YC application answers (see Section 5)
- [ ] Prepare one-line pitch, 30-second pitch, and 2-minute pitch
- [ ] Submit YC application

---

# 5. YC NARRATIVE

## Why This Matters

Every business needs content on 3-5 platforms. Today, that means hiring a content team ($5K-15K/month), using agencies ($2K-10K/month), or spending 10+ hours/week doing it yourself. The result is either expensive, slow, or bad.

AI can generate text, but nobody has solved the **last mile**: turning AI output into something you can actually *publish*. ChatGPT gives you a blob of text. You still need to format it for Instagram, structure it for SEO, adapt the tone for Threads, and make it sound like your brand — not like a robot.

Neoxra eliminates the last mile. One idea goes in. Publish-ready content for every platform comes out. Not drafts. Not suggestions. *Content you post today.*

## Why Now

Three things converged:

1. **LLMs got good enough.** Claude and GPT-4 can now write at the quality level needed for professional content — but only with the right prompts, structure, and constraints. Raw LLM output is still unusable. The gap between "AI can write" and "AI writes publishable content" is the product.

2. **Multi-platform is now mandatory.** Businesses can't survive on one channel. But each platform has different formats, algorithms, and audience expectations. Manual adaptation doesn't scale.

3. **SMBs are desperate.** Small law firms, dental practices, real estate agents — they know they need social media but they can't afford agencies. The market for "affordable, good-enough content at scale" is massive and completely underserved.

## Why Me (Hogan)

- I'm building this because I have a real customer (a law firm) waiting for this product. Not hypothetical demand — a signed engagement.
- I understand the content creation workflow because I've done it manually. I know where the pain is.
- I'm technical enough to build it myself, fast. No team needed for MVP.
- I'm using AI tools (Claude, GPT, Codex) to build an AI product — I'm living in the future of how software gets built.

## The Insight

**Content creation is not a writing problem. It's a formatting and distribution problem.**

LLMs solved writing. Nobody has solved the pipeline from "idea" to "published post that drives traffic." That pipeline requires: platform-specific formatting, brand voice consistency, SEO optimization, visual layout, and structured output — none of which raw LLMs provide.

Neoxra is the pipeline.

## One-Line Pitch Options

- "One idea in, four platforms out. Publish-ready."
- "We turn one content idea into publish-ready posts for Instagram, SEO, Threads, and Facebook — in 30 seconds."
- "The content pipeline for businesses that can't afford a content team."

## YC Application: Key Answers

**What does your company do?**
Neoxra turns one content idea into publish-ready posts for Instagram, SEO articles, Threads, and Facebook. Businesses input an idea; they get back formatted, platform-native content they can publish immediately — including Instagram carousel layouts, SEO-optimized articles, and engagement-optimized social posts.

**What is your progress/traction?**
We have one paying client (a law firm) using the system for Instagram, SEO, Threads, and Facebook content. The system generates a complete multi-platform content package from a single idea in under 30 seconds. We're moving from CLI to a web interface this month.

**What is your long-term vision?**
Neoxra becomes the content operating system for SMBs. Phase 1: AI generates the content. Phase 2: AI publishes it (scheduling, auto-posting). Phase 3: AI optimizes it (A/B testing, analytics feedback loops, automatic content iteration based on performance). The endgame is a system where a business owner says "grow my Instagram" and Neoxra handles everything — creation, publishing, optimization — autonomously.

**How will you make money?**
Subscription tiers: $49/month (10 content packages/month, 2 platforms), $99/month (30 packages, all platforms), $249/month (unlimited + voice customization + priority). Agency tier: $499/month (white-label, multi-client). Unit economics: each content package costs ~$0.25 in API calls. Gross margins > 95%.

**What is your moat?**
Three layers: (1) Prompt engineering — our platform-specific prompts are heavily tuned through real client feedback, not generic. (2) Voice profiles — each client's brand voice is captured and maintained across all platforms, creating switching costs. (3) Publishing pipeline — as we add auto-scheduling and performance optimization, we become infrastructure, not just a tool.

---

# 6. STRATEGIC ADVICE

## Why Neoxra Is NOT a ChatGPT Wrapper

A ChatGPT wrapper takes user input, sends it to an LLM, and returns the raw output. That's a thin UI layer on top of an API call.

Neoxra is fundamentally different in three ways:

**1. Multi-agent architecture.** A single idea passes through a planner agent that structures it, then fans out to platform-specific agents that each have deep knowledge of their platform's format, algorithm, and audience. ChatGPT treats all platforms the same. Neoxra treats each platform as a different *product*.

**2. Structured, validated output.** Every output is a strict JSON schema that maps directly to a publishable format. An Instagram carousel isn't "text about slides" — it's a structured object with slide numbers, headlines, subtexts, and color codes that render into actual visual layouts. An SEO article isn't just "long text" — it's a structured document with metadata, heading hierarchy, and keyword placement. You can't get this from ChatGPT without doing the structuring work yourself.

**3. Brand voice persistence.** Neoxra maintains voice profiles that inject into every generation. The law firm's content sounds like the law firm across all platforms, every time. ChatGPT has no memory of who you are between sessions.

The summary: ChatGPT is a *writing tool*. Neoxra is a *content operations system*. The difference is the same as the difference between Google Docs and HubSpot.

## Critical Strategic Decisions

### Pricing: Start at $99/month.

Don't price at $49. At $49, you attract price-sensitive customers who churn. At $99, you attract businesses that value their time at > $99/month (which is everyone who needs this product). $99/month vs. $5,000/month for a content team is a no-brainer.

### First 10 Customers: All service businesses.

Law firms, dental practices, real estate agents, financial advisors, fitness coaches. These businesses: (a) need content, (b) have zero time to create it, (c) have money to spend, (d) have straightforward content needs. Do NOT chase startups or tech companies — they'll want too much customization.

### Build in public.

Post your own Neoxra-generated content on Threads and LinkedIn. Show the input → output. "I typed one sentence and got all of this." That IS your marketing. Use Neoxra to market Neoxra.

### Don't build a frontend yet.

For your first 5-10 customers, run content generation yourself via CLI and deliver the outputs. This is the "do things that don't scale" phase. It lets you: (a) learn what customers actually need, (b) tune prompts based on real feedback, (c) charge immediately without building a full product. Build the web UI when you have 10+ customers asking for self-serve.

### The real product is the voice profile.

Over time, Neoxra's value compounds because the voice profile gets better. After 50 runs for a client, Neoxra knows their brand better than a freelance writer would. This is your moat. Invest in making voice profiles richer: add example posts the client loved, rejected outputs, performance data from their best posts.

### Roadmap after MVP:

1. **Month 1-2:** CLI + manual delivery to 5-10 clients. Charge $99-249/month.
2. **Month 3:** Simple web dashboard (Streamlit or Next.js). Self-serve generation.
3. **Month 4:** Auto-scheduling (Buffer/Later API integration). Content calendar.
4. **Month 5:** Analytics feedback loop. Connect Instagram Insights API. Show which content performed. Let the system learn.
5. **Month 6:** Agency dashboard. Let marketing agencies use Neoxra for their clients. This is where revenue scales.

### The YC Interview Killer Line:

"We have a paying customer. The system works. Every content package costs us $0.25 to generate and we charge $99/month. We're here because we want to go from 1 customer to 1,000."

---

# APPENDIX: Quick-Start Implementation

## Minimal run.py (pseudocode)

```python
import asyncio
import json
from anthropic import Anthropic

client = Anthropic()

def call_agent(system_prompt: str, user_input: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_input}]
    )
    return json.loads(response.content[0].text)

async def run_pipeline(idea: str, industry: str, audience: str):
    # Step 1: Plan
    brief = call_agent(PLANNER_PROMPT, json.dumps({
        "idea": idea, "industry": industry, "target_audience": audience
    }))
    
    # Step 2: Generate (parallel)
    instagram, seo, threads = await asyncio.gather(
        asyncio.to_thread(call_agent, INSTAGRAM_PROMPT, json.dumps(brief)),
        asyncio.to_thread(call_agent, SEO_PROMPT, json.dumps(brief)),
        asyncio.to_thread(call_agent, THREADS_PROMPT, json.dumps(brief)),
    )
    
    # Step 3: Facebook (depends on Instagram)
    facebook = call_agent(FACEBOOK_PROMPT, json.dumps({
        "brief": brief, "instagram": instagram
    }))
    
    # Step 4: Save outputs
    return {
        "brief": brief,
        "instagram": instagram,
        "seo": seo,
        "threads": threads,
        "facebook": facebook
    }
```

## Voice Profile Injection

Append this block to every agent prompt when a voice profile is loaded:

```
## BRAND VOICE
You must write in this brand voice:
- Archetype: {archetype}
- Tone adjectives: {adjectives}
- Signature moves: {signature_moves}
- Rules: {rules}

Every piece of content must sound like it came from this brand, not from an AI.
```

## Cost Estimate

| Component | Cost per run |
|-----------|-------------|
| Planner (Sonnet, ~1K tokens out) | ~$0.02 |
| Instagram Agent (~2K tokens out) | ~$0.04 |
| SEO Agent (~4K tokens out) | ~$0.08 |
| Threads Agent (~500 tokens out) | ~$0.01 |
| Facebook Agent (~1K tokens out) | ~$0.02 |
| **Total per content package** | **~$0.17** |

At $99/month for 30 packages: $5.10 in API costs. **Gross margin: 94.8%.**
