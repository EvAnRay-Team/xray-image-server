import type { PrismaClient } from "../generated/prisma/client"
import type { Config } from "./config"
import { prisma } from "./db"
import COS from "cos-nodejs-sdk-v5"

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

    public static async getLocalFont(filename: string) {
        return await Bun.file(
            `./assets/static/font/${filename}`
        ).arrayBuffer()
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
        const ext = filename.split('.').pop()?.toLowerCase()
        let mimeType = 'image/png' // 默认 PNG
        if (ext === 'jpg' || ext === 'jpeg') {
            mimeType = 'image/jpeg'
        } else if (ext === 'gif') {
            mimeType = 'image/gif'
        } else if (ext === 'webp') {
            mimeType = 'image/webp'
        } else if (ext === 'svg') {
            mimeType = 'image/svg+xml'
        }
        
        // 转换为 base64 data URL
        const base64 = buffer.toString('base64')
        return `data:${mimeType};base64,${base64}`
    }

    private getFileFromOSS(fileKey: string) {}
}

let prismaClient: PrismaClient
let ossClient: COS
let bucket: string
let region: string
