import type { CommandEvent, Environment, IInkdropPlugin } from '@inkdropapp/types'
import { models } from 'inkdrop'

import { exportAll, exportMultipleNotes, exportNotesInBook, exportSingleNote } from './exporter.js'
import { notifyFailure } from './notify-failure.js'

class ExportAsMarkdownPlugin implements IInkdropPlugin {
  private env: Environment | undefined
  private subscription: { dispose(): void } | undefined

  activate(env: Environment) {
    this.env = env
    this.subscription = env.commands.add(document.body, {
      'export-as-markdown:all': () =>
        this.exportAll().catch(notifyFailure(env, 'Failed to export all notes')),
      'export-as-markdown:selections': e =>
        this.exportSelectedNotes(e).catch(notifyFailure(env, 'Failed to export as Markdown')),
      'export-as-markdown:notebook': e =>
        this.exportBook(e).catch(notifyFailure(env, 'Failed to export the notebook'))
    })
  }

  deactivate() {
    this.subscription?.dispose()
    this.env = undefined
  }

  private getEnv(): Environment {
    if (!this.env) {
      throw new Error('export-as-markdown: env accessed before activate()')
    }
    return this.env
  }

  async exportAll() {
    await exportAll(this.getEnv())
  }

  async exportSelectedNotes(e: CommandEvent) {
    const env = this.getEnv()
    const { noteListBar, editingNote } = env.store.getState()
    const { actionTargetNoteIds } = noteListBar
    const noteIds: string[] = e.detail?.noteId
      ? [e.detail.noteId]
      : actionTargetNoteIds.length > 0
        ? actionTargetNoteIds
        : editingNote
          ? [editingNote._id]
          : []
    if (noteIds.length > 1) {
      await exportMultipleNotes(env, noteIds)
      env.notifications.addInfo('Exporting notes completed', {
        detail: '',
        dismissable: true
      })
    } else if (noteIds.length === 1) {
      const note = (await models.Note.loadWithId(noteIds[0])).toObject()
      await exportSingleNote(env, note)
    } else {
      env.notifications.addError('No note opened', {
        detail: 'Please open a note to export',
        dismissable: true
      })
    }
  }

  async exportBook(e: CommandEvent) {
    const env = this.getEnv()
    const {
      bookList: { bookForContextMenu }
    } = env.store.getState()
    const bookId = e.detail?.bookId || bookForContextMenu?._id
    if (bookId) {
      await exportNotesInBook(env, bookId)
    } else {
      env.notifications.addError('No notebook specified', {
        detail: 'Please select a notebook to export on sidebar',
        dismissable: true
      })
    }
  }
}

export default new ExportAsMarkdownPlugin()
