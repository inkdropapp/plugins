const BASE_URL_REGEX = /^https:\/\/(www\.)?vimeo\.com\//

export function isVimeoURL(url: string): boolean {
  return BASE_URL_REGEX.test(url)
}

export function extractVideoIdFromURL(url: string): string | null {
  const parts = url.split('/')
  const lastPart = parts[parts.length - 1]
  const videoId = lastPart.split('?')[0]
  return videoId || null
}

export function getEmbedURL(videoId: string): string {
  return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?transparent=0`
}
