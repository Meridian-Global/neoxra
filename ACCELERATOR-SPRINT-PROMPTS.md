# Accelerator Sprint — Claude Code Prompts

> 執行順序：PR-1 → PR-2 → PR-3 → PR-4 → PR-5
> 每個 PR 都是獨立的 Claude Code prompt，在對應的 repo 裡執行

---

## PR-0: SEO 文章尾端崩潰修復 (已完成)

**Status: ✅ 已由 Cowork 直接修復，只需 commit & push**

修復了兩個檔案：

1. `neoxra-core/neoxra_core/skills/seo_generation.py` — 將硬編碼的 `SEO_MODEL = "claude-sonnet-4-20250514"` 改為動態解析 `NEOXRA_SEO_MODEL → ANTHROPIC_MODEL → DEFAULT_MODEL`
2. `neoxra-core/neoxra_core/pipeline/seo.py` — 將 `on_section_ready` callback 完整傳遞到 SkillInput.context
3. `neoxra/backend/app/core/output_validation.py` — `estimated_word_count` 範圍從 `1200-2000` 更新為 `2000-8000`，新增 `estimated_character_count` 欄位

在兩個 repo 裡分別 commit：
```bash
# neoxra-core
cd neoxra-core
git add -A && git commit -m "fix: resolve SEO model + callback + validation range"

# neoxra
cd neoxra
git add -A && git commit -m "fix: align SEO validation range with core (2000-8000 words)"
```

---

## PR-1: 模型品質升級 — 全平台輸出可直接使用

**Repo: `neoxra-core`**
**目標: 讓所有平台的 AI 輸出品質達到「複製貼上就能用」的水準**

```
你是 Neoxra 的 AI 工程師。目前所有平台的內容生成都使用 claude-haiku-4-5，
輸出品質不夠好，不能直接複製貼上到社群平台使用。

任務：為每個平台技能加入獨立的模型選擇邏輯，讓重要的生成步驟可以使用更好的模型。

## 修改 1: neoxra_core/providers/llm.py

在檔案頂部新增：

```python
# Platform-specific model overrides (env vars)
# NEOXRA_SEO_MODEL, NEOXRA_IG_MODEL, NEOXRA_THREADS_MODEL, NEOXRA_FB_MODEL
# Falls back to ANTHROPIC_MODEL, then DEFAULT_MODEL
```

新增一個 helper function：

```python
def resolve_model(platform: str | None = None) -> str:
    """Resolve model for a given platform.
    
    Priority: NEOXRA_{PLATFORM}_MODEL → ANTHROPIC_MODEL → DEFAULT_MODEL
    """
    import os
    if platform:
        env_key = f"NEOXRA_{platform.upper()}_MODEL"
        platform_model = os.environ.get(env_key)
        if platform_model:
            return platform_model
    return os.environ.get("ANTHROPIC_MODEL") or DEFAULT_MODEL
```

## 修改 2: neoxra_core/skills/instagram_generation.py

在 generate() 呼叫中加入 model 參數：
- 第 145 行: `generate(prompt, max_tokens=2048, temperature=0.5)` 
  → `generate(prompt, max_tokens=2048, temperature=0.5, model=resolve_model("ig"))`
- 第 155 行 (repair): 同樣加入 `model=resolve_model("ig")`

Import: `from neoxra_core.providers.llm import generate, resolve_model`

## 修改 3: neoxra_core/skills/seo_generation.py

已經有 `_resolve_seo_model()` 函數，將它改為使用通用的 `resolve_model("seo")`：
- 刪除 `_resolve_seo_model()` 函數
- 將所有 `model=_resolve_seo_model()` 改為 `model=resolve_model("seo")`
- Import: `from neoxra_core.providers.llm import generate, resolve_model`

## 修改 4: neoxra_core/skills/threads_generation.py

找到 generate() 呼叫，加入 `model=resolve_model("threads")`
Import: `from neoxra_core.providers.llm import generate, resolve_model`

## 修改 5: neoxra_core/skills/facebook_adapter.py (或類似檔名)

找到 generate() 呼叫，加入 `model=resolve_model("fb")`
Import: `from neoxra_core.providers.llm import generate, resolve_model`

## 測試

執行 `pytest -q` 確保所有測試通過。

## 完成後

使用者可以在 .env 中設定：
```
ANTHROPIC_MODEL=claude-haiku-4-5          # 預設（便宜快速）
NEOXRA_SEO_MODEL=claude-sonnet-4-6        # SEO 需要更好的模型
NEOXRA_IG_MODEL=claude-sonnet-4-6         # Instagram 需要更好的輸出
NEOXRA_THREADS_MODEL=claude-sonnet-4-6    # Threads 需要更好的輸出
NEOXRA_FB_MODEL=claude-sonnet-4-6         # Facebook 需要更好的輸出
```
```

