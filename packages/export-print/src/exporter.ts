import path from 'path'

import type { CommandEvent, Environment, ModelNote } from '@inkdropapp/types'
import { exportUtils, models } from 'inkdrop'

type Note = ReturnType<ModelNote['toObject']>

const PRINT_CANCELED_REASON = 'Print job canceled'

export async function exportAsPDFCommand(env: Environment, e: CommandEvent) {
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
    await exportMultipleNotesAsPDF(env, noteIds)
    env.notifications.addInfo('Exporting notes completed', {
      detail: '',
      dismissable: true
    })
  } else if (noteIds.length === 1) {
    const note = (await models.Note.loadWithId(noteIds[0])).toObject()
    await exportAsPDF(env, note)
  } else {
    env.notifications.addError('No note opened', {
      detail: 'Please open a note to export as PDF',
      dismissable: true
    })
  }
}

export async function printCommand(env: Environment) {
  const { editingNote } = env.store.getState()
  if (editingNote) {
    await print(env, editingNote)
  } else {
    env.notifications.addError('No note opened', {
      detail: 'Please open a note to export',
      dismissable: true
    })
  }
}

async function exportMultipleNotesAsPDF(env: Environment, noteIds: string[]) {
  const { filePaths: res } = await env.dialog.showOpenDialog({
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  if (res instanceof Array && res.length > 0) {
    const destDir = res[0]

    for (const noteId of noteIds) {
      const note = (await models.Note.loadWithId(noteId)).toObject()
      if (note) {
        const fileName = exportUtils.sanitizeFileName(note.title, { extension: '.pdf' })
        const pathToSave = path.join(destDir, fileName)
        await exportAsPDF(env, note, pathToSave)
      }
    }
  }
}

export async function exportAsPDF(env: Environment, note: Note, pathToSave?: string) {
  if (typeof pathToSave === 'undefined') {
    const { filePath } = await env.dialog.showSaveDialog({
      title: 'Save PDF file',
      defaultPath: `${note.title}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (typeof filePath === 'string' && filePath.length > 0) {
      pathToSave = filePath
    } else {
      return
    }
  }

  if (typeof pathToSave === 'string' && pathToSave.length > 0) {
    try {
      await exportUtils.exportNoteAsPDF(note, pathToSave, {
        pageSize: 'A4',
        printBackground: true
      })
    } catch (e) {
      env.notifications.addError('Failed to save PDF', {
        detail: e instanceof Error ? e.stack : String(e),
        dismissable: true
      })
    }
  }
}

export async function print(env: Environment, note: Note) {
  const { success, failureReason } = await exportUtils.printNote(note, {
    printBackground: true
  })
  if (!success && failureReason !== PRINT_CANCELED_REASON) {
    env.notifications.addError('Failed to print', {
      detail: failureReason,
      dismissable: true
    })
  }
}
