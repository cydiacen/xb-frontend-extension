"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortIcon = void 0;
//@ts-ignore
const prettier_1 = require("./prettier");
const vscode_1 = require("vscode");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
// const prettier = require('prettier')
// const getFileInfo = {} as any
//  const resolveConfig = {sync:{}as any}
//  const format ={} as any
class PortIcon {
    constructor() {
        this.commands = {
            sync: "port.sync",
            createModel: "port.create"
        };
        this.syncBar = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
        this.createCommands();
        this.syncBar.command = this.commands.sync;
        this.activePort();
        this.emunList = [];
        this.myEnumList = [];
    }
    activePort() {
        this.syncBar.text = "sync";
        this.syncBar.color = "yellow";
        this.syncBar.tooltip = "接口同步";
        this.syncBar.show();
    }
    createCommands() {
        vscode.commands.registerCommand(this.commands.sync, this.sync.bind(this));
        vscode.commands.registerCommand(this.commands.createModel, this.createModel.bind(this));
    }
    transform(currentModel, used) {
        let list = currentModel.split('\r\n\t');
        let data = {};
        if (list.length % 2 !== 1) {
            vscode_1.window.showErrorMessage('出错了！格式不对');
        }
        else {
            for (let i = 1; i < list.length; i = i + 2) {
                let filed = list[i + 1].replace(/\r\n/g, '').replace('}', '').replace('?', '').split(': ');
                let types = filed[1].split('[]');
                let desc = list[i].match(/\/\*+([^*]*?)\*+\//)[1].trim();
                if (['number', 'string', 'boolean', 'object', 'undefined'].includes(types[0])) {
                    data[filed[0]] = {
                        name: filed[0],
                        type: types[0],
                        isArray: types.length === 2,
                        desc: desc
                    };
                }
                else {
                    if (this.emunList.includes(`${types[0]}.ts`)) {
                        this.myEnumList.push(types[0]);
                        data[filed[0]] = {
                            name: filed[0],
                            type: types[0],
                            isEnum: true,
                            isArray: types.length === 2,
                            desc: desc,
                        };
                    }
                    else {
                        if (!used.includes(types[0])) {
                            used.push(types[0]);
                        }
                        data[filed[0]] = {
                            name: filed[0],
                            type: types[0],
                            isArray: types.length === 2,
                            desc: desc,
                            depend: this.transform(this.findInterfaceFile(types[0]), used)
                        };
                    }
                }
            }
            return { data };
        }
    }
    findInterfaceFile(name) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let selection = editor.selection;
        let _targetDirectory = path.resolve(editor.document.uri.fsPath, '../../models');
        let _sourceDirectory = path.resolve(vscode.workspace.workspaceFolders[0].uri.path, './src/client');
        let currentName;
        if (name) {
            currentName = name;
        }
        else {
            currentName = editor.document.getText(selection);
        }
        let currentModel = null;
        if (fs.existsSync(_targetDirectory)) {
            const list = fs.readdirSync(_sourceDirectory);
            list.forEach((controller) => {
                if (controller !== 'Enum') {
                    const types = fs.readdirSync(path.resolve(vscode.workspace.workspaceFolders[0].uri.path, `./src/client/${controller}/Type`));
                    types.forEach((dto) => {
                        if (dto === `${currentName}.ts`) {
                            currentModel = fs.readFileSync(path.resolve(vscode.workspace.workspaceFolders[0].uri.path, `./src/client/${controller}/Type/${dto}`), 'utf8');
                            return;
                        }
                    });
                }
            });
            return currentModel;
        }
        else {
            vscode_1.window.showErrorMessage('出错了！当前目录没有models文件夹');
        }
    }
    createModel() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let selection = editor.selection;
        this.emunList = [];
        this.myEnumList = [];
        let name = editor.document.getText(selection);
        let _targetDirectory = path.resolve(editor.document.uri.fsPath, '../../models');
        let _enumDirectory = path.resolve(vscode.workspace.workspaceFolders[0].uri.path, './src/client/Enum');
        this.emunList = fs.readdirSync(_enumDirectory);
        let currentModel = this.findInterfaceFile();
        let data = this.transform(currentModel, []);
        let context = {
            text: `
        import { ApiProperty } from '@nestjs/swagger'
        ${this.myEnumList.filter((i, idx) => this.myEnumList.indexOf(i) === idx).map((i) => {
                return `import { ${i} } from '@/client/Enum/${i}'`;
            }).join('\r\n')}
        ${this.myEnumList.length ? "import { transformEnumToSwagger } from '@/utils/transform'" : ''}
        `
        };
        //已存在class分支
        const list = fs.readdirSync(_targetDirectory);
        let fileName = name.replace(/(?<=[a-z])([A-Z])/g, '-$1').toLowerCase() + '.ts';
        if (list.includes(fileName)) {
            vscode.window.showInformationMessage('已存在，确定替换吗？', '确定').then(text => {
                if (!text) {
                    return;
                }
                this.createClass(name, data === null || data === void 0 ? void 0 : data.data, context, []);
                const filePath = path.resolve(_targetDirectory, fileName);
                fs.writeFileSync(filePath, context.text);
                this.prettierFiles(filePath);
                editor.edit(builder => {
                    builder.insert(new vscode.Position(selection.end.line, selection.end.character), 'Dto');
                });
            });
        }
        else {
            this.createClass(name, data === null || data === void 0 ? void 0 : data.data, context, []);
            const filePath = path.resolve(_targetDirectory, fileName);
            fs.writeFileSync(filePath, context.text);
            this.prettierFiles(filePath);
            editor.edit(builder => {
                builder.insert(new vscode.Position(0, 0), `import { ${name}Dto } from '../models/${fileName.split('.')[0]}'\r\n`);
                builder.insert(new vscode.Position(selection.end.line, selection.end.character), 'Dto');
            });
        }
    }
    /** 格式化文件 */
    prettierFiles(file) {
        let rootpath = vscode.workspace.rootPath;
        const prettierConfigPath = require.resolve(rootpath + '/.prettierrc.yml');
        const options = prettier_1.resolveConfig.sync(file, {
            config: prettierConfigPath,
        });
        const fileInfo = prettier_1.getFileInfo.sync(file);
        if (fileInfo.ignored) {
            return;
        }
        try {
            const input = fs.readFileSync(file, 'utf8');
            const withParserOptions = Object.assign(Object.assign({}, options), { parser: fileInfo.inferredParser });
            const output = prettier_1.format(input, withParserOptions);
            if (output !== input) {
                fs.writeFileSync(file, output, 'utf8');
            }
        }
        catch (e) {
            console.log('格式化出错了');
        }
    }
    createClass(name, data, context, created) {
        let obj = `export class ${name}Dto {
        ${Object.keys(data).map((key) => {
            let i = data[key];
            if (i.depend && i.type !== name) {
                this.createClass(i.type, i.depend.data, context, created);
            }
            if (i.isEnum) {
                return `
                @ApiProperty({
                    description: '${i.desc}',
                    enum: transformEnumToSwagger(${i.type}),
                    enumName: '${i.type}',
                })
                ${i.name}: ${i.type}`;
            }
            if (i.isArray) {
                const Dto = ['number', 'string', 'boolean', 'object', 'undefined'].includes(i.type) ? '' : 'Dto';
                let typeName = i.type;
                if (!Dto) {
                    typeName = typeName[0].toUpperCase() + typeName.slice(1);
                }
                else {
                    typeName += 'Dto';
                }
                return `
                @ApiProperty({
                    type: ${typeName},
                    description: '${i.desc}',
                    isArray: true,
                })
                ${i.name}: ${i.type}${Dto}[]`;
            }
            else {
                return `
                @ApiProperty({
                    description: '${i.desc}'
                })
                ${i.name}: ${i.type}`;
            }
        }).join(' ')}
    }
    `;
        if (!created.includes(name)) {
            created.push(name);
            context.text += obj;
        }
    }
    sync() {
        let currentTer;
        vscode.window.terminals.every(ter => {
            if (ter.creationOptions.name === 'one-enough-pad') {
                currentTer = ter;
                return false;
            }
            return true;
        });
        if (!currentTer) {
            currentTer = vscode.window.createTerminal('one-enough-pad');
        }
        currentTer.show();
        currentTer.sendText('yarn run api');
    }
    //   public watchLocalFile() {
    //     const lockWatcher = vscode.workspace.createFileSystemWatcher(
    //       path.join(vscode.workspace.rootPath, "auto-port-config.js"),
    //       true,
    //       false,
    //       true
    //     );
    //     let lockDispose = lockWatcher.onDidChange(async () => {
    //       this.activePort();
    //     });
    //     this.dispose = () => {
    //       lockDispose.dispose();
    //     };
    //   }
    // 对象和自由资源。
    dispose() {
        this.syncBar.dispose();
    }
}
exports.PortIcon = PortIcon;
//# sourceMappingURL=port.js.map