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
