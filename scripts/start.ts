#!/usr/bin/env bun
import { run } from "../core"
import { loadConfig } from "./config-loader"

// 加载对应环境的配置
const config = await loadConfig()

// 启动服务
await run(config)
