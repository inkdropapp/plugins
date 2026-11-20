import type { Stats } from 'node:fs'

import type { Package, PackageManager } from '@inkdropapp/types'
import type { FSWatcher } from 'chokidar'

type ThemePackage = Package & { reloadStylesheets(): void }

let chokidarPromise: Promise<typeof import('chokidar')> | null = null
function loadChokidar() {
  chokidarPromise ??= import('chokidar')
  return chokidarPromise
}

function shouldIgnore(path: string, stats?: Stats) {
  if (/[/\\](node_modules|\.git)([/\\]|$)/.test(path)) return true
  return stats?.isFile() === true && !path.endsWith('.css')
}

/**
 * Watches the active theme packages and reloads a theme's stylesheets whenever
 * one of its CSS files changes.
 */
export class ThemeHotReloader {
  private watchers: FSWatcher[] | null = null

  constructor(private readonly packages: PackageManager) {}

  getThemePackages() {
    return this.packages
      .getActivePackages()
      .filter((pack): pack is ThemePackage => pack.getType() === 'theme')
  }

  async watchThemePackage(pack: ThemePackage) {
    const { watch } = await loadChokidar()
    return watch(pack.path, {
      ignoreInitial: true,
      ignored: shouldIgnore
    }).on('all', (_event, path) => {
      if (path.endsWith('.css')) {
        console.log('Reloading stylesheets:', pack.name)
        pack.reloadStylesheets()
      }
    })
  }

  async watchThemes() {
    console.log('Start watching themes...')
    await this.unwatchThemes()
    const watchers: FSWatcher[] = []
    this.watchers = watchers

    for (const pack of this.getThemePackages()) {
      // Bail out if unwatchThemes() ran while we were awaiting chokidar.
      if (this.watchers !== watchers) break
      watchers.push(await this.watchThemePackage(pack))
    }
  }

  async unwatchThemes() {
    const watchers = this.watchers
    this.watchers = null
    if (watchers) await Promise.all(watchers.map(watcher => watcher.close()))
    console.log('Stopped watching themes')
  }
}
