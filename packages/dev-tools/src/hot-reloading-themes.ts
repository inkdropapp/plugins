import type { IPCFs, Package, PackageManager } from '@inkdropapp/types'

type ThemePackage = Package & { reloadStylesheets(): void }

type ThemeWatch = { dispose(): void }

function isWatchedStylesheet(path: string) {
  return path.endsWith('.css') && !/[/\\](node_modules|\.git)[/\\]/.test(path)
}

/**
 * Watches the active theme packages and reloads a theme's stylesheets whenever
 * one of its CSS files changes.
 */
export class ThemeHotReloader {
  private watches: ThemeWatch[] | null = null

  constructor(
    private readonly packages: PackageManager,
    private readonly fs: IPCFs
  ) {}

  getThemePackages() {
    return this.packages
      .getActivePackages()
      .filter((pack): pack is ThemePackage => pack.getType() === 'theme')
  }

  watchThemePackage(pack: ThemePackage): Promise<ThemeWatch> {
    return this.fs.watch(pack.path, ({ path }) => {
      if (isWatchedStylesheet(path)) {
        console.log('Reloading stylesheets:', pack.name)
        pack.reloadStylesheets()
      }
    })
  }

  async watchThemes() {
    console.log('Start watching themes...')
    this.unwatchThemes()
    const watches: ThemeWatch[] = []
    this.watches = watches

    for (const pack of this.getThemePackages()) {
      const watch = await this.watchThemePackage(pack)
      // unwatchThemes() may have run while the watch was starting.
      if (this.watches !== watches) {
        watch.dispose()
        break
      }
      watches.push(watch)
    }
  }

  unwatchThemes() {
    const watches = this.watches
    this.watches = null
    for (const watch of watches ?? []) watch.dispose()
    console.log('Stopped watching themes')
  }
}
