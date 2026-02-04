import { Elysia } from "elysia"
import { getLogger } from "../core/logger"

/**
 * Elysia 网络日志中间件
 * 记录 HTTP 请求的基本信息
 */
export function loggingMiddleware() {
    const logger = getLogger()

    return (app: Elysia) =>
        app
            .onRequest((context) => {
                // 记录请求开始时间
                ;(context.store as any).requestStartTime = Date.now()
            })
            .onAfterHandle({ as: "global" }, (context) => {
                const { request, set, path } = context
                const method = request.method

                // 计算响应时间
                const startTime =
                    (context.store as any).requestStartTime || Date.now()
                const responseTime = Date.now() - startTime

                // 获取客户端信息
                const clientIp = extractClientIpSafe(context.headers)
                const userAgent =
                    extractHeaderSafe(context.headers, "user-agent") ||
                    "unknown"

                // 格式化响应时间
                const formattedTime = formatTime(responseTime)

                // 确定日志级别
                const statusCode = Number(set.status)
                let level: string

                if (statusCode >= 500) {
                    level = "error"
                } else if (statusCode >= 400) {
                    level = "warn"
                } else {
                    level = "http"
                }

                // 记录日志
                logger.log(
                    level,
                    `${method} ${path} ${set.status} ${formattedTime}`,
                    {
                        method,
                        path,
                        statusCode: set.status,
                        responseTime: formattedTime,
                        clientIp,
                        userAgent
                    }
                )
            })
            .onError({ as: "global" }, (context) => {
                const { request, error, path } = context
                const method = request.method

                // 计算响应时间
                const startTime =
                    (context.store as any).requestStartTime || Date.now()
                const responseTime = Date.now() - startTime

                // 获取客户端信息
                const clientIp = extractClientIpSafe(context.headers)
                const userAgent =
                    extractHeaderSafe(context.headers, "user-agent") ||
                    "unknown"

                // 格式化响应时间
                const formattedTime = formatTime(responseTime)

                // 记录错误日志
                logger.log(
                    "error",
                    `${method} ${path} ERROR ${formattedTime}`,
                    {
                        method,
                        path,
                        statusCode: 500,
                        responseTime: formattedTime,
                        clientIp,
                        userAgent,
                        error: {
                            name:
                                error instanceof Error
                                    ? error.name
                                    : "UnknownError",
                            message:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                            stack:
                                error instanceof Error ? error.stack : undefined
                        }
                    }
                )
            })
}

/**
 * 安全地提取HTTP头部值
 */
function extractHeaderSafe(
    headers: Record<string, string | undefined>,
    headerName: string
): string | undefined {
    try {
        const value = headers[headerName]
        return value && value !== "undefined" ? String(value) : undefined
    } catch {
        return undefined
    }
}

/**
 * 安全地提取客户端IP地址
 */
function extractClientIpSafe(
    headers: Record<string, string | undefined>
): string {
    try {
        // 尝试从 X-Forwarded-For 获取
        const forwarded = extractHeaderSafe(headers, "x-forwarded-for")
        if (forwarded) {
            const ips = forwarded.split(",")
            if (ips.length > 0 && ips[0]) {
                return ips[0].trim()
            }
        }

        // 尝试从 X-Real-IP 获取
        const realIp = extractHeaderSafe(headers, "x-real-ip")
        if (realIp) {
            return realIp
        }

        // 尝试从 Remote-Addr 获取
        const remoteAddr = extractHeaderSafe(headers, "remote-addr")
        if (remoteAddr) {
            return remoteAddr
        }
    } catch (err) {
        // 忽略任何解析错误
    }

    return "unknown"
}

/**
 * 格式化响应时间显示
 */
function formatTime(ms: number): string {
    if (ms < 1) return `${Math.round(ms * 1000)}μs`
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
}
