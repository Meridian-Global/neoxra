# Neoxra 雲端架構 + 部署 + CI/CD 規劃

> 對象：個人創業者 / 小團隊
> 目標：快速上線 demo，保留未來擴充能力，成本可控
> 撰寫日期：2026-04-16

---

## TL;DR（直接給結論，再看細節）

1. **Domain 首選**：`<TODO-neoxra-domain>`（品牌型、SaaS 慣例、可註冊率高）；
   備選 `<TODO-neoxra-alt-domain>` / `<TODO-neoxra-alt-domain>`；
   `<TODO-neoxra-ai-domain>` 價錢通常 $2k~$10k，MVP 階段不建議搶。
2. **最佳架構組合**：
   - `neoxra` 前端 → **Vercel**
   - `neoxra` 後端 FastAPI → **GCP Cloud Run**（或 Railway，二擇一，見 B 段）
   - `neoxra-core` → **作為 Python package，不獨立部署**
   - `neoxra-linkedin` → **Chrome extension 只呼叫 neoxra API**，不自建後端
3. **未來 30 天重點**：
   - 第 1 週：買 domain、Vercel 部前端、Cloud Run 部後端（手動）
   - 第 2 週：把 neoxra-core 改成可 `pip install git+...` 的 package，neoxra 匯入它
   - 第 3 週：寫 GitHub Actions（三個 repo 各一份），main merge → auto deploy
   - 第 4 週：加 staging 環境、secrets 規劃、monitoring（Cloud Run + Sentry 免費方案）
4. **現在不要做**：自建 Kubernetes、GCP VPC / Cloud SQL、neoxra-core 獨立部署、前後端拆微服務、自己搞 Nginx。

---

## A. Domain / 命名策略

### 命名原則（先對齊標準）

1. **可唸、可拼、可記憶**（2~4 音節）。
2. **`.com` 優先**，再考慮 `.ai` / `.so` / `.io`。
3. **避開商標衝突**：`neoxra` 是常見字，單獨存在 SaaS 市場已被佔用（例：Neoxra 是一個 data ops 公司），因此原生 `neoxra.com` 幾乎不可能拿到。
4. **留擴充空間**：不要寫死在 LinkedIn 或單一平台。

### 15 個可行 domain 方向

#### 品牌型（抽象、有辨識度、適合長期品牌）

| # | Domain | 優點 | 缺點 | 定位 |
|---|--------|------|------|------|
| 1 | `<TODO-neoxra-domain>` | SaaS 命名慣例（use-/try-/get-），可註冊率高，保留 neoxra 概念 | 前綴讓名字變長 | ✅ **長期品牌首選** |
| 2 | `<TODO-neoxra-alt-domain>` | 友好、實驗感、對早期使用者親切 | "try" 有暫時感，品牌化後可能要換 | ✅ 適合 MVP~中期 |
| 3 | `<TODO-neoxra-alt-domain>` | 短、現代 SaaS 感（Notion / Linear 都用 .so / 類似） | `.so` 辨識度仍遜於 `.com` | ✅ 長期可用 |
| 4 | `meridian.global` | 你公司名（Meridian Global），可當母品牌 | 不直接指向 neoxra 產品 | 🔸 當 corporate site，不當產品域名 |
| 5 | `<TODO-neoxra-alt-domain>` | 活潑、有音樂 metaphor 延伸 | "play" 容易被誤以為遊戲 | 🔸 備選 |

#### 功能型（描述做的事，SEO 友善）

| # | Domain | 優點 | 缺點 | 定位 |
|---|--------|------|------|------|
| 6 | `onebrief.com` / `onebrief.ai` | 呼應你系統核心的 Brief 物件，直覺 | 太窄，若未來加入其他抽象物件就綁手綁腳 | 🔸 MVP 可用，不推長期 |
| 7 | `crosspost.ai` | 一看就懂是跨平台內容工具 | 太直白，難以品牌化 | ❌ 只適合 MVP |
| 8 | `postconductor.com` | conductor 呼應 neoxra metaphor | 略長 | 🔸 有創意，但較小眾 |
| 9 | `brandvoice.ai` | Brand voice 是你 critic agent 的核心概念 | 容易被誤以為單純 voice cloning 工具 | ❌ 定位偏差 |

