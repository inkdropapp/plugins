import type { CommandEvent, Environment, IInkdropPlugin } from '@inkdropapp/types'
import { models } from 'inkdrop'

import {
  copyNoteAsHtml,
  copyNoteAsSimpleHtml,
  exportMultipleNotesAsHtml,
  exportNoteAsHtml,
  exportNotesInBook
} from './exporter.js'

class ExportAsHtmlPlugin implements IInkdropPlugin {
  private env: Environment | undefined
  private subscription: { dispose(): void } | undefined

  activate(env: Environment) {
    this.env = env
    this.subscription = env.commands.add(document.body, {
      'export-as-html:selections': e => this.exportAsHtmlCommand(e),
      'export-as-html:copy': e => this.copyAsHtmlCommand(e),
      'export-as-html:copy-simple': e => this.copyAsSimpleHtmlCommand(e),
      'export-as-html:notebook': e => this.exportNotebook(e)
    })
  }

  deactivate() {
    this.subscription?.dispose()
    this.env = undefined
  }

  private getEnv(): Environment {
    if (!this.env) {
      throw new Error('export-as-html: env accessed before activate()')
    }
    return this.env
  }

  async exportAsHtmlCommand(e: CommandEvent) {
    const env = this.getEnv()
    const { noteListBar, editingNote } = env.store.getState()
    const { actionTargetNoteIds } = noteListBar
    const noteIds: string[] = e.detail?.noteId
      ? [e.detail.noteId]
      : actionTargetNoteIds.length > 0
        ? actionTargetNoteIds
        : [editingNote?._id]
    if (noteIds && noteIds.length > 1) {
      env.notifications.addInfo('Exporting notes started', {
        detail: 'It may take a while..',
        dismissable: true
      })
      await exportMultipleNotesAsHtml(env, noteIds)
      env.notifications.addInfo('Exporting notes completed', {
        detail: '',
        dismissable: true
      })
    } else if (noteIds.length === 1) {
      const note = (await models.Note.loadWithId(noteIds[0])).toObject()
      exportNoteAsHtml(env, note)
    } else {
      env.notifications.addError('No note opened', {
        detail: 'Please open a note to export as HTML',
        dismissable: true
      })
    }
  }

  async copyAsHtmlCommand(e: CommandEvent) {
    const env = this.getEnv()
    const { noteListBar } = env.store.getState()
    const { actionTargetNoteIds } = noteListBar
    const noteId = e.detail?.noteId || actionTargetNoteIds?.[0]
    if (noteId) {
      const note = (await models.Note.loadWithId(noteId)).toObject()
      copyNoteAsHtml(env, note)
    }
  }

  async copyAsSimpleHtmlCommand(e: CommandEvent) {
    const env = this.getEnv()
    const { noteListBar } = env.store.getState()
    const { actionTargetNoteIds } = noteListBar
    const noteId = e.detail?.noteId || actionTargetNoteIds?.[0]
    if (noteId) {
      const note = (await models.Note.loadWithId(noteId)).toObject()
      copyNoteAsSimpleHtml(env, note)
    }
  }

  exportNotebook(e: CommandEvent) {
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

export default new ExportAsHtmlPlugin()