---

## PR-2: Threads 輸出品質提升 — 可直接貼上 Threads

**Repo: `neoxra-core`**
**目標: Threads 輸出內容要能直接複製貼上到 Threads app 使用**

```
你是 Neoxra 的 AI prompt 工程師。目前 Threads 的輸出雖然有結構 (hook/argument/evidence/cta)，
但內容品質不夠好，使用者不會想直接貼到 Threads 上。

問題分析：
1. 內容太制式化，像 AI 寫的
2. 用語太正式，不像真人在 Threads 上寫的東西
3. 缺乏具體案例和數據
4. reply_bait 太刻板

任務：改善 Threads 生成的 prompt，讓輸出更像一個有洞見的專業人士在 Threads 上的真實發文。

## 修改檔案: neoxra_core/prompts/threads_generation.py

重寫 build_threads_generation_prompt 函數中的 prompt 內容。保持函數簽名和回傳格式完全不變。

### 新的 Threads Platform Rules（替換現有的）：

```
## Threads Platform Rules
- Each post must be 500 characters or fewer.
- Write the way a confident expert talks to peers — not how a brand talks to customers.
- Be specific. Replace vague claims with concrete numbers, names, or scenarios.
- No hashtags. No emoji unless it genuinely adds tone (max 1 total).
- Ban these words/phrases: 遊戲規則改變者, 解鎖, 賦能, 顛覆, 深度好文, 乾貨, leverage, unlock, game-changer, deep dive, pro tip.
- Prefer sentence fragments and conversational rhythm over complete grammatically perfect sentences.
- For zh-TW: Write like a Taiwanese professional on social media — use 口語化 but not 幼稚. 
  Example good tone: 「講真的，大部分人搞錯了一件事。」
  Example bad tone: 「在當今快速變化的時代，我們需要重新思考...」
```

### 新的 Hook Formats（替換現有的）：

```
## Hook Formats (pick the one that fits the topic best)
- hot take: State an opinion most people quietly agree with but won't say out loud.
- myth-bust: Name the popular belief, then explain why it's wrong with one proof point.
- personal lesson: Share a specific moment (real or plausible) that changed your thinking.
- 數字開場 (zh-TW): 用一個讓人停下來的數字開頭。例如「87% 的車禍理賠少拿了錢，因為一個動作沒做。」
```

### 新的 Structure 指引（替換現有的）：

```
## Structure
- Default to a 4-5 post thread. Only use single_post if the topic is truly narrow.
- Post 1 (hook): Must make someone stop scrolling. No warm-up. No context-setting.
- Posts 2-3 (argument/evidence): Give the reader something they can USE — a framework, a number, a comparison. Not just another opinion.
- Post 4 (punchline): Reframe the topic in a way that makes the reader feel smarter.
- Post 5 (cta): Optional. Only include if there's a genuine next step, not a fake engagement prompt.
- reply_bait: Ask a question the reader actually wants to answer about their own experience. 
  NOT: 「你覺得呢？」 
  YES: 「你遇過最離譜的理賠經驗是什麼？」
```

### JSON Output 格式保持不變

不要改動 JSON schema，只改善 prompt 內容品質指引。

## 驗證

執行 pytest -q 確保測試通過。
```

---

## PR-3: Facebook 輸出品質提升 — 可直接貼上 Facebook

**Repo: `neoxra-core`**
**目標: Facebook 輸出要能直接複製貼上成 Facebook 貼文**

