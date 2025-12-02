// @ts-nocheck
/* eslint-disable */

// 获取VSCode API
const vscode = acquireVsCodeApi();

// 状态管理
let currentModels = [];
let editingIndex = -1;

// DOM元素
const baseUrlInput = document.getElementById("baseUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveApiKeyBtn = document.getElementById("saveApiKey");
const testConnectionBtn = document.getElementById("testConnection");
const connectionStatus = document.getElementById("connectionStatus");
const fetchModelsBtn = document.getElementById("fetchModels");
const toggleAddModelBtn = document.getElementById("toggleAddModel");
const modelsTableBody = document.getElementById("modelsTableBody");
const emptyModelsMessage = document.getElementById("emptyModelsMessage");
const modelFormContainer = document.getElementById("modelFormContainer");
const modelFormTitle = document.getElementById("modelFormTitle");
const modelIdInput = document.getElementById("modelId");
const ownedByInput = document.getElementById("ownedBy");
const contextLengthInput = document.getElementById("contextLength");
const maxTokensInput = document.getElementById("maxTokens");
const temperatureInput = document.getElementById("temperature");
const topPInput = document.getElementById("topP");
const saveModelBtn = document.getElementById("saveModel");
const cancelModelBtn = document.getElementById("cancelModel");
const saveAllConfigBtn = document.getElementById("saveAllConfig");
const saveStatus = document.getElementById("saveStatus");

// 初始化
window.addEventListener("load", () => {
	console.log("Webview loaded");
	// 请求加载配置
	vscode.postMessage({ command: "loadConfig" });
	console.log("Sent loadConfig message");
});

// 监听来自Extension的消息
window.addEventListener("message", (event) => {
	const message = event.data;

	switch (message.command) {
		case "configLoaded":
			loadConfig(message.data);
			break;
		case "testConnectionResult":
			showConnectionStatus(message.data);
			break;
		case "fetchModelsResult":
			handleFetchModelsResult(message.data);
			break;
		case "saveResult":
			showSaveStatus(message.data);
			break;
		case "confirmDelete":
			// 用户确认删除，执行删除操作
			executeDelete(message.data.index);
			break;
	}
});

// 执行删除操作
function executeDelete(index) {
	console.log("Executing delete for index:", index);
	currentModels.splice(index, 1);
	renderModelsTable();

	// 自动保存配置
	const baseUrl = baseUrlInput.value.trim();
	if (baseUrl) {
		console.log("Sending saveAllConfig message");
		vscode.postMessage({
			command: "saveAllConfig",
			data: {
				baseUrl,
				models: currentModels,
			},
		});
	}
}

// 加载配置
function loadConfig(data) {
	baseUrlInput.value = data.baseUrl || "";
	apiKeyInput.value = data.apiKey || "";
	currentModels = data.models || [];
	renderModelsTable();
}

// 渲染模型表格
// 在 main.js 中修改此函数
function renderModelsTable() {
    modelsTableBody.innerHTML = "";

    if (currentModels.length === 0) {
        emptyModelsMessage.style.display = "block";
        modelsTable.style.display = "none"; // 如果没数据隐藏表格头
        return;
    }

    emptyModelsMessage.style.display = "none";
    modelsTable.style.display = "table";

    currentModels.forEach((model, index) => {
        const row = document.createElement("tr");
        // 使用新的图标按钮结构
        row.innerHTML = `
            <td><strong style="color: var(--vscode-textLink-foreground);">${escapeHtml(model.id)}</strong></td>
            <td>${escapeHtml(model.owned_by)}</td>
            <td>${model.context_length || 256000}</td>
            <td>${model.max_tokens || 8132}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-icon-only btn-edit" data-index="${index}" title="编辑">
                        <svg class="icon" style="pointer-events: none;" viewBox="0 0 16 16"><path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l.66-1.17 1.17.66-1.83.51zM4.66 12.5l-.99-.57 7.9-7.9.99.57-7.9 7.9zM11.96 3.03l.99.57-.4.4-.99-.57.4-.4z"/></svg>
                    </button>
                    <button class="btn btn-icon-only danger btn-danger" data-index="${index}" title="删除">
                        <svg class="icon" style="pointer-events: none;" viewBox="0 0 16 16"><path d="M11 2H9c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1H5c-.55 0-1 .45-1 1v2h8V4c0-.55-.45-1-1-1zM5 8v6c0 .55.45 1 1 1h4c.55 0 1-.45 1-1V8H5z"/></svg>
                    </button>
                </div>
            </td>
        `;
        modelsTableBody.appendChild(row);
    });

    // 绑定事件逻辑保持不变...
    // 注意：点击SVG可能会导致 e.target 变为 path 元素，
    // 所以建议在 btn-edit 和 btn-danger 的 click 事件中使用 e.currentTarget 或 .closest('button')

    document.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            // 使用 currentTarget 确保获取到的是 button 元素
            const index = parseInt(e.currentTarget.getAttribute("data-index"));
            editModel(index);
        });
    });

    document.querySelectorAll(".btn-danger").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.currentTarget.getAttribute("data-index"));
            deleteModel(index);
        });
    });
}

