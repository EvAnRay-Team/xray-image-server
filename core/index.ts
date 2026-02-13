import Elysia from "elysia"
import { type Config } from "./config"
import { createLoggerWithConfig, setLogger } from "./logger"
import {
    initializeRenderService,
    registerTemplates,
    shutdownRenderService,
    getRenderService
} from "./render-service"
import { registerPingGet } from "../apis/ping.get"
import { registerRenderPost } from "../apis/render.post"
import { getVersion } from "./utils"
import { loggingMiddleware } from "../middlewares/logging.middleware"
import getPort from "get-port"
import { readdir } from "fs/promises"
import { join, extname } from "path"
import type { Logger } from "winston"
import { AssetsManager } from "./asset"

/**
 * 动态扫描并加载 templates 目录下的所有模板
 * @returns 返回所有成功加载的模板数组
 */
export async function loadTemplatesFromDirectory(
    logger: Logger
): Promise<any[]> {
    const templates: any[] = []
    const templatesDir = join(process.cwd(), "templates")

    try {
        // 读取 templates 目录下的所有文件
        const files = await readdir(templatesDir)

        // 过滤出 .tsx 文件
        const templateFiles = files.filter((file) => extname(file) === ".tsx")

        // 动态导入每个模板文件
        for (const file of templateFiles) {
            const templateName = file.replace(".tsx", "")

            try {
                // 动态导入模板文件
                const module = await import(join("../templates", file))

                // 按照约定查找模板导出：${templateName}Template
                const templateExportName = `${templateName}Template`
                const template = module[templateExportName]

                if (template) {
                    logger.debug(`found template ${templateName}`)
                    templates.push(template)
                } else {
                    logger.warn(
                        `warning: template export "${templateExportName}" not found in ${file}`
                    )
                }
            } catch (error) {
                logger.error(`failed to load template from ${file}:`, error)
            }
        }
    } catch (error) {
        logger.error("failed to read templates directory:", error)
    }

    return templates
}

export async function run(config: Config) {
    // 创建 Logger
    const logger = createLoggerWithConfig(config.debug, config.logger)
    setLogger(logger)

    logger.info(`starting xray-image-server ${await getVersion()}...`)
    logger.debug("debug mode: " + config.debug)
    // logger.debug("config: " + JSON.stringify(config, null, 0))

    // 初始化资源管理器

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
    // 动态加载并注册模板
    const templates = await loadTemplatesFromDirectory(logger)
    registerTemplates(...templates)
    logger.info(`${templates.length} templates registered)`)
    
    // 打印已加载的模板列表
    const registeredTemplates = getRenderService().getAllTemplates()
    if (registeredTemplates.length > 0) {
        logger.info("已加载的模板列表:")
        registeredTemplates.forEach((template) => {
            logger.info(`  - ${template.name}`)
        })
    } else {
        logger.warn("未加载任何模板")
    }


    // if (config.enableOnlineAssets) {
    //     await AssetsManager.initialize(config)
    //     logger.info("assets manager initialized")
    // }

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

    // 添加额外的退出事件监听作为后备
    process.on("beforeExit", async (code) => {
        if (!isShuttingDown) {
            logger.info(
                `Process beforeExit with code ${code}, performing cleanup...`
            )
            await shutdownHandler("beforeExit")
        }
    })

    process.on("exit", (code) => {
        if (!isShuttingDown) {
            logger.info(`Process exit with code ${code}`)
        }
    })

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
