import fs from 'fs'
import os from 'os'
import path from 'path'

import type { Environment, IPCDirEntry, IPCFileStat } from '@inkdropapp/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setEnv } from './env'
import { importMarkdownFromMultipleFilesAndDirectories, previewImport } from './importer'

const MAX_ATTACHMENT_FILE_SIZE = vi.hoisted(() => 100)

const inkdropModule = vi.hoisted(() => ({
  savedBooks: [] as Array<{ _id: string; name: string; parentBookId: string | null }>,
  importMarkdownFile: vi.fn<(filePath: string, destBookId: string) => Promise<void>>()
}))

vi.mock('inkdrop', async () => {
  class Book {
    _id = ''
    name: string
    parentBookId: string | null

    constructor({ name, parentBookId }: { name: string; parentBookId: string | null }) {
      this.name = name
      this.parentBookId = parentBookId
    }

    async save() {
      this._id = `book:${this.name}`
      inkdropModule.savedBooks.push({
        _id: this._id,
        name: this.name,
        parentBookId: this.parentBookId
      })
    }
  }
  return {
    path: (await import('node:path')).default,
    logger: { debug: () => {} },
    models: { Book },
    importUtils: { importMarkdownFile: inkdropModule.importMarkdownFile }
  }
})

vi.mock('inkdrop-model', () => ({ maxAttachmentFileSize: MAX_ATTACHMENT_FILE_SIZE }))

/** The parts of `inkdrop.fs` the importer uses, reading the real disk. */
const fsOnDisk = {
  async readdir(dirPath: string): Promise<IPCDirEntry[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymbolicLink: entry.isSymbolicLink()
    }))
  },
  async stat(targetPath: string): Promise<IPCFileStat> {
    const stats = await fs.promises.stat(targetPath)
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtimeMs: stats.mtimeMs,
      birthtimeMs: stats.birthtimeMs
    }
  }
}

let rootDir: string

function writeFile(relativePath: string, size: number) {
  const filePath = path.join(rootDir, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, 'x'.repeat(size))
  return filePath
}

function importedFiles() {
  return inkdropModule.importMarkdownFile.mock.calls.map(
    ([filePath, destBookId]) => `${path.relative(rootDir, filePath)} -> ${destBookId}`
  )
}

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-markdown-test-'))
  inkdropModule.savedBooks.length = 0
  inkdropModule.importMarkdownFile.mockReset()
  setEnv({ fs: fsOnDisk } as unknown as Environment)
})

afterEach(() => {
  setEnv(undefined)
  fs.rmSync(rootDir, { recursive: true, force: true })
})

describe('previewImport', () => {
  it('counts the files of a single picked folder as direct files, and its subfolders as notebooks', async () => {
    writeFile('vault/top.md', 10)
    writeFile('vault/top.png', 20)
    writeFile('vault/sub/child.md', 30)
    writeFile('vault/sub/pic.jpg', 40)
    writeFile('vault/sub/deep/leaf.md', 5)

    const preview = await previewImport([path.join(rootDir, 'vault')])

    expect(preview.directFileCount).toBe(1)
    expect(preview.mdFileCount).toBe(3)
    expect(preview.imageCount).toBe(2)
    expect(preview.imageSize).toBe(60)
    expect(preview.totalSize).toBe(105)
    expect(preview.notebooks).toEqual([
      {
        name: 'sub',
        isNotebook: true,
        fileCount: 1,
        imageCount: 1,
        imageSize: 40,
        children: [
          {
            name: 'deep',
            isNotebook: true,
            fileCount: 1,
            imageCount: 0,
            imageSize: 0,
            children: []
          }
        ]
      }
    ])
  })

  it('makes every folder a notebook when several items are picked', async () => {
    writeFile('first/a.md', 10)
    writeFile('second/b.md', 10)
    const looseFile = writeFile('loose.md', 7)

    const preview = await previewImport([
      path.join(rootDir, 'first'),
      path.join(rootDir, 'second'),
      looseFile
    ])

    expect(preview.directFileCount).toBe(1)
    expect(preview.mdFileCount).toBe(3)
    expect(preview.totalSize).toBe(27)
    expect(preview.notebooks.map(notebook => notebook.name)).toEqual(['first', 'second'])
  })

  it('marks a folder without Markdown files as not a notebook', async () => {
    writeFile('vault/note.md', 10)
    writeFile('vault/assets/pic.png', 20)

    const preview = await previewImport([path.join(rootDir, 'vault')])

    expect(preview.notebooks).toEqual([
      {
        name: 'assets',
        isNotebook: false,
        fileCount: 0,
        imageCount: 1,
        imageSize: 20,
        children: []
      }
    ])
  })

  it('ignores files that are neither Markdown nor an image', async () => {
    writeFile('vault/note.md', 10)
    writeFile('vault/archive.enex', MAX_ATTACHMENT_FILE_SIZE + 1)

    const preview = await previewImport([path.join(rootDir, 'vault')])

    expect(preview.mdFileCount).toBe(1)
    expect(preview.totalSize).toBe(10)
    expect(preview.oversizedFiles).toEqual([])
  })

  it('lists oversized files relative to the folder that holds the pick', async () => {
    writeFile('vault/small.md', 10)
    writeFile('vault/sub/huge.png', MAX_ATTACHMENT_FILE_SIZE + 1)

    const preview = await previewImport([path.join(rootDir, 'vault')])

    expect(preview.oversizedFiles).toEqual([path.join('vault', 'sub', 'huge.png')])
  })
})

