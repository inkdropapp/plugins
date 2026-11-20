import fs from 'fs'
import path from 'path'

import type { Environment, ModelNote } from '@inkdropapp/types'
import { exportUtils, logger, models } from 'inkdrop'

import { errorMessage } from './notify-failure.js'

type Note = ReturnType<ModelNote['toObject']>

type BookTreeNode = {
  _id: string
  name: string
  children?: BookTreeNode[]
}

/**
 * Asks for a folder and exports the notes into it.
 *
 * @returns Whether the notes were exported; `false` when the folder dialog was cancelled.
 * @throws When a note fails to load or export.
 */
export async function exportMultipleNotesAsHtml(
  env: Environment,
  noteIds: string[]
): Promise<boolean> {
  const { filePaths } = await env.dialog.showOpenDialog({
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  const [destDir] = filePaths
  if (!destDir) return false

  for (const noteId of noteIds) {
    const note = (await models.Note.loadWithId(noteId)).toObject()
    const fileName = exportUtils.sanitizeFileName(note.title, { extension: '.html' })
    await exportUtils.exportNoteAsHtml(note, destDir, fileName)
  }
  return true
}

export async function exportNoteAsHtml(env: Environment, note: Note, pathToSave?: string) {
  if (typeof pathToSave !== 'string') {
    const res = await env.dialog.showSaveDialog({
      title: 'Save HTML file',
      defaultPath: exportUtils.sanitizeFileName(note.title, { extension: '.html' }),
      filters: [
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    pathToSave = res.filePath
  }

  if (pathToSave) {
    try {
      const destDir = path.dirname(pathToSave)
      const fileName = path.basename(pathToSave)
      await exportUtils.exportNoteAsHtml(note, destDir, fileName)
    } catch (e) {
      logger.error('Failed to save HTML:', e)
      env.notifications.addError('Failed to save as HTML', {
        detail: errorMessage(e),
        dismissable: true
      })
    }
  }
}

export async function copyNoteAsHtml(env: Environment, note: Note) {
  try {
    const processor = await exportUtils.getProcessorForNote(note)
    if (!processor) return false

    await processor.replaceAttachmentImagesWithDataURI()
    const html = await processor.createHTMLWithTemplate(note.title)
    env.clipboard.write({ html, text: html })
  } catch (e) {
    logger.error('Failed to copy as html:', e)
    env.notifications.addError('Failed to copy as html', {
      detail: errorMessage(e),
      dismissable: true
    })
  }
}

export async function copyNoteAsSimpleHtml(env: Environment, note: Note) {
  try {
    const processor = await exportUtils.getProcessorForNote(note)
    if (!processor) return false

    await processor.replaceAttachmentImagesWithDataURI()
    const html = await processor.stringifySimple()
    env.clipboard.write({ html, text: html })
  } catch (e) {
    logger.error('Failed to copy as simple html:', e)
    env.notifications.addError('Failed to copy as simple html', {
      detail: errorMessage(e),
      dismissable: true
    })
  }
}

export async function exportNotesInBook(env: Environment, bookId: string) {
  const book = findBookFromTree(bookId, env.store.getState().books.tree)
  if (!book) {
    throw new Error('Notebook not found: ' + bookId)
  }
  const { filePaths: pathArrayToSave } = await env.dialog.showOpenDialog({
    title: `Select a directory to export a book "${book.name}"`,
    properties: ['openDirectory', 'createDirectory']
  })
  if (pathArrayToSave instanceof Array && pathArrayToSave.length > 0) {
    const [pathToSave] = pathArrayToSave
    try {
      await exportBook(env, pathToSave, book, { createBookDir: false })
      env.notifications.addInfo(`Finished exporting notes in "${book.name}"`, {
        detail: 'Directory: ' + pathToSave,
        dismissable: true
      })
    } catch (e) {
      logger.error('Failed to export:', e)
      env.notifications.addError('Failed to export', {
        detail: errorMessage(e),
        dismissable: true
      })
    }
  }
}

async function exportBook(
  env: Environment,
  parentDir: string,
  book: BookTreeNode,
  opts: { createBookDir?: boolean } = {}
) {
  const { createBookDir = true } = opts
  const db = env.localDB
  const dirName = exportUtils.sanitizeFileName(book.name, { replacement: '-' })
  const pathToSave = createBookDir ? path.join(parentDir, dirName) : parentDir
  const { rows } = await db.notes.query(
    {
      index: 'notes',
      bookId: book._id,
      status: ['none', 'active', 'onHold', 'completed', 'dropped'],
      limit: false
    },
    { includeDocs: true }
  )
  const notes = rows.flatMap(row => ('doc' in row ? [row.doc] : []))

  if (!fs.existsSync(pathToSave)) fs.mkdirSync(pathToSave)
  for (const note of notes) {
    await exportUtils.exportNoteAsHtml(note, pathToSave)
  }

  for (const childBook of book.children ?? []) {
    await exportBook(env, pathToSave, childBook)
  }
}

function findBookFromTree(bookId: string, tree: BookTreeNode[]): BookTreeNode | undefined {
  for (const item of tree) {
    if (item._id === bookId) {
      return item
    } else if (item.children) {
      const book = findBookFromTree(bookId, item.children)
      if (book) {
        return book
      }
    }
  }
  return undefined
}
