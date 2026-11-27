import path from 'path'

import type { CommandEvent, Environment } from '@inkdropapp/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { exportAsPDFCommand } from './exporter'

const inkdropModule = vi.hoisted(() => ({
  titlesByNoteId: new Map<string, string>(),
  exportNoteAsPDF: vi.fn<(note: { title: string }, pathToSave: string) => Promise<void>>()
}))

vi.mock('inkdrop', () => ({
  exportUtils: {
    sanitizeFileName: (name: string, { extension }: { extension: string }) => name + extension,
    exportNoteAsPDF: inkdropModule.exportNoteAsPDF
  },
  models: {
    Note: {
      loadWithId: async (noteId: string) => ({
        toObject: () => ({ _id: noteId, title: inkdropModule.titlesByNoteId.get(noteId) })
      })
    }
  }
}))

const DEST_DIR = path.resolve('/exports')

function createEnv({
  selectedNoteIds,
  pickedDirs = [DEST_DIR],
  existingPaths = []
}: {
  selectedNoteIds: string[]
  pickedDirs?: string[]
  existingPaths?: string[]
}) {
  const pathsOnDisk = new Set(existingPaths)
  inkdropModule.exportNoteAsPDF.mockImplementation(async (_note, pathToSave) => {
    pathsOnDisk.add(pathToSave)
  })
  const addInfo = vi.fn()
  const env = {
    store: {
      getState: () => ({
        noteListBar: { actionTargetNoteIds: selectedNoteIds },
        editingNote: null
      })
    },
    dialog: { showOpenDialog: async () => ({ filePaths: pickedDirs }) },
    fs: { exists: async (targetPath: string) => pathsOnDisk.has(targetPath) },
    notifications: { addInfo, addError: vi.fn() }
  } as unknown as Environment
  return { env, addInfo }
}

function exportedPaths() {
  return inkdropModule.exportNoteAsPDF.mock.calls.map(([, pathToSave]) => pathToSave)
}

const commandEvent = {} as CommandEvent

describe('exportAsPDFCommand with several notes', () => {
  beforeEach(() => {
    inkdropModule.exportNoteAsPDF.mockReset()
    inkdropModule.titlesByNoteId.clear()
  })

  it('names each PDF after its note', async () => {
    inkdropModule.titlesByNoteId.set('note:1', 'First').set('note:2', 'Second')
    const { env, addInfo } = createEnv({ selectedNoteIds: ['note:1', 'note:2'] })

    await exportAsPDFCommand(env, commandEvent)

    expect(exportedPaths()).toEqual([
      path.join(DEST_DIR, 'First.pdf'),
      path.join(DEST_DIR, 'Second.pdf')
    ])
    expect(addInfo).toHaveBeenCalledOnce()
  })

  it('numbers notes that share a title', async () => {
    inkdropModule.titlesByNoteId.set('note:1', 'Same').set('note:2', 'Same').set('note:3', 'Same')
    const { env } = createEnv({ selectedNoteIds: ['note:1', 'note:2', 'note:3'] })

    await exportAsPDFCommand(env, commandEvent)

    expect(exportedPaths()).toEqual([
      path.join(DEST_DIR, 'Same.pdf'),
      path.join(DEST_DIR, 'Same (2).pdf'),
      path.join(DEST_DIR, 'Same (3).pdf')
    ])
  })

  it('does not overwrite a file that is already in the folder', async () => {
    inkdropModule.titlesByNoteId.set('note:1', 'Report').set('note:2', 'Other')
    const { env } = createEnv({
      selectedNoteIds: ['note:1', 'note:2'],
      existingPaths: [path.join(DEST_DIR, 'Report.pdf'), path.join(DEST_DIR, 'Report (2).pdf')]
    })

    await exportAsPDFCommand(env, commandEvent)

    expect(exportedPaths()).toEqual([
      path.join(DEST_DIR, 'Report (3).pdf'),
      path.join(DEST_DIR, 'Other.pdf')
    ])
  })

  it('exports nothing when the folder dialog is cancelled', async () => {
    inkdropModule.titlesByNoteId.set('note:1', 'First').set('note:2', 'Second')
    const { env, addInfo } = createEnv({ selectedNoteIds: ['note:1', 'note:2'], pickedDirs: [] })

    await exportAsPDFCommand(env, commandEvent)

    expect(exportedPaths()).toEqual([])
    expect(addInfo).not.toHaveBeenCalled()
  })
})
