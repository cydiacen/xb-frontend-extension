"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const ChildrenType = {
	dep: 1,
	script: 2,
	root: 3
}
class DepNodeProvider {
	constructor(workspaceRoot) {
		this.workspaceRoot = workspaceRoot;
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() {
		debugger
		this._onDidChangeTreeData.fire();
	}
	getTreeItem(element) {
		this.getIcon(element);
		this.getContextValue(element);
		return element;
	}
	getContextValue(ele) {
		const values = {
			[ChildrenType.script]: "script",
			[ChildrenType.dep]: "dependency",
			[ChildrenType.root]: "root"
		}
		ele.contextValue = values[ele.type];
	}
	getIcon(ele) {
		const icons = {
			[ChildrenType.dep]: {
				light: path.join(__filename, '..', 'resources', 'light', 'dependency.svg'),
				dark: path.join(__filename, '..', 'resources', 'dark', 'dependency.svg')
			},
			[ChildrenType.script]: {
				light: path.join(__filename, '..', 'resources', 'light', 'string.svg'),
				dark: path.join(__filename, '..', 'resources', 'dark', 'string.svg')
			}
		}
		ele.iconPath = icons[ele.type];
	}
	getChildren(element) {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}
		if (element) {
			switch (element.type) {
				case ChildrenType.dep:
					return Promise.resolve(this.getDepsInPackageJson(path.join(this.workspaceRoot, 'node_modules', element.label, 'package.json')));
				case ChildrenType.script:
					return Promise.resolve(this.getScriptInConfig(element));
				case ChildrenType.root:
					if (element.label === '脚本列表') {
						let obj = vscode.workspace.getConfiguration("xbView").get('scriptMenu');
						return Promise.resolve(this.getScriptInConfig({ nodes: obj }));
					} else if (element.label === 'npm依赖树') {
						const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
						if (this.pathExists(packageJsonPath)) {
							return Promise.resolve(this.getDepsInPackageJson(packageJsonPath));
						}
						else {
							vscode.window.showInformationMessage('Workspace has no package.json');
							return Promise.resolve([]);
						}
					}
					break;
				default:
					break;
			}


		}
		else {
			//这里是首次加载
			let arr = [];
			arr.push(new Dependency('脚本列表', '生成api,枚举,组件', vscode.TreeItemCollapsibleState.Collapsed, ChildrenType.root));
			arr.push(new Dependency('npm依赖树', '查看npm依赖树', vscode.TreeItemCollapsibleState.Collapsed, ChildrenType.root));
			return Promise.resolve(arr);

		}
	}
	getScriptInConfig(ele) {
		const toDep = (item) => {
			if (!item.script) {
				return new Dependency(item.title, item.des, vscode.TreeItemCollapsibleState.Collapsed, ChildrenType.script);
			}
			else {
				return new Dependency(item.title + '   ➤', item.des, vscode.TreeItemCollapsibleState.None, ChildrenType.script, {
					command: 'extension.runScript',
					title: '',
					arguments: [item]
				});
			}
		};
		const scripts = ele.nodes
			? Object.values(ele.nodes).map(node => Object.assign({ nodes: node.nodes }, toDep(node)))
			: [];
		return scripts;
	}
    /**
     * Given the path to package.json, read all its dependencies and devDependencies.
     */
	getDepsInPackageJson(packageJsonPath) {
		if (this.pathExists(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
			const toDep = (moduleName, version) => {
				if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.Collapsed, ChildrenType.dep);
				}
				else {
					return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None, ChildrenType.dep, {
						command: 'extension.openPackageOnNpm',
						title: '',
						arguments: [moduleName]
					});
				}
			};
			const deps = packageJson.dependencies
				? Object.keys(packageJson.dependencies).map(dep => toDep(dep, packageJson.dependencies[dep]))
				: [];
			const devDeps = packageJson.devDependencies
				? Object.keys(packageJson.devDependencies).map(dep => toDep(dep, packageJson.devDependencies[dep]))
				: [];
			return deps.concat(devDeps);
		}
		else {
			return [];
		}
	}
	pathExists(p) {
		try {
			fs.accessSync(p);
		}
		catch (err) {
			return false;
		}
		return true;
	}
}
exports.DepNodeProvider = DepNodeProvider;
class Dependency extends vscode.TreeItem {
	constructor(label, version, collapsibleState, type, command) {
		super(label, collapsibleState);
		this.label = label;
		this.type = type;
		this.version = version;
		this.collapsibleState = collapsibleState;
		this.command = command;
		this.iconPath = {
			light: path.join(__filename, '..', 'resources', 'light', 'dependency.svg'),
			dark: path.join(__filename, '..', 'resources', 'dark', 'dependency.svg')
		};
		this.contextValue = 'dependency';
	}
	get tooltip() {
		return `${this.label}-${this.version}`;
	}
	get description() {
		return this.version;
	}
}
exports.Dependency = Dependency;
//# sourceMappingURL=nodeDependencies.js.map