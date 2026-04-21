export interface StyleAnalysis {
  tone_keywords: string[];
  structural_patterns: string[];
  vocabulary_notes: string;
}

export interface CarouselSlide {
  title: string;
  body: string;
  text_alignment?: 'left' | 'center' | 'right';
  emphasis?: 'normal' | 'strong' | 'quiet';
}

export interface Scorecard {
  hook_strength: number;
  cta_clarity: number;
  hashtag_relevance: number;
  platform_fit: number;
  tone_match: number;
  originality: number;
  average: number;
}

export interface InstagramContent {
  caption: string;
  hook_options: string[];
  hashtags: string[];
  carousel_outline: CarouselSlide[];
  reel_script: string;
}

export interface InstagramResult {
  content: InstagramContent;
  scorecard: Scorecard;
  critique: string;
  style_analysis: StyleAnalysis;
}