```
你是 Neoxra 的 AI prompt 工程師。目前 Facebook 的輸出是從 Instagram 內容「改編」的，
但改編結果太制式，不像真人在 Facebook 上的發文風格。

問題分析：
1. hook 太短，不夠吸引注意力
2. body 雖然比 Instagram 長，但讀起來像翻譯稿
3. discussion_prompt 太制式（像問卷調查的問題）
4. share_hook 太刻板，不會讓人想分享

任務：改善 Facebook 生成的 prompt，讓輸出像一個有影響力的 Facebook 用戶的真實貼文。

## 修改檔案: neoxra_core/prompts/facebook_generation.py

重寫 build_facebook_generation_prompt 函數中的 prompt 內容。保持函數簽名和回傳格式完全不變。

### 新的 Facebook Adaptation Rules（替換現有的）：

```
## Facebook Adaptation Rules
- This is NOT a translation of the Instagram caption. Re-think the topic for Facebook.
- Facebook audiences read longer posts. The body should be 200-400 words (zh-TW: 300-600 字).
- Write in first person or second person. Never in third person ("users should...").
- Structure the body like a story or argument: setup → tension → resolution → takeaway.

### Hook (opening line)
- Must work as a standalone statement that makes people click "See more".
- For zh-TW: Use conversational openers like 「講一件你可能不知道的事」or「上週有人問我...」
- Do NOT start with generic statements like 「你知道嗎？」or「在這個時代...」

### Body
- Include at least one specific example, scenario, or data point.
- Use line breaks every 2-3 sentences. Facebook rewards readable formatting.
- For zh-TW: Add occasional 口語化 markers like 「說真的」「重點來了」to maintain attention.

### Discussion Prompt
- Ask about a specific experience, not a general opinion.
- BAD: 「你對車禍理賠有什麼看法？」
- GOOD: 「有保過車險的人，你第一次申請理賠時遇到最意外的事是什麼？」

### Share Hook
- Give a reason to tag or share that relates to the reader's social circle.
- BAD: 「分享給需要的人」
- GOOD: 「你身邊一定有人現在正在處理這件事，傳給他。」

### Image Recommendation
- Suggest a specific visual concept that works on Facebook (not just "use the carousel").
- Example: 「一張理賠流程的時間軸圖，標出三個大多數人會卡住的關鍵步驟」
```

### JSON Output 格式保持不變

不要改動 JSON schema，只改善 prompt 的品質指引。

## 驗證

執行 pytest -q 確保測試通過。
```

---

## PR-4: Instagram 輸出格式改善 — 複製即可用

**Repo: `neoxra-core`**
**目標: Instagram 的 caption、hashtags、carousel text 複製後可以直接貼上 Instagram**

```
你是 Neoxra 的 AI prompt 工程師。目前 Instagram 的輸出有結構（carousel slides, caption, hashtags），
但複製出來的格式不適合直接貼上 Instagram。

問題分析：
1. Caption 需要更像 Instagram 原生風格（短句、換行、emoji 適度使用）
2. Carousel slide 文字可能太長，在真實輪播圖上會看不清
3. Hashtags 沒有按照 Instagram 最佳實踐排列

任務：改善 Instagram 生成的 prompt，讓輸出更符合 Instagram 原生格式。

## 修改檔案: neoxra_core/prompts/instagram_generation.py

在 build_instagram_generation_prompt 函數中，加入以下品質指引。
保持函數簽名和回傳 JSON 格式完全不變。

### 在現有 prompt 中新增或替換的規則：

```
## Instagram-Native Content Rules

### Caption
- First sentence must be a scroll-stopper. It appears as preview text.
- Use line breaks between ideas (Instagram renders \n as line breaks).
- Include 1-2 relevant emoji per paragraph, but never start with emoji.
- End with a clear CTA: save, share, comment, or follow.
- For zh-TW: 口語化但專業。像一個有影響力的 Instagram 創作者在寫文案。
  GOOD: 「車禍後最容易犯的錯，就是太快答應和解。\n\n先把這 3 件事做完，你的權益才有保障。」
  BAD: 「本文將為您介紹車禍理賠的完整流程。」

### Carousel Slides
- Each slide title: maximum 15 characters (zh-TW) or 6 words (en). Must be scannable.
- Each slide body: maximum 80 characters (zh-TW) or 30 words (en). Users swipe fast.
- Slide 1 is the hook — same energy as the caption first line.
- Last slide is the CTA — tell them what to do next.
- Total slides: 5-7 for best engagement.

### Hashtags  
- Generate exactly 20 hashtags.
- Mix: 5 high-volume (>100k posts), 10 medium (10k-100k), 5 niche (<10k).
- First 5 hashtags should be the most relevant to the specific topic.
- No generic hashtags like #love #instagood #photooftheday.
- For zh-TW: Mix Chinese and English hashtags. Example: #車禍理賠 #保險理賠流程 #carinsurance
```

## 驗證

執行 pytest -q 確保測試通過。
```

---

