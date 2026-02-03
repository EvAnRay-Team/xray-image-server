import { xxh64 } from "@node-rs/xxhash"
import type Elysia from "elysia"
import stringify from "fast-json-stable-stringify"
import { LRUCache } from "lru-cache"
import z from "zod"
import { getRenderService } from "../core"
import { server } from "typescript"

const RequestSchema = z.object({
    id: z.string(),
    payload: z.record(z.string(), z.unknown()),
    noCache: z.boolean().default(false)
})

type Request = z.infer<typeof RequestSchema>

const renderCache = new LRUCache<string, Buffer>({
    max: 100,
    ttl: 1000 * 60 * 5
})

export async function registerRenderPost(app: Elysia) {
    app.post("/v1/render", async (ctx) => {
        // 验证请求参数
        try {
            const { id, payload, noCache } = RequestSchema.parse(ctx.body)
            // 计算请求参数的 hash 生成缓存键
            const cacheKey = id + "-" + xxh64(stringify(payload))

            const service = getRenderService()

            // 检查当前的 templateName 是否已经注册
            if (!service.hasTemplate(id)) {
                ctx.set.status = 404
                return "Template not found"
            }

            if (!noCache) {
                // 没有传入 noCache 参数，尝试从缓存里查找结果
                const cachedResult = renderCache.get(cacheKey)
                if (cachedResult) {
                    ctx.set.status = 200
                    ctx.set.headers["content-type"] = "image/png"
                    ctx.set.headers["content-length"] = cachedResult.length
                    return cachedResult
                }
            }

            try {
                const img = await service.render(id, payload)
                // 成功生成图片，置入缓存
                renderCache.set(cacheKey, img)

                ctx.set.status = 200
                ctx.set.headers["content-type"] = "image/png"
                ctx.set.headers["content-length"] = img.length
                return img
            } catch (err) {
                // 这种情况是模板名称正确但是模板本身使用的参数错误
                ctx.set.status = 422
                return "Validation error"
            }
        } catch (err) {
            // 这里是传入的请求参数格式错误，返回 400
            ctx.set.status = 400
            return "Bad request"
        }
    })
}