// 显示连接状态
function showConnectionStatus(data) {
	connectionStatus.textContent = data.message;
	connectionStatus.className = `status-message ${data.success ? "success" : "error"}`;
	testConnectionBtn.disabled = false;
	testConnectionBtn.textContent = "测试连接";
}

// 处理获取模型结果
function handleFetchModelsResult(data) {
	fetchModelsBtn.disabled = false;
	fetchModelsBtn.textContent = "从API获取模型";

	if (!data.success) {
		showMessage(`获取模型失败: ${data.message}`, "error");
		return;
	}

	if (!data.models || data.models.length === 0) {
		showMessage("未获取到任何模型", "warning");
		return;
	}

	// 将获取到的模型添加到当前模型列表（去重）
	const existingIds = new Set(currentModels.map((m) => m.id));
	const newModels = data.models.filter((m) => !existingIds.has(m.id));

	if (newModels.length === 0) {
		showMessage("所有模型已存在于配置中", "info");
		return;
	}

	// 简化模型数据，只保留需要的字段
	const simplifiedModels = newModels.map((m) => ({
		id: m.id,
		owned_by: m.owned_by || "unknown",
		context_length: m.context_length || 256000,
		max_tokens: m.max_tokens || 8132,
		temperature: 0,
		top_p: 1,
	}));

	currentModels = [...currentModels, ...simplifiedModels];
	renderModelsTable();
	showMessage(`成功添加 ${newModels.length} 个模型`, "info");
}

// 显示保存状态
function showSaveStatus(data) {
	saveStatus.textContent = data.message;
	saveStatus.className = `status-message ${data.success ? "success" : "error"}`;
	saveAllConfigBtn.disabled = false;
	saveAllConfigBtn.textContent = "保存所有配置";

	setTimeout(() => {
		saveStatus.textContent = "";
	}, 3000);
}

// 编辑模型
function editModel(index) {
	editingIndex = index;
	const model = currentModels[index];

	modelFormTitle.textContent = "编辑模型";
	modelIdInput.value = model.id;
	ownedByInput.value = model.owned_by;
	contextLengthInput.value = model.context_length || "";
	maxTokensInput.value = model.max_tokens || "";
	temperatureInput.value = model.temperature !== undefined ? model.temperature : "";
	topPInput.value = model.top_p !== undefined ? model.top_p : "";

	modelFormContainer.style.display = "block";
	modelFormContainer.scrollIntoView({ behavior: "smooth" });
}

// 删除模型
function deleteModel(index) {
	console.log("Delete model clicked, index:", index);
	const modelId = currentModels[index].id;
	console.log("Model to delete:", modelId);

	// 发送删除请求到Extension，让Extension显示确认对话框
	vscode.postMessage({
		command: "deleteModel",
		data: { index, modelId },
	});
}

