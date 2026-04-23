import type { SeoArticle, SeoSection } from '../lib/seo-types'
import { useLanguage } from './LanguageProvider'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  'zh-TW': {
    wordCountPrefix: '約',
    wordCountSuffix: '字',
    searchIntent: '搜尋意圖',
    primaryKeyword: '主關鍵字',
    conclusion: '結論',
    summary: '重點整理',
  },
  en: {
    wordCountPrefix: 'About',
    wordCountSuffix: 'words',
    searchIntent: 'Search intent',
    primaryKeyword: 'Primary keyword',
    conclusion: 'Conclusion',
    summary: 'Key takeaways',
  },
}

function KeywordBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[var(--accent-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
      {children}
    </span>
  )
}

function ArticleSection({ section }: { section: SeoSection }) {
  const HeadingTag = section.heading_level <= 2 ? 'h2' : 'h3'
  const headingClass =
    section.heading_level <= 2
      ? 'text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]'
      : 'text-xl font-semibold text-[var(--text-primary)]'

  return (
    <section className="space-y-3">
      <HeadingTag className={headingClass}>{section.heading}</HeadingTag>
      <p className="whitespace-pre-wrap text-[16px] leading-8 text-[var(--text-secondary)]">
        {section.content}
      </p>
    </section>
  )
}

export function SeoArticlePreview({ article }: { article: SeoArticle }) {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <article className="space-y-8">
      <section className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)]">
        <div className="-mx-6 -mt-6 mb-6 h-1 rounded-t-[var(--card-radius)] bg-[image:var(--gradient-seo)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-tertiary)]">
              SEO METADATA
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.02em] text-[var(--text-primary)]">
              {article.metadata.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {article.metadata.meta_description}
            </p>
          </div>
          <span className="rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
            {copy.wordCountPrefix} {article.estimated_word_count} {copy.wordCountSuffix}
          </span>
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-[12px] bg-[var(--bg-sunken)] p-4">
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">URL Slug</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">/{article.metadata.url_slug}</p>
          </div>
          <div className="rounded-[12px] bg-[var(--bg-sunken)] p-4">
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">{copy.searchIntent}</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">{article.metadata.target_search_intent}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <KeywordBadge>{copy.primaryKeyword}: {article.metadata.primary_keyword}</KeywordBadge>
          {article.metadata.secondary_keywords.map((keyword) => (
            <KeywordBadge key={keyword}>{keyword}</KeywordBadge>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] md:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="space-y-4">
            <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-[var(--text-primary)] md:text-[42px]">
              {article.h1}
            </h1>
            <p className="text-lg leading-8 text-[var(--text-secondary)]">{article.introduction}</p>
          </header>

          <div className="space-y-8">
            {article.sections.map((section, index) => (
              <ArticleSection key={`${section.heading}-${index}`} section={section} />
            ))}
          </div>

          <section className="rounded-[18px] bg-[var(--bg-sunken)] p-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{copy.conclusion}</h2>
            <p className="mt-3 text-[16px] leading-8 text-[var(--text-secondary)]">{article.conclusion}</p>
            <h3 className="mt-6 text-lg font-semibold text-[var(--text-primary)]">{copy.summary}</h3>
            <ul className="mt-3 space-y-2 text-[15px] leading-7 text-[var(--text-secondary)]">
              {article.summary_points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-[15px] font-medium leading-7 text-[var(--text-primary)]">
              {article.cta}
            </p>
          </section>
        </div>
      </section>
    </article>
  )
}