#### AI / SaaS 型（強調 AI 與產品感）

| # | Domain | 優點 | 缺點 | 定位 |
|---|--------|------|------|------|
| 10 | `<TODO-neoxra-ai-domain>` | 直接連結 AI，你原本偏好 | 重複字（neoxra + ai），讀起來略拗口；.com 後綴抬價 | 🔸 可用但非最佳 |
| 11 | `<TODO-neoxra-alt-domain>` | 與 primary-neoxra-domain 類似，get- 前綴 SaaS 慣例 | 跟 primary-neoxra-domain 重複度高，二選一 | 🔸 primary-neoxra-domain 的備選 |
| 12 | `harmonize.ai` | 呼應 neoxra 概念、抽象、有想像空間 | 與許多既有品牌字重疊 | ✅ 有潛力，需查商標 |

#### 多平台擴充型（不綁 LinkedIn，未來可橫跨 IG / Threads / X / TikTok）

| # | Domain | 優點 | 缺點 | 定位 |
|---|--------|------|------|------|
| 13 | `polyvoice.ai` | poly = 多、voice = 品牌聲音，扣你系統的 voice_store | 生字，需行銷說明 | ✅ 擴充友善 |
| 14 | `multicast.ai` | 多通道內容廣播的直接隱喻 | "multicast" 有網路技術意涵，可能誤導開發者 | 🔸 備選 |
| 15 | `onetake.ai` | 一次創作、多平台輸出的概念 | 已被影視產業佔用部分心智份額 | 🔸 MVP 可用 |

### 分類建議矩陣

```
                適合 MVP          適合長期品牌
品牌型        alt-neoxra-domain      primary-neoxra-domain / <TODO-neoxra-alt-domain>
功能型        onebrief          （不推長期用功能型）
AI/SaaS 型    neoxra-ai      harmonize.ai
多平台擴充型   onetake           polyvoice
```

### 具體建議

- **現在就買：** `<TODO-neoxra-domain>`（主）+ `<TODO-neoxra-alt-domain>`（副）+ `<TODO-neoxra-alt-domain>`（防搶）。全部加起來一年約 $40~$60。
- **先不要碰：** `.ai` 網域通常每年 $70+，而且 `<TODO-neoxra-ai-domain>` 多半要拍賣四位數以上。品牌未穩前不划算。
- **長期策略：** 產品站用 `<TODO-neoxra-domain>`，母公司保留 `meridian.global`，需要 API 子網域時再切 `api.<TODO-neoxra-domain>`、`app.<TODO-neoxra-domain>`。

---

## B. 雲端架構選項比較

### 6 個方案矩陣

| 方案 | 成本/月（初期） | 架構複雜度 | 維護難度 | 部署速度 | 適合現階段 | 未來 scale | 適合你的 repo 結構 |
|------|--------|-----------|---------|---------|-----------|-----------|------------------|
| **1. 全本地，不上雲** | $0 | 低 | 低 | 快 | ⭕ 剛開始可 | ❌ 無法 demo / 用戶測試 | ❌ 無法給人試 |
| **2. 前 Vercel + 後 Cloud Run** | ~$0~$20 | 中 | 中 | 中快 | ✅ **最佳** | ✅ 可橫向擴充 | ✅ 完美對應 |
| **3. 全上 GCP（Cloud Run + Cloud SQL + Storage）** | ~$30~$100 | 高 | 中高 | 中 | ❌ 過度設計 | ✅ 最成熟 | ⚠️ 早期殺雞用牛刀 |
| **4. Railway / Render / Fly.io** | ~$5~$20 | 低 | 低 | 最快 | ✅ **次佳** | ⚠️ scale 受平台限制 | ✅ 極簡上手 |
| **5. neoxra-core 作 library** | $0 額外 | 低 | 低 | — | ✅ **必選** | ✅ 需要時再切 service | ✅ 對應 monorepo 哲學 |
| **6. neoxra-core 獨立 microservice** | +$10~$30 | 高 | 高 | 慢 | ❌ 太早 | ✅ | ❌ 早期不需要 |

