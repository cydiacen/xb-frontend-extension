// The module 'vscode' contains the VS Code extensibility API

'use strict';
Object.defineProperty(exports, "__esModule", {
    value: true
});
const vsc = require("vscode");
var { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } = require('vscode');

const fs = require("fs");
const path = require("path");
const temp = `let $lang = {
}
export default $lang`

var set, warningArr;

function translateKeyValue(data, value) {
    let json = data.match(/\{(.|\n|\r\n)*\}/g)[0];
    json = json.slice(1, json.length - 1);
    let valueArr = value.map(i => i.label.trim());
    //生成语言包
    let objArr = json.replace(/\r\n/g, '\n').split('\n');

    objArr.forEach(item => {
        valueArr.forEach((v, i) => {
            if (item.includes(v)) {
                set.add(i);
            }
        })
    })
    valueArr.forEach((v, i) => {
        if (!v.startsWith('\"') && !v.startsWith('\'')) {
            v = `"${v}"`;
        }
        if (![...set].includes(i)) {
            objArr.unshift(`    ${v}:${v},`);
        } else {
            warningArr.push(v);
        }
    })
    return objArr;
}

function modifyFile(_path, value) {
    return new Promise((solve) => {
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

//生成日志文件
function markLog(str) {
    var rOption = {
        flags: 'r',
        encoding: 'utf8',
        mode: 666
    }
    let dir = path.join(__dirname, 'log.txt');
    if (fs.existsSync(dir)) {
        fs.createReadStream(dir, rOption).on('data', data => {
            fs.writeFile(path.join(__dirname + '.txt', '.'), data + new Date().toLocaleDateString() + '\r\n' + str);
        })
    } else {
        fs.writeFile(dir, str);
    }
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

module.exports = function scaningFile() {
    console.log("scaningFile is active!");
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
        reg = /([\'].*?[\u4e00-\u9fa5]+.*?[\'])|([\"].*?[\u4e00-\u9fa5]+.*?[\"])/g
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
                            let placeText = langType.label + `[${isHtml ? `'${item.label}'` : item.label}]`;
                            edit.replace(item.range, isHtml ? `{{::${placeText}}}` : placeText);
                        })
                    })
                    translateLangFile(activeEditor.document.uri, value)
                })

            }
            console.log(33, value);
        })
    } else {
        window.showErrorMessage('Sorry!当前没有需要翻译的文案!')
    }
}
