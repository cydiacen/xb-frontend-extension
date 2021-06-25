// import { window, StatusBarItem, StatusBarAlignment } from "vscode";
const { window, StatusBarItem, StatusBarAlignment } = require('vscode')
// import * as vscode from "vscode";
const vscode = require('vscode')
// import * as path from "path";
const path = require('path')
const fs = require("fs");

const prettier = require('prettier')



class PortIcon {
    // 定义一个状态栏的属性
    syncBar;
    commands = {
        sync: "port.sync",
        createModel: "port.create"
    };
    emunList;
    constructor() {
        this.syncBar = window.createStatusBarItem(StatusBarAlignment.Left);
        this.createCommands();
        this.syncBar.command = this.commands.sync;
        this.activePort();
        this.emunList = [];
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
        let enumList = [];
        if (list.length % 2 !== 1) {
            window.showErrorMessage('出错了！格式不对');
        } else {
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
                } else {
                    if (this.emunList.includes(`${types[0]}.ts`)) {
                        enumList.push(types[0]);
                        data[filed[0]] = {
                            name: filed[0],
                            type: types[0],
                            isEnum: true,
                            isArray: types.length === 2,
                            desc: desc,
                        };
                    } else {
                        if (!used.includes(types[0])) {
                            used.push(types[0]);
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

            }
            return { data, enumList };
        }
    }
    findInterfaceFile(name) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        let selection = editor.selection;
        let _targetDirectory = path.resolve(editor.document.uri.fsPath, '../models');
        let _sourceDirectory = path.resolve(editor.document.uri.fsPath, '../../../client');
        let currentName;
        if (name) {
            currentName = name;
        } else {
            currentName = editor.document.getText(selection);
        }
        let currentModel = null
        if (fs.existsSync(_targetDirectory)) {
            const list = fs.readdirSync(_sourceDirectory);
            list.forEach((controller) => {
                if (controller !== 'Enum') {
                    const types = fs.readdirSync(path.resolve(editor.document.uri.fsPath, `../../../client/${controller}/Type`));
                    types.forEach((dto) => {
                        if (dto === `${currentName}.ts`) {
                            currentModel = fs.readFileSync(path.resolve(editor.document.uri.fsPath, `../../../client/${controller}/Type/${dto}`), 'utf8');
                            return;
                        }
                    });
                }

            });
            return currentModel;
        } else {
            window.showErrorMessage('出错了！当前目录没有models文件夹');
        }
    }
    createModel() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        let selection = editor.selection;

        let name = editor.document.getText(selection);

        let _targetDirectory = path.resolve(editor.document.uri.fsPath, '../models');
        let _enumDirectory = path.resolve(editor.document.uri.fsPath, '../../../client/Enum');
        this.emunList = fs.readdirSync(_enumDirectory);
        let currentModel = this.findInterfaceFile();
        let data = this.transform(currentModel, []);
        let context = {
            text: `
        import { ApiProperty } from '@nestjs/swagger'
        ${data?.enumList.map((i) => {
                return `import { ${i} } from '@/client/Enum/${i}'`;
            }).join('\r\n')}
        ${data?.enumList.length ? "import { transformEnumToSwagger } from '@/utils/transform'" : ''}
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
                this.createClass(name, data?.data, context, []);
                const filePath = path.resolve(_targetDirectory, fileName);
                fs.writeFileSync(filePath, context.text);
                this.prettierFiles(filePath);
                editor.edit(builder => {
                    builder.insert(new vscode.Position(selection.end.line, selection.end.character), 'Dto');
                });
            });
        } else {
            this.createClass(name, data?.data, context, []);
            const filePath = path.resolve(_targetDirectory, fileName);
            fs.writeFileSync(filePath, context.text);
            this.prettierFiles(filePath);
            editor.edit(builder => {
                builder.insert(new vscode.Position(0, 0), `import { ${name}Dto } from './models/${fileName}'\r\n`);
                builder.insert(new vscode.Position(selection.end.line, selection.end.character), 'Dto');
            });
        }



    }
    /** 格式化文件 */
    prettierFiles(file) {
        let rootpath = vscode.workspace.rootPath;
        const prettierConfigPath = require.resolve(rootpath + '/.prettierrc.yml');
        const options = prettier.resolveConfig.sync(file, {
            config: prettierConfigPath,
        })
        const fileInfo = prettier.getFileInfo.sync(file)
        if (fileInfo.ignored) {
            return
        }
        try {
            const input = fs.readFileSync(file, 'utf8')
            const withParserOptions = {
                ...options,
                parser: fileInfo.inferredParser,
            }
            const output = prettier.format(input, withParserOptions)
            if (output !== input) {
                fs.writeFileSync(file, output, 'utf8')
            }
        } catch (e) {
            console.log('格式化出错了')
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
                const Dto = ['number','string','boolean','object','undefined'].includes(i.type)?'':'Dto'
                let typeName = i.type
                if(!Dto){
                    typeName = typeName[0].toUpperCase()+typeName.slice(1)
                }else{
                    typeName+='Dto'
                }
                return `
                @ApiProperty({
                    type: ${typeName},
                    description: '${i.desc}',
                    isArray: true,
                })
                ${i.name}: ${i.type}${Dto}[]`;
            } else {
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
        // program.command('install').action(()=>{
        //     console.log(111)
        // })
        // var process = require('child_process');
        // process.exec(`yarn install`, function(error: any, stdout: any, stderr: any) {
        //     console.log(error, stdout, stderr);

            window.showInformationMessage( "功能待完成");
        // });

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

module.exports.PortIcon = PortIcon