### 詳細分析

#### 方案 2：Vercel 前端 + Cloud Run 後端（**推薦**）

**為什麼這個組合：**
- Vercel 對 Next.js 是原生支援，push → build → 自動 preview URL，完全不用維護。
- Cloud Run 是「serverless container」：你 push 一個 Docker image，GCP 自動擴縮，**閒置時縮到 0 就不收費**，對 MVP 極友善。
- 成本估算（以你個人使用 + 少量 demo）：
  - Vercel Hobby：$0
  - Cloud Run：每月免費 200 萬請求 + 360,000 GB-seconds，實測個人用幾乎跑不滿免費額度
  - Claude API 才是主要成本（跟雲端分開）
  - domain 約 $1~$2/月
- **實際每月帳單通常 $0~$5**（Claude API 另計）。

**缺點：**
- 前後端分兩家（Vercel + GCP），日誌與 secrets 要各管一份。
- Cloud Run cold start 約 1~3 秒（可接受）。

#### 方案 4：Railway / Render / Fly.io（**次推薦**）

- **優點：** 前後端可同一平台、部署極簡、有免費額度、UI 友善。
- **缺點：** 免費額度相對小，服務層級跳升後成本易失控；長期如果要加 GCP 其他服務（Vision、Speech、BigQuery）會被平台限制住。
- **適合情境：** 你希望一週內上線、不想學 Docker / GCP、專案規模小於 $10/月。

#### 為什麼不推方案 3（全 GCP）

早期上全套 GCP = 要學 VPC、IAM、Service Accounts、Secret Manager、Cloud SQL、Load Balancer。對個人開發者來說，前兩週會耗掉 100% 的時間，完全不符合「快速上線 demo」的目標。**等你月成本 > $100 或有實際用戶才開始搬，不會太晚。**

#### 為什麼不推方案 6（neoxra-core 獨立部署）

現階段 neoxra-core 是 **能力函式庫**（skills、prompts、voice loader、LLM provider wrapper），不是會被多個 client 同時 HTTP 呼叫的服務。當你只有 1 個 client（neoxra backend）時，HTTP 包一層只會徒增延遲、錯誤來源、部署複雜度。**Library 模式的退出成本極低**——哪天真的需要獨立 service，把 skills 匯到 FastAPI endpoint 就是幾小時的工作。

---

## C. 三個 Repo 的部署策略

### C1. neoxra（產品平台層）

- **現在就上雲。** 它是你唯一有 demo URL 價值的專案。
- **拆法：**
  - `frontend/` (Next.js) → Vercel
  - `backend/` (FastAPI) → Cloud Run（或 Railway）
- **環境：** 只要 `production` 一套就夠了。Vercel 預設會給每個 PR 一個 preview URL，等於免費 staging。backend staging 可等有外部使用者時再加。
- **DB：** 早期用 SQLite 或 Cloud Run 的檔案系統即可（注意 Cloud Run 無狀態，要用 `gcsfuse` 或直接 skip DB）。真的要跨請求持久化，改用 **Supabase**（免費 Postgres）或 **Cloud Firestore** 免費額度。

### C2. neoxra-core（AI 能力層）

- **現階段：Library，不要獨立部署。**
- **做法：** 把 neoxra-core 發成可安裝的 Python package：
  - 方法 A（最快）：`neoxra` 的 `requirements.txt` 加一行
    ```
    neoxra-core @ git+https://github.com/<你的帳號>/neoxra-core.git@main
    ```
  - 方法 B（稍正式）：發到 **GitHub Packages** 或私有 PyPI index。
  - 方法 C（未來再做）：用 GitHub Actions 打 tag 後自動 publish 到私有 registry。
