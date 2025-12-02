import * as vscode from "vscode";
import { ConfigPanel } from "./configPanel";
import { ConfigManager } from "./configManager";

/**
 * Activity Bar视图提供器
 */
export class ConfigViewProvider implements vscode.TreeDataProvider<ConfigViewItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ConfigViewItem | undefined | null | void> =
		new vscode.EventEmitter<ConfigViewItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ConfigViewItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly configManager: ConfigManager
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ConfigViewItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ConfigViewItem): Thenable<ConfigViewItem[]> {
		if (element) {
			return Promise.resolve([]);
		}

		const items: ConfigViewItem[] = [
			new ConfigViewItem(
				"打开配置面板",
				"打开可视化配置界面",
				vscode.TreeItemCollapsibleState.None,
				{
					command: "oaicopilot.openConfigPanel",
					title: "打开配置面板",
				}
			),
			new ConfigViewItem(
				"刷新模型列表",
				"重新加载模型配置",
				vscode.TreeItemCollapsibleState.None,
				{
					command: "oaicopilot.refreshModels",
					title: "刷新模型列表",
				}
			),
			new ConfigViewItem(
				"查看文档",
				"打开项目文档",
				vscode.TreeItemCollapsibleState.None,
				{
					command: "oaicopilot.openDocs",
					title: "查看文档",
				}
			),
		];

		return Promise.resolve(items);
	}
}

class ConfigViewItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly tooltip: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.tooltip = tooltip;
		this.command = command;
	}
}
