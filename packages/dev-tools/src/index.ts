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
      'dev-tools:unwatch-themes': () => this.unwatchThemes(env)
    })
  }

  private async watchThemes(env: Environment) {
    this.hotReloader ??= new ThemeHotReloader(env.packages, env.fs)
    await this.hotReloader.watchThemes()
    env.notifications.addInfo('Watching themes...', {
      dismissable: true,
      detail: 'When any file changes are detected, it will reload immediately.'
    })
  }

  private unwatchThemes(env: Environment) {
    this.hotReloader?.unwatchThemes()
    env.notifications.addInfo('Stopped watching themes', {
      dismissable: true
    })
  }

  deactivate() {
    this.commandsSubscription?.dispose()
    this.commandsSubscription = null
    this.hotReloader?.unwatchThemes()
  }
}

export default new DevToolsPlugin()
