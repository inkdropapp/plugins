import path from 'path'

import type { FileWatchEvent, IPCFs, PackageManager } from '@inkdropapp/types'
import { describe, expect, it, vi } from 'vitest'

import { ThemeHotReloader } from './hot-reloading-themes'

type WatchListener = (event: FileWatchEvent) => void

function createPackage(name: string, type: 'theme' | 'plugin' = 'theme') {
  return {
    name,
    path: path.resolve('/packages', name),
    getType: () => type,
    reloadStylesheets: vi.fn()
  }
}

function createReloader(packages: Array<ReturnType<typeof createPackage>>) {
  const listenersByPath = new Map<string, WatchListener>()
  const disposals: string[] = []
  const pendingWatches: Array<() => void> = []
  let startsWatchesImmediately = true

  const fs = {
    watch: (targetPath: string, listener: WatchListener) => {
      const start = () => {
        listenersByPath.set(targetPath, listener)
        return { dispose: () => disposals.push(targetPath) }
      }
      if (startsWatchesImmediately) return Promise.resolve(start())
      return new Promise(resolve => {
        pendingWatches.push(() => resolve(start()))
      })
    }
  } as unknown as IPCFs
  const packageManager = { getActivePackages: () => packages } as unknown as PackageManager

  return {
    reloader: new ThemeHotReloader(packageManager, fs),
    disposals,
    emitChange: (pack: { path: string }, ...segments: string[]) =>
      listenersByPath.get(pack.path)?.({ type: 'change', path: path.join(pack.path, ...segments) }),
    holdWatchStarts: () => {
      startsWatchesImmediately = false
    },
    finishWatchStarts: () => {
      for (const finish of pendingWatches.splice(0)) finish()
    }
  }
}

describe('ThemeHotReloader', () => {
  it('reloads a theme when one of its CSS files changes', async () => {
    const theme = createPackage('my-theme')
    const { reloader, emitChange } = createReloader([theme])
    await reloader.watchThemes()

    emitChange(theme, 'styles', 'theme.css')

    expect(theme.reloadStylesheets).toHaveBeenCalledOnce()
  })

  it('reloads only the theme whose file changed', async () => {
    const changedTheme = createPackage('changed-theme')
    const otherTheme = createPackage('other-theme')
    const { reloader, emitChange } = createReloader([changedTheme, otherTheme])
    await reloader.watchThemes()

    emitChange(changedTheme, 'styles', 'theme.css')

    expect(changedTheme.reloadStylesheets).toHaveBeenCalledOnce()
    expect(otherTheme.reloadStylesheets).not.toHaveBeenCalled()
  })

  it.each([
    ['a file that is not CSS', ['package.json']],
    ['CSS inside node_modules', ['node_modules', 'dep', 'dep.css']],
    ['CSS inside .git', ['.git', 'objects', 'x.css']]
  ])('ignores %s', async (_label, segments) => {
    const theme = createPackage('my-theme')
    const { reloader, emitChange } = createReloader([theme])
    await reloader.watchThemes()

    emitChange(theme, ...segments)

    expect(theme.reloadStylesheets).not.toHaveBeenCalled()
  })

  it('does not watch packages that are not themes', async () => {
    const plugin = createPackage('my-plugin', 'plugin')
    const { reloader, emitChange } = createReloader([plugin])
    await reloader.watchThemes()

    emitChange(plugin, 'styles', 'plugin.css')

    expect(plugin.reloadStylesheets).not.toHaveBeenCalled()
  })

  it('stops every watch when unwatching', async () => {
    const firstTheme = createPackage('first-theme')
    const secondTheme = createPackage('second-theme')
    const { reloader, disposals } = createReloader([firstTheme, secondTheme])
    await reloader.watchThemes()

    reloader.unwatchThemes()

    expect(disposals).toEqual([firstTheme.path, secondTheme.path])
  })

  it('stops the previous watches when watching again', async () => {
    const theme = createPackage('my-theme')
    const { reloader, disposals } = createReloader([theme])
    await reloader.watchThemes()

    await reloader.watchThemes()

    expect(disposals).toEqual([theme.path])
  })

  it('stops a watch that was still starting when unwatching', async () => {
    const firstTheme = createPackage('first-theme')
    const secondTheme = createPackage('second-theme')
    const { reloader, disposals, holdWatchStarts, finishWatchStarts } = createReloader([
      firstTheme,
      secondTheme
    ])
    holdWatchStarts()
    const watching = reloader.watchThemes()

    reloader.unwatchThemes()
    finishWatchStarts()
    await watching

    expect(disposals).toEqual([firstTheme.path])
  })
})
