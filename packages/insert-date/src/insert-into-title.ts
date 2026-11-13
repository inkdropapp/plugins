import type { Environment } from '@inkdropapp/types'
import { actions } from 'inkdrop'

/**
 * Inserts `text` at the caret of the note title input, replacing its selection.
 *
 * The input is a controlled React component bound to the Redux store, so the
 * title is updated by dispatching the same actions its own `onChange` handler
 * does. Writing to `input.value` directly would be discarded on the next render.
 */
export function insertIntoTitle(app: Environment, input: HTMLInputElement, text: string): void {
  const selectionStart = input.selectionStart ?? input.value.length
  const selectionEnd = input.selectionEnd ?? selectionStart
  const title = input.value.slice(0, selectionStart) + text + input.value.slice(selectionEnd)
  const caret = selectionStart + text.length

  app.store.dispatch(actions.editingNote.update({ title }))
  app.store.dispatch(actions.editor.change(true))

  // Restore the caret once the store update has re-rendered the input.
  requestAnimationFrame(() => input.setSelectionRange(caret, caret))
}
