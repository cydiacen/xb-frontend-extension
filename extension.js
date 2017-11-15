'use strict';
Object.defineProperty(exports, "__esModule", {
    value: true
});
const vsc = require("vscode");
var {
    window,
    commands,
    Disposable,
    ExtensionContext,
    StatusBarAlignment,
    StatusBarItem,
    TextDocument
} = require('vscode');
const fs = require("fs");
const path = require("path");
let regex = [
    /(bindings)\s*:\s*{([^}]*)/g, //匹配bindings
    /<([^>^/]*)$/g, //匹配标签名称
];
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
        let text = document.getText(range);
        let tag = /<([^>^/]*)$/g.exec(text),
            arr;
        if (tag) {
            let _path = path.resolve(document.uri.fsPath, '../index.js'),
                indexJs = fs.readFileSync(_path, 'utf8'),
                tagName = string2Array(tag[1].trim())[0].trim().split(' ')[0];
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
function parseBindings(url) {
    let bindings = [];
    try {
        let data = fs.readFileSync(url.replace('.html', '.js'), 'utf8');
        if (!data) {
            vsc.window.showWarningMessage('当前目录缺少index.js');
            return;
        } else {
            let bindingsString = data.replace(/\/\*(.|\r|\n)+\*\//g, '/*');
            bindingsString = bindingsString.match(regex[0])[0];
            // bindingsString = bindingsString.match(regex[0])[0];
            if (bindingsString) {
                let bindingArr = bindingsString.split('{');
                bindingArr = bindingArr.slice(1, bindingArr.length);
                bindingArr = bindingArr.join('').trim();
                bindingArr.match(/(\w+):[^\n]*/g)
                    // string2Array(bindingsString.split('{')[1].trim())
                    .map(item => {
                        let field = new vsc.CompletionItem('-' + item.split(':')[0].trim(), item.split(':')[1].indexOf('?') > -1 ? vsc.CompletionItemKind.Module : vsc.CompletionItemKind.Constructor);
                        field.insertText = item.split(':')[0].trim().replace(/([A-Z])/g, "-$1").toLowerCase() + '=""';
                        if (item.indexOf('//') > -1) {
                            field.documentation = item.split('//')[1].trim();
                        } else if (item.indexOf('/*') > -1) {
                            field.documentation = data.split(item)[1].split('*/')[0].trim();
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


function string2Array(str) {
    let arr = str.split('\r\n');
    if (arr.length <= 1) {
        arr = str.split('\n');
    }
    return arr;
}

function activate(context) {
    vsc.window.showWarningMessage('欢迎使用One Enough！')
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
    let classServer = new ClassServer();
    context.subscriptions.push(vsc.languages.registerCompletionItemProvider([
        'html',
    ], classServer));
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