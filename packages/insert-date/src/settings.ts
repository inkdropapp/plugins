import type { Environment } from '@inkdropapp/types'

/**
 * The user's custom date format, or `''` when they haven't set one.
 *
 * An empty setting means "no custom format": the context menu hides its entry
 * and the command falls back to {@link FALLBACK_FORMAT}.
 */
export function getCustomFormat(app: Environment): string {
  return (app.config.get<string>('insert-date.format') ?? '').trim()
}

export function getLocaleName(app: Environment): string {
  return app.config.get<string>('insert-date.locale')
}
