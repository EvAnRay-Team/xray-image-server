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
import { registerRenderPost } from "../apis/render.post"
import { getVersion } from "./utils"
import { loggingMiddleware } from "../middlewares/logging.middleware"
import getPort from "get-port"

export async function run(config: Config) {
    // 创建 Logger
    const logger = createLoggerWithConfig(config.debug, config.logger)
    setLogger(logger)

    logger.info(`starting xray-image-server ${await getVersion()}...`)
    logger.debug("debug mode: " + config.debug)
    logger.debug("config: " + JSON.stringify(config, null, 0))

    // 覆写环境变量中的数据库URL
    if (config.db?.url) {
        process.env.DATABASE_URL = config.db.url
    }

    // 检测端口的可用性
    const port = await getPort({ port: config.port })
    if (port !== config.port) {
        logger.warn(
            `port ${config.port} is already in use, using ${port} instead`
        )
        config.port = port
    }
    // 注册模板
    const templates = [defaultTemplate]
    registerTemplates(...templates)
    logger.info(`${templates.length} templates registered`)

    // 初始化渲染服务（Worker 线程池）
    await initializeRenderService(config.worker)
    logger.info("render service initialized")

    // 初始化服务端
    const app = new Elysia()

    // 添加日志中间件
    app.use(loggingMiddleware())

    // 注册各个端点
    registerPingGet(app)
    registerRenderPost(app)

    // 启动服务
    const server = app.listen(config.port!)
    logger.info(`server listening on port ${config.port}`)

    // 设置优雅关闭信号处理器
    let isShuttingDown = false
    const shutdownTimeout = 30000 // 30秒超时

    const shutdownHandler = async (signal: string) => {
        if (isShuttingDown) {
            logger.warn(
                `Received ${signal}, but shutdown is already in progress`
            )
            return
        }

        isShuttingDown = true
        console.log("")
        logger.info(`Received ${signal}, starting shutdown...`)

        // 设置强制退出超时
        const forceExitTimer = setTimeout(() => {
            logger.error(
                `graceful shutdown timeout (${shutdownTimeout}ms), forcing exit`
            )
            process.exit(1)
        }, shutdownTimeout)

        try {
            // 先停止接收新连接
            await server.stop()
            logger.info("http server shutdown completed")

            // 执行自定义关闭逻辑
            await shutdownRenderService()
            logger.info("render service shutdown completed")

            // 清除强制退出定时器
            clearTimeout(forceExitTimer)

            logger.info("👋 goodbye!")
            process.exit(0)
        } catch (error) {
            logger.error(
                `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`
            )
            clearTimeout(forceExitTimer)
            process.exit(1)
        }
    }

    // 注册信号处理器
    process.on("SIGINT", () => shutdownHandler("SIGINT"))
    process.on("SIGTERM", () => shutdownHandler("SIGTERM"))

    // 处理未捕获的异常
    process.on("uncaughtException", (error) => {
        logger.error(`Uncaught exception: ${error.message}`, {
            stack: error.stack
        })
        shutdownHandler("uncaughtException")
    })

    process.on("unhandledRejection", (reason, promise) => {
        logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`)
        shutdownHandler("unhandledRejection")
    })
}

export { defineConfig } from "./config"
export { RenderService, getRenderService } from "./render-service"
export { WorkerPool } from "./worker-pool"
export type { WorkerPoolConfig, PoolStats } from "./worker-types"
