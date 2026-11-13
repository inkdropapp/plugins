import type { ContextMenuItem, Environment } from '@inkdropapp/types'

import { FORMAT_PRESETS } from './formats'
import { getLoadedFormatter } from './formatter'
import { getCustomFormat, getLocaleName } from './settings'

const MENU_LABEL = 'Insert date'
const CUSTOM_LABEL = 'Custom (from settings)'
const COMMAND = 'insert-date:run'

/** Renders `pattern` against the current time, or `fallback` if that isn't possible yet. */
function preview(app: Environment, pattern: string, fallback: string): string {
  const format = getLoadedFormatter()
  if (!format) return fallback

  try {
    return format(new Date(), pattern, getLocaleName(app))
  } catch {
    return fallback
  }
}

function buildSubmenu(app: Environment): ContextMenuItem[] {
  const presets = FORMAT_PRESETS.map(({ label, format }) => ({
    label: preview(app, format, label),
    command: COMMAND,
    commandDetail: { format }
  }))

  const customFormat = getCustomFormat(app)
  if (!customFormat) return presets

  // No `commandDetail`, so the command falls back to the configured format.
  const custom: ContextMenuItem = {
    label: preview(app, customFormat, CUSTOM_LABEL),
    command: COMMAND
  }

  return [custom, { type: 'separator' }, ...presets]
}

/**
 * Builds the "Insert date" context-menu item.
 *
 * `created()` runs on every menu open with `this` bound to a fresh clone of the
 * item, which is what lets the submenu labels preview the *current* time rather
 * than the time the plugin was activated.
 */
export function createInsertDateMenuItem(app: Environment): ContextMenuItem {
  return {
    label: MENU_LABEL,
    submenu: buildSubmenu(app),
    created(this: ContextMenuItem) {
      this.submenu = buildSubmenu(app)
    }
  }
}
