import type { ConfigSchema, Environment, IInkdropPlugin } from '@inkdropapp/types'

import { DEFAULT_FORMAT, DEFAULT_LOCALE, LOCALE_NAMES } from './locales'

class InsertDatePlugin implements IInkdropPlugin {
  config: Record<string, ConfigSchema> = {
    format: {
      title: 'Format',
      description: 'How to display date and time. See below for available options.',
      type: 'string',
      default: DEFAULT_FORMAT
    },
    locale: {
      title: 'Locale',
      description: 'How to localize months, weekdays, etc.',
      type: 'string',
      default: DEFAULT_LOCALE,
      enum: [...LOCALE_NAMES]
    }
  }

  private subscription: { dispose(): void } | null = null

  activate(app: Environment) {
    this.subscription = app.commands.add(document.body, {
      'insert-date:run': () =>
        this.insertDate(app).catch(error => {
          app.notifications.addError('insert-date: failed to insert the date', {
            detail: error instanceof Error ? error.message : String(error),
            dismissable: true
          })
        })
    })
  }

  deactivate() {
    this.subscription?.dispose()
    this.subscription = null
  }

  /**
   * Formats the current date with the configured pattern and inserts it at the
   * cursor, replacing the selection if there is one.
   *
   * date-fns and its locales are pulled in on first use rather than at
   * activation, so a session that never inserts a date never loads them.
   */
  private async insertDate(app: Environment) {
    const pattern = app.config.get<string>('insert-date.format')
    const localeName = app.config.get<string>('insert-date.locale')

    const { formatDate } = await import('./format-date')

    let formatted: string
    try {
      formatted = formatDate(new Date(), pattern, localeName)
    } catch (error) {
      // date-fns rejects Moment-era tokens such as `YYYY` and `DD` outright,
      // which a config carried over from v5 is likely to still contain.
      app.notifications.addError(`insert-date: invalid format \`${pattern}\``, {
        detail: error instanceof Error ? error.message : String(error),
        dismissable: true
      })
      return
    }

    // Resolved after the await so the text lands in whichever editor is active now.
    const editor = app.getActiveEditor()
    if (!editor) return

    editor.dispatch(editor.state.replaceSelection(`${formatted}\n`))
  }
}

export default new InsertDatePlugin()