- **什麼時候改成 microservice？** 出現以下任一條件才考慮：
  1. neoxra-linkedin extension 要直接呼叫 AI（繞過 neoxra backend）
  2. 有第二個產品（非 neoxra）要用同一套 AI 能力
  3. AI 部分要獨立 scale（例如 GPU 或長任務佇列）
- **CI：** 只要跑 `pytest` + 打 tag 即可，不需要 deploy step。

### C3. neoxra-linkedin（LinkedIn 應用層）

- **不需要獨立後端伺服器。** Chrome extension 的特性是：UI 跑在瀏覽器，「後端」就是呼叫 `api.<TODO-neoxra-domain>/v1/...`。
- **部署其實只有兩件事：**
  1. **build** extension 成 `.zip`（CI 做）
  2. **upload** 到 Chrome Web Store（官方不建議自動化，首次上架要人工）
- **建議做法：**
  - Release 時：GitHub Action 跑 build → 產生 `extension.zip` → 上傳成 GitHub Release 資產
  - 上架：手動在 Chrome Web Store Developer Dashboard 上傳（初期一週上架 1 次就足夠）
- **版本管理：** 用 semver，`manifest.json` 的 version 要跟 git tag 同步（CI 可檢查）。

### 最小可行上線架構（MVP）

```
┌─────────────────────┐
│  <TODO-neoxra-domain>   │  ← Vercel（Next.js）
│  (marketing + app)  │
└──────────┬──────────┘
           │ fetch
           ▼
┌─────────────────────┐
│ api.<TODO-neoxra-domain>│  ← Cloud Run（FastAPI）
│  neoxra backend  │
│  │                  │
│  └─ neoxra-core  │  ← 同一個 Docker image 裡的 Python package
│     (as library)    │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│   Anthropic API     │
└─────────────────────┘

Chrome extension (neoxra-linkedin)
  → 呼叫 api.<TODO-neoxra-domain>
```

**只有兩個部署目標：Vercel 的前端、Cloud Run 的後端。** 其他都是程式碼層的組合。

---

## D. CI/CD 規劃

### D1. 總原則

1. **Branch 策略：** `main` = production；`feat/*` / `fix/*` = feature branches；PR 必經 code review（或自我 review）+ 通過 CI。
2. **Deploy 策略：** 只有 `main` merge 才會 deploy production。feature branch push 只跑 test。
3. **Environment：** 初期只要 `production`，外加 Vercel 自動產生的 PR preview URL 當 staging。
4. **Secrets 管理：**
   - GitHub Actions 用 `repository secrets` 存 `ANTHROPIC_API_KEY`、`GCP_SA_KEY`、`VERCEL_TOKEN` 等。
   - Runtime secrets（backend 用的）存 **Google Secret Manager**，Cloud Run service 綁 Service Account 讀取。
   - 絕對不要把 secrets 寫進 `.env` 然後 commit。`.env.example` 只放 key 名稱不放值。

### D2. neoxra 的 CI/CD

**觸發時機 → 做什麼**

| 事件 | 動作 |
|------|------|
| push 到 `feat/*` | 跑 `pytest` + lint（ruff / mypy） |
| 開 PR 到 `main` | 上述 + Vercel 自動給 preview URL + backend build Docker image（不 deploy） |
| merge 到 `main` | 上述 + backend **推 image 到 GCP Artifact Registry** + `gcloud run deploy` + Vercel 自動 deploy 前端 |
| tag `v*.*.*` | 上述 + 產生 GitHub Release notes |

**GitHub Actions workflow 檔案建議：**

```
.github/workflows/
├── ci.yml          # 所有 push / PR：lint + test
├── deploy.yml      # 只在 main：build + deploy backend to Cloud Run
└── release.yml     # 只在 tag：產生 release
```

**`deploy.yml` 核心步驟：**

```yaml
# 簡化版
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
- uses: google-github-actions/setup-gcloud@v2
- run: gcloud builds submit --tag gcr.io/$PROJECT/neoxra-backend
- run: gcloud run deploy neoxra-backend \
         --image gcr.io/$PROJECT/neoxra-backend \
         --region asia-east1 \
         --allow-unauthenticated \
         --set-secrets=ANTHROPIC_API_KEY=anthropic-key:latest
```

