import type Elysia from "elysia"

export async function registerPingGet(app: Elysia) {
    app.get("/v1/ping", (ctx) => {
        ctx.set.headers["Content-Type"] = "application/json"
        return {
            result: "pong"
        }
    })
}
