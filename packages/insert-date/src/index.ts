import type { CommandEvent, ConfigSchema, Environment, IInkdropPlugin } from '@inkdropapp/types'

import { createInsertDateMenuItem } from './context-menu'
import { FALLBACK_FORMAT } from './formats'
import { loadFormatter } from './formatter'
import { insertIntoTitle } from './insert-into-title'
import { DEFAULT_LOCALE, LOCALE_NAMES } from './locales'
import { getCustomFormat, getLocaleName } from './settings'

const TITLE_INPUT_SELECTOR = '.editor-title-bar-input input'

/** Long enough that activation never waits on date-fns, short enough to beat the first right-click. */
const WARM_UP_DELAY_MS = 1000

type InsertDateDetail = { format?: string } | undefined

interface Subscription {
  dispose(): void
}

function findTitleInput(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof Element)) return null

  const input = target.closest(TITLE_INPUT_SELECTOR)
  return input instanceof HTMLInputElement ? input : null
}

class InsertDatePlugin implements IInkdropPlugin {
  config: Record<string, ConfigSchema> = {
    format: {
      title: 'Format',
      description:
        'A custom date and time format, listed at the top of the Insert date menu. Leave it empty to use only the predefined formats. See below for available options.',
      type: 'string',
      default: ''
    },
    locale: {
      title: 'Locale',
      description: 'How to localize months, weekdays, etc.',
      type: 'string',
      default: DEFAULT_LOCALE,
      enum: [...LOCALE_NAMES]
    }
  }

  private command: Subscription | null = null
  private contextMenu: Subscription | null = null
  private warmUpTimer: ReturnType<typeof setTimeout> | null = null

  activate(app: Environment) {
    this.command = app.commands.add(document.body, {
      'insert-date:run': (event: CommandEvent<InsertDateDetail>) =>
        this.insertDate(app, event).catch(error => {
          app.notifications.addError('insert-date: failed to insert the date', {
            detail: error instanceof Error ? error.message : String(error),
            dismissable: true
          })
        })
    })

    this.contextMenu = app.contextMenu.add({
      '.cm-editor': [createInsertDateMenuItem(app)],
      [TITLE_INPUT_SELECTOR]: [createInsertDateMenuItem(app)]
    })

    // Warm the formatter so the context menu can preview the current date in its
    // labels. Failures are ignored here; the command reports them when it runs.
    this.warmUpTimer = setTimeout(() => {
      this.warmUpTimer = null
      void loadFormatter().catch(() => {})
    }, WARM_UP_DELAY_MS)
  }

  deactivate() {
    if (this.warmUpTimer) clearTimeout(this.warmUpTimer)
    this.warmUpTimer = null
    this.contextMenu?.dispose()
    this.contextMenu = null
    this.command?.dispose()
    this.command = null
  }

  /**
   * Formats the current date and inserts it into whichever field the command was
   * invoked on — the note title input, or otherwise the active editor.
   *
   * The format comes from the menu item that was clicked. A keybinding carries no
   * format, so it uses the custom one from settings — or {@link FALLBACK_FORMAT}
   * when that is left empty.
   */
  private async insertDate(app: Environment, event: CommandEvent<InsertDateDetail>) {
    const pattern = event.detail?.format || getCustomFormat(app) || FALLBACK_FORMAT
    const localeName = getLocaleName(app)

    const formatDate = await loadFormatter()

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

    const titleInput = findTitleInput(event.target)
    if (titleInput) {
      if (!titleInput.readOnly) insertIntoTitle(app, titleInput, formatted)
      return
    }

    // Resolved after the await so the text lands in whichever editor is active now.
    const editor = app.getActiveEditor()
    if (!editor) return

    editor.dispatch(editor.state.replaceSelection(`${formatted}\n`))
  }
}

export default new InsertDatePlugin()
