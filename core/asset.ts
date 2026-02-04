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
            `"./assets/static/font"/${filename}`
        ).arrayBuffer()
    }

    public static async getLocalImage(filename: string) {
        return await Bun.file(
            `"./assets/static/image"/${filename}`
        ).arrayBuffer()
    }

    private getFileFromOSS(fileKey: string) {}
}

let prismaClient: PrismaClient
let ossClient: COS
let bucket: string
let region: string
