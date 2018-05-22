// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } = require('vscode');

export function scaningFile() {
    var items = Object.keys(scripts).map(function (key) {
        return { label: key, description: scripts[key] };
    });
    window.showQuickPick(items).then(function (value) {
        lastScript = value.label;
        run_command_1.runCommand(['run', value.label]);
    });
}