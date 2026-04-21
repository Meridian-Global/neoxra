import type { SeoArticle } from './seo-types'

function escapeYaml(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function toMarkdown(article: SeoArticle): string {
  const frontmatter = [
    '---',
    `title: ${escapeYaml(article.metadata.title)}`,
    `description: ${escapeYaml(article.metadata.meta_description)}`,
    `slug: ${escapeYaml(article.metadata.url_slug)}`,
    `primary_keyword: ${escapeYaml(article.metadata.primary_keyword)}`,
    `secondary_keywords: [${article.metadata.secondary_keywords.map(escapeYaml).join(', ')}]`,
    `search_intent: ${escapeYaml(article.metadata.target_search_intent)}`,
    `estimated_word_count: ${article.estimated_word_count}`,
    '---',
  ]

  const body = [
    `# ${article.h1}`,
    article.introduction,
    ...article.sections.flatMap((section) => [
      `${'#'.repeat(Math.min(Math.max(section.heading_level, 2), 4))} ${section.heading}`,
      section.content,
    ]),
    '## 結論',
    article.conclusion,
    '## 重點整理',
    ...article.summary_points.map((point) => `- ${point}`),
    '## 下一步',
    article.cta,
  ]

  return [...frontmatter, '', ...body].join('\n\n')
}

export function toHTML(article: SeoArticle): string {
  const keywordMeta = article.metadata.secondary_keywords
    .map((keyword) => `<meta name="keywords" content="${escapeHtml(keyword)}" />`)
    .join('\n')

  const sections = article.sections
    .map((section) => {
      const level = Math.min(Math.max(section.heading_level, 2), 4)
      return [
        `<h${level}>${escapeHtml(section.heading)}</h${level}>`,
        ...paragraphs(section.content).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      ].join('\n')
    })
    .join('\n\n')

  return [
    `<article>`,
    `<header>`,
    `<title>${escapeHtml(article.metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(article.metadata.meta_description)}" />`,
    `<link rel="canonical" href="/${escapeHtml(article.metadata.url_slug)}" />`,
    `<meta name="primary-keyword" content="${escapeHtml(article.metadata.primary_keyword)}" />`,
    keywordMeta,
    `<h1>${escapeHtml(article.h1)}</h1>`,
    `</header>`,
    ...paragraphs(article.introduction).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    sections,
    `<section>`,
    `<h2>結論</h2>`,
    ...paragraphs(article.conclusion).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    `<h2>重點整理</h2>`,
    `<ul>`,
    ...article.summary_points.map((point) => `<li>${escapeHtml(point)}</li>`),
    `</ul>`,
    `<h2>下一步</h2>`,
    `<p>${escapeHtml(article.cta)}</p>`,
    `</section>`,
    `</article>`,
  ].filter(Boolean).join('\n')
}
