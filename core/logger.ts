import chalk from "chalk"
import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"
import { mkdirSync } from "fs"

const { combine, timestamp, printf, errors, splat, metadata } = winston.format

const levelNameDict: Record<
    string,
    [string, (...text: unknown[]) => string, (...text: unknown[]) => string]
> = {
    error: ["ERROR", chalk.bold.redBright, chalk.redBright],
    warn: ["WARN_", chalk.bold.yellow, chalk.yellow],
    info: ["INFO_", chalk.bold.blue, chalk.white],
    http: ["HTTP_", chalk.bold.magenta, chalk.magenta],
    verbose: ["VERBO", chalk.bold.cyan, chalk.cyan],
    debug: ["DEBUG", chalk.bold.greenBright, chalk.greenBright],
    silly: ["SILLY", chalk.bold.white, chalk.white]
}

const customFormatter = printf((info) => {
    const { timestamp, level, message } = info
    const stack = info.stack ? `\n${info.stack}` : ""

    const [levelName, levelColor, messageColor] = levelNameDict[level] ?? [
        "WTF__",
        chalk.bold.white,
        chalk.white
    ]

    return chalk.gray(
        `> ${timestamp}  ${levelColor(levelName)}  ${messageColor(message)}${stack}`
    )
})

/**
 * 确保日志目录存在
 * @param logDir 日志目录路径
 */
function ensureLogDir(logDir: string): void {
    try {
        mkdirSync(logDir, { recursive: true })
    } catch (error) {
        // 如果目录已存在或其他错误，忽略
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
            console.warn(`Failed to create log directory ${logDir}:`, error)
        }
    }
}

/**
 * 创建文件传输配置
 * @param config 日志配置
 */
function createFileTransport(config: {
    logDir: string
    filename: string
    datePattern: string
    maxFiles: string
    maxSize: string
    zippedArchive: boolean
    utc: boolean
}): DailyRotateFile {
    ensureLogDir(config.logDir)

    return new DailyRotateFile({
        dirname: config.logDir,
        filename: config.filename,
        datePattern: config.datePattern,
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        zippedArchive: config.zippedArchive,
        utc: config.utc,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
    })
}

export const createWinstonLogger = (
    isDebug: boolean = false,
    fileConfig?: {
        enableFileTransport: boolean
        logDir: string
        filename: string
        datePattern: string
        maxFiles: string
        maxSize: string
        zippedArchive: boolean
        utc: boolean
    }
) =>
    winston.createLogger({
        level: isDebug ? "debug" : "info",
        format: combine(
            timestamp({ format: "MM-DD HH:mm:ss.SSS" }),
            errors({ stack: true }), // 让 Error 带 stack
            splat(), // 支持 %s %d 这种格式化
            metadata({
                fillExcept: ["message", "level", "timestamp", "label"]
            }),
            customFormatter
        ),
        transports: [
            new winston.transports.Console({ format: customFormatter }),
            ...(fileConfig?.enableFileTransport
                ? [createFileTransport(fileConfig)]
                : [])
        ]
    })

export let logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
})

export function getLogger() {
    return logger
}

export function setLogger(newLogger: winston.Logger) {
    logger = newLogger
}

/**
 * 根据配置创建 logger 实例
 * @param isDebug 是否启用调试模式
 * @param config 配置对象
 */
export function createLoggerWithConfig(
    isDebug: boolean = false,
    config?: {
        enableFileTransport?: boolean
        logDir?: string
        filename?: string
        datePattern?: string
        maxFiles?: string
        maxSize?: string
        zippedArchive?: boolean
        utc?: boolean
    }
) {
    const fileConfig = config
        ? {
              enableFileTransport: config.enableFileTransport ?? true,
              logDir: config.logDir ?? "./logs",
              filename: config.filename ?? "log-%DATE%.jsonl",
              datePattern: config.datePattern ?? "YYYY-MM-DD",
              maxFiles: config.maxFiles ?? "7d",
              maxSize: config.maxSize ?? "100m",
              zippedArchive: config.zippedArchive ?? false,
              utc: config.utc ?? false
          }
        : undefined

    return createWinstonLogger(isDebug, fileConfig)
}
