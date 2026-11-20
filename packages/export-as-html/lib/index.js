"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inkdrop_1 = require("inkdrop");
const exporter_js_1 = require("./exporter.js");
class ExportAsHtmlPlugin {
    env;
    subscription;
    activate(env) {
        this.env = env;
        this.subscription = env.commands.add(document.body, {
            'export-as-html:selections': e => this.exportAsHtmlCommand(e),
            'export-as-html:copy': e => this.copyAsHtmlCommand(e),
            'export-as-html:copy-simple': e => this.copyAsSimpleHtmlCommand(e),
            'export-as-html:notebook': e => this.exportNotebook(e)
        });
    }
    deactivate() {
        this.subscription?.dispose();
        this.env = undefined;
    }
    getEnv() {
        if (!this.env) {
            throw new Error('export-as-html: env accessed before activate()');
        }
        return this.env;
    }
    async exportAsHtmlCommand(e) {
        const env = this.getEnv();
        const { noteListBar, editingNote } = env.store.getState();
        const { actionTargetNoteIds } = noteListBar;
        const noteIds = e.detail?.noteId
            ? [e.detail.noteId]
            : actionTargetNoteIds.length > 0
                ? actionTargetNoteIds
                : [editingNote?._id];
        if (noteIds && noteIds.length > 1) {
            env.notifications.addInfo('Exporting notes started', {
                detail: 'It may take a while..',
                dismissable: true
            });
            await (0, exporter_js_1.exportMultipleNotesAsHtml)(env, noteIds);
            env.notifications.addInfo('Exporting notes completed', {
                detail: '',
                dismissable: true
            });
        }
        else if (noteIds.length === 1) {
            const note = (await inkdrop_1.models.Note.loadWithId(noteIds[0])).toObject();
            (0, exporter_js_1.exportNoteAsHtml)(env, note);
        }
        else {
            env.notifications.addError('No note opened', {
                detail: 'Please open a note to export as HTML',
                dismissable: true
            });
        }
    }
    async copyAsHtmlCommand(e) {
        const env = this.getEnv();
        const { noteListBar } = env.store.getState();
        const { actionTargetNoteIds } = noteListBar;
        const noteId = e.detail?.noteId || actionTargetNoteIds?.[0];
        if (noteId) {
            const note = (await inkdrop_1.models.Note.loadWithId(noteId)).toObject();
            (0, exporter_js_1.copyNoteAsHtml)(env, note);
        }
    }
    async copyAsSimpleHtmlCommand(e) {
        const env = this.getEnv();
        const { noteListBar } = env.store.getState();
        const { actionTargetNoteIds } = noteListBar;
        const noteId = e.detail?.noteId || actionTargetNoteIds?.[0];
        if (noteId) {
            const note = (await inkdrop_1.models.Note.loadWithId(noteId)).toObject();
            (0, exporter_js_1.copyNoteAsSimpleHtml)(env, note);
        }
    }
    exportNotebook(e) {
        const env = this.getEnv();
        const { bookList: { bookForContextMenu } } = env.store.getState();
        const bookId = e.detail?.bookId || bookForContextMenu?._id;
        if (bookId) {
            (0, exporter_js_1.exportNotesInBook)(env, bookId);
        }
        else {
            env.notifications.addError('No notebook specified', {
                detail: 'Please select a notebook to export on sidebar',
                dismissable: true
            });
        }
    }
}
exports.default = new ExportAsHtmlPlugin();