## PR-5: 前端複製體驗優化

**Repo: `neoxra`**
**目標: 讓所有平台的複製體驗更流暢**

```
你是 Neoxra 的前端工程師。目前各平台的複製按鈕需要小幅優化，
讓使用者的複製貼上體驗更好。

## 修改 1: frontend/components/ThreadsPreview.tsx

改善 formatThread 函數（約第 43 行），讓複製出來的格式更適合直接貼到 Threads：

將現有的：
```typescript
function formatThread(thread: ThreadsThread) {
  return thread.posts
    .map((post) => `${post.post_number}/${thread.posts.length}\n${post.content}`)
    .join('\n\n')
}
```

改為：
```typescript
function formatThread(thread: ThreadsThread) {
  // Threads app 不需要編號，直接貼文字即可
  // 第一則直接貼，後續則用空行分隔
  return thread.posts.map((post) => post.content).join('\n\n---\n\n')
}
```

同時在 reply_bait 區塊（約第 145 行）加入一個 CopyButton：
在 reply_bait 的 <div> 裡加入：
```tsx
<div className="flex items-center justify-between">
  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
    Reply bait
  </div>
  <CopyButton label={copy.copyOne} copiedLabel={copy.copied} value={thread.reply_bait} />
</div>
```

## 修改 2: frontend/components/FacebookPreview.tsx

改善 formatFacebookPost 函數（約第 36 行），讓複製格式更像 Facebook 貼文：

將現有的：
```typescript
function formatFacebookPost(post: FacebookPost) {
  return [post.hook, post.body, post.discussion_prompt, post.share_hook]
    .filter(Boolean)
    .join('\n\n')
}
```

改為：
```typescript
function formatFacebookPost(post: FacebookPost) {
  // 組合成可直接貼上 Facebook 的格式
  const parts = [post.hook, '', post.body]
  if (post.discussion_prompt) {
    parts.push('', post.discussion_prompt)
  }
  if (post.share_hook) {
    parts.push('', post.share_hook)
  }
  return parts.join('\n')
}
```

同時新增每個區塊的獨立複製按鈕。在每個區塊的標題旁加入 CopyButton：

在 discussion prompt 區塊（約第 111 行）：
```tsx
<div className="flex items-center justify-between">
  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
    {copy.discussion}
  </div>
  <CopyButton value={post.discussion_prompt} copy={copy} />
</div>
```

## 修改 3: frontend/app/instagram/page.tsx

找到複製 hashtags 的地方（大約在 hashtags.join(' ') 附近），
改為用換行分隔讓使用者可以更靈活地使用：

```typescript
// 將 hashtags 分成兩組顯示
const hashtagText = hashtags.join(' ')  // 保持現有的空格分隔，Instagram 接受這種格式
```

這裡其實不需要改——Instagram 本身接受空格分隔的 hashtags。

## 修改 4: 所有 CopyButton 的回饋時間

在 ThreadsPreview.tsx 和 FacebookPreview.tsx 中，
將 CopyButton 的 setTimeout 從 1400ms 改為 2000ms，讓使用者更容易看到「已複製」的回饋：

```typescript
window.setTimeout(() => setCopied(false), 2000)
```

## 驗證

執行 `npm run build` 確保編譯通過（如果有 TypeScript 錯誤需修復）。
```

---

## 部署前 .env 設定

在 `neoxra/backend/.env` 中新增以下設定來啟用 Sonnet（可選但建議）：

```env
# 升級特定平台的模型（需要更多 token 但品質大幅提升）
NEOXRA_SEO_MODEL=claude-sonnet-4-6
NEOXRA_IG_MODEL=claude-sonnet-4-6
NEOXRA_THREADS_MODEL=claude-sonnet-4-6
NEOXRA_FB_MODEL=claude-sonnet-4-6
```

## 執行順序

1. 在 `neoxra-core` 和 `neoxra` 分別 commit PR-0 的修改
2. 在 `neoxra-core` 執行 PR-1（模型選擇邏輯）
3. 在 `neoxra-core` 執行 PR-2（Threads prompt）
4. 在 `neoxra-core` 執行 PR-3（Facebook prompt）
5. 在 `neoxra-core` 執行 PR-4（Instagram prompt）
6. 在 `neoxra` 執行 PR-5（前端複製體驗）
7. 更新 `.env` 加入 Sonnet model
8. 重啟 backend，測試所有平台
9. Deploy 到 production
10. 錄製 demo video
