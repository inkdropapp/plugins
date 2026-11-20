"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inkdrop_1 = require("inkdrop");
const exporter_js_1 = require("./exporter.js");
class ExportAsMarkdownPlugin {
    env;
    subscription;
    activate(env) {
        this.env = env;
        this.subscription = env.commands.add(document.body, {
            'export-as-markdown:all': () => this.exportAll(),
            'export-as-markdown:selections': e => this.exportSelectedNotes(e),
            'export-as-markdown:notebook': e => this.exportBook(e)
        });
    }
    deactivate() {
        this.subscription?.dispose();
        this.env = undefined;
    }
    getEnv() {
        if (!this.env) {
            throw new Error('export-as-markdown: env accessed before activate()');
        }
        return this.env;
    }
    exportAll() {
        (0, exporter_js_1.exportAll)(this.getEnv());
    }
    async exportSelectedNotes(e) {
        const env = this.getEnv();
        const { noteListBar, editingNote } = env.store.getState();
        const { actionTargetNoteIds } = noteListBar;
        const noteIds = e.detail?.noteId
            ? [e.detail.noteId]
            : actionTargetNoteIds.length > 0
                ? actionTargetNoteIds
                : [editingNote?._id];
        if (noteIds && noteIds.length > 1) {
            await (0, exporter_js_1.exportMultipleNotes)(env, noteIds);
            env.notifications.addInfo('Exporting notes completed', {
                detail: '',
                dismissable: true
            });
        }
        else if (noteIds.length === 1) {
            const note = (await inkdrop_1.models.Note.loadWithId(noteIds[0])).toObject();
            (0, exporter_js_1.exportSingleNote)(env, note);
        }
        else {
            env.notifications.addError('No note opened', {
                detail: 'Please open a note to export',
                dismissable: true
            });
        }
    }
    exportBook(e) {
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
exports.default = new ExportAsMarkdownPlugin();
