import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { renderCarouselSlideToPng } from './carousel-export'
import { toHTML, toMarkdown } from './seo-export'
import type { FacebookPost } from './facebook-types'
import type { InstagramContent } from './instagram-types'
import type { SeoArticle } from './seo-types'
import type { ThreadsThread } from './threads-types'

const MAX_ZIP_BYTES = 50 * 1024 * 1024

export interface AllPlatformOutputs {
  instagram?: InstagramContent
  seo?: SeoArticle
  threads?: ThreadsThread
  facebook?: FacebookPost
  instagramSlideElements?: HTMLElement[]
}

function slugifyTopic(topicSlug: string) {
  const slug = topicSlug
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'neoxra'
}

function formatCaption(content: InstagramContent) {
  return [content.caption, '', content.hashtags.join(' ')].join('\n')
}

function formatThreads(thread: ThreadsThread) {
  return [
    ...thread.posts.map((post) => `${post.post_number}/${thread.posts.length}\n${post.content}`),
    '',
    `互動引導：${thread.reply_bait}`,
  ].join('\n\n')
}

function formatFacebook(post: FacebookPost) {
  return [
    post.hook,
    post.body,
    post.discussion_prompt,
    post.share_hook,
    '',
    `圖像建議：${post.image_recommendation}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export async function downloadAllOutputs(outputs: AllPlatformOutputs, topicSlug: string): Promise<void> {
  const zip = new JSZip()

  if (outputs.instagram) {
    const instagramFolder = zip.folder('instagram')
    instagramFolder?.file('caption.txt', formatCaption(outputs.instagram))

    const slideElements = (outputs.instagramSlideElements ?? []).filter(Boolean)
    if (slideElements.length === 0) {
      throw new Error('目前找不到可匯出的 Instagram 輪播圖片。')
    }

    for (const [index, slideElement] of slideElements.entries()) {
      const pngBlob = await renderCarouselSlideToPng(slideElement)
      instagramFolder?.file(`slide-${String(index + 1).padStart(2, '0')}.png`, pngBlob)
    }
  }

  if (outputs.seo) {
    zip.file('seo-article.md', toMarkdown(outputs.seo))
    zip.file('seo-article.html', toHTML(outputs.seo))
  }

  if (outputs.threads) {
    zip.file('threads.txt', formatThreads(outputs.threads))
  }

  if (outputs.facebook) {
    zip.file('facebook.txt', formatFacebook(outputs.facebook))
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  if (zipBlob.size > MAX_ZIP_BYTES) {
    throw new Error('匯出檔案超過 50MB，請減少內容後再試。')
  }

  saveAs(zipBlob, `${slugifyTopic(topicSlug)}-neoxra-output.zip`)
}
