import type { CommandEvent, Environment, IInkdropPlugin } from '@inkdropapp/types'
import { useModal, logger, path } from 'inkdrop'
import { useEffect, useCallback, useState } from 'react'

import { getEnv, setEnv } from './env.js'
import { ImportHTMLWizardDialog } from './import-wizard-dialog.js'
import type { WizardStep } from './import-wizard-dialog.js'
import { openImportDialog, importHTMLFromMultipleFiles } from './importer.js'

/**
 * The notebook a sidebar context-menu command targets: an explicit `detail.bookId` when
 * dispatched programmatically, else the last notebook that was right-clicked — the store never
 * clears it, so a programmatic dispatch should pass `bookId`. `null` (no notebook right-clicked
 * yet) falls back to the regular wizard, which asks for a destination.
 */
function getContextMenuBookId(e: CommandEvent): string | null {
  return e.detail?.bookId ?? getEnv().store.getState().bookList.bookForContextMenu?._id ?? null
}

const COMPONENT_NAME = 'ImportHTMLPlugin'

const ImportHTMLPlugin = () => {
  const [step, setStep] = useState<WizardStep>('notebook')
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [processingFilePath, setProcessingFilePath] = useState('')
  const [importError, setImportError] = useState<Error | null>(null)
  const wizardDialog = useModal()

  const importFiles = useCallback(
    async (paths: string[], destBookId: string) => {
      setStep('progress')
      setStatus('Importing files..')
      try {
        await importHTMLFromMultipleFiles(paths, destBookId, filePath => {
          setProcessingFilePath(filePath)
          setStatus(`Importing file.. ${path.basename(filePath)}`)
        })
        getEnv().notifications.addSuccess('Import HTML files', {
          detail: `Successfully imported ${paths.length} HTML files!`,
          dismissable: true
        })
        wizardDialog.close()
      } catch (e) {
        setImportError(e instanceof Error ? e : new Error(String(e)))
      }
    },
    [wizardDialog]
  )

  // With a destination already known (from a notebook's context menu), the notebook step —
  // the wizard's only step before importing — is skipped.
  const startWizard = useCallback(
    async (destBookId: string | null = null) => {
      const { filePaths: pickedPaths } = await openImportDialog()
      if (!(pickedPaths instanceof Array) || pickedPaths.length === 0) return
      logger.debug('[import-html] Picked files:', pickedPaths)

      setFilePaths(pickedPaths)
      setSelectedBookId(destBookId)
      setImportError(null)
      setStep('notebook')
      wizardDialog.show()
      if (destBookId) await importFiles(pickedPaths, destBookId)
    },
    [wizardDialog, importFiles]
  )

  const showDialog = useCallback(() => startWizard(), [startWizard])
  const showDialogForNotebook = useCallback(
    (e: CommandEvent) => startWizard(getContextMenuBookId(e)),
    [startWizard]
  )

  const handleImport = useCallback(async () => {
    if (!selectedBookId) return
    await importFiles(filePaths, selectedBookId)
  }, [filePaths, selectedBookId, importFiles])

  useEffect(() => {
    const sub = getEnv().commands.add(document.body, {
      'import-html:import-from-file': {
        description: 'Import notes from HTML files',
        didDispatch: showDialog
      },
      'import-html:import-from-file-into-notebook': {
        description: 'Import notes from HTML files into the selected notebook',
        hiddenInCommandPalette: true,
        didDispatch: showDialogForNotebook
      }
    })
    return () => sub.dispose()
  }, [showDialog, showDialogForNotebook])

  return (
    <ImportHTMLWizardDialog
      modal={wizardDialog}
      step={step}
      status={status}
      selectedBookId={selectedBookId}
      importingFilePath={processingFilePath}
      importError={importError}
      onSelectNotebook={setSelectedBookId}
      onImport={handleImport}
    />
  )
}

class InkdropPlugin implements IInkdropPlugin {
  activate(env: Environment) {
    setEnv(env)
    env.components.registerClass(ImportHTMLPlugin, COMPONENT_NAME)
    env.layouts.addComponentToLayout('modal', COMPONENT_NAME)
  }

  deactivate(env: Environment) {
    env.layouts.removeComponentFromLayout('modal', COMPONENT_NAME)
    env.components.deleteClass(ImportHTMLPlugin, COMPONENT_NAME)
    setEnv(undefined)
  }
}

const plugin = new InkdropPlugin()
export default plugin
