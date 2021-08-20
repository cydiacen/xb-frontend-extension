"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVueComponent = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class CreateVueComponent {
    constructor() {
        this.createCommands();
    }

    createCommands() {
        vscode.commands.registerCommand('extension.createVue3Component',(uri)=>{
            this.CreateVue3Component(uri)
        } );
    }
    CreateVue3Component(uri){
        vscode.window.showInputBox({placeHolder:'please input component name'}).then(res=>{
            if(res){
                if(res.match(/^.*[A-Z]+.*$/) === null){
                    const filePath = path.join(uri.fsPath, res);
                    //创建文件夹
                    fs.mkdirSync(filePath)
                    fs.writeFileSync(path.join(filePath, 'index.less'), '')
                    fs.writeFileSync(path.join(filePath, 'script.tsx'), `
                    import { defineComponent } from 'vue'

                    export default defineComponent({
                        name: '${res.split('-').map(i=>i.replace(i[0],i[0].toUpperCase())).join('')}',
                        setup() {
                            return {}
                        },
                    })
                    `);
                    this.prettierFiles(path.join(filePath, 'script.tsx'))
                    fs.writeFileSync(path.join(filePath, 'index.vue'), `
                    <template>
                        <div></div>
                    </template>
                    <script lang="tsx" src="./script.tsx"></script>
                    <style lang="less" src="./index.less" scoped></style>
                    
                    `);
                    this.prettierFiles(path.join(filePath, 'index.vue'))
                    vscode.window.showInformationMessage('组件创建成功！')
                }else{
                    vscode.window.showErrorMessage('命名格式不正确，请使用小写横杆间隔命名！')
                }

            }

        })
       
    }
    /** 格式化文件 */
    prettierFiles(file) {
        const prettier = require('prettier')
        const fileInfo = prettier.getFileInfo.sync(file)
        if (fileInfo.ignored) {
            return
        }
        try {
            const input = fs.readFileSync(file, 'utf8')
            const withParserOptions = {
                ...{
                    printWidth: 120,
                    tabWidth: 4,
                    useTabs: true,
                    semi: false,
                    trailingComma: 'all',
                    bracketSpacing: true,
                    jsxBracketSameLine: false,
                    arrowParens: 'avoid',
                    singleQuote: true,
                    endOfLine: 'crlf'
                  },
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
}
exports.CreateVueComponent = CreateVueComponent;
