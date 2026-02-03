import Elysia from "elysia"

export function runElysia() {
    // 初始化一个 elysia 实例
    const app = new Elysia()

    // 启动服务
    app.listen(3000)
}
