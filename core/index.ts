import Elysia from "elysia"
import { defaultTemplate } from "../templates/default"
import { type Config } from "./config"
import { createLoggerWithConfig, setLogger } from "./logger"
import {
    initializeRenderService,
    registerTemplates,
    shutdownRenderService
} from "./render-service"
import { registerPingGet } from "../apis/ping.get"
import { registerRenderGet } from "../apis/render.get"
import { getVersion } from "./utils"

export async function onShutdown() {
    // 关闭服务
    await shutdownRenderService()
}

export async function run(config: Config) {
    // 创建 Logger
    const logger = createLoggerWithConfig(config.debug, config.logger)
    setLogger(logger)

    logger.info(`starting xray-image-server ${await getVersion()}...`)
    logger.debug("debug mode: " + config.debug)
    logger.debug("config: " + JSON.stringify(config, null, 0))

    // 注册模板
    registerTemplates(defaultTemplate)

    // 初始化渲染服务（Worker 线程池）
    await initializeRenderService(config.worker)

    // 初始化服务端
    const app = new Elysia()

    // 注册各个端点
    registerPingGet(app)
    registerRenderGet(app)

    // 启动服务
    app.listen(config.port!)
}

export { defineConfig } from "./config"
export { RenderService, getRenderService } from "./render-service"
export { WorkerPool } from "./worker-pool"
export type { WorkerPoolConfig, PoolStats } from "./worker-types"
