import * as vscode from "vscode";
import type { HFModelItem } from "../types";

/**
 * 配置管理器 - 封装配置读写逻辑
 */
export class ConfigManager {
	constructor(
		private readonly secrets: vscode.SecretStorage,
		private readonly userAgent: string
	) {}

	/**
	 * 获取Base URL配置
	 */
	getBaseUrl(): string {
		const config = vscode.workspace.getConfiguration();
		return config.get<string>("oaicopilot.baseUrl", "https://router.huggingface.co/v1");
	}

	/**
	 * 设置Base URL配置
	 */
	async setBaseUrl(baseUrl: string): Promise<void> {
		const config = vscode.workspace.getConfiguration();
		await config.update("oaicopilot.baseUrl", baseUrl, vscode.ConfigurationTarget.Global);
	}

	/**
	 * 获取API Key
	 */
	async getApiKey(): Promise<string | undefined> {
		return await this.secrets.get("oaicopilot.apiKey");
	}

	/**
	 * 设置API Key
	 */
	async setApiKey(apiKey: string): Promise<void> {
		if (!apiKey.trim()) {
			await this.secrets.delete("oaicopilot.apiKey");
		} else {
			await this.secrets.store("oaicopilot.apiKey", apiKey.trim());
		}
	}

	/**
	 * 获取已配置的模型列表
	 */
	getModels(): HFModelItem[] {
		const config = vscode.workspace.getConfiguration();
		return config.get<HFModelItem[]>("oaicopilot.models", []);
	}

	/**
	 * 设置模型列表
	 */
	async setModels(models: HFModelItem[]): Promise<void> {
		const config = vscode.workspace.getConfiguration();
		await config.update("oaicopilot.models", models, vscode.ConfigurationTarget.Global);
	}

	/**
	 * 测试连接 - 验证Base URL和API Key是否有效
	 */
	async testConnection(baseUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
		try {
			if (!baseUrl || !baseUrl.startsWith("http")) {
				return { success: false, message: "无效的Base URL" };
			}

			if (!apiKey || !apiKey.trim()) {
				return { success: false, message: "API Key不能为空" };
			}

			const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"User-Agent": this.userAgent,
				},
			});

			if (!resp.ok) {
				let errorText = "";
				try {
					errorText = await resp.text();
				} catch (e) {
					// ignore
				}
				return {
					success: false,
					message: `连接失败: ${resp.status} ${resp.statusText}${errorText ? `\n${errorText}` : ""}`,
				};
			}

			return { success: true, message: "连接成功！" };
		} catch (error) {
			return {
				success: false,
				message: `连接错误: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * 从API获取模型列表
	 */
	async fetchModelsFromApi(
		baseUrl: string,
		apiKey: string
	): Promise<{ success: boolean; models?: HFModelItem[]; message?: string }> {
		try {
			if (!baseUrl || !baseUrl.startsWith("http")) {
				return { success: false, message: "无效的Base URL" };
			}

			if (!apiKey || !apiKey.trim()) {
				return { success: false, message: "API Key不能为空" };
			}

			const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"User-Agent": this.userAgent,
				},
			});

			if (!resp.ok) {
				let errorText = "";
				try {
					errorText = await resp.text();
				} catch (e) {
					// ignore
				}
				return {
					success: false,
					message: `获取模型失败: ${resp.status} ${resp.statusText}${errorText ? `\n${errorText}` : ""}`,
				};
			}

			const data = (await resp.json()) as { data?: HFModelItem[] };
			const models = data.data ?? [];

			return { success: true, models };
		} catch (error) {
			return {
				success: false,
				message: `获取模型错误: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
}
