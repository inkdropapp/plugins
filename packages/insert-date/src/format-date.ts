import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { de, enUS, fr, ja, ko } from 'date-fns/locale'

import type { LocaleName } from './locales'

const LOCALES = { en: enUS, ja, de, fr, ko } satisfies Record<LocaleName, Locale>

/**
 * Formats `date` with a date-fns pattern.
 *
 * An unrecognized `localeName` (e.g. from a hand-edited config file) falls back
 * to `enUS`, which is what date-fns itself defaults to.
 *
 * @throws {RangeError} If the pattern contains a token date-fns rejects, such
 *   as Moment's `YYYY` or `DD`.
 */
export function formatDate(date: Date, pattern: string, localeName: string): string {
  const locale = LOCALES[localeName as LocaleName] ?? enUS
  return format(date, pattern, { locale })
}
