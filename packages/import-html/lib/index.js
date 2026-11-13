"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const path_1 = __importDefault(require("path"));
const inkdrop_1 = require("inkdrop");
const react_1 = require("react");
const env_js_1 = require("./env.js");
const import_wizard_dialog_js_1 = require("./import-wizard-dialog.js");
const importer_js_1 = require("./importer.js");
/**
 * The notebook a sidebar context-menu command targets: an explicit `detail.bookId` when
 * dispatched programmatically, else the last notebook that was right-clicked — the store never
 * clears it, so a programmatic dispatch should pass `bookId`. `null` (no notebook right-clicked
 * yet) falls back to the regular wizard, which asks for a destination.
 */
function getContextMenuBookId(e) {
    return e.detail?.bookId ?? (0, env_js_1.getEnv)().store.getState().bookList.bookForContextMenu?._id ?? null;
}
const ImportHTMLPlugin = () => {
    const [step, setStep] = (0, react_1.useState)('notebook');
    const [filePaths, setFilePaths] = (0, react_1.useState)([]);
    const [selectedBookId, setSelectedBookId] = (0, react_1.useState)(null);
    const [status, setStatus] = (0, react_1.useState)('');
    const [processingFilePath, setProcessingFilePath] = (0, react_1.useState)('');
    const [importError, setImportError] = (0, react_1.useState)(null);
    const wizardDialog = (0, inkdrop_1.useModal)();
    const importFiles = (0, react_1.useCallback)(async (paths, destBookId) => {
        setStep('progress');
        setStatus('Importing files..');
        try {
            await (0, importer_js_1.importHTMLFromMultipleFiles)(paths, destBookId, filePath => {
                setProcessingFilePath(filePath);
                setStatus(`Importing file.. ${path_1.default.basename(filePath)}`);
            });
            (0, env_js_1.getEnv)().notifications.addSuccess('Import HTML files', {
                detail: `Successfully imported ${paths.length} HTML files!`,
                dismissable: true
            });
            wizardDialog.close();
        }
        catch (e) {
            setImportError(e instanceof Error ? e : new Error(String(e)));
        }
    }, [wizardDialog]);
    // With a destination already known (from a notebook's context menu), the notebook step —
    // the wizard's only step before importing — is skipped.
    const startWizard = (0, react_1.useCallback)(async (destBookId = null) => {
        const { filePaths: pickedPaths } = await (0, importer_js_1.openImportDialog)();
        if (!(pickedPaths instanceof Array) || pickedPaths.length === 0)
            return;
        inkdrop_1.logger.debug('[import-html] Picked files:', pickedPaths);
        setFilePaths(pickedPaths);
        setSelectedBookId(destBookId);
        setImportError(null);
        setStep('notebook');
        wizardDialog.show();
        if (destBookId)
            await importFiles(pickedPaths, destBookId);
    }, [wizardDialog, importFiles]);
    const showDialog = (0, react_1.useCallback)(() => startWizard(), [startWizard]);
    const showDialogForNotebook = (0, react_1.useCallback)((e) => startWizard(getContextMenuBookId(e)), [startWizard]);
    const handleImport = (0, react_1.useCallback)(async () => {
        if (!selectedBookId)
            return;
        await importFiles(filePaths, selectedBookId);
    }, [filePaths, selectedBookId, importFiles]);
    (0, react_1.useEffect)(() => {
        const sub = (0, env_js_1.getEnv)().commands.add(document.body, {
            'import-html:import-from-file': {
                description: 'Import notes from HTML files',
                didDispatch: showDialog
            },
            'import-html:import-from-file-into-notebook': {
                description: 'Import notes from HTML files into the selected notebook',
                hiddenInCommandPalette: true,
                didDispatch: showDialogForNotebook
            }
        });
        return () => sub.dispose();
    }, [showDialog, showDialogForNotebook]);
    return ((0, jsx_runtime_1.jsx)(import_wizard_dialog_js_1.ImportHTMLWizardDialog, { modal: wizardDialog, step: step, status: status, selectedBookId: selectedBookId, importingFilePath: processingFilePath, importError: importError, onSelectNotebook: setSelectedBookId, onImport: handleImport }));
};
class InkdropPlugin {
    activate(env) {
        (0, env_js_1.setEnv)(env);
        env.components.registerClass(ImportHTMLPlugin);
        env.layouts.addComponentToLayout('modal', 'ImportHTMLPlugin');
    }
    deactivate(env) {
        env.layouts.removeComponentFromLayout('modal', 'ImportHTMLPlugin');
        env.components.deleteClass(ImportHTMLPlugin);
        (0, env_js_1.setEnv)(undefined);
    }
}
const plugin = new InkdropPlugin();
exports.default = plugin;