Vercel 幾乎不用寫 action：把 repo 綁上 Vercel 帳號，它會自動在 push / PR 時 build。

### D3. neoxra-core 的 CI/CD

**不需要 deploy，只需要 CI。**

| 事件 | 動作 |
|------|------|
| push 到任何 branch | 跑 `pytest -q` |
| 開 PR | 上述 + coverage report（選用） |
| merge 到 `main` | 上述 |
| tag `v*.*.*` | 上述 + （可選）publish 到私有 PyPI |

短期就一個 `ci.yml`，裡面跑 `pip install -e ".[dev]"` + `pytest`，足夠。

### D4. neoxra-linkedin 的 CI/CD

| 事件 | 動作 |
|------|------|
| push 到 `feat/*` | lint + （如有）test |
| merge 到 `main` | build extension `.zip` + upload 到 GitHub Artifacts |
| tag `v*.*.*` | 建 GitHub Release + 附 `.zip`；通知你去 Chrome Web Store 上傳 |

**不要嘗試自動上傳到 Chrome Web Store。** Chrome 有官方 publish API 但審核依舊要幾天到兩週，自動化只節省「拉 zip」那 30 秒，不值得。

### D5. Secrets 清單（要先準備）

| Secret | 存哪裡 | 用途 |
|--------|--------|------|
| `ANTHROPIC_API_KEY` | GitHub Secrets（CI）+ GCP Secret Manager（runtime） | Claude API |
| `GCP_SA_KEY` | GitHub Secrets | CI 部署 Cloud Run |
| `VERCEL_TOKEN` | GitHub Secrets（只有 neoxra 前端需要） | 前端部署 |
| `DATABASE_URL` | GCP Secret Manager | 未來接 Supabase / Cloud SQL 時 |

---

## E. 最務實的建議（執行面）

### E1. 我現在最推薦的方案（一句話版）

> 買 `<TODO-neoxra-domain>`；前端 Vercel，後端 Cloud Run，neoxra-core 當 library，neoxra-linkedin 只 build zip；main merge 就 auto deploy；staging/production 現在先不拆。

### E2. 未來 30 天執行順序

**Week 1：上線 demo（優先做「看得到」的事）**
- Day 1：註冊 `<TODO-neoxra-domain>`（Cloudflare Registrar 或 Namecheap，選 Cloudflare 有更好的 DNS UX）
- Day 2：neoxra 的 `frontend/` 綁 Vercel，PR preview 通過即 merge
- Day 3：寫 neoxra backend 的 `Dockerfile`；本地 `docker build` + `docker run` 確認能跑
- Day 4：建 GCP 專案 → 開 Cloud Run → 手動部一次，拿到 `api-xxx.run.app` URL
- Day 5：設 custom domain `api.<TODO-neoxra-domain>` 指到 Cloud Run
- Day 6~7：前端串 backend API，第一個 end-to-end demo（輸入 idea → 回傳三平台內容）

**Week 2：打底 neoxra-core 作 library**
- Day 8~9：在 neoxra-core 發 tag `v0.1.0`，測試 `pip install git+...` 從 neoxra 匯入
- Day 10~11：neoxra backend 改用 neoxra-core 的 skills / voice loader，刪掉重複程式碼
- Day 12~14：寫 neoxra-core 的 `ci.yml`，每次 push 跑 pytest

**Week 3：CI/CD 自動化**
- Day 15~17：寫 neoxra 的 `deploy.yml`，merge to main → 自動 build + push + deploy Cloud Run
- Day 18~19：前端 Vercel 的 auto deploy 驗證；設 preview URL 給自己當 staging
- Day 20~21：寫 neoxra-linkedin 的 build + zip action

