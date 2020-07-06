// The module 'vscode' contains the VS Code extensibility API

'use strict';
Object.defineProperty(exports, "__esModule", {
    value: true
});
const vsc = require("vscode");
var { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace } = require('vscode');

const fs = require("fs");
const path = require("path");
const temp = `let $lang = {
}
export default $lang`

var set, warningArr;
let getter = {
    get isNewSIS() {
        return ['typescriptreact', 'vue', 'typescript'].includes(window.activeTextEditor.document.languageId);
    },
    langReg() {
        return this.isNewSIS ? /\{(.|\n|\r\n)*?\}/g : /\{(.|\n|\r\n)*\}/g;
    }
}
function translateKeyValueForNewSIS(data, value) {

    let valueArr = value.map(i => i.label.trim());
    valueArr = valueArr.filter((i, idx) => valueArr.indexOf(i) === idx)
    let arr = data.match(getter.langReg())
    arr.forEach((res, idx) => {
        if (idx > 1) return;
        res = res.slice(3, res.length - 1);
        //生成语言包
        let objArr = res.replace(/\r\n/g, '\n').split('\n');
        objArr.forEach(item => {
            valueArr.forEach((v, i) => {
                try {
                    if (new Function(`return Object.keys({${item}})[0] `)() === v) {
                        set.add(i);
                    }
                } catch (error) {
                    console.log('error:'+item);
                    console.log(error);
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
        data = data.replace(arr[idx], ['{', ...objArr, '}'].join('\n'));
    });
    let json = data.match(/\{(.|\n|\r\n)*\}/g)[0];
    json = json.slice(1, json.length - 1);
    let resArr = json.replace(/\r\n/g, '\n').split('\n');
    return resArr
}
function translateKeyValue(data, value) {
    if (getter.isNewSIS) {
        return translateKeyValueForNewSIS(data, value);
    }
    let json = data.match(/\{(.|\n|\r\n)*\}/g)[0];
    json = json.slice(1, json.length - 1);
    let valueArr = value.map(i => i.label.trim());
    valueArr = valueArr.filter((i, idx) => valueArr.indexOf(i) === idx)
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
    let files = getter.isNewSIS ? ['../lang.ts'] : ['../lang.cn.js', '../lang.en.js'], proArr = [];
    files.forEach(cur => {
        proArr.push(modifyFile(path.join(file.path.slice(1), cur), value));
    })
    Promise.all(proArr).then(() => {
        if (warningArr.length) {
            window.showWarningMessage('语言包内容已存在:\r\n' + [...new Set(warningArr)].join(','));
        }
    })

}
let map = new Map();
function checkLangKey(key) {
    var rOption = {
        flags: 'r',
        encoding: 'utf8',
        mode: 666
    }
    let uri = window.activeTextEditor.document.uri, keys, _path = uri.path.slice(1);
    if (map.has(_path)) {
        keys = map.get(_path);
    } else {
        let p = path.join(_path, getter.isNewSIS ? '../lang.ts' : '../lang.cn.js');
        let data = fs.readFileSync(p, rOption);
        let obj1 = new Function(`return ${data.match(getter.langReg())[0]}`)();
        if (getter.isNewSIS) {
            let res = fs.readFileSync(path.join(workspace.rootPath, './src/lang/common.js'), rOption);
            let obj2 = new Function(`return ${res.match(getter.langReg())[0]}`)();
            keys = Object.keys(Object.assign(obj1, obj2));
            // window.activeTextEditor
        } else {
            keys = Object.keys(obj1);
        }
        map.set(_path, keys)
    }
    return keys.includes(key.replace(/^['"]|['"]$/g, ''));
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
    if (['html', 'vue'].includes(activeEditor.document.languageId)) {
        reg = /([\u4e00-\u9fa5]+)/g
    } else if (['typescriptreact', 'javascript', 'typescript'].includes(activeEditor.document.languageId)) {
        reg = /([\'].*?[\u4e00-\u9fa5]+.*?[\'])|([\"].*?[\u4e00-\u9fa5]+.*?[\"])/g
    } else {
        window.showErrorMessage('当前文件类型不支持检索!');
        return;
    }
    while (match = reg.exec(text)) {
        //包含$lang的文案不操作
        if (match[0].includes('$lang')) continue;
        var startPos = activeEditor.document.positionAt(match.index);
        var endPos = activeEditor.document.positionAt(match.index + match[0].length);
        let reg;
        if (['typescriptreact', 'typescript', 'vue'].includes(activeEditor.document.languageId)) {
            reg = new RegExp(`(\\$)t\\((\\'|\\")*${match[0]}(\\'|\\")*\\)`, 'g')
        } else {
            reg = new RegExp(`(\\$)*lang\\[(\\'|\\")*${match[0]}(\\'|\\")*\\]`, 'g')
        }
        let lineText = window.activeTextEditor.document.lineAt(startPos.line).text;
        if (reg.test(lineText)) {
            if (checkLangKey(match[0])) {
                continue;
            }
        }
        if (lineText.trim().startsWith('//') || lineText.trim().startsWith('<!--')) continue;
        items.push({
            label: match[0].trim(),
            description: window.activeTextEditor.document.lineAt(startPos.line).text.trim(),
            range: new vsc.Range(startPos, endPos)
        })
    }
    map.clear();
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
                }, {
                    label: '$t'
                }, {
                    label: 'this.$t'
                }]
                window.showQuickPick(pickItem).then(langType => {
                    window.activeTextEditor.edit(edit => {
                        value.forEach(item => {
                            let isHtml = ['html', 'vue'].includes(activeEditor.document.languageId);
                            let addBracket = str => (['typescriptreact', 'typescript', 'vue'].includes(activeEditor.document.languageId) ? `(${str})` : `[${str}]`)
                            let placeText = langType.label + addBracket(`${isHtml ? `'${item.label}'` : item.label}`);
                            if (!item.description.includes(placeText)) {
                                edit.replace(item.range, isHtml ? `{{${placeText}}}` : placeText);
                            }
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
