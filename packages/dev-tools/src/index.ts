import type { Environment, IInkdropPlugin } from '@inkdropapp/types'

import { ThemeHotReloader } from './hot-reloading-themes'
import { notifyFailure } from './notify-failure'

class DevToolsPlugin implements IInkdropPlugin {
  private commandsSubscription: { dispose(): void } | null = null
  private hotReloader: ThemeHotReloader | null = null

  activate(env: Environment) {
    this.commandsSubscription = env.commands.add(document.body, {
      'dev-tools:watch-themes': () =>
        this.watchThemes(env).catch(notifyFailure(env, 'Failed to watch themes')),
      'dev-tools:unwatch-themes': () =>
        this.unwatchThemes(env).catch(notifyFailure(env, 'Failed to stop watching themes'))
    })
  }

  private async watchThemes(env: Environment) {
    this.hotReloader ??= new ThemeHotReloader(env.packages)
    await this.hotReloader.watchThemes()
    env.notifications.addInfo('Watching themes...', {
      dismissable: true,
      detail: 'When any file changes are detected, it will reload immediately.'
    })
  }

  private async unwatchThemes(env: Environment) {
    await this.hotReloader?.unwatchThemes()
    env.notifications.addInfo('Stopped watching themes', {
      dismissable: true
    })
  }

  async deactivate() {
    this.commandsSubscription?.dispose()
    this.commandsSubscription = null
    await this.hotReloader?.unwatchThemes()
  }
}

export default new DevToolsPlugin()
