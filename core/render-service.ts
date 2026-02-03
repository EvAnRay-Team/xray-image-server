import type { RenderTemplate } from "./render-template"
import type { WorkerPoolConfig, PoolStats } from "./worker-types"
import {
    WorkerPool,
    getGlobalWorkerPool,
    initializeGlobalWorkerPool,
    shutdownGlobalWorkerPool
} from "./worker-pool"

/**
 * 模板注册表
 */
const templateRegistry = new Map<string, RenderTemplate<any>>()

/**
 * 渲染服务配置
 */
export interface RenderServiceConfig extends WorkerPoolConfig {
    /** 是否自动初始化 */
    autoInitialize?: boolean
}

/**
 * 渲染服务类
 */
export class RenderService {
    private pool: WorkerPool | null = null
    private initialized = false
    private config: RenderServiceConfig

    constructor(config: RenderServiceConfig = {}) {
        this.config = { autoInitialize: true, ...config }
    }

    /**
     * 初始化服务
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return
        }

        this.pool = await initializeGlobalWorkerPool(this.config)
        this.initialized = true
    }

    /**
     * 注册模板
     */
    registerTemplate<T extends object>(template: RenderTemplate<T>): void {
        templateRegistry.set(template.name, template)
    }

    /**
     * 注册多个模板
     */
    registerTemplates(...templates: RenderTemplate<any>[]): void {
        for (const template of templates) {
            this.registerTemplate(template)
        }
    }

    /**
     * 获取已注册的模板
     */
    getTemplate<T extends object>(name: string): RenderTemplate<T> | undefined {
        return templateRegistry.get(name)
    }

    /**
     * 检查是否已注册指定名称的模板
     */
    hasTemplate(name: string): boolean {
        return templateRegistry.has(name)
    }

    /**
     * 使用 Worker 线程池渲染图片
     */
    async render<T extends object>(
        templateName: string,
        input: T
    ): Promise<Buffer> {
        // 自动初始化
        if (!this.initialized && this.config.autoInitialize) {
            await this.initialize()
        }

        if (!this.pool) {
            throw new Error("RenderService not initialized")
        }

        // 检查模板是否已注册
        const template = templateRegistry.get(templateName)
        if (!template) {
            throw new Error(`Template "${templateName}" not registered`)
        }

        // 验证输入数据
        if (template.inputSchema) {
            try {
                template.inputSchema.parse(input)
            } catch (error) {
                throw new Error(
                    `Input validation failed: ${error instanceof Error ? error.message : String(error)}`
                )
            }
        }

        // 使用 Worker 线程池渲染
        return await this.pool.render(
            templateName,
            input as Record<string, any>
        )
    }

    /**
     * 直接渲染（不使用 Worker 线程池，在主线程执行）
     */
    async renderDirect<T extends object>(
        templateName: string,
        input: T
    ): Promise<Buffer> {
        const template = templateRegistry.get(templateName)
        if (!template) {
            throw new Error(`Template "${templateName}" not registered`)
        }

        return await template.render(input as any)
    }

    /**
     * 获取统计信息
     */
    getStats(): PoolStats | null {
        return this.pool?.getStats() ?? null
    }

    /**
     * 关闭服务
     */
    async shutdown(): Promise<void> {
        if (this.pool) {
            await shutdownGlobalWorkerPool()
            this.pool = null
            this.initialized = false
        }
    }
}

/**
 * 全局渲染服务实例
 */
let globalService: RenderService | null = null

/**
 * 获取全局渲染服务
 */
export function getRenderService(config?: RenderServiceConfig): RenderService {
    if (!globalService) {
        globalService = new RenderService(config)
    }
    return globalService
}

/**
 * 便捷函数：渲染图片
 */
export async function render<T extends object>(
    templateName: string,
    input: T
): Promise<Buffer> {
    const service = getRenderService()
    return await service.render(templateName, input)
}

/**
 * 便捷函数：直接渲染（主线程）
 */
export async function renderDirect<T extends object>(
    templateName: string,
    input: T
): Promise<Buffer> {
    const service = getRenderService()
    return await service.renderDirect(templateName, input)
}

/**
 * 便捷函数：注册模板
 */
export function registerTemplate<T extends object>(
    template: RenderTemplate<T>
): void {
    const service = getRenderService()
    service.registerTemplate(template)
}

/**
 * 便捷函数：注册多个模板
 */
export function registerTemplates(...templates: RenderTemplate<any>[]): void {
    const service = getRenderService()
    service.registerTemplates(...templates)
}

/**
 * 便捷函数：初始化服务
 */
export async function initializeRenderService(
    config?: RenderServiceConfig
): Promise<RenderService> {
    const service = getRenderService(config)
    await service.initialize()
    return service
}

/**
 * 便捷函数：获取统计信息
 */
export function getRenderStats(): PoolStats | null {
    return globalService?.getStats() ?? null
}

/**
 * 便捷函数：关闭服务
 */
export async function shutdownRenderService(): Promise<void> {
    if (globalService) {
        await globalService.shutdown()
        globalService = null
    }
}