describe('importMarkdownFromMultipleFilesAndDirectories', () => {
  it('imports a single picked folder into the destination and creates notebooks for its subfolders', async () => {
    writeFile('vault/top.md', 10)
    writeFile('vault/sub/child.md', 10)
    writeFile('vault/sub/deep/leaf.md', 10)

    await importMarkdownFromMultipleFilesAndDirectories(
      [path.join(rootDir, 'vault')],
      'book:dest',
      () => {},
      { root: true }
    )

    expect(inkdropModule.savedBooks).toEqual([
      { _id: 'book:sub', name: 'sub', parentBookId: 'book:dest' },
      { _id: 'book:deep', name: 'deep', parentBookId: 'book:sub' }
    ])
    expect(importedFiles()).toEqual([
      `${path.join('vault', 'top.md')} -> book:dest`,
      `${path.join('vault', 'sub', 'child.md')} -> book:sub`,
      `${path.join('vault', 'sub', 'deep', 'leaf.md')} -> book:deep`
    ])
  })

  it('creates a notebook for each folder when several are picked', async () => {
    writeFile('first/a.md', 10)
    writeFile('second/b.md', 10)

    await importMarkdownFromMultipleFilesAndDirectories(
      [path.join(rootDir, 'first'), path.join(rootDir, 'second')],
      'book:dest',
      () => {},
      { root: true }
    )

    expect(inkdropModule.savedBooks.map(book => book.name)).toEqual(['first', 'second'])
    expect(importedFiles()).toEqual([
      `${path.join('first', 'a.md')} -> book:first`,
      `${path.join('second', 'b.md')} -> book:second`
    ])
  })

  it('skips a folder that holds no Markdown file at any depth', async () => {
    writeFile('vault/note.md', 10)
    writeFile('vault/assets/nested/pic.png', 10)

    await importMarkdownFromMultipleFilesAndDirectories(
      [path.join(rootDir, 'vault')],
      'book:dest',
      () => {},
      { root: true }
    )

    expect(inkdropModule.savedBooks).toEqual([])
    expect(importedFiles()).toEqual([`${path.join('vault', 'note.md')} -> book:dest`])
  })

  it('reports each file and subfolder, but not the single picked folder itself', async () => {
    writeFile('vault/top.md', 10)
    writeFile('vault/sub/child.md', 10)
    const reported: string[] = []

    await importMarkdownFromMultipleFilesAndDirectories(
      [path.join(rootDir, 'vault')],
      'book:dest',
      (filePath, { isDirectory }) => {
        reported.push(`${path.relative(rootDir, filePath)}${isDirectory ? path.sep : ''}`)
      },
      { root: true }
    )

    expect(reported).toEqual([
      path.join('vault', 'top.md'),
      path.join('vault', 'sub') + path.sep,
      path.join('vault', 'sub', 'child.md')
    ])
  })
})
