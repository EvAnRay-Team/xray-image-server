#!/usr/bin/env bun
import { run } from "../core"
import { loadConfig } from "./config-loader"

async function main() {
    try {
        // 加载对应环境的配置
        const config = await loadConfig()

        // 启动服务
        await run(config)
    } catch (error) {
        console.error("Failed to start server:", error)
        process.exit(1)
    }
}

// 显式调用main函数
main()
