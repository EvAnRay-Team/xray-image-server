import type { WorkerPoolConfig } from "./worker-types"

export type Config = {
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
}

export const defaultConfig: Config = {
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
    }
}

export function defineConfig(conf: Config): Config {
    return { ...defaultConfig, ...conf }
}