// 切换添加模型表单
function toggleAddModelForm() {
	if (modelFormContainer.style.display === "none") {
		editingIndex = -1;
		modelFormTitle.textContent = "添加模型";
		clearModelForm();
		modelFormContainer.style.display = "block";
		modelFormContainer.scrollIntoView({ behavior: "smooth" });
	} else {
		modelFormContainer.style.display = "none";
	}
}

// 清空模型表单
function clearModelForm() {
	modelIdInput.value = "";
	ownedByInput.value = "";
	contextLengthInput.value = "";
	maxTokensInput.value = "";
	temperatureInput.value = "";
	topPInput.value = "";
}

// 保存模型
function saveModel() {
	const id = modelIdInput.value.trim();
	const ownedBy = ownedByInput.value.trim();

	if (!id || !ownedBy) {
		showMessage("模型ID和提供商为必填项", "error");
		return;
	}

	const model = {
		id,
		owned_by: ownedBy,
	};

	// 添加可选字段
	if (contextLengthInput.value) {
		model.context_length = parseInt(contextLengthInput.value);
	}
	if (maxTokensInput.value) {
		model.max_tokens = parseInt(maxTokensInput.value);
	}
	if (temperatureInput.value !== "") {
		model.temperature = parseFloat(temperatureInput.value);
	}
	if (topPInput.value !== "") {
		model.top_p = parseFloat(topPInput.value);
	}

	if (editingIndex >= 0) {
		// 编辑模式
		currentModels[editingIndex] = model;
	} else {
		// 添加模式
		currentModels.push(model);
	}

	renderModelsTable();
	modelFormContainer.style.display = "none";
	clearModelForm();

	// 自动保存配置
	const baseUrl = baseUrlInput.value.trim();
	if (baseUrl) {
		vscode.postMessage({
			command: "saveAllConfig",
			data: {
				baseUrl,
				models: currentModels,
			},
		});
	}
}

// HTML转义
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

// 显示消息（替代alert）
function showMessage(message, type = "info") {
	vscode.postMessage({
		command: "showMessage",
		data: { message, type },
	});
}

// 事件监听
saveApiKeyBtn.addEventListener("click", () => {
	const apiKey = apiKeyInput.value.trim();
	vscode.postMessage({
		command: "saveApiKey",
		data: { apiKey },
	});
});

testConnectionBtn.addEventListener("click", () => {
	const baseUrl = baseUrlInput.value.trim();
	const apiKey = apiKeyInput.value.trim();

	if (!baseUrl || !apiKey) {
		showMessage("请先填写Base URL和API Key", "warning");
		return;
	}

	testConnectionBtn.disabled = true;
	testConnectionBtn.textContent = "测试中...";
	connectionStatus.textContent = "";

	vscode.postMessage({
		command: "testConnection",
		data: { baseUrl, apiKey },
	});
});

fetchModelsBtn.addEventListener("click", () => {
	const baseUrl = baseUrlInput.value.trim();
	const apiKey = apiKeyInput.value.trim();

	if (!baseUrl || !apiKey) {
		showMessage("请先填写Base URL和API Key", "warning");
		return;
	}

	fetchModelsBtn.disabled = true;
	fetchModelsBtn.textContent = "获取中...";

	vscode.postMessage({
		command: "fetchModels",
		data: { baseUrl, apiKey },
	});
});

toggleAddModelBtn.addEventListener("click", toggleAddModelForm);

saveModelBtn.addEventListener("click", saveModel);

cancelModelBtn.addEventListener("click", () => {
	modelFormContainer.style.display = "none";
	clearModelForm();
});

saveAllConfigBtn.addEventListener("click", () => {
	const baseUrl = baseUrlInput.value.trim();

	if (!baseUrl) {
		showMessage("Base URL不能为空", "error");
		return;
	}

	saveAllConfigBtn.disabled = true;
	saveAllConfigBtn.textContent = "保存中...";
	saveStatus.textContent = "";

	vscode.postMessage({
		command: "saveAllConfig",
		data: {
			baseUrl,
			models: currentModels,
		},
	});
});
