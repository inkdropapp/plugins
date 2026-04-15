import { useRef, useState } from 'react'
import type {
  EmbeddedComponentProps,
  EmbeddingProvider
} from '@inkdropapp/types'
import { isVimeoURL, extractVideoIdFromURL, getEmbedURL } from './utils.js'

export const PROVIDER_ID = 'embed:vimeo'

const Vimeo: React.FC<EmbeddedComponentProps> = props => {
  const { href } = props
  const contentFrame = useRef<HTMLIFrameElement>(null)
  const [frameId] = useState('vimeo-' + Math.random())
  const videoId = href ? extractVideoIdFromURL(href) : null

  if (videoId) {
    const url = getEmbedURL(videoId)

    return (
      <iframe
        id={frameId}
        className="embed-frame"
        ref={contentFrame}
        height="344"
        src={url}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  return (
    <div className="embed-error">
      <p>Invalid Vimeo URL. Cannot extract a video ID.</p>
    </div>
  )
}

export const vimeoProvider: EmbeddingProvider = {
  id: PROVIDER_ID,
  test: (url: string) => isVimeoURL(url),
  getComponent: () => Vimeo
}