**Week 4：維運基本功（低優先但有價值）**
- Day 22~24：接 **Sentry**（免費 5k events/月）到 backend 和 extension
- Day 25~26：GCP Secret Manager 收掉所有 runtime secrets
- Day 27~28：寫一份 `DEPLOYMENT.md` 紀錄現在的架構（未來的你會感謝現在的你）
- Day 29~30：做一個對外的 demo reel / landing page hero section

### E3. 哪些事情「現在先不要做」

1. **不要自建 Kubernetes / GKE**——Cloud Run 就是 Kubernetes 的簡化版，未來真需要再遷移也極快。
2. **不要把 neoxra-core 拆成獨立服務**——現在只有一個 client，拆了只是徒增 bug 和延遲。
3. **不要急著買 `.ai` 網域**——品牌未驗證前買四位數美金域名是 premature optimization。
4. **不要做多環境（dev/staging/prod 三層）**——個人專案用 main = prod + Vercel PR preview 當 staging，已經 80 分。
5. **不要自己搞 Nginx / Load Balancer**——Cloud Run 和 Vercel 都內建 HTTPS + CDN。
6. **不要上 Cloud SQL / RDS**——有資料需求就先 Supabase 免費 tier，或 SQLite + Cloud Storage。
7. **不要做 neoxra-linkedin 的自動上架**——Chrome Web Store 審核時間決定節奏，自動化反而難 debug。

### E4. 哪些事情「現在做最划算」

1. **域名**：$12/年鎖 5 年品牌資產，沒有理由不做。
2. **GitHub Actions CI**：free tier 夠用、日後代碼庫長大時的保護網。
3. **Sentry / 基本 monitoring**：免費方案的觀測能力遠超個人可以自己寫的水準。
4. **neoxra-core 做好 pytest**：這是你之後重構、提取 skills 的根基。壞 test 比沒 test 更慘，現在還少就打好基礎。
5. **Dockerfile 寫好**：Cloud Run、Railway、Fly、未來任何 PaaS 都吃 Docker image，一次投資多處受用。
6. **寫 `.env.example`**：未來招人 / onboard 新機器的時間成本差 10 倍。

### E5. 決策原則（未來再遇到類似取捨的判準）

1. **Reversibility first**：選 reversible 的路徑（Cloud Run > GKE、library > microservice、Vercel > 自架 CDN）。
2. **Demo 價值 > 架構完美**：有人能打開網址用到產品，才有下一步的資源。
3. **Infra 成本 < Claude API 成本時，不要碰 infra**：你每月 $5 infra + $50 API 時代，任何「優化基礎設施省 $2」的時間都是虧的。
4. **一條 main、一個 env 撐多久撐多久**：加環境加 branch 加 stage 都是成本，沒遇到痛點前不要預先解決。
5. **先 monolith，後拆分**：neoxra backend 目前是 one Docker image 跑 FastAPI + neoxra-core，這是你最省事的組合，直到流量或團隊規模逼你拆。

---

## 附錄：推薦工具與服務清單

| 類別 | 工具 | 月費（初期） | 為什麼 |
|------|------|------|--------|
| Domain Registrar | Cloudflare Registrar | ~$1 | 批發價、DNS 管理整合 |
| 前端託管 | Vercel Hobby | $0 | Next.js 原生，PR preview 免費 |
| 後端託管 | GCP Cloud Run | $0~$5 | Serverless container，scale to zero |
| Secrets | GCP Secret Manager | $0（6 secrets 以下） | Cloud Run 原生整合 |
| DB（待需要時） | Supabase Free | $0 | Postgres + Auth + Storage 一站式 |
| 錯誤監控 | Sentry Developer | $0 | 5k events/月免費 |
| 日誌 | GCP Cloud Logging | $0（50 GiB/月免費） | Cloud Run 自動寫入 |
| CI | GitHub Actions | $0（public repo 無限 / private 2000 min/月） | 最標準 |
| Registry | GCP Artifact Registry | $0~$1 | 0.5 GB 免費 |

---

*有任何段落想深入展開（例如：Dockerfile 範本、具體 GitHub Actions YAML、Cloud Run 部署腳本、Vercel custom domain 設定步驟），告訴我哪一段，我再補細節。*
