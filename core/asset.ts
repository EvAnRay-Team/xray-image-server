import type { PrismaClient } from "../generated/prisma/client"
import type { Config } from "./config"
import { prisma } from "./db"
import COS from "cos-nodejs-sdk-v5"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"

export class AssetsManager {
    private constructor() {}

    public static async initialize(config: Config) {
        // 初始化数据库连接
        prismaClient = prisma(config.db?.url!)
        // 初始化 OSS 连接
        ossClient = new COS({
            SecretId: config.oss?.secretId!,
            SecretKey: config.oss?.secretKey!
        })
        bucket = config.oss?.bucket!
        region = config.oss?.region!
    }

    /**
     * 获取远程图片（从 COS）
     * 先检查本地文件是否存在，如果存在则直接读取，否则从 COS 下载到本地
     * @param file_key COS 中的文件 key
     * @returns base64 data URL 字符串，可直接用于 satori 的 <img src> 属性
     */
    public static async getRemoteImage(file_key: string): Promise<string> {
        // 按照 file_key 的完整路径保存，保留目录结构
        // 例如：maimaidx/abstract_cover/f3/8e/file.jpg -> assets/remote/image/maimaidx/abstract_cover/f3/8e/file.jpg
        const localPath = join(process.cwd(), "assets", "remote", "image", file_key)
        const localFile = Bun.file(localPath)

        // 检查本地文件是否存在
        if (await localFile.exists()) {
            // 文件存在，直接读取并返回
            const arrayBuffer = await localFile.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            return this.bufferToDataURL(buffer, file_key)
        }

        // 检查 OSS 客户端是否已初始化
        if (!ossClient || !bucket || !region) {
            throw new Error(
                `OSS client not initialized. Please call AssetsManager.initialize(config) first and ensure enableOnlineAssets is true.`
            )
        }

        // 文件不存在，从 COS 下载
        try {
            const result = await ossClient.getObject({
                Bucket: bucket,
                Region: region,
                Key: file_key
            }) as any

            // 获取文件内容（可能是 Buffer 或 Stream）
            let fileBuffer: Buffer
            const body = result.Body as any
            if (Buffer.isBuffer(body)) {
                fileBuffer = body
            } else if (body && typeof body === "object" && "byteLength" in body) {
                // Uint8Array 或类似的 TypedArray
                fileBuffer = Buffer.from(body)
            } else if (typeof body === "string") {
                fileBuffer = Buffer.from(body, "base64")
            } else {
                // 如果是 Stream，需要转换为 Buffer
                const chunks: Buffer[] = []
                for await (const chunk of body) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                }
                fileBuffer = Buffer.concat(chunks)
            }

            // 确保目录存在
            const dir = dirname(localPath)
            mkdirSync(dir, { recursive: true })

            // 保存文件到本地
            writeFileSync(localPath, fileBuffer)

            // 返回 base64 data URL
            return this.bufferToDataURL(fileBuffer, file_key)
        } catch (error) {
            throw new Error(
                `Failed to download image from COS (key: ${file_key}): ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    /**
     * 将 Buffer 转换为 base64 data URL
     */
    private static bufferToDataURL(buffer: Buffer, filename: string): string {
        // 根据文件扩展名确定 MIME 类型
        const ext = filename.split(".").pop()?.toLowerCase()
        let mimeType = "image/png" // 默认 PNG
        if (ext === "jpg" || ext === "jpeg") {
            mimeType = "image/jpeg"
        } else if (ext === "gif") {
            mimeType = "image/gif"
        } else if (ext === "webp") {
            mimeType = "image/webp"
        } else if (ext === "svg") {
            mimeType = "image/svg+xml"
        }

        // 转换为 base64 data URL
        const base64 = buffer.toString("base64")
        return `data:${mimeType};base64,${base64}`
    }

    public static async getLocalFont(filename: string) {
        return await Bun.file(`./assets/static/font/${filename}`).arrayBuffer()
    }

    /**
     * 获取本地图片并转换为 base64 data URL
     * @param filename 图片文件名，会依次尝试以下路径：
     *   1. ./assets/static/image/${filename}
     * @returns base64 data URL 字符串，可直接用于 satori 的 <img src> 属性
     */
    public static async getLocalImage(filename: string): Promise<string> {
        // 尝试多个可能的路径
        let file = Bun.file(`./assets/static/image/${filename}`)

        if (!(await file.exists())) {
            throw new Error(`Image file not found: ${filename}`)
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 根据文件扩展名确定 MIME 类型
        const ext = filename.split(".").pop()?.toLowerCase()
        let mimeType = "image/png" // 默认 PNG
        if (ext === "jpg" || ext === "jpeg") {
            mimeType = "image/jpeg"
        } else if (ext === "gif") {
            mimeType = "image/gif"
        } else if (ext === "webp") {
            mimeType = "image/webp"
        } else if (ext === "svg") {
            mimeType = "image/svg+xml"
        }

        // 转换为 base64 data URL
        const base64 = buffer.toString("base64")
        return `data:${mimeType};base64,${base64}`
    }


    public static async getMusicCover(musicId: number, isAbstract: boolean): Promise<string> {
        if (isAbstract) {
            const abstractDoc = await prismaClient.abstracts.findFirst({ where: { music_id: musicId } })
            return await this.getRemoteImage(abstractDoc?.file_key!)
        } else {
            return await this.getLocalImage(`maimaidx/normal_cover/${musicId}.png`)
        }
    }
}

let prismaClient: PrismaClient
let ossClient: COS
let bucket: string
let region: string
