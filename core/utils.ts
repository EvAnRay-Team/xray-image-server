import type { CSSProperties } from "react"

interface PackageJson {
    name: string
    version?: string
    [key: string]: any
}

export async function getVersion() {
    // 从 package.json 中获取版本号
    try {
        const packageJson = await import("../package.json", {
            assert: { type: "json" }
        })
        const pkg = packageJson.default as PackageJson
        // 如果没有 version 字段，返回默认值
        return pkg.version || "0.1.0"
    } catch (error) {
        // 如果读取失败，返回默认版本
        return "0.1.0"
    }
}

export class SnowFlake {
    private epoch: number = 1704067200000 // 2024-01-01 00:00:00 UTC
    private workerIdBits: number = 10
    private sequenceBits: number = 12
    private maxSequence: number = (1 << this.sequenceBits) - 1

    private lastMs: number = 0
    private sequence: number = 0

    constructor(readonly workerId: number) {}

    nextBigIntId(): bigint {
        const now = Date.now()
        if (now === this.lastMs) {
            this.sequence = (this.sequence + 1) & this.maxSequence
            if (this.sequence === 0) {
                while (Date.now() <= this.lastMs) {}
            }
        } else {
            this.sequence = 0
            this.lastMs = now
        }

        const timestampPart =
            BigInt(now - this.epoch) <<
            BigInt(this.workerIdBits + this.sequenceBits)
        const workerPart = BigInt(this.workerId) << BigInt(this.sequenceBits)
        const id = timestampPart | workerPart | BigInt(this.sequence)
        return id
    }

    nextBase36Id(): string {
        return this.nextBigIntId().toString(36)
    }
}

export const snowflake = new SnowFlake(1)

/**
 * CSS 样式工具函数
 */

/**
 * 重置 margin 和 padding 的样式对象
 * 用于清除元素的默认边距和内边距
 */
export const resetMarginPadding: CSSProperties = {
    margin: 0,
    padding: 0
}

/**
 * 创建绝对定位样式对象
 * 使用方法：
 *  - 两个参数：absoluteStyle(left, top, [additionalStyles])
 *  - 四个参数：absoluteStyle(width, height, left, top, [additionalStyles])
 * @returns React CSS 样式对象
 */
export function absoluteStyle(
    a: number | string,
    b: number | string,
    c?: number | string | CSSProperties,
    d?: number | string | CSSProperties,
    e?: CSSProperties
): CSSProperties {
    // 只有两个参数：left 和 top
    if (typeof c === "undefined" && typeof d === "undefined") {
        return {
            position: "absolute",
            left: typeof a === "number" ? `${a}px` : a,
            top: typeof b === "number" ? `${b}px` : b
        }
    }
    // 三个参数：left, top, additionalStyles
    if (typeof d === "undefined" && typeof c !== "undefined" && (typeof c === "object" && c !== null)) {
        return {
            position: "absolute",
            left: typeof a === "number" ? `${a}px` : a,
            top: typeof b === "number" ? `${b}px` : b,
            ...c
        }
    }
    // 四个或五个参数：width, height, left, top, (additionalStyles)
    let width = a
    let height = b
    let left = c as number | string
    let top = d as number | string
    let additionalStyles = e as CSSProperties | undefined

    // 处理四个参数：没有additionalStyles
    if (typeof e === "undefined") {
        return {
            position: "absolute",
            width: typeof width === "number" ? `${width}px` : width,
            height: typeof height === "number" ? `${height}px` : height,
            left: typeof left === "number" ? `${left}px` : left,
            top: typeof top === "number" ? `${top}px` : top
        }
    }

    // 五个参数
    return {
        position: "absolute",
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        left: typeof left === "number" ? `${left}px` : left,
        top: typeof top === "number" ? `${top}px` : top,
        ...additionalStyles
    }
}
