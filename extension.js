'use strict';
Object.defineProperty(exports, "__esModule", {
    value: true
});
// (c) 2016-2017 Ecmel Ercan
const vsc = require("vscode");
var {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} = require('vscode');
const lst = require("vscode-languageserver-types");
const css = require("vscode-css-languageservice");
const fs = require("fs");
const path = require("path");
const request = require('request');
let service = css.getCSSLanguageService();
let map = {};
let regex = [
    /(bindings)\s*:\s*{([^}]*)/g, //匹配bindings
    /<([^>^/]*)$/g, //匹配标签名称
];
let dot = vsc.CompletionItemKind.Class;
let hash = vsc.CompletionItemKind.Reference;
class ClassServer {
    constructor() {
        this.regex = [
            /(\.|\#)[^\.^\#^\<^\>]*$/i,
            /<style[\s\S]*>([\s\S]*)<\/style>/ig
        ];
    }
    provideCompletionItems(document, position, token) {
        let start = new vsc.Position(0, 0);
        let range = new vsc.Range(start, position);
        let text = document.getText(range),
            tag = regex[1].exec(text),
            arr;
        if (tag) {
            let _path = path.resolve(document.uri.fsPath, '../index.js'),
                indexJs = fs.readFileSync(_path, 'utf8'),
                tagName = string2Array(tag[1].trim())[0];
            if (tagName) {
                let tagDir = path.join(document.uri.fsPath, '../..', tagName + '/index.js');
                arr = parseBindings(tagDir);
                return new vsc.CompletionList(arr);
            }
        }
    }
    resolveCompletionItem(item, token) {
        return null;
    }
}

function pushSymbols(key, symbols) {
    let ci = [];
    for (let i = 0; i < symbols.length; i++) {
        if (symbols[i].kind !== 5) {
            continue;
        }
        let symbol;
        while (symbol = regex.exec(symbols[i].name)) {
            let item = new vsc.CompletionItem(symbol[1]);
            item.kind = symbol[0].startsWith('.') ? dot : hash;
            item.detail = path.basename(key);
            ci.push(item);
        }
    }
    map[key] = ci;
}

function parse(uri) {
    fs.readFile(uri.fsPath, 'utf8', function (err, data) {
        if (err) {
            delete map[uri.fsPath];
        } else {
            let doc = lst.TextDocument.create(uri.fsPath, 'css', 1, data);
            let symbols = service.findDocumentSymbols(doc, service.parseStylesheet(doc));
            pushSymbols(uri.fsPath, symbols);
        }
    });
}

function parseBindings(url) {
    let bindings = [];
    try {
        let data = fs.readFileSync(url.replace('.html', '.js'), 'utf8');
        if (!data) {
            vsc.window.showWarningMessage('当前目录缺少index.js');
            return;
        } else {
            let bindingsString = data.match(regex[0])[0];
            if (bindingsString) {
                bindingsString.split('{')[1].trim().match(/(\w+):[^\n]*/g)
                    // string2Array(bindingsString.split('{')[1].trim())
                    .map(item => {
                        let field = new vsc.CompletionItem('-' + item.split(':')[0].trim(), item.split(':')[1].indexOf('?') > -1 ? vsc.CompletionItemKind.Module : vsc.CompletionItemKind.Constructor);
                        field.insertText = item.split(':')[0].trim().replace(/([A-Z])/g, "-$1").toLowerCase() + '=""';
                        if (item.indexOf('//') > -1) {
                            field.documentation = item.split('//')[1].trim();
                        } else if (item.indexOf('/*') > -1) {
                            field.documentation = bindingsString.split(item)[1].split('*/')[0];
                        }
                        bindings.push(field);
                    })
                return bindings;
            }
            return null;
        }
    } catch (error) {
        console.log(error);
        vsc.window.showErrorMessage('parseBinding出错');
    }

}

function parseRemote(url) {
    request(url, (err, response, body) => {
        if (body.length > 0) {
            let doc = lst.TextDocument.create(url, 'css', 1, body);
            let symbols = service.findDocumentSymbols(doc, service.parseStylesheet(doc));
            pushSymbols(url, symbols);
        }
    });
}

function parseRemoteConfig() {
    let remoteCssConfig = vsc.workspace.getConfiguration('css');
    let urls = remoteCssConfig.get('remoteStyleSheets', []);
    urls.forEach((url) => parseRemote(url));
}

function string2Array(str) {
    let arr = str.split('\r\n');
    if (arr.length <= 1) {
        arr = str.split('\n');
    }
    return arr;
}

function activate(context) {
    if (vsc.workspace.rootPath) {
        const remoteCssConfig = vsc.workspace.getConfiguration('html');
        const extensions = remoteCssConfig.get('fileExtensions', []);
        extensions.forEach(ext => {
            const glob = `**/*.${ext}`;
            vsc.workspace.findFiles(glob, '').then(function (uris) {
                for (let i = 0; i < uris.length; i++) {
                    parse(uris[i]);
                }
            });
            let watcher = vsc.workspace.createFileSystemWatcher(glob);
            watcher.onDidCreate(function (uri) {
                parse(uri);
            });
            watcher.onDidChange(function (uri) {
                parse(uri);
            });
            watcher.onDidDelete(function (uri) {
                delete map[uri.fsPath];
            });
            context.subscriptions.push(watcher);
        });
        parseRemoteConfig();
        // The command has been defined in the package.json file
        // Now provide the implementation of the command with  registerCommand
        // The commandId parameter must match the command field in package.json
        let wordCounter = new WordCount();
        let controller = new WordCounterController(wordCounter);
        // var disposable = commands.registerCommand('extension.sayHello', () => {
        //     wordCounter.updateWordCount();
        // });

        // Add to a list of disposables which are disposed when this extension is deactivated.
        context.subscriptions.push(controller);
        context.subscriptions.push(wordCounter);
    };
    let classServer = new ClassServer();
    context.subscriptions.push(vsc.languages.registerCompletionItemProvider([
        'html',
    ], classServer));
    context.subscriptions.push(vsc.workspace.onDidChangeConfiguration((e) => parseRemoteConfig()));
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
class WordCount {
    constructor() {
        this._statusBarItem = StatusBarItem;
    }
    updateWordCount() {
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;
        // Only update status if an Markdown file
        if (doc.languageId === "markdown") {
            let wordCount = this._getWordCount(doc);

            // Update the status bar
            this._statusBarItem.text = wordCount !== 1 ? `$(hubot)  大佬，您已码了${wordCount}个汉字` : '$(hubot)  切，就打一个字。。你是要干嘛？';
            this._statusBarItem.show();
        } else {
            this._statusBarItem.hide();
        }
    }
    _getWordCount(doc) {
        let docContent = doc.getText();

        // Parse out unwanted whitespace so the split is accurate
        // docContent = docContent.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
        // docContent = docContent.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        let wordCount = 0;
        if (docContent != "") {
            let reg = /[\u4e00-\u9fa5]/g;
            if (docContent.toString().match(reg)) {
                wordCount = docContent.toString().match(reg).length
            }
            // wordCount = docContent.split(" ").length;
        }
        return wordCount;
    }
    dispose() {
        this._statusBarItem.dispose();
    }
}

class WordCounterController {

    constructor(wordCounter) {
        this._wordCounter = wordCounter;
        this._wordCounter.updateWordCount();

        // subscribe to selection change and editor activation events
        let subscriptions = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // update the counter for the current file
        this._wordCounter.updateWordCount();

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    _onEvent() {
        this._wordCounter.updateWordCount();
    }
}
//# sourceMappingURL=extension.js.map