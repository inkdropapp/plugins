import type { Environment, IInkdropPlugin } from '@inkdropapp/types'

import { exportAsPDFCommand, printCommand } from './exporter.js'

class ExportPrintPlugin implements IInkdropPlugin {
  private subscription: { dispose(): void } | undefined

  activate(env: Environment) {
    this.subscription = env.commands.add(document.body, {
      'export-print:export-as-pdf': e => exportAsPDFCommand(env, e),
      'export-print:print': () => printCommand(env)
    })
  }

  deactivate() {
    this.subscription?.dispose()
  }
}

export default new ExportPrintPlugin()
