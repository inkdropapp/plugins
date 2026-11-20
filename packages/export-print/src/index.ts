import type { Environment, IInkdropPlugin } from '@inkdropapp/types'

import { exportAsPDFCommand, printCommand } from './exporter.js'
import { notifyFailure } from './notify-failure.js'

class ExportPrintPlugin implements IInkdropPlugin {
  private subscription: { dispose(): void } | undefined

  activate(env: Environment) {
    this.subscription = env.commands.add(document.body, {
      'export-print:export-as-pdf': e =>
        exportAsPDFCommand(env, e).catch(notifyFailure(env, 'Failed to export as PDF')),
      'export-print:print': () => printCommand(env).catch(notifyFailure(env, 'Failed to print'))
    })
  }

  deactivate() {
    this.subscription?.dispose()
  }
}

export default new ExportPrintPlugin()
