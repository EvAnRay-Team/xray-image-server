import type { WorkerPoolConfig } from "./worker-types"

export type Config = {
    debug?: boolean
    host?: string
    port?: number
    enableOnlineAssets?: boolean
    worker?: WorkerPoolConfig
    db?: { pgUrl: string }
    oss?: {
        secretId: string
        secretKey: string
        bucket: string
        region: string
    }
    render?: { autoInitialize?: boolean }
    logger?: {
        /** 是否启用文件日志 */
        enableFileTransport?: boolean
        /** 日志文件目录，默认为项目根目录下的 logs 文件夹 */
        logDir?: string
        /** 日志文件名模式，默认为 log-%DATE%.json */
        filename?: string
        /** 日期格式，默认为 YYYY-MM-DD */
        datePattern?: string
        /** 最大保留的日志文件数量或天数 */
        maxFiles?: string
        /** 单个日志文件的最大大小 */
        maxSize?: string
        /** 是否压缩归档文件 */
        zippedArchive?: boolean
        /** 使用UTC时间 */
        utc?: boolean
    }
}

export const defaultConfig: Config = {
    debug: false,
    host: "127.0.0.1",
    port: 3000,
    enableOnlineAssets: false,
    worker: {
        workerCount: 4,
        maxQueueSize: 100,
        maxWorkerErrors: 3,
        taskTimeout: 30000, // 30秒
        verbose: false
    },
    db: {
        pgUrl: "postgres://username:password@localhost:5432/database"
    },
    oss: {
        secretId: "your-secret-id",
        secretKey: "your-secret-key",
        bucket: "your-bucket-name",
        region: "your-region"
    },
    render: {
        autoInitialize: true
    },
    logger: {
        enableFileTransport: true,
        logDir: "./logs",
        filename: "log-%DATE%.jsonl",
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d", // 保留最近7天的日志
        maxSize: "100m", // 单个文件最大100MB
        zippedArchive: false,
        utc: false
    }
}

export function defineConfig(conf: Config): Config {
    return { ...defaultConfig, ...conf }
}
