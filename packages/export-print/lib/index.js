"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exporter_js_1 = require("./exporter.js");
class ExportPrintPlugin {
    subscription;
    activate(env) {
        this.subscription = env.commands.add(document.body, {
            'export-print:export-as-pdf': e => (0, exporter_js_1.exportAsPDFCommand)(env, e),
            'export-print:print': () => (0, exporter_js_1.printCommand)(env)
        });
    }
    deactivate() {
        this.subscription?.dispose();
    }
}
exports.default = new ExportPrintPlugin();
