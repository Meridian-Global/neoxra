import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'

const EXPORT_SIZE = 1080

function slugifyTopic(topicSlug: string) {
  const slug = topicSlug
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'instagram'
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('無法建立輪播圖片。'))
      }
    }, 'image/png')
  })
}

export async function renderCarouselSlideToPng(slideElement: HTMLElement): Promise<Blob> {
  const sourceCanvas = await html2canvas(slideElement, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    width: slideElement.offsetWidth,
    height: slideElement.offsetHeight,
    windowWidth: slideElement.scrollWidth,
    windowHeight: slideElement.scrollHeight,
  })

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = EXPORT_SIZE
  outputCanvas.height = EXPORT_SIZE

  const context = outputCanvas.getContext('2d')
  if (!context) {
    throw new Error('瀏覽器目前無法匯出圖片。')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(sourceCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE)

  return canvasToBlob(outputCanvas)
}

export async function exportCarousel(slideElements: HTMLElement[], topicSlug: string): Promise<void> {
  const validSlideElements = slideElements.filter(Boolean)

  if (validSlideElements.length === 0) {
    throw new Error('目前沒有可匯出的輪播圖片。')
  }

  const zip = new JSZip()

  for (const [index, slideElement] of validSlideElements.entries()) {
    const pngBlob = await renderCarouselSlideToPng(slideElement)
    zip.file(`slide-${String(index + 1).padStart(2, '0')}.png`, pngBlob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveAs(zipBlob, `${slugifyTopic(topicSlug)}-carousel.zip`)
}
