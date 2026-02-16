import { type Config } from "../core/config"

// 根据环境变量加载对应的配置文件
async function loadConfig(): Promise<Config> {
    const env = process.env.NODE_ENV || "development"

    // console.log(`Loading configuration for environment: ${env}`)

    try {
        let configModule: { default: Config }

        switch (env.toLowerCase()) {
            case "production":
            case "prod":
                configModule = await import("../server.config.prod")
                break
            case "test":
            case "testing":
                configModule = await import("../server.config.test")
                break
            case "development":
                configModule = await import("../server.config.dev")
                break
            case "dev":
            default:
                configModule = await import("../server.config.dev")
                break
        }

        return configModule.default
    } catch (error) {
        console.warn(
            `Failed to load ${env} config, falling back to default config:`,
            error
        )
        // 如果特定环境配置加载失败，使用基础配置
        const { defineConfig } = await import("../core/config")
        return defineConfig({
            debug: env === "development",
            port: 3000
        })
    }
}

export { loadConfig }
