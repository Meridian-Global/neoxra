export interface SeoMetadata {
  title: string
  meta_description: string
  url_slug: string
  primary_keyword: string
  secondary_keywords: string[]
  target_search_intent: string
}

export interface SeoSection {
  heading: string
  heading_level: number
  content: string
}

export interface SeoArticle {
  metadata: SeoMetadata
  h1: string
  introduction: string
  sections: SeoSection[]
  conclusion: string
  summary_points: string[]
  cta: string
  estimated_word_count: number
}
