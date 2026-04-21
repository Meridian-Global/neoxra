export type ThreadsPostPurpose = 'hook' | 'argument' | 'evidence' | 'punchline' | 'cta'
export type ThreadsFormat = 'single_post' | 'thread'

export interface ThreadsPost {
  content: string
  post_number: number
  purpose: ThreadsPostPurpose
}

export interface ThreadsThread {
  posts: ThreadsPost[]
  format: ThreadsFormat
  reply_bait: string
}
