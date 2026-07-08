import type { formatDate } from './format-date'

type FormatDate = typeof formatDate

let loaded: FormatDate | null = null
let pending: Promise<FormatDate> | null = null

/**
 * The formatter, but only if the date-fns chunk happens to be loaded already.
 *
 * Callers that cannot await — the context menu builds its labels synchronously —
 * use this and fall back to static text when it returns `null`.
 */
export function getLoadedFormatter(): FormatDate | null {
  return loaded
}

/**
 * Imports the date-fns chunk on first call and caches it. Concurrent callers
 * share a single import; a rejected import is not cached, so the next call retries.
 */
export function loadFormatter(): Promise<FormatDate> {
  if (loaded) return Promise.resolve(loaded)

  pending ??= import('./format-date')
    .then(({ formatDate }) => {
      loaded = formatDate
      pending = null
      return formatDate
    })
    .catch(error => {
      pending = null
      throw error
    })

  return pending
}
