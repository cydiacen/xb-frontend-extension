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
    TextDocument,
    TextEditorEdit,

} = require('vscode');
const fs = require("fs");
const path = require("path");
const os = require("os");
const scaningFile = require("./translate");
let regex = [
    /(bindings)\s*:\s*{([^}]*)/g, //匹配bindings
    /<([^>^/]*)$/g, //匹配标签名称
];
var endWithSpace; //文本是否以空格结尾
class ClassServer {
    constructor() {
        this.regex = [
            /(\.|\#)[^\.^\#^\<^\>]*$/i,
            /<style[\s\S]*>([\s\S]*)<\/style>/ig
        ];
    }
    provideCompletionItems(document, position, token) {
        if (window.activeTextEditor.document.languageId !== 'html') return;
        let start = new vsc.Position(0, 0);
        let range = new vsc.Range(start, position);
        let text = document.getText(range);
        let tag = /<([^>^/]*)$/g.exec(text),
            arr;
        endWithSpace = text.substring(text.length - 1, 0).endsWith(' ') || text.endsWith(' ')
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
        url = url.replace('.html', '.js');
        if (!fs.existsSync(url)) return;
        let data = fs.readFileSync(url, 'utf8');
        if (!data) {
            vsc.window.showWarningMessage('当前目录缺少index.js');
            return;
        } else {
            let bindingsString = data.replace(/\/\*(.|\r|\n)+\*\//g, '/*');
            bindingsString = getTextObjectValue(bindingsString, 'bindings');
            // bindingsString = bindingsString.match(regex[0])[0];
            if (bindingsString) {
                let bindingArr = bindingsString.split('{');
                bindingArr = bindingArr.slice(1, bindingArr.length);
                bindingArr = bindingArr.join('').trim();
                bindingsString.match(/(\w+):[^\n]*/g)
                    // string2Array(bindingsString.split('{')[1].trim())
                    .map(item => {
                        let field = new vsc.CompletionItem('-' + item.split(':')[0].trim(), item.split(':')[1].indexOf('?') > -1 ? vsc.CompletionItemKind.Module : vsc.CompletionItemKind.Constructor);
                        field.insertText = (endWithSpace ? '' : ' ') + item.split(':')[0].trim().replace(/([A-Z])/g, "-$1").toLowerCase() + '=""';
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
        // vsc.window.showErrorMessage('parseBinding出错');
    }

}
//获取字符串中某个key的值
function getTextObjectValue(context, key) {
    let res = '',
        count = 1,
        reg = new Function(`return /(${key})\\s*:\\s*{(.|\\r|\\n)*/g`)();
    context = context.match(reg)[0];
    for (let i = 0; i < context.length; i++) {
        if (i > context.indexOf('{')) {
            if (context[i] == '{') count++;
            if (context[i] == '}') count--;
            if (count == 0) break;
            res += context[i];
        }
    }
    return res;
}

function string2Array(str) {
    let arr = str.split('\r\n');
    if (arr.length <= 1) {
        arr = str.split('\n');
    }
    return arr;
}
// const gitExtension = vsc.scm.createSourceControl('git', 'Git')
// const git = gitExtension.getAPI(1);
// let { findGitPath } = require('./locator.js');
let { findGitPath } = require('./locator.js')
findGitPath().then(data => {
    let pro = require('child_process');
    vsc.gitVersion = pro.execSync('cd ' + vsc.workspace.rootPath + ';' + data.path + ' rev-parse --abbrev-ref HEAD', { encoding: 'UTF-8' }).trim();;
})

// console.log(findGitPath());
// pro.ChildProcess
//脚本命令行快捷指令
const keys = {
    $$version: () => {
        return vsc.gitVersion;
    },
    $$ip: () => {
        const os = require('os');
        const osType = os.type(); //系统类型
        const netInfo = os.networkInterfaces(); //网络信息
        let ip = '';
        if (osType === 'Windows_NT') {
            for (let dev in netInfo) {
                //win7的网络信息中显示为本地连接，win10显示为以太网
                if (dev === '本地连接' || dev === '以太网') {
                    for (let j = 0; j < netInfo[dev].length; j++) {
                        if (netInfo[dev][j].family === 'IPv4') {
                            ip = netInfo[dev][j].address;
                            break;
                        }
                    }
                }
            }

        } else if (osType === 'Linux') {
            ip = netInfo.eth0[0].address;
        }

        return ip;
    }
};
function translateScript(script) {
    let res;
    Object.keys(keys).forEach((v) => {
        if (script.includes(v)) {
            let _v = v.replace(/\$/g, '\\$')
            script = script.replace(new RegExp(_v, 'g'), keys[v]())
            return;
        }
    })
    return script;
}
const nodeDependencies_1 = require("./xbView");
function activate(context) {
    // vsc.window.showInformationMessage('欢迎使用One Enough！')
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let wordCounter = new WordCount();
    let controller = new WordCounterController(wordCounter);
    commands.registerCommand('extension.scaningFile', () => {

        scaningFile();
        // window.showTextDocument(window.activeTextEditor.document,)

    })
    const nodeDependenciesProvider = new nodeDependencies_1.DepNodeProvider(vsc.workspace.rootPath);
    vsc.window.registerTreeDataProvider('xbView', nodeDependenciesProvider);
    vsc.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
    vsc.commands.registerCommand('extension.openPackageOnNpm', moduleName => vsc.commands.executeCommand('vscode.open', vsc.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
    vsc.commands.registerCommand('extension.runScript', module => {
        let runText = "";
        if (module.nodes) {
            let scripts = module.nodes.map(i => translateScript(i.script));
            // if (os.platform().includes('darwin')) {
            //     runText = scripts.join(' && ');
            // } else {
            runText = scripts.join(' ; ');
            // }
        } else {
            runText = translateScript(module.command.arguments[0].script);
        }
        let currentTer;
        vsc.window.terminals.every(ter => {
            if (ter._creationOptions.name === 'one-enough-pad') {
                currentTer = ter;
                return false;
            }
            return true;
        })
        if (!currentTer) {
            currentTer = vsc.window.createTerminal('one-enough-pad');
        }
        currentTer.show();
        currentTer.sendText(runText);
        // ter.dispose();
    });
    vsc.commands.registerCommand('nodeDependencies.addEntry', () => vsc.window.showInformationMessage(`Successfully called add entry.`));
    vsc.commands.registerCommand('nodeDependencies.editEntry', (node) => {
        vsc.commands.executeCommand('vscode.openFolder', vsc.Uri.parse(path.join(vsc.workspace.rootPath, 'node_modules', node.label)), true)
    });
    vsc.commands.registerCommand('nodeDependencies.deleteEntry', (node) => vsc.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));

    // commands.registerCommand('extension.replaceFeild', () => {
    //     // window.showInformationMessage('extension.scaningDic!');
    //     let selection = window.activeTextEditor.selection;
    //     window.activeTextEditor.edit(edit => {
    //         edit.replace(selection, '123');
    //     })
    //     // window.showTextDocument(window.activeTextEditor.document,)

    // })
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

function deactivate() { }
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