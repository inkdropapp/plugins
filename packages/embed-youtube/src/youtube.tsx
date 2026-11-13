import type { EmbeddedComponentProps, EmbeddingProvider } from '@inkdropapp/types'
import { useId, useRef } from 'react'

import { isYouTubeURL, extractVideoIdFromURL, getEmbedURL } from './utils.js'

export const PROVIDER_ID = 'embed:youtube'

const YouTube: React.FC<EmbeddedComponentProps> = props => {
  const { href } = props
  const contentFrame = useRef<HTMLIFrameElement>(null)
  // The id goes into the embed URL unencoded, so drop useId()'s punctuation (`:r1:`, `«r1»`).
  const frameId = 'youtube-' + useId().replace(/[^\w-]/g, '')
  const videoId = href ? extractVideoIdFromURL(href) : null

  if (videoId) {
    const url = getEmbedURL(videoId, frameId)

    return (
      <iframe
        id={frameId}
        className="embed-frame"
        ref={contentFrame}
        height="344"
        src={url}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    )
  }

  return (
    <div className="embed-error">
      <p>Invalid YouTube URL. Cannot extract a video ID.</p>
    </div>
  )
}

export const youtubeProvider: EmbeddingProvider = {
  id: PROVIDER_ID,
  test: (url: string) => isYouTubeURL(url),
  getComponent: () => YouTube
}
