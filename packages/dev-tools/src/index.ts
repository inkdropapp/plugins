import type { Environment, IInkdropPlugin } from '@inkdropapp/types'

import { ThemeHotReloader } from './hot-reloading-themes'

class DevToolsPlugin implements IInkdropPlugin {
  private commandsSubscription: { dispose(): void } | null = null
  private hotReloader: ThemeHotReloader | null = null

  activate(env: Environment) {
    this.commandsSubscription = env.commands.add(document.body, {
      'dev-tools:watch-themes': () => {
        this.hotReloader ??= new ThemeHotReloader(env.packages)
        this.hotReloader.watchThemes()
        env.notifications.addInfo('Watching themes...', {
          dismissable: true,
          detail: 'When any file changes are detected, it will reload immediately.'
        })
      },
      'dev-tools:unwatch-themes': () => {
        this.hotReloader?.unwatchThemes()
        env.notifications.addInfo('Stopped watching themes', {
          dismissable: true
        })
      }
    })
  }

  async deactivate() {
    this.commandsSubscription?.dispose()
    this.commandsSubscription = null
    await this.hotReloader?.unwatchThemes()
  }
}

export default new DevToolsPlugin()
