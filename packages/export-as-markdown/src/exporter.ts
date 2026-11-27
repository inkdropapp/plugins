import type { Environment, ModelNote } from '@inkdropapp/types'
import { exportUtils, logger, models, path } from 'inkdrop'

import { errorMessage } from './notify-failure.js'

type Note = ReturnType<ModelNote['toObject']>

type BookTreeNode = {
  _id: string
  name: string
  children?: BookTreeNode[]
}

export async function exportAll(env: Environment) {
  const { filePaths: pathArrayToSave } = await env.dialog.showOpenDialog({
    title: 'Select a directory to export all notes',
    properties: ['openDirectory', 'createDirectory']
  })
  if (pathArrayToSave instanceof Array && pathArrayToSave.length > 0) {
    const [pathToSave] = pathArrayToSave
    const books: BookTreeNode[] = env.store.getState().books.tree
    try {
      for (const book of books) {
        await exportBook(env, pathToSave, book)
      }
      logger.info('Finished exporting all notes')
      env.notifications.addInfo('Finished exporting all notes', {
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

export async function exportSingleNote(env: Environment, note: Note) {
  const { filePath: pathToSave } = await env.dialog.showSaveDialog({
    title: 'Save Markdown File',
    defaultPath: exportUtils.sanitizeFileName(note.title, { extension: '.md' }),
    filters: [{ name: 'Markdown Files', extensions: ['md'] }]
  })
  if (pathToSave) {
    try {
      const destDir = path.dirname(pathToSave)
      const fileName = path.basename(pathToSave)
      await exportUtils.exportNoteAsMarkdown(note, destDir, fileName)
    } catch (e) {
      logger.error('Failed to export editing note:', e, note)
      env.notifications.addError('Failed to export editing note', {
        detail: errorMessage(e),
        dismissable: true
      })
    }
  }
}

/**
 * Asks for a folder and exports the notes into it.
 *
 * @returns Whether the notes were exported; `false` when the folder dialog was cancelled.
 * @throws When a note fails to load or export.
 */
export async function exportMultipleNotes(env: Environment, noteIds: string[]): Promise<boolean> {
  const { filePaths } = await env.dialog.showOpenDialog({
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  const [destDir] = filePaths
  if (!destDir) return false

  for (const noteId of noteIds) {
    const note = (await models.Note.loadWithId(noteId)).toObject()
    const fileName = exportUtils.sanitizeFileName(note.title, { extension: '.md' })
    await exportUtils.exportNoteAsMarkdown(note, destDir, fileName)
  }
  return true
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

  await env.fs.mkdir(pathToSave, { recursive: true })
  for (const note of notes) {
    await exportUtils.exportNoteAsMarkdown(note, pathToSave)
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
