import type { CommandEvent, Environment, IInkdropPlugin } from '@inkdropapp/types'
import { models } from 'inkdrop'

import { exportAll, exportMultipleNotes, exportNotesInBook, exportSingleNote } from './exporter.js'

class ExportAsMarkdownPlugin implements IInkdropPlugin {
  private env: Environment | undefined
  private subscription: { dispose(): void } | undefined

  activate(env: Environment) {
    this.env = env
    this.subscription = env.commands.add(document.body, {
      'export-as-markdown:all': () => this.exportAll(),
      'export-as-markdown:selections': e => this.exportSelectedNotes(e),
      'export-as-markdown:notebook': e => this.exportBook(e)
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

  exportAll() {
    exportAll(this.getEnv())
  }

  async exportSelectedNotes(e: CommandEvent) {
    const env = this.getEnv()
    const { noteListBar, editingNote } = env.store.getState()
    const { actionTargetNoteIds } = noteListBar
    const noteIds: string[] = e.detail?.noteId
      ? [e.detail.noteId]
      : actionTargetNoteIds.length > 0
        ? actionTargetNoteIds
        : [editingNote?._id]
    if (noteIds && noteIds.length > 1) {
      await exportMultipleNotes(env, noteIds)
      env.notifications.addInfo('Exporting notes completed', {
        detail: '',
        dismissable: true
      })
    } else if (noteIds.length === 1) {
      const note = (await models.Note.loadWithId(noteIds[0])).toObject()
      exportSingleNote(env, note)
    } else {
      env.notifications.addError('No note opened', {
        detail: 'Please open a note to export',
        dismissable: true
      })
    }
  }

  exportBook(e: CommandEvent) {
    const env = this.getEnv()
    const {
      bookList: { bookForContextMenu }
    } = env.store.getState()
    const bookId = e.detail?.bookId || bookForContextMenu?._id
    if (bookId) {
      exportNotesInBook(env, bookId)
    } else {
      env.notifications.addError('No notebook specified', {
        detail: 'Please select a notebook to export on sidebar',
        dismissable: true
      })
    }
  }
}

export default new ExportAsMarkdownPlugin()
