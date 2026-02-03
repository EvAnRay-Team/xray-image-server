import { runElysia } from "../apis"
import { defaultTemplate } from "../templates/default"
import { type Config } from "./config"
import {
    initializeRenderService,
    registerTemplate,
    shutdownRenderService
} from "./render-service"

export async function onShutdown() {
    // 关闭服务
    await shutdownRenderService()
}

export async function run(config: Config) {
    // 注册模板
    registerTemplate(defaultTemplate)

    // 初始化渲染服务（Worker 线程池）
    await initializeRenderService(config.worker)

    // 初始化服务端
    runElysia(config)
}

export { defineConfig } from "./config"
export { RenderService, getRenderService } from "./render-service"
export { WorkerPool } from "./worker-pool"
export type { WorkerPoolConfig, PoolStats } from "./worker-types"
