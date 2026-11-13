export interface DateFormatPreset {
  /** Shown until the date-fns chunk has loaded and a real preview can be rendered. */
  readonly label: string
  readonly format: string
}

export const FORMAT_PRESETS: readonly DateFormatPreset[] = [
  { label: 'Full date & time', format: 'PPPPp' },
  { label: 'Long date & time', format: 'PPPp' },
  { label: 'Date only', format: 'PPPP' },
  { label: 'Short date', format: 'P' },
  { label: 'Time', format: 'p' },
  { label: 'ISO date', format: 'yyyy-MM-dd' }
]

/** Used when the command runs without a format — i.e. a keybinding, with no custom format set. */
export const FALLBACK_FORMAT = FORMAT_PRESETS[0].format
