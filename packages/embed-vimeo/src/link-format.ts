import type { Extension } from '@codemirror/state'
import type { LinkFormatItem, LinkFormatsConfig } from '@inkdropapp/types'
import { editor } from 'inkdrop'

import { isVimeoURL, extractVideoIdFromURL, getEmbedURL } from './utils.js'

function getVimeoIframe(videoId: string): string {
  const src = getEmbedURL(videoId)
  return [
    `<iframe width="560" height="315"`,
    ` src="${src}"`,
    ` frameborder="0"`,
    ` allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"`,
    ` allowfullscreen></iframe>`
  ].join('')
}

function getInitialFormats(url: string): LinkFormatItem[] {
  if (!isVimeoURL(url)) return []

  const videoId = extractVideoIdFromURL(url)
  if (!videoId) return []

  const content = getVimeoIframe(videoId)
  return [
    {
      type: 'vimeo-embed',
      label: 'Vimeo embed',
      detail: '<iframe ...>',
      content,
      order: 50
    }
  ]
}

const config: LinkFormatsConfig = {
  getInitialFormats
}

export function vimeoLinkFormatExtension(): Extension {
  return editor.linkFormatsConfig.of(config)
}
