import path from 'path'

import type { Environment } from '@inkdropapp/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { exportNotesInBook } from './exporter'

const inkdropModule = vi.hoisted(() => ({
  exportNoteAsHtml: vi.fn<(note: { _id: string }, destDir: string) => Promise<void>>()
}))

vi.mock('inkdrop', async () => ({
  path: (await import('node:path')).default,
  exportUtils: {
    sanitizeFileName: (name: string) => name.replaceAll('/', '-'),
    exportNoteAsHtml: inkdropModule.exportNoteAsHtml
  },
  logger: { info: () => {}, error: () => {} },
  models: {}
}))

const DEST_DIR = path.resolve('/exports')

const BOOK_TREE = [
  {
    _id: 'book:work',
    name: 'Work',
    children: [{ _id: 'book:plans', name: 'Plans/2026', children: [] }]
  },
  { _id: 'book:home', name: 'Home' }
]

const NOTE_IDS_BY_BOOK_ID: Record<string, string[]> = {
  'book:work': ['note:w1', 'note:w2'],
  'book:plans': ['note:p1'],
  'book:home': ['note:h1']
}

function createEnv({ pickedDirs = [DEST_DIR] }: { pickedDirs?: string[] } = {}) {
  const mkdir = vi.fn<(dirPath: string, options?: { recursive?: boolean }) => Promise<void>>()
  const addInfo = vi.fn()
  const addError = vi.fn()
  const env = {
    store: { getState: () => ({ books: { tree: BOOK_TREE } }) },
    dialog: { showOpenDialog: async () => ({ filePaths: pickedDirs }) },
    localDB: {
      notes: {
        query: async ({ bookId }: { bookId: string }) => ({
          rows: NOTE_IDS_BY_BOOK_ID[bookId].map(_id => ({ doc: { _id } }))
        })
      }
    },
    fs: { mkdir },
    notifications: { addInfo, addError }
  } as unknown as Environment
  return { env, mkdir, addInfo, addError }
}

function exportedNotes() {
  return inkdropModule.exportNoteAsHtml.mock.calls.map(
    ([note, destDir]) => `${note._id} -> ${destDir}`
  )
}

describe('exportNotesInBook', () => {
  beforeEach(() => {
    inkdropModule.exportNoteAsHtml.mockReset()
  })

  it('exports the notebook into the picked folder and its sub-notebooks into subfolders', async () => {
    const { env, mkdir, addInfo } = createEnv()
    const plansDir = path.join(DEST_DIR, 'Plans-2026')

    await exportNotesInBook(env, 'book:work')

    expect(mkdir.mock.calls).toEqual([
      [DEST_DIR, { recursive: true }],
      [plansDir, { recursive: true }]
    ])
    expect(exportedNotes()).toEqual([
      `note:w1 -> ${DEST_DIR}`,
      `note:w2 -> ${DEST_DIR}`,
      `note:p1 -> ${plansDir}`
    ])
    expect(addInfo).toHaveBeenCalledOnce()
  })

  it('finds a notebook nested in the tree', async () => {
    const { env } = createEnv()

    await exportNotesInBook(env, 'book:plans')

    expect(exportedNotes()).toEqual([`note:p1 -> ${DEST_DIR}`])
  })

  it('exports nothing when the folder dialog is cancelled', async () => {
    const { env, mkdir, addInfo } = createEnv({ pickedDirs: [] })

    await exportNotesInBook(env, 'book:work')

    expect(mkdir).not.toHaveBeenCalled()
    expect(exportedNotes()).toEqual([])
    expect(addInfo).not.toHaveBeenCalled()
  })

  it('reports a failure to create a folder and stops', async () => {
    const { env, mkdir, addInfo, addError } = createEnv()
    mkdir.mockRejectedValueOnce(new Error('EACCES: permission denied'))

    await exportNotesInBook(env, 'book:work')

    expect(exportedNotes()).toEqual([])
    expect(addInfo).not.toHaveBeenCalled()
    expect(addError).toHaveBeenCalledWith(
      'Failed to export',
      expect.objectContaining({ detail: 'EACCES: permission denied' })
    )
  })

  it('throws for a notebook that does not exist', async () => {
    const { env } = createEnv()

    await expect(exportNotesInBook(env, 'book:missing')).rejects.toThrow('Notebook not found')
  })
})
