"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVueComponent = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
//@ts-ignore
const prettier_1 = require("./prettier")
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
}
exports.CreateVueComponent = CreateVueComponent;
