// @ts-nocheck
/* eslint-disable */

// 获取VSCode API
const vscode = acquireVsCodeApi();

// 状态管理
let currentModels = [];
let editingIndex = -1;
let selectedModelIndices = new Set(); // 存储选中的模型索引

// DOM元素
const baseUrlInput = document.getElementById("baseUrl");
const apiKeyInput = document.getElementById("apiKey");
const saveApiKeyBtn = document.getElementById("saveApiKey");
const testConnectionBtn = document.getElementById("testConnection");
const connectionStatus = document.getElementById("connectionStatus");
const proxyUrlInput = document.getElementById("proxyUrl");
const proxyStrictSSLCheckbox = document.getElementById("proxyStrictSSL");
const proxySupportSelect = document.getElementById("proxySupport");
const saveProxyBtn = document.getElementById("saveProxy");
const proxyStatus = document.getElementById("proxyStatus");
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
const retryEnabledCheckbox = document.getElementById("retryEnabled");
const maxAttemptsInput = document.getElementById("maxAttempts");
const retryIntervalInput = document.getElementById("retryInterval");
const saveRetryBtn = document.getElementById("saveRetry");
const retryStatus = document.getElementById("retryStatus");

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
		case "proxyResult":
			showProxyStatus(message.data);
			break;
		case "confirmDelete":
			// 用户确认删除，执行删除操作
			executeDelete(message.data.index);
			break;
		case "confirmBatchDelete":
			// 用户确认批量删除，执行批量删除操作
			executeBatchDelete(message.data.indices);
			break;
		case "retryResult":
			showRetryStatus(message.data);
			break;
	}
});

// 执行删除操作
function executeDelete(index) {
	console.log("Executing delete for index:", index);
	currentModels.splice(index, 1);

	// 清理选中状态中的该索引
	selectedModelIndices.delete(index);

	// 重新映射选中索引（因为删除后索引会变化）
	const newSelectedIndices = new Set();
	selectedModelIndices.forEach(idx => {
		if (idx > index) {
			newSelectedIndices.add(idx - 1);
		} else if (idx < index) {
			newSelectedIndices.add(idx);
		}
	});
	selectedModelIndices = newSelectedIndices;

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
	proxyUrlInput.value = data.proxyUrl || "";
	proxyStrictSSLCheckbox.checked = data.proxyStrictSSL !== false; // 默认为 true
	proxySupportSelect.value = data.proxySupport || "on";

	// 加载重试配置
	retryEnabledCheckbox.checked = data.retryEnabled !== false; // 默认为 true
	maxAttemptsInput.value = data.maxAttempts || 3;
	retryIntervalInput.value = data.retryInterval || 1000;

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
            <td style="text-align: center;">
                <input type="checkbox" class="model-checkbox" data-index="${index}"
                       ${selectedModelIndices.has(index) ? 'checked' : ''} />
            </td>
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

    // 绑定全选复选框事件
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", toggleSelectAll);
    }

    // 绑定单个复选框事件
    document.querySelectorAll(".model-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
            const index = parseInt(e.target.getAttribute("data-index"));
            toggleModelSelection(index);
        });
    });

    // 更新全选复选框和批量删除按钮状态
    updateSelectAllCheckbox();
    updateBatchDeleteButton();
}

// 全选/取消全选函数
function toggleSelectAll() {
	const selectAllCheckbox = document.getElementById("selectAllCheckbox");
	const isChecked = selectAllCheckbox.checked;

	if (isChecked) {
		// 全选
		currentModels.forEach((_, index) => selectedModelIndices.add(index));
	} else {
		// 取消全选
		selectedModelIndices.clear();
	}

	renderModelsTable();
	updateBatchDeleteButton();
}

// 单个复选框切换函数
function toggleModelSelection(index) {
	if (selectedModelIndices.has(index)) {
		selectedModelIndices.delete(index);
	} else {
		selectedModelIndices.add(index);
	}

	updateSelectAllCheckbox();
	updateBatchDeleteButton();
}

