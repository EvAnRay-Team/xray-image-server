import type { PrismaClient } from "../generated/prisma/client"
import type { Config } from "./config"
import { prisma } from "./db"
import COS from "cos-nodejs-sdk-v5"
import { mkdirSync, writeFileSync } from "fs"
import { basename, join } from "path"

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
     * 获取 COS 抽象曲绘（下载缓存到 assets/cover/mai_cover_abstract/）
     * @param file_key COS 中的文件 key
     */
    public static async getRemoteImage(file_key: string): Promise<string> {
        const filename = basename(file_key)
        const relativePath = join("cover", "mai_cover_abstract", filename)
        const localPath = join(process.cwd(), "assets", relativePath)
        const localFile = Bun.file(localPath)

        if (await localFile.exists()) {
            const buffer = Buffer.from(await localFile.arrayBuffer())
            return this.bufferToDataURL(buffer, filename)
        }

        if (!ossClient || !bucket || !region) {
            throw new Error(
                `OSS client not initialized. Please call AssetsManager.initialize(config) first and ensure enableOnlineAssets is true.`
            )
        }

        try {
            const result = await ossClient.getObject({
                Bucket: bucket,
                Region: region,
                Key: file_key
            }) as any

            let fileBuffer: Buffer
            const body = result.Body as any
            if (Buffer.isBuffer(body)) {
                fileBuffer = body
            } else if (body && typeof body === "object" && "byteLength" in body) {
                fileBuffer = Buffer.from(body)
            } else if (typeof body === "string") {
                fileBuffer = Buffer.from(body, "base64")
            } else {
                const chunks: Buffer[] = []
                for await (const chunk of body) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                }
                fileBuffer = Buffer.concat(chunks)
            }

            mkdirSync(join(process.cwd(), "assets", "cover", "mai_cover_abstract"), { recursive: true })
            writeFileSync(localPath, fileBuffer)

            return this.bufferToDataURL(fileBuffer, filename)
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
        return await Bun.file(`./assets/font/${filename}`).arrayBuffer()
    }

    /**
     * 读取 assets 下的图片并转为 base64 data URL
     * @param relativePath 相对 assets/ 的路径，如 layout/mai_music_info/background/bg_dx.png
     */
    public static async getAssetImage(relativePath: string): Promise<string> {
        const file = Bun.file(join(process.cwd(), "assets", relativePath))

        if (!(await file.exists())) {
            throw new Error(`Asset file not found: assets/${relativePath}`)
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        return this.bufferToDataURL(buffer, basename(relativePath))
    }

    public static async getMaiNormalCover(musicId: number): Promise<string> {
        return this.getAssetImage(join("cover", "mai_cover_normal", `${musicId}.png`))
    }

    public static async getMusicCover(musicId: number, isAbstract: boolean): Promise<string> {
        if (!isAbstract) {
            return await this.getMaiNormalCover(musicId)
        }
        if (!prismaClient) {
            return await this.getMaiNormalCover(musicId)
        }
        const list = await prismaClient.abstracts.findMany({ where: { music_id: musicId } })
        if (list.length === 0) {
            return await this.getMaiNormalCover(musicId)
        }
        const randomIndex = Math.floor(Math.random() * list.length)
        const picked = list[randomIndex]
        if (!picked?.file_key) {
            return await this.getMaiNormalCover(musicId)
        }
        return await this.getRemoteImage(picked.file_key)
    }
}

let prismaClient: PrismaClient
let ossClient: COS
let bucket: string
let region: string
