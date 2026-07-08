/**
 * The locale names offered in the settings dropdown.
 *
 * Kept apart from the date-fns locale objects so the plugin's entry module can
 * build its config schema without pulling date-fns into the eager bundle.
 * `format-date.ts` maps these names onto the actual locales.
 */
export const LOCALE_NAMES = ['en', 'ja', 'de', 'fr', 'ko'] as const

export type LocaleName = (typeof LOCALE_NAMES)[number]

export const DEFAULT_LOCALE: LocaleName = 'en'
