import type {
    WorkerRequestMessage,
    WorkerResponseMessage
} from "./worker-types"

/* 
Worker 脚本定义
*/

// 声明 Worker 全局作用域
declare const self: Worker

// 存储已加载的模板实例
const templateRegistry = new Map<string, any>()

/**
 * 动态加载模板
 */
async function loadTemplate(templateName: string) {
    if (templateRegistry.has(templateName)) {
        return templateRegistry.get(templateName)
    }

    try {
        // 动态导入模板文件
        const module = await import(`../templates/${templateName}.tsx`)
        const template = module[`${templateName}Template`]

        if (!template) {
            throw new Error(
                `Template export "${templateName}Template" not found in template/${templateName}.tsx`
            )
        }

        templateRegistry.set(templateName, template)
        return template
    } catch (error) {
        throw new Error(
            `Failed to load template "${templateName}": ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * 执行渲染任务
 */
async function handleRenderTask(message: WorkerRequestMessage) {
    const startTime = Date.now()

    try {
        // 加载模板
        const template = await loadTemplate(message.templateName)

        // 执行渲染
        const buffer = await template.render(message.input)

        // 将 Buffer 转换为 ArrayBuffer 以便在线程间传递
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        )

        // 发送成功响应
        const response: WorkerResponseMessage = {
            type: "success",
            taskId: message.taskId,
            buffer: arrayBuffer,
            duration: Date.now() - startTime
        }

        self.postMessage(response, [arrayBuffer]) // 使用 transferable 优化性能
    } catch (error) {
        // 发送错误响应
        const response: WorkerResponseMessage = {
            type: "error",
            taskId: message.taskId,
            error: error instanceof Error ? error.message : String(error)
        }

        self.postMessage(response)
    }
}

/**
 * 监听主线程消息
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
    const message = event.data

    switch (message.type) {
        case "render":
            await handleRenderTask(message)
            break
        default:
            console.warn(`[Worker] Unknown message type:`, message)
    }
}

/**
 * 错误处理
 */
self.onerror = (error: ErrorEvent) => {
    console.error(`[Worker] Uncaught error:`, error)
}

/**
 * 发送就绪信号
 */
const readyMessage: WorkerResponseMessage = { type: "ready" }
self.postMessage(readyMessage)
