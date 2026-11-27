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
    const exported = await exportMultipleNotesAsPDF(env, noteIds)
    if (exported) {
      env.notifications.addInfo('Exporting notes completed', {
        detail: '',
        dismissable: true
      })
    }
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

/**
 * Asks for a folder and exports each note into it as a PDF, numbering file names that are taken.
 *
 * @returns Whether the notes were exported; `false` when the folder dialog was cancelled.
 * @throws When a note fails to load or export.
 */
async function exportMultipleNotesAsPDF(env: Environment, noteIds: string[]): Promise<boolean> {
  const { filePaths } = await env.dialog.showOpenDialog({
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  const [destDir] = filePaths
  if (!destDir) return false

  for (const noteId of noteIds) {
    const note = (await models.Note.loadWithId(noteId)).toObject()
    await writePDF(note, await unusedPDFPath(env, destDir, note.title))
  }
  return true
}

async function unusedPDFPath(env: Environment, destDir: string, title: string): Promise<string> {
  for (let copyNumber = 1; ; copyNumber++) {
    const name = copyNumber === 1 ? title : `${title} (${copyNumber})`
    const pathToSave = path.join(destDir, exportUtils.sanitizeFileName(name, { extension: '.pdf' }))
    if (!(await env.fs.exists(pathToSave))) return pathToSave
  }
}

/**
 * Asks where to save the note and exports it there as a PDF.
 *
 * @throws When the PDF fails to export.
 */
export async function exportAsPDF(env: Environment, note: Note) {
  const { filePath } = await env.dialog.showSaveDialog({
    title: 'Save PDF file',
    defaultPath: exportUtils.sanitizeFileName(note.title, { extension: '.pdf' }),
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (filePath) await writePDF(note, filePath)
}

function writePDF(note: Note, pathToSave: string) {
  return exportUtils.exportNoteAsPDF(note, pathToSave, {
    pageSize: 'A4',
    printBackground: true
  })
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