// 更新全选复选框状态
function updateSelectAllCheckbox() {
	const selectAllCheckbox = document.getElementById("selectAllCheckbox");
	if (!selectAllCheckbox) return;

	const totalModels = currentModels.length;
	const selectedCount = selectedModelIndices.size;

	if (selectedCount === 0) {
		selectAllCheckbox.checked = false;
		selectAllCheckbox.indeterminate = false;
	} else if (selectedCount === totalModels) {
		selectAllCheckbox.checked = true;
		selectAllCheckbox.indeterminate = false;
	} else {
		selectAllCheckbox.checked = false;
		selectAllCheckbox.indeterminate = true; // 半选状态
	}
}

// 更新批量删除按钮显示
function updateBatchDeleteButton() {
	const batchDeleteBtn = document.getElementById("batchDeleteBtn");
	if (!batchDeleteBtn) return;

	const selectedCount = selectedModelIndices.size;
	if (selectedCount > 0) {
		batchDeleteBtn.style.display = "inline-flex";
		batchDeleteBtn.textContent = `批量删除 (${selectedCount})`;
	} else {
		batchDeleteBtn.style.display = "none";
	}
}

// 批量删除函数
function batchDeleteModels() {
	if (selectedModelIndices.size === 0) {
		showMessage("请先选择要删除的模型", "warning");
		return;
	}

	// 获取选中的模型信息
	const selectedModels = Array.from(selectedModelIndices)
		.sort((a, b) => a - b)
		.map(index => ({
			index,
			id: currentModels[index].id,
			owned_by: currentModels[index].owned_by
		}));

	// 发送批量删除请求到后端
	vscode.postMessage({
		command: "batchDeleteModels",
		data: { models: selectedModels }
	});
}

// 执行批量删除
function executeBatchDelete(indices) {
	console.log("Executing batch delete for indices:", indices);

	// 按降序排序，从后往前删除，避免索引错乱
	const sortedIndices = [...indices].sort((a, b) => b - a);

	sortedIndices.forEach(index => {
		currentModels.splice(index, 1);
	});

	// 清空选中状态
	selectedModelIndices.clear();

	renderModelsTable();
	updateBatchDeleteButton();

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

// 显示代理保存状态
function showProxyStatus(data) {
	proxyStatus.textContent = data.message;
	proxyStatus.className = `status-message ${data.success ? "success" : "error"}`;
	saveProxyBtn.disabled = false;

	setTimeout(() => {
		proxyStatus.textContent = "";
	}, 3000);
}

// 显示重试保存状态
function showRetryStatus(data) {
	retryStatus.textContent = data.message;
	retryStatus.className = `status-message ${data.success ? "success" : "error"}`;
	saveRetryBtn.disabled = false;

	setTimeout(() => {
		retryStatus.textContent = "";
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

saveProxyBtn.addEventListener("click", () => {
	const proxyUrl = proxyUrlInput.value.trim();
	const proxyStrictSSL = proxyStrictSSLCheckbox.checked;
	const proxySupport = proxySupportSelect.value;

	saveProxyBtn.disabled = true;
	proxyStatus.textContent = "保存中...";
	proxyStatus.className = "status-message";

	vscode.postMessage({
		command: "saveProxy",
		data: {
			proxyUrl,
			proxyStrictSSL,
			proxySupport,
		},
	});
});

// 批量删除按钮事件
const batchDeleteBtn = document.getElementById("batchDeleteBtn");
if (batchDeleteBtn) {
	batchDeleteBtn.addEventListener("click", batchDeleteModels);
}

// 保存重试配置按钮事件
saveRetryBtn.addEventListener("click", () => {
	const retryEnabled = retryEnabledCheckbox.checked;
	const maxAttempts = parseInt(maxAttemptsInput.value) || 3;
	const retryInterval = parseInt(retryIntervalInput.value) || 1000;

	// 前端验证
	if (maxAttempts < 1 || maxAttempts > 10) {
		showMessage("最大重试次数必须在 1-10 之间", "error");
		return;
	}

	if (retryInterval < 100) {
		showMessage("重试间隔必须大于等于 100 毫秒", "error");
		return;
	}

	saveRetryBtn.disabled = true;
	retryStatus.textContent = "保存中...";
	retryStatus.className = "status-message";

	vscode.postMessage({
		command: "saveRetry",
		data: {
			retryEnabled,
			maxAttempts,
			retryInterval,
		},
	});
});
