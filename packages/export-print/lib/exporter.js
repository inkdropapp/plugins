"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAsPDFCommand = exportAsPDFCommand;
exports.printCommand = printCommand;
exports.exportAsPDF = exportAsPDF;
exports.print = print;
const path_1 = __importDefault(require("path"));
const inkdrop_1 = require("inkdrop");
const PRINT_CANCELED_REASON = 'Print job canceled';
async function exportAsPDFCommand(env, e) {
    const { noteListBar, editingNote } = env.store.getState();
    const { actionTargetNoteIds } = noteListBar;
    const noteIds = e.detail?.noteId
        ? [e.detail.noteId]
        : actionTargetNoteIds.length > 0
            ? actionTargetNoteIds
            : [editingNote?._id];
    if (noteIds && noteIds.length > 1) {
        await exportMultipleNotesAsPDF(env, noteIds);
        env.notifications.addInfo('Exporting notes completed', {
            detail: '',
            dismissable: true
        });
    }
    else if (noteIds.length === 1) {
        const note = (await inkdrop_1.models.Note.loadWithId(noteIds[0])).toObject();
        exportAsPDF(env, note);
    }
    else {
        env.notifications.addError('No note opened', {
            detail: 'Please open a note to export as PDF',
            dismissable: true
        });
    }
}
async function printCommand(env) {
    const { editingNote } = env.store.getState();
    if (editingNote) {
        await print(env, editingNote);
    }
    else {
        env.notifications.addError('No note opened', {
            detail: 'Please open a note to export',
            dismissable: true
        });
    }
}
async function exportMultipleNotesAsPDF(env, noteIds) {
    const { filePaths: res } = await env.dialog.showOpenDialog({
        title: 'Select Destination Directory',
        properties: ['openDirectory']
    });
    if (res instanceof Array && res.length > 0) {
        const destDir = res[0];
        for (const noteId of noteIds) {
            const note = (await inkdrop_1.models.Note.loadWithId(noteId)).toObject();
            if (note) {
                const pathToSave = path_1.default.join(destDir, `${note.title}.pdf`);
                await exportAsPDF(env, note, pathToSave);
            }
        }
    }
}
async function exportAsPDF(env, note, pathToSave) {
    if (typeof pathToSave === 'undefined') {
        const { filePath } = await env.dialog.showSaveDialog({
            title: 'Save PDF file',
            defaultPath: `${note.title}.pdf`,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (typeof filePath === 'string' && filePath.length > 0) {
            pathToSave = filePath;
        }
        else {
            return;
        }
    }
    if (typeof pathToSave === 'string' && pathToSave.length > 0) {
        try {
            await inkdrop_1.exportUtils.exportNoteAsPDF(note, pathToSave, {
                pageSize: 'A4',
                printBackground: true
            });
        }
        catch (e) {
            env.notifications.addError('Failed to save PDF', {
                detail: e instanceof Error ? e.stack : String(e),
                dismissable: true
            });
        }
    }
}
async function print(env, note) {
    const { success, failureReason } = await inkdrop_1.exportUtils.printNote(note, {
        printBackground: true
    });
    if (!success && failureReason !== PRINT_CANCELED_REASON) {
        env.notifications.addError('Failed to print', {
            detail: failureReason,
            dismissable: true
        });
    }
}
