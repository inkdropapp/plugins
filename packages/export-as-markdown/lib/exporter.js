"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAll = exportAll;
exports.exportNotesInBook = exportNotesInBook;
exports.exportSingleNote = exportSingleNote;
exports.exportMultipleNotes = exportMultipleNotes;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const inkdrop_1 = require("inkdrop");
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
async function exportAll(env) {
    const { filePaths: pathArrayToSave } = await env.dialog.showOpenDialog({
        title: 'Select a directory to export all notes',
        properties: ['openDirectory', 'createDirectory']
    });
    if (pathArrayToSave instanceof Array && pathArrayToSave.length > 0) {
        const [pathToSave] = pathArrayToSave;
        const books = env.store.getState().books.tree;
        try {
            for (const book of books) {
                await exportBook(env, pathToSave, book);
            }
            inkdrop_1.logger.info('Finished exporting all notes');
            env.notifications.addInfo('Finished exporting all notes', {
                detail: 'Directory: ' + pathToSave,
                dismissable: true
            });
        }
        catch (e) {
            inkdrop_1.logger.error('Failed to export:', e);
            env.notifications.addError('Failed to export', {
                detail: errorMessage(e),
                dismissable: true
            });
        }
    }
}
async function exportNotesInBook(env, bookId) {
    const book = findBookFromTree(bookId, env.store.getState().books.tree);
    if (!book) {
        throw new Error('Notebook not found: ' + bookId);
    }
    const { filePaths: pathArrayToSave } = await env.dialog.showOpenDialog({
        title: `Select a directory to export a book "${book.name}"`,
        properties: ['openDirectory', 'createDirectory']
    });
    if (pathArrayToSave instanceof Array && pathArrayToSave.length > 0) {
        const [pathToSave] = pathArrayToSave;
        try {
            await exportBook(env, pathToSave, book, { createBookDir: false });
            env.notifications.addInfo(`Finished exporting notes in "${book.name}"`, {
                detail: 'Directory: ' + pathToSave,
                dismissable: true
            });
        }
        catch (e) {
            inkdrop_1.logger.error('Failed to export:', e);
            env.notifications.addError('Failed to export', {
                detail: errorMessage(e),
                dismissable: true
            });
        }
    }
}
async function exportSingleNote(env, note) {
    const { filePath: pathToSave } = await env.dialog.showSaveDialog({
        title: 'Save Markdown File',
        defaultPath: `${note.title}.md`,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }]
    });
    if (pathToSave) {
        try {
            const destDir = path_1.default.dirname(pathToSave);
            const fileName = path_1.default.basename(pathToSave);
            await inkdrop_1.exportUtils.exportNoteAsMarkdown(note, destDir, fileName);
        }
        catch (e) {
            inkdrop_1.logger.error('Failed to export editing note:', e, note);
            env.notifications.addError('Failed to export editing note', {
                detail: errorMessage(e),
                dismissable: true
            });
        }
    }
}
async function exportMultipleNotes(env, noteIds) {
    const { filePaths: res } = await env.dialog.showOpenDialog({
        title: 'Select Destination Directory',
        properties: ['openDirectory']
    });
    if (res instanceof Array && res.length > 0) {
        const destDir = res[0];
        try {
            for (const noteId of noteIds) {
                const note = (await inkdrop_1.models.Note.loadWithId(noteId)).toObject();
                if (note) {
                    const fileName = inkdrop_1.exportUtils.sanitizeFileName(note.title, {
                        extension: '.md'
                    });
                    await inkdrop_1.exportUtils.exportNoteAsMarkdown(note, destDir, fileName);
                }
            }
        }
        catch (e) {
            inkdrop_1.logger.error('Failed to export notes:', e);
            env.notifications.addError('Failed to export notes', {
                detail: errorMessage(e),
                dismissable: true
            });
        }
    }
}
async function exportBook(env, parentDir, book, opts = {}) {
    const { createBookDir = true } = opts;
    const db = env.localDB;
    const dirName = inkdrop_1.exportUtils.sanitizeFileName(book.name, { replacement: '-' });
    const pathToSave = createBookDir ? path_1.default.join(parentDir, dirName) : parentDir;
    const { rows } = await db.notes.query({
        index: 'notes',
        bookId: book._id,
        status: ['none', 'active', 'onHold', 'completed', 'dropped'],
        limit: false
    }, { includeDocs: true });
    const notes = rows.map(row => row.doc);
    if (!fs_1.default.existsSync(pathToSave))
        fs_1.default.mkdirSync(pathToSave);
    for (const note of notes) {
        await inkdrop_1.exportUtils.exportNoteAsMarkdown(note, pathToSave);
    }
    for (const childBook of book.children ?? []) {
        await exportBook(env, pathToSave, childBook);
    }
}
function findBookFromTree(bookId, tree) {
    for (const item of tree) {
        if (item._id === bookId) {
            return item;
        }
        else if (item.children) {
            const book = findBookFromTree(bookId, item.children);
            if (book) {
                return book;
            }
        }
    }
    return undefined;
}
