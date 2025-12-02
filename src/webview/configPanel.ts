import * as vscode from "vscode";
import { ConfigManager } from "./configManager";

/**
 * Webview面板管理器
 */
export class ConfigPanel {
	public static currentPanel: ConfigPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private readonly _configManager: ConfigManager;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, configManager: ConfigManager) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._configManager = configManager;

		// 设置Webview内容
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		// 监听面板关闭事件
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// 处理来自Webview的消息
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				await this._handleMessage(message);
			},
			null,
			this._disposables
		);
	}

	/**
	 * 创建或显示配置面板
	 */
	public static createOrShow(extensionUri: vscode.Uri, configManager: ConfigManager) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// 如果面板已存在，则显示它
		if (ConfigPanel.currentPanel) {
			ConfigPanel.currentPanel._panel.reveal(column);
			// 重新加载配置
			ConfigPanel.currentPanel._loadConfig();
			return;
		}

		// 创建新面板
		const panel = vscode.window.createWebviewPanel(
			"oaicopilotConfig",
			"OAI Copilot 配置",
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview", "ui")],
				retainContextWhenHidden: true,
			}
		);

		ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri, configManager);
		ConfigPanel.currentPanel._loadConfig();
	}

	/**
	 * 释放资源
	 */
	public dispose() {
		ConfigPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	/**
	 * 加载配置并发送到Webview
	 */
	private async _loadConfig() {
		const baseUrl = this._configManager.getBaseUrl();
		const apiKey = await this._configManager.getApiKey();
		const models = this._configManager.getModels();

		this._panel.webview.postMessage({
			command: "configLoaded",
			data: {
				baseUrl,
				apiKey: apiKey || "",
				models,
			},
		});
	}

	/**
	 * 处理来自Webview的消息
	 */
	private async _handleMessage(message: any) {
		switch (message.command) {
			case "loadConfig":
				await this._loadConfig();
				break;

			case "saveApiKey":
				await this._configManager.setApiKey(message.data.apiKey);
				vscode.window.showInformationMessage("API Key已保存");
				break;

			case "testConnection":
				const testResult = await this._configManager.testConnection(message.data.baseUrl, message.data.apiKey);
				this._panel.webview.postMessage({
					command: "testConnectionResult",
					data: testResult,
				});
				break;

			case "fetchModels":
				const fetchResult = await this._configManager.fetchModelsFromApi(
					message.data.baseUrl,
					message.data.apiKey
				);
				this._panel.webview.postMessage({
					command: "fetchModelsResult",
					data: fetchResult,
				});
				break;

			case "deleteModel":
				// 显示确认对话框
				const confirmed = await vscode.window.showWarningMessage(
					`确定要删除模型 "${message.data.modelId}" 吗？`,
					{ modal: true },
					"删除"
				);

				if (confirmed === "删除") {
					// 通知Webview执行删除
					this._panel.webview.postMessage({
						command: "confirmDelete",
						data: { index: message.data.index },
					});
				}
				break;

			case "showMessage":
				// 显示消息通知
				const { message: msg, type } = message.data;
				switch (type) {
					case "error":
						vscode.window.showErrorMessage(msg);
						break;
					case "warning":
						vscode.window.showWarningMessage(msg);
						break;
					case "info":
					default:
						vscode.window.showInformationMessage(msg);
						break;
				}
				break;

			case "saveAllConfig":
				try {
					await this._configManager.setBaseUrl(message.data.baseUrl);
					await this._configManager.setModels(message.data.models);
					this._panel.webview.postMessage({
						command: "saveResult",
						data: { success: true, message: "配置已保存成功！" },
					});
					vscode.window.showInformationMessage("配置已保存成功！");
				} catch (error) {
					this._panel.webview.postMessage({
						command: "saveResult",
						data: {
							success: false,
							message: `保存失败: ${error instanceof Error ? error.message : String(error)}`,
						},
					});
				}
				break;
		}
	}

	/**
	 * 生成Webview的HTML内容
	 */
	private _getHtmlForWebview(webview: vscode.Webview): string {
		// 获取资源URI - 从out目录读取（打包后的位置）
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "out", "webview", "ui", "main.js")
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "out", "webview", "ui", "style.css")
		);

		// 生成nonce用于CSP
		const nonce = getNonce();

		// 直接生成HTML，不读取文件
		return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>OAI Compatible Copilot 配置</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div class="container">
        <h1>OAI Compatible Copilot 配置</h1>

        <!-- 基础配置区 -->
        <section class="config-section">
            <h2>基础配置</h2>
            <div class="form-group">
                <label for="baseUrl">Base URL:</label>
                <input type="text" id="baseUrl" placeholder="https://api-inference.xxx/v1" />
            </div>
            <div class="form-group">
                <label for="apiKey">API Key:</label>
                <input type="password" id="apiKey" placeholder="输入API Key" />
            </div>
            <div class="form-group" style="display: flex; gap: 10px; align-items: center;">
                <button id="saveApiKey" class="btn btn-primary">保存</button>
                <button id="testConnection" class="btn btn-secondary">测试连接</button>
                <span id="connectionStatus" class="status-message"></span>
            </div>
        </section>

        <!-- 模型管理区 -->
        <section class="config-section">
            <h2>模型管理</h2>
            <div class="form-group">
                <button id="fetchModels" class="btn btn-primary">从API获取模型</button>
                <button id="toggleAddModel" class="btn btn-secondary">手动添加模型</button>
            </div>

            <!-- 已配置模型列表 -->
            <div class="models-list">
                <h3>已配置模型</h3>
                <div id="modelsTableContainer">
                    <table id="modelsTable">
                        <thead>
                            <tr>
                                <th>模型ID</th>
                                <th>提供商</th>
                                <th>上下文长度</th>
                                <th>最大Token</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="modelsTableBody">
                            <!-- 动态填充 -->
                        </tbody>
                    </table>
                    <div id="emptyModelsMessage" class="empty-message" style="display: none;">
                        暂无配置的模型，请从API获取或手动添加
                    </div>
                </div>
            </div>

            <!-- 添加/编辑模型表单 -->
            <div id="modelFormContainer" class="model-form" style="display: none;">
                <h3 id="modelFormTitle">添加模型</h3>
                <div class="form-group">
                    <label for="modelId">模型ID: <span class="required">*</span></label>
                    <input type="text" id="modelId" placeholder="例如: Qwen3-Coder-480B-A35B-Instruct" required />
                </div>
                <div class="form-group">
                    <label for="ownedBy">提供商: <span class="required">*</span></label>
                    <input type="text" id="ownedBy" placeholder="例如: zai" required />
                </div>
                <div class="form-group">
                    <label for="contextLength">上下文长度:</label>
                    <input type="number" id="contextLength" placeholder="默认: 256000" min="1000" />
                </div>
                <div class="form-group">
                    <label for="maxTokens">最大Token:</label>
                    <input type="number" id="maxTokens" placeholder="默认: 8132" min="1" />
                </div>
                <div class="form-group">
                    <label for="temperature">Temperature:</label>
                    <input type="number" id="temperature" placeholder="默认: 0" min="0" max="2" step="0.1" />
                </div>
                <div class="form-group">
                    <label for="topP">Top P:</label>
                    <input type="number" id="topP" placeholder="默认: 1" min="0" max="1" step="0.1" />
                </div>
                <div class="form-actions">
                    <button id="saveModel" class="btn btn-primary">保存模型</button>
                    <button id="cancelModel" class="btn btn-secondary">取消</button>
                </div>
            </div>
        </section>

        <!-- 保存所有配置 -->
        <section class="config-section">
            <button id="saveAllConfig" class="btn btn-success">保存所有配置</button>
            <span id="saveStatus" class="status-message"></span>
        </section>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
