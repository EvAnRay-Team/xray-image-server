import Elysia from "elysia"
import type { Config } from "../core/config"

export function runElysia(config: Config) {
    // 初始化一个 elysia 实例
    const app = new Elysia()

    // 启动服务
    app.listen(`${config.host!}:${config.port!}`)
}
