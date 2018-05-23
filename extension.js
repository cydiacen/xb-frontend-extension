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

const temp = `let $lang = {
}
export default $lang`

var set, warningArr;

function translateKeyValue(data, value) {
    let json = data.match(/\{(.|\n|\r\n)*\}/g)[0];
    json = json.slice(1, json.length - 1);
    let valueArr = value.map(i => i.label.trim());
    //生成中文语言包
    let objArr = json.replace(/\r\n/g, '\n').split('\n');

    objArr.forEach(item => {
        valueArr.forEach((v, i) => {
            if (item.includes(v)) {
                set.add(i);
            }
        })
    })
    valueArr.forEach((v, i) => {
        if (![...set].includes(i)) {
            objArr.push(`    ${v}:${v},`);
        } else {
            warningArr.push(v);
        }
    })

    return objArr;
}

function modifyFile(_path, value) {
    return new Promise((solve, reject) => {
        set = new Set();
        warningArr = [];
        let isExists = fs.existsSync(_path);
        if (isExists) {
            var rOption = {
                flags: 'r',
                encoding: 'utf8',
                mode: 666
            }
            var fileReadStream = fs.createReadStream(_path, rOption);
            // var fileWriteStream = fs.createWriteStream(path.join(_path, '../lang.cn.js'), wOption);
            fileReadStream.on('data', function (data) {
                // let json =JSON.parse(data.match(/{[^}]*}/g)[0]);
                fs.writeFile(_path, data.replace(/\{(.|\n|\r\n)*\}/g, "{\r\n" + translateKeyValue(data, value).filter(i => i).join('\r\n') + "\r\n}"), (err) => {
                    if (err) throw err;
                });
                solve();
            });
        } else {
            fs.writeFile(_path, temp.replace(/\{(.|\n|\r\n)*\}/g, "{\r\n" + translateKeyValue(temp, value).filter(i => i).join('\r\n') + "\r\n}"), (err) => {
                if (err) {
                    console.log(err);
                    throw err
                };
            })
            solve();
        }
    })


}

function translateLangFile(file, value) {
    Promise.all([modifyFile(path.join(file.path.slice(1), '../lang.cn.js'), value),
    modifyFile(path.join(file.path.slice(1), '../lang.en.js'), value)
    ]).then(() => {
        if (warningArr.length) {
            window.showWarningMessage('语言包内容已存在:\r\n' + [...new Set(warningArr)].join(','));
        }
    })

}

function activate(context) {
    // vsc.window.showInformationMessage('欢迎使用One Enough！')
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let wordCounter = new WordCount();
    let controller = new WordCounterController(wordCounter);
    //TODO:123
    commands.registerCommand('extension.scaningFile', () => {
        // window.showInformationMessage('extension.scaningDic!');
        var items = [];
        let activeEditor = window.activeTextEditor;
        if (!activeEditor || !activeEditor.document) {
            return;
        }
        var text = activeEditor.document.getText();
        var match, reg;
        if (activeEditor.document.languageId == 'html') {
            reg = /([\u4e00-\u9fa5]+)/g
        } else if (activeEditor.document.languageId == 'javascript') {
            reg = /([\'\"].*[\u4e00-\u9fa5]+.*[\'\"])/g
        } else {
            window.showErrorMessage('请在js文件或者html文件下执行此命令!');
            return;
        }
        while (match = reg.exec(text)) {
            //包含$lang的文案不操作
            if (match[0].includes('$lang')) continue;
            var startPos = activeEditor.document.positionAt(match.index);
            var endPos = activeEditor.document.positionAt(match.index + match[0].length);
            let reg = new RegExp(`(\\$)*lang\\[(\\'|\\")*${match[0]}(\\'|\\")*\\]`, 'g')
            let lineText = window.activeTextEditor.document.lineAt(startPos.line).text;
            if (reg.test(lineText)) continue;
            if (lineText.trim().startsWith('//') || lineText.trim().startsWith('<!--')) continue;
            items.push({
                label: match[0].trim(),
                description: window.activeTextEditor.document.lineAt(startPos.line).text.trim(),
                range: new vsc.Range(startPos, endPos)
            })
        }
        if (items.length) {
            window.showQuickPick(items, {
                onDidSelectItem: (value) => {
                    window.activeTextEditor.revealRange(value.range, 1);
                    let pos = new vsc.Position(value.range.start.line, value.range.end.character);
                    let moveNum = value.range.start.line - window.activeTextEditor.selection.anchor.line;
                    vsc.commands.executeCommand('cursorMove', {
                        to: 'down',
                        value: moveNum,
                        by: 'line'
                    })
                },
                placeHolder: '选择需要转换的文案 可用方向键+空格选择',
                canPickMany: true,
                ignoreFocusOut: true
            }).then(function (value) {
                if (value) {
                    let pickItem = [{
                        label: 'this.$lang'
                    }, {
                        label: '$lang'
                    }, {
                        label: '$scope.$lang'
                    }, {
                        label: '$ctrl.$lang'
                    }]
                    window.showQuickPick(pickItem).then(langType => {
                        window.activeTextEditor.edit(edit => {
                            value.forEach(item => {
                                let isHtml = activeEditor.document.languageId == 'html';
                                let placeText = langType.label + `[${isHtml ? `"${item.label}"` : item.label}]`;
                                edit.replace(item.range, isHtml ? `{{${placeText}}}` : placeText);
                            })
                        })
                        translateLangFile(activeEditor.document.uri, value)
                    })

                }
                console.log(33, value);
            }).catch(err => {
                console.log(err);
            });
        } else {
            window.showErrorMessage('Sorry!当前没有需要翻译的文案!')
        }

        // window.showTextDocument(window.activeTextEditor.document,)

    })
